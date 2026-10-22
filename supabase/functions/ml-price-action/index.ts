// ml-price-action
// Altera o preço de um ou mais anúncios da conta (até 50 por vez), em duas etapas.
//
// previa: { account_id, etapa: "previa", idempotency_key,
//           itens: [{ item_id, preco_novo }]                 // preço definido item a item
//         | item_ids: string[], regra: { tipo: "valor" | "percentual" | "soma", valor } }
//   Para cada item: lê /items e a automação de preços. Bloqueia se a automação estiver ativa,
//   se o anúncio não for desta conta, não estiver ativo/pausado ou o preço não mudar.
//   Queda de 20% ou mais vira aviso (não bloqueia).
// confirmar: { account_id, etapa: "confirmar", idempotency_key }
//   Relê o item; se o preço mudou desde a prévia, não envia. Anúncio com variações recebe o
//   mesmo preço em todas, enviando todas as variações (as omitidas seriam apagadas pelo ML).
// Contrato de resposta em _shared/mlAcaoLote.ts.

import { buscarMl, enviarMl } from "../_shared/mlHttp.ts";
import { type Contexto, type Execucao, type Linha, servirAcaoEmLote } from "../_shared/mlAcaoLote.ts";
import {
  aplicarRegra,
  centavos,
  corpoPreco,
  erroPreco,
  estadoPreco,
  lerItemPreco,
  lerRegra,
  MAX_ITENS_LOTE,
  precoIgnorado,
  quedaGrande,
  type RegraLote,
  variacao,
} from "../_shared/mlPreco.ts";

const API = "https://api.mercadolibre.com";
const ATRIBUTOS = "id,seller_id,status,title,price,currency_id,variations";

const brl = (n: number | null) =>
  n == null ? "Sem preço" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

async function lerItem(token: string, itemId: string) {
  const r = await buscarMl(`${API}/items/${itemId}?attributes=${ATRIBUTOS}`, token);
  if (!r.ok) return { ok: false as const, erro: r.erro };
  const item = lerItemPreco(r.json);
  return item ? { ok: true as const, item } : { ok: false as const, erro: "Resposta do Mercado Livre sem o anúncio." };
}

/** 404 automation_not_found = sem automação. Qualquer outra falha bloqueia por segurança. */
async function automacao(token: string, itemId: string): Promise<{ ativa: boolean; pausada: boolean; erro: string | null }> {
  const r = await buscarMl(`${API}/pricing-automation/items/${itemId}/automation`, token);
  if (r.ok) {
    const status = (r.json as { status?: unknown })?.status;
    return { ativa: status === "ACTIVE", pausada: status === "PAUSED", erro: null };
  }
  if (r.status === 404) return { ativa: false, pausada: false, erro: null };
  return { ativa: false, pausada: false, erro: "Não foi possível confirmar se o anúncio tem automação de preços." };
}

type Pedido = { item_id: string; preco_novo: number | null };

function lerPedidos(body: Record<string, unknown>): { ok: true; pedidos: Pedido[]; regra: RegraLote | null } | { ok: false; erro: string } {
  const valido = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{3}\d+$/.test(v);
  let pedidos: Pedido[] = [];
  let regra: RegraLote | null = null;
  if (Array.isArray(body.itens)) {
    pedidos = body.itens.flatMap((x) => {
      const i = x as { item_id?: unknown; preco_novo?: unknown };
      return valido(i?.item_id) ? [{ item_id: i.item_id, preco_novo: Number(i.preco_novo) }] : [];
    });
  } else if (Array.isArray(body.item_ids)) {
    regra = lerRegra(body.regra);
    if (!regra) return { ok: false, erro: "Regra de preço inválida." };
    pedidos = body.item_ids.filter(valido).map((item_id) => ({ item_id, preco_novo: null }));
  }
  pedidos = [...new Map(pedidos.map((p) => [p.item_id, p])).values()];
  if (!pedidos.length) return { ok: false, erro: "Escolha ao menos um anúncio." };
  if (pedidos.length > MAX_ITENS_LOTE) return { ok: false, erro: `No máximo ${MAX_ITENS_LOTE} anúncios por vez.` };
  return { ok: true, pedidos, regra };
}

async function previa(ctx: Contexto, body: Record<string, unknown>) {
  const lidos = lerPedidos(body);
  if (!lidos.ok) return { ok: false as const, erro: lidos.erro, status: 400 };
  const linhas: Linha[] = [];
  for (const p of lidos.pedidos) {
    const base = { chave: p.item_id, item_id: p.item_id, titulo: null as string | null, antes: "—", depois: "—", hash: "", dados: {} };
    const lido = await lerItem(ctx.token, p.item_id);
    if (!lido.ok) {
      linhas.push({ ...base, bloqueio: lido.erro });
      continue;
    }
    const { item } = lido;
    const atual = item.preco;
    const novo = p.preco_novo != null ? centavos(p.preco_novo) : atual != null && lidos.regra ? aplicarRegra(atual, lidos.regra) : NaN;
    const linha: Linha = {
      ...base,
      titulo: item.titulo,
      antes: brl(atual),
      depois: Number.isFinite(novo) ? brl(novo) : "—",
      hash: estadoPreco(item),
      dados: { preco_novo: novo, preco_antes: atual, variacoes: item.variacoes.length },
    };
    const v = atual != null && Number.isFinite(novo) ? variacao(atual, novo) : null;
    if (v != null) linha.depois += ` (${v > 0 ? "+" : ""}${(v * 100).toFixed(1).replace(".", ",")}%)`;

    let bloqueio: string | null = null;
    if (item.seller_id !== null && item.seller_id !== Number(ctx.conta.ml_user_id)) bloqueio = "Este anúncio não é desta conta.";
    else if (item.status !== "active" && item.status !== "paused") bloqueio = "Só anúncios ativos ou pausados podem mudar de preço.";
    else if (atual == null) bloqueio = "O Mercado Livre não informou o preço atual.";
    else bloqueio = erroPreco(novo) ?? (novo === atual ? "O preço novo é igual ao atual." : null);
    if (!bloqueio) {
      const auto = await automacao(ctx.token, item.item_id);
      if (auto.erro) bloqueio = auto.erro;
      else if (auto.ativa) bloqueio = "Automação de preços ativa no Mercado Livre: pause a automação para mudar o preço.";
      else if (auto.pausada) linha.aviso = "O anúncio tem automação de preços pausada.";
    }
    linha.bloqueio = bloqueio;
    const avisos = [linha.aviso];
    if (!bloqueio && atual != null && quedaGrande(atual, novo)) avisos.push("Queda de 20% ou mais no preço.");
    if (!bloqueio && item.variacoes.length) avisos.push(`O mesmo preço vale para as ${item.variacoes.length} variações.`);
    linha.aviso = avisos.filter(Boolean).join(" ") || null;
    linhas.push(linha);
  }
  return { ok: true as const, linhas };
}

async function executar(ctx: Contexto, linha: Linha): Promise<Execucao> {
  const r = (status: Execucao["resultado"]["status"], mensagem: string | null, codigo_ml: string | null = null) =>
    ({ chave: linha.chave, item_id: linha.item_id, status, mensagem, codigo_ml });
  const itemId = linha.item_id!;
  const novo = Number(linha.dados.preco_novo);

  const lido = await lerItem(ctx.token, itemId);
  if (!lido.ok) return { resultado: r("recusado", lido.erro) };
  if (lido.item.preco === novo && lido.item.variacoes.every((v) => v.preco == null || v.preco === novo)) {
    return { resultado: r("ja_feito", "O anúncio já está com este preço.") };
  }
  if (estadoPreco(lido.item) !== linha.hash) return { resultado: r("conflito", "O preço mudou no Mercado Livre desde a prévia. Gere nova prévia.") };

  const corpo = corpoPreco(lido.item, novo);
  const url = `${API}/items/${itemId}`;
  const envio = await enviarMl("PUT", url, ctx.token, corpo);
  let ok = envio.ok && !precoIgnorado(envio.json);
  if (!envio.ok && envio.incerto) {
    const relido = await lerItem(ctx.token, itemId);
    ok = relido.ok && relido.item.preco === novo;
  }
  const auditoria = { payload: { metodo: "PUT", url, corpo }, resposta: envio.ok ? envio.json : { status: envio.status, erro: envio.erro }, codigo: envio.ok ? null : envio.codigo };
  if (!ok) {
    const mensagem = envio.ok ? "O Mercado Livre ignorou o preço: o anúncio tem automação de preços." : envio.erro;
    return { resultado: r("recusado", mensagem, envio.ok ? "item.price.not_modifiable" : envio.codigo), auditoria };
  }
  await ctx.admin.from("ml_listings").update({ preco: novo }).eq("item_id", itemId).eq("account_id", ctx.accountId);
  return { resultado: r("feito", null), auditoria };
}

servirAcaoEmLote({ acao: "preco.alterar", previa, executar });
