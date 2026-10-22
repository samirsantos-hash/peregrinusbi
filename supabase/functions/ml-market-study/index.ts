// ml-market-study
// Estudo de mercado a partir de um anúncio da conta: concorrentes no catálogo, preços (quartis),
// mais vendidos e termos em alta da categoria, tarifa do ML e margem opcional. Sinais por regras
// fixas (_shared/mlMercado.ts) e parecer da IA escrito só com esses números. Cada estudo é guardado.
// Só lê o Mercado Livre.
//
// Contrato
// POST JWT de quem gerencia a conta: { account_id, item_id, custo?: number, frete?: number }
//   200 { estudo }   estudo = linha de ml_market_studies
// 400 dados inválidos · 401 sem login · 403 conta ou anúncio de outra pessoa · 404 anúncio não encontrado
// 409 conta sem autorização · 502 o ML não respondeu
//
// Fonte: /items, /categories, /trends, /highlights, /products/search, /products/{id}/items,
// /items/{id}/price_to_win e /sites/{site}/listing_prices. Chamadas em sequência (em paralelo o ML devolve 429).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { chamarIa, MODELO_IA } from "../_shared/mlIa.ts";
import { semanaDe } from "../_shared/mlTendencias.ts";
import { gravarSemana } from "../_shared/mlTendenciasDb.ts";
import {
  avaliarFatores,
  calcularMargem,
  contarSinais,
  type Destaque,
  LIMITES_COLETA,
  lerCompeticao,
  lerDestaques,
  lerOfertas,
  lerPosicao,
  lerTarifa,
  lerTendencias,
  type Margem,
  montarPromptMercado,
  type Oferta,
  resumirConcorrencia,
  SCHEMA_PARECER,
  type Tendencia,
  validarParecer,
} from "../_shared/mlMercado.ts";

const API = "https://api.mercadolibre.com";
/** Depois disso a coleta para de buscar detalhes opcionais e segue para a IA. */
const ORCAMENTO_COLETA_MS = 40_000;

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function lerValor(v: unknown): number | null | "invalido" {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return "invalido";
  return Math.round(n * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();
  const noPrazo = () => Date.now() - inicio < ORCAMENTO_COLETA_MS;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const acesso = await exigirGestor(req, body.account_id);
  if (!acesso.ok) return acesso.res;
  const itemId = typeof body.item_id === "string" && /^[A-Z]{3}\d+$/.test(body.item_id) ? body.item_id : null;
  if (!itemId) return resposta({ error: "Anúncio inválido." }, 400);
  const custo = lerValor(body.custo), frete = lerValor(body.frete);
  if (custo === "invalido" || frete === "invalido") return resposta({ error: "Custo e frete devem ser valores em reais, maiores ou iguais a zero." }, 400);

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const alvo = await contaComToken(admin, body.account_id as string);
  if (!alvo.ok) return resposta({ error: alvo.erro }, 409);
  const { conta, token } = alvo;
  const site = conta.site_id || "MLB";
  const meuSeller = Number(conta.ml_user_id);
  const avisos: string[] = [];

  // Anúncio de partida
  const it = await buscarMl(`${API}/items/${itemId}?include_attributes=all`, token);
  if (!it.ok) return resposta({ error: it.erro }, it.status === 404 ? 404 : 502);
  const item = it.json as Record<string, unknown>;
  if (item.seller_id !== meuSeller) return resposta({ error: "Este anúncio não é desta conta." }, 403);
  const titulo = txt(item.title) ?? itemId;
  const categoriaId = txt(item.category_id);
  const tipoAnuncio = txt(item.listing_type_id);
  const envio = (item.shipping ?? {}) as Record<string, unknown>;
  const logistica = txt(envio.logistic_type);
  const meu = {
    preco: typeof item.price === "number" ? item.price : null,
    full: logistica === "fulfillment",
    frete_gratis: envio.free_shipping === true,
    loja_oficial: item.official_store_id != null,
    catalogo: item.catalog_listing === true,
  };
  const atributos = (Array.isArray(item.attributes) ? item.attributes : []) as Record<string, unknown>[];
  const gtin = txt(atributos.find((a) => a.id === "GTIN")?.value_name)?.split(/[,;\s]+/)[0] ?? null;
  const produtoDoAnuncio = txt(item.catalog_product_id);

  // Categoria
  let categoria: { id: string; nome: string | null; caminho: { id: string; nome: string }[] } | null = null;
  if (categoriaId) {
    const c = await buscarMl(`${API}/categories/${categoriaId}`, token);
    const cj = c.ok ? c.json as Record<string, unknown> : {};
    const caminho = (Array.isArray(cj.path_from_root) ? cj.path_from_root : []) as Record<string, unknown>[];
    categoria = {
      id: categoriaId,
      nome: txt(cj.name),
      caminho: caminho.flatMap((p) => txt(p.id) ? [{ id: txt(p.id)!, nome: txt(p.name) ?? "" }] : []),
    };
  }

  // Termos em alta: categoria do anúncio (sobe até 2 níveis se vier vazia) e o site todo
  let tendenciasCategoria: Tendencia[] = [];
  let tendenciasDe: { id: string; nome: string | null } | null = null;
  if (categoria) {
    const subindo = [...categoria.caminho].reverse().slice(0, 3);
    if (!subindo.length) subindo.push({ id: categoria.id, nome: categoria.nome ?? "" });
    for (const cat of subindo) {
      const t = await buscarMl(`${API}/trends/${site}/${cat.id}`, token);
      const lidas = t.ok ? lerTendencias(t.json, titulo) : [];
      if (lidas.length) { tendenciasCategoria = lidas; tendenciasDe = { id: cat.id, nome: cat.nome || null }; break; }
    }
  }
  const ts = await buscarMl(`${API}/trends/${site}`, token);
  const tendenciasSite = ts.ok ? lerTendencias(ts.json, titulo) : [];
  if (!ts.ok) avisos.push(`Termos em alta do site: ${ts.erro}`);
  const semana = semanaDe();
  if (tendenciasDe) await gravarSemana(admin, tendenciasDe.id, semana, tendenciasCategoria, tendenciasDe.nome);
  if (tendenciasSite.length) await gravarSemana(admin, site, semana, tendenciasSite, site === "MLB" ? "Mercado Livre Brasil" : site);

  // Produtos de catálogo para comparar
  type Produto = { id: string; nome: string | null; correspondencia: "anuncio" | "gtin" | "busca"; ofertas_total: number | null };
  const produtos: Produto[] = [];
  if (produtoDoAnuncio) {
    const p = await buscarMl(`${API}/products/${produtoDoAnuncio}`, token);
    produtos.push({ id: produtoDoAnuncio, nome: p.ok ? txt((p.json as Record<string, unknown>).name) : null, correspondencia: "anuncio", ofertas_total: null });
  } else {
    const params = new URLSearchParams({ status: "active", site_id: site });
    if (gtin) params.set("product_identifier", gtin);
    else {
      params.set("q", titulo);
      const dominio = txt(item.domain_id);
      if (dominio) params.set("domain_id", dominio);
    }
    const s = await buscarMl(`${API}/products/search?${params}`, token);
    if (!s.ok) avisos.push(`Busca no catálogo: ${s.erro}`);
    const resultados = s.ok ? ((s.json as { results?: unknown }).results ?? []) as Record<string, unknown>[] : [];
    for (const r of resultados.slice(0, LIMITES_COLETA.produtos)) {
      const id = txt(r.id);
      if (id) produtos.push({ id, nome: txt(r.name), correspondencia: gtin ? "gtin" : "busca", ofertas_total: null });
    }
  }

  // Ofertas de cada produto (100 por página)
  const ofertas: Oferta[] = [];
  for (const p of produtos) {
    let offset = 0;
    while (offset < LIMITES_COLETA.ofertasPorProduto && noPrazo()) {
      const r = await buscarMl(`${API}/products/${p.id}/items${offset ? `?offset=${offset}` : ""}`, token);
      if (!r.ok) {
        if (r.status !== 404) avisos.push(`Ofertas do produto ${p.id}: ${r.erro}`);
        break;
      }
      const lidas = lerOfertas(r.json, p.id);
      p.ofertas_total = lidas.total ?? p.ofertas_total;
      ofertas.push(...lidas.ofertas);
      offset += lidas.ofertas.length;
      if (!lidas.ofertas.length || lidas.total == null || offset >= lidas.total) break;
    }
  }
  const unicas = [...new Map(ofertas.map((o) => [o.item_id, o])).values()].sort((a, b) => a.preco - b.preco);
  const concorrencia = resumirConcorrencia(unicas, meuSeller);

  // Competição no catálogo
  let competicao: ReturnType<typeof lerCompeticao> = null;
  if (meu.catalogo) {
    const c = await buscarMl(`${API}/items/${itemId}/price_to_win?siteId=${site}&version=v2`, token);
    competicao = c.ok ? lerCompeticao(c.json) : null;
    if (!c.ok) avisos.push(`Competição no catálogo: ${c.erro}`);
  }

  // Mais vendidos
  let destaques: Destaque[] = [];
  let categoriaTemDestaques = false;
  if (categoriaId) {
    const h = await buscarMl(`${API}/highlights/${site}/category/${categoriaId}`, token);
    destaques = h.ok ? lerDestaques(h.json) : [];
    categoriaTemDestaques = destaques.length > 0;
  }
  const hi = await buscarMl(`${API}/highlights/${site}/item/${itemId}`, token);
  const minhaPosicao = hi.ok ? lerPosicao(hi.json) : null;
  let produtoPosicao: number | null = null;
  if (produtoDoAnuncio) {
    const hp = await buscarMl(`${API}/highlights/${site}/product/${produtoDoAnuncio}`, token);
    produtoPosicao = hp.ok ? lerPosicao(hp.json) : null;
  }
  const comNome = destaques.slice(0, LIMITES_COLETA.destaquesComNome);
  const idsItens = comNome.filter((d) => d.tipo === "ITEM").map((d) => d.id);
  if (idsItens.length && noPrazo()) {
    const r = await buscarMl(`${API}/items?ids=${idsItens.join(",")}&attributes=id,title,price`, token);
    for (const linha of (r.ok && Array.isArray(r.json) ? r.json : []) as { code?: number; body?: Record<string, unknown> }[]) {
      const d = comNome.find((x) => x.id === linha.body?.id);
      if (d && linha.code === 200) { d.nome = txt(linha.body?.title); d.preco = typeof linha.body?.price === "number" ? linha.body.price : null; }
    }
  }
  for (const d of comNome.filter((x) => x.tipo === "PRODUCT")) {
    if (!noPrazo()) break;
    const p = await buscarMl(`${API}/products/${d.id}`, token);
    if (!p.ok) continue;
    const pj = p.json as Record<string, unknown>;
    d.nome = txt(pj.name);
    const bbw = pj.buy_box_winner as Record<string, unknown> | null | undefined;
    d.preco = typeof bbw?.price === "number" ? bbw.price : null;
  }
  for (const d of destaques) d.seu = d.id === itemId || (produtoDoAnuncio != null && d.id === produtoDoAnuncio);

  // Tarifa e margem
  const tarifaEm = async (preco: number) => {
    if (!categoriaId || !tipoAnuncio) return null;
    const q = new URLSearchParams({ price: String(preco), category_id: categoriaId, listing_type_id: tipoAnuncio, currency_id: txt(item.currency_id) ?? "BRL" });
    if (logistica) q.set("logistic_type", logistica);
    const modo = txt(envio.mode);
    if (modo) q.set("shipping_mode", modo);
    const r = await buscarMl(`${API}/sites/${site}/listing_prices?${q}`, token);
    if (!r.ok) avisos.push(`Tarifa do ML: ${r.erro}`);
    return r.ok ? lerTarifa(r.json, tipoAnuncio) : null;
  };
  const tarifaMeu = meu.preco != null ? await tarifaEm(meu.preco) : null;
  const medianaConc = concorrencia.precos?.mediana ?? null;
  const tarifaMediana = medianaConc != null ? await tarifaEm(medianaConc) : null;
  let margem: Margem | null = null, margemNaMediana: Margem | null = null;
  if (custo != null) {
    if (meu.preco != null && tarifaMeu) margem = calcularMargem(meu.preco, tarifaMeu.valor, custo, frete ?? 0);
    if (medianaConc != null && tarifaMediana) margemNaMediana = calcularMargem(medianaConc, tarifaMediana.valor, custo, frete ?? 0);
    if (!margem) avisos.push("Margem não calculada: o ML não informou a tarifa de venda.");
  }
  const { data: config } = await admin.from("ml_settings").select("margem_minima").eq("account_id", conta.id).maybeSingle();
  const margemMinima = config?.margem_minima != null ? Number(config.margem_minima) : null;

  const fatores = avaliarFatores({
    produtosEncontrados: produtos.length,
    concorrencia,
    meu,
    competicao,
    destaques: { categoriaTem: categoriaTemDestaques, minhaPosicao, produtoPosicao },
    tendenciasRelacionadas: tendenciasCategoria.filter((t) => t.relacionada).length,
    tendenciasTotal: tendenciasCategoria.length,
    margem,
    margemMinima,
  });
  const sinais = contarSinais(fatores);

  const resultado = {
    anuncio: { item_id: itemId, titulo, preco: meu.preco, tipo_anuncio: tipoAnuncio, logistica, ...meu, gtin, catalog_product_id: produtoDoAnuncio, permalink: txt(item.permalink), thumbnail: txt(item.thumbnail) },
    categoria,
    produtos,
    concorrencia,
    ofertas: unicas.filter((o) => o.seller_id !== meuSeller).slice(0, LIMITES_COLETA.ofertasGuardadas),
    competicao,
    destaques: { categoria: destaques, minha_posicao: minhaPosicao, produto_posicao: produtoPosicao },
    tendencias: { categoria: tendenciasCategoria, categoria_de: tendenciasDe, site: tendenciasSite },
    tarifa: { no_seu_preco: tarifaMeu, na_mediana: tarifaMediana },
    margem: custo != null ? { seu_preco: margem, mediana: margemNaMediana, minima_conta: margemMinima } : null,
    fatores,
    avisos,
  };

  const fatos = {
    anuncio: { titulo, preco: meu.preco, tipo_anuncio: tipoAnuncio, full: meu.full, frete_gratis: meu.frete_gratis, catalogo: meu.catalogo },
    categoria: categoria?.nome ?? null,
    produtos_comparados: produtos.map((p) => ({ nome: p.nome, correspondencia: p.correspondencia })),
    concorrencia,
    competicao_catalogo: competicao,
    mais_vendidos: { sua_posicao: minhaPosicao, posicao_do_produto: produtoPosicao, categoria_tem_lista: categoriaTemDestaques },
    termos_em_alta_ligados_ao_titulo: tendenciasCategoria.filter((t) => t.relacionada).map((t) => t.palavra),
    termos_em_alta_da_categoria: tendenciasCategoria.slice(0, 10).map((t) => t.palavra),
    tarifa_ml_no_seu_preco: tarifaMeu,
    margem_no_seu_preco: margem,
    margem_na_mediana_dos_concorrentes: margemNaMediana,
    fatores: fatores.map((f) => ({ fator: f.nome, sinal: f.sinal, medido: f.medido })),
  };
  const ia = await chamarIa(montarPromptMercado(fatos), "estudo_mercado", SCHEMA_PARECER);
  const parecer = ia.ok ? validarParecer(ia.json) : null;

  const { data, error } = await admin.from("ml_market_studies").insert({
    account_id: conta.id,
    item_id: itemId,
    titulo,
    categoria_id: categoriaId,
    categoria_nome: categoria?.nome ?? null,
    custo,
    frete,
    resultado,
    ia: parecer,
    erro_ia: parecer ? null : ia.ok ? "A IA devolveu uma resposta fora do formato." : ia.erro,
    modelo: MODELO_IA,
    sinais_verdes: sinais.verdes,
    sinais_amarelos: sinais.amarelos,
    sinais_vermelhos: sinais.vermelhos,
    criado_por: acesso.userId,
  }).select("*").single();
  if (error) {
    console.error("ml-market-study", error.message);
    return resposta({ error: "Não foi possível guardar o estudo." }, 500);
  }
  return resposta({ estudo: data });
});
