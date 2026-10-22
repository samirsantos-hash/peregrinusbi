// ml-listing-improve
// Melhorias de anúncio: lê o anúncio no ML, aponta problemas por regras fixas e pede à IA
// explicação, análise livre, títulos e descrição sugeridos. Só sugere: não escreve no ML.
//
// Contrato
// POST JWT de quem gerencia a conta: { account_id, item_id, forcar?: boolean }
//   200 { status: "gerado" | "sem_mudanca", melhoria }   melhoria = linha de ml_listing_improvements
//   sem forcar, se nada mudou no anúncio desde a última análise, devolve a guardada sem gastar IA.
// POST x-refresh-secret (cron, de hora em hora): { account_id? }
//   analisa os TOP_DIARIO mais vendidos ativos de cada conta ainda não verificados hoje (São Paulo),
//   dentro do limite de tempo; IA só quando o anúncio mudou.
//   200 { contas: [{ account_id, analisados, com_ia, pendentes, erro }] }
// 400 dados inválidos · 401 sem login · 403 anúncio ou conta de outra pessoa · 502 o ML não respondeu
//
// Fonte: /items/{id}, /items/{id}/description, /item/{id}/performance, /categories/{id} e /categories/{id}/attributes.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { type Conta, contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { chamarIa, MODELO_IA } from "../_shared/mlIa.ts";
import { hojeSaoPaulo } from "../_shared/mlPromocoes.ts";
import {
  assinatura,
  atributosDaFicha,
  diagnosticar,
  lerCategoria,
  lerFotos,
  lerQualidade,
  montarPrompt,
  SCHEMA_MELHORIAS,
  validarIa,
} from "../_shared/mlMelhorias.ts";

const API = "https://api.mercadolibre.com";
const ORCAMENTO_MS = 100_000;
/** Anúncios mais vendidos analisados por conta a cada dia. */
const TOP_DIARIO = 10;

type Cache = Map<string, unknown>;

async function categoria(token: string, id: string, cache: Cache) {
  const chave = `cat:${id}`;
  if (!cache.has(chave)) {
    const [c, a] = [await buscarMl(`${API}/categories/${id}`, token), await buscarMl(`${API}/categories/${id}/attributes`, token)];
    cache.set(chave, { config: lerCategoria(c.ok ? c.json : null), atributos: a.ok ? a.json : [] });
  }
  return cache.get(chave) as { config: ReturnType<typeof lerCategoria>; atributos: unknown };
}

type Saida =
  | { ok: true; status: "gerado" | "sem_mudanca"; melhoria: Record<string, unknown> }
  | { ok: false; status: number; erro: string };

async function analisar(
  admin: SupabaseClient,
  conta: Conta,
  token: string,
  itemId: string,
  opcoes: { forcar: boolean; origem: "manual" | "diario"; userId: string | null; cache: Cache },
): Promise<Saida> {
  const it = await buscarMl(`${API}/items/${itemId}?include_attributes=all&include_internal_attributes=true`, token);
  if (!it.ok) return { ok: false, status: it.status === 404 ? 404 : 502, erro: it.erro };
  const item = it.json as Record<string, unknown>;
  if (typeof item.seller_id === "number" && item.seller_id !== Number(conta.ml_user_id)) {
    return { ok: false, status: 403, erro: "Este anúncio não é desta conta." };
  }
  const titulo = typeof item.title === "string" ? item.title : "";
  const categoriaId = typeof item.category_id === "string" ? item.category_id : null;
  const condicao = typeof item.condition === "string" ? item.condition : null;

  const desc = await buscarMl(`${API}/items/${itemId}/description`, token);
  if (!desc.ok && desc.status !== 404) return { ok: false, status: 502, erro: desc.erro };
  const descricao = desc.ok ? ((desc.json as { plain_text?: unknown }).plain_text as string | undefined) ?? null : null;

  const perf = await buscarMl(`${API}/item/${itemId}/performance`, token);
  const qualidade = perf.ok ? lerQualidade(perf.json) : null;

  const cat = categoriaId ? await categoria(token, categoriaId, opcoes.cache) : { config: lerCategoria(null), atributos: [] };

  const variacoes = (Array.isArray(item.variations) ? item.variations : []) as Record<string, unknown>[];
  const idsEmVariacoes = variacoes.flatMap((v) => [
    ...(Array.isArray(v.attribute_combinations) ? v.attribute_combinations : []),
    ...(Array.isArray(v.attributes) ? v.attributes : []),
  ]).flatMap((a) => {
    const x = a as { id?: unknown; value_name?: unknown; value_id?: unknown };
    return typeof x.id === "string" && (x.value_name || x.value_id != null) ? [x.id] : [];
  });
  const ficha = atributosDaFicha(cat.atributos, item.attributes, condicao, idsEmVariacoes);
  const diagnostico = diagnosticar({ titulo, descricao, fotos: lerFotos(item.pictures), categoria: cat.config, qualidade, ficha });

  const combinacoes = variacoes.map((v) =>
    (Array.isArray(v.attribute_combinations) ? v.attribute_combinations : [])
      .map((a) => `${(a as { name?: string }).name ?? ""}: ${(a as { value_name?: string }).value_name ?? ""}`).join(" · "),
  ).filter(Boolean);
  const prompt = montarPrompt({
    item_id: itemId,
    titulo,
    categoria: cat.config.nome,
    condicao,
    preco: typeof item.price === "number" ? item.price : null,
    tipo_anuncio: typeof item.listing_type_id === "string" ? item.listing_type_id : null,
    catalogo: item.catalog_listing === true,
    variacoes: combinacoes,
    descricao,
  }, diagnostico);
  const hash = assinatura(prompt);
  const agora = new Date().toISOString();

  const { data: existente } = await admin.from("ml_listing_improvements").select("*")
    .eq("account_id", conta.id).eq("item_id", itemId).maybeSingle();
  if (!opcoes.forcar && existente && existente.entrada_hash === hash && existente.ia) {
    const { data } = await admin.from("ml_listing_improvements").update({ verificado_em: agora })
      .eq("account_id", conta.id).eq("item_id", itemId).select("*").single();
    return { ok: true, status: "sem_mudanca", melhoria: data ?? existente };
  }

  const ia = await chamarIa(prompt, "melhorias_anuncio", SCHEMA_MELHORIAS);
  const sugestao = ia.ok ? validarIa(ia.json, diagnostico.titulo.max, diagnostico.descricao.max) : null;
  const linha = {
    account_id: conta.id,
    item_id: itemId,
    titulo,
    diagnostico,
    ia: sugestao,
    erro_ia: sugestao ? null : ia.ok ? "A IA devolveu uma resposta fora do formato." : ia.erro,
    modelo: MODELO_IA,
    entrada_hash: hash,
    qualidade_score: qualidade?.score ?? null,
    achados_altos: diagnostico.achados.filter((a) => a.gravidade === "alta").length,
    achados_total: diagnostico.achados.length,
    origem: opcoes.origem,
    gerado_por: opcoes.userId,
    gerado_em: agora,
    verificado_em: agora,
  };
  const { data, error } = await admin.from("ml_listing_improvements").upsert(linha).select("*").single();
  if (error) {
    console.error("ml-listing-improve", error.message);
    return { ok: false, status: 500, erro: "Não foi possível guardar a análise." };
  }
  return { ok: true, status: "gerado", melhoria: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();
  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string; item_id?: unknown; forcar?: unknown };
  const cron = segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"));

  if (!cron) {
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return acesso.res;
    const itemId = typeof body.item_id === "string" && /^[A-Z]{3}\d+$/.test(body.item_id) ? body.item_id : null;
    if (!itemId) return resposta({ error: "Anúncio inválido." }, 400);
    const alvo = await contaComToken(admin, body.account_id as string);
    if (!alvo.ok) return resposta({ error: alvo.erro }, 409);
    const r = await analisar(admin, alvo.conta, alvo.token, itemId, { forcar: body.forcar === true, origem: "manual", userId: acesso.userId, cache: new Map() });
    if (!r.ok) return resposta({ error: r.erro }, r.status);
    return resposta({ status: r.status, melhoria: r.melhoria });
  }

  let q = admin.from("ml_accounts").select("id").eq("status", "active");
  if (body.account_id) q = q.eq("id", body.account_id);
  const { data: contasIds } = await q;
  const inicioDia = new Date(`${hojeSaoPaulo()}T00:00:00-03:00`).toISOString();
  const contas = [];
  for (const { id: accountId } of contasIds ?? []) {
    const base = { account_id: accountId, analisados: 0, com_ia: 0, pendentes: 0 };
    const { data: top } = await admin.from("ml_listings").select("item_id")
      .eq("account_id", accountId).eq("status", "active").order("vendidos", { ascending: false, nullsFirst: false }).limit(TOP_DIARIO);
    const ids = (top ?? []).map((t) => t.item_id as string);
    if (!ids.length) { contas.push({ ...base, erro: null }); continue; }
    const { data: feitos } = await admin.from("ml_listing_improvements").select("item_id")
      .eq("account_id", accountId).in("item_id", ids).gte("verificado_em", inicioDia);
    const hoje = new Set((feitos ?? []).map((f) => f.item_id as string));
    const fila = ids.filter((id) => !hoje.has(id));
    if (!fila.length) { contas.push({ ...base, erro: null }); continue; }
    if (Date.now() - inicio > ORCAMENTO_MS) { contas.push({ ...base, pendentes: fila.length, erro: "Limite de tempo; segue na próxima execução." }); continue; }

    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) { contas.push({ ...base, pendentes: fila.length, erro: alvo.erro }); continue; }
    const cache: Cache = new Map();
    let analisados = 0, comIa = 0, erro: string | null = null;
    for (const itemId of fila) {
      if (Date.now() - inicio > ORCAMENTO_MS) break;
      const r = await analisar(admin, alvo.conta, alvo.token, itemId, { forcar: false, origem: "diario", userId: null, cache });
      if (!r.ok) { erro = r.erro; continue; }
      analisados++;
      if (r.status === "gerado") comIa++;
    }
    contas.push({ account_id: accountId, analisados, com_ia: comIa, pendentes: fila.length - analisados, erro });
  }
  return resposta({ contas });
});
