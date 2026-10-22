// ml-trends-sync
// Guarda os termos em alta da semana (/trends) do Brasil e das categorias mais vendidas de cada conta,
// para comparar semana a semana. O ML só devolve a semana atual: 50 termos, sem volume de busca.
//
// Contrato
// POST JWT de quem gerencia a conta: { account_id }   coleta o Brasil e as categorias desta conta
// POST x-refresh-secret (cron diário): { account_id? } todas as contas ativas
//   só busca o que ainda não foi coletado nesta semana (segunda a domingo, São Paulo)
//   200 { semana, coletados, ja_coletados, pendentes, erros: string[] }
// 401 sem login · 403 conta de outra pessoa · 409 conta sem autorização
//
// Fonte: /trends/{site}, /trends/{site}/{categoria} e /categories/{id} (path_from_root).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { lerTendencias } from "../_shared/mlMercado.ts";
import { cadeiaDeCategorias, DIAS_MAPA_VALIDO, semanaDe, topCategorias } from "../_shared/mlTendencias.ts";
import { gravarSemana } from "../_shared/mlTendenciasDb.ts";

const API = "https://api.mercadolibre.com";
const ORCAMENTO_MS = 100_000;

type Placar = { coletados: number; ja_coletados: number; pendentes: number; erros: string[] };

async function jaColetado(admin: SupabaseClient, escopo: string, semana: string) {
  const { data } = await admin.from("ml_trends_coletas").select("escopo").eq("escopo", escopo).eq("semana", semana).maybeSingle();
  return !!data;
}

async function coletar(admin: SupabaseClient, token: string, escopo: string, nome: string | null, semana: string, p: Placar) {
  if (await jaColetado(admin, escopo, semana)) { p.ja_coletados++; return; }
  const url = escopo.match(/^[A-Z]{3}$/) ? `${API}/trends/${escopo}` : `${API}/trends/${escopo.slice(0, 3)}/${escopo}`;
  const r = await buscarMl(url, token);
  if (!r.ok && r.status !== 404) { p.erros.push(`${nome ?? escopo}: ${r.erro}`); return; }
  const erro = await gravarSemana(admin, escopo, semana, r.ok ? lerTendencias(r.json, "") : [], nome);
  if (erro) p.erros.push(`${nome ?? escopo}: não foi possível guardar.`);
  else p.coletados++;
}

/** Acha, para cada categoria, a categoria (ela ou até 2 acima) que tem termos em alta, e guarda o mapa. */
async function escopoDaCategoria(admin: SupabaseClient, token: string, categoriaId: string, semana: string, p: Placar) {
  const limite = new Date(Date.now() - DIAS_MAPA_VALIDO * 86400_000).toISOString();
  const { data: mapa } = await admin.from("ml_trend_categorias").select("escopo_id, escopo_nome, verificado_em")
    .eq("category_id", categoriaId).maybeSingle();
  if (mapa && mapa.verificado_em >= limite) {
    return mapa.escopo_id ? { id: mapa.escopo_id as string, nome: mapa.escopo_nome as string | null, lido: false } : null;
  }

  const c = await buscarMl(`${API}/categories/${categoriaId}`, token);
  if (!c.ok) { p.erros.push(`Categoria ${categoriaId}: ${c.erro}`); return null; }
  const cj = c.json as Record<string, unknown>;
  const caminho = (Array.isArray(cj.path_from_root) ? cj.path_from_root : []) as { id?: unknown; name?: unknown }[];
  const cadeia = cadeiaDeCategorias(categoriaId, caminho.flatMap((x) => typeof x.id === "string" ? [{ id: x.id, nome: typeof x.name === "string" ? x.name : "" }] : []));

  let achado: { id: string; nome: string | null; lido: boolean } | null = null;
  for (const cat of cadeia) {
    const t = await buscarMl(`${API}/trends/${categoriaId.slice(0, 3)}/${cat.id}`, token);
    if (!t.ok && t.status !== 404) { p.erros.push(`${cat.nome || cat.id}: ${t.erro}`); return null; }
    const termos = t.ok ? lerTendencias(t.json, "") : [];
    if (termos.length) {
      achado = { id: cat.id, nome: cat.nome || null, lido: true };
      if (!(await jaColetado(admin, cat.id, semana))) {
        const erro = await gravarSemana(admin, cat.id, semana, termos, achado.nome);
        if (erro) p.erros.push(`${cat.nome || cat.id}: não foi possível guardar.`);
        else p.coletados++;
      } else p.ja_coletados++;
      break;
    }
  }
  await admin.from("ml_trend_categorias").upsert({
    category_id: categoriaId,
    nome: typeof cj.name === "string" ? cj.name : null,
    escopo_id: achado?.id ?? null,
    escopo_nome: achado?.nome ?? null,
    verificado_em: new Date().toISOString(),
  });
  return achado;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();
  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string };
  const cron = segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"));

  let contas: string[];
  if (cron) {
    let q = admin.from("ml_accounts").select("id").eq("status", "active");
    if (body.account_id) q = q.eq("id", body.account_id);
    const { data } = await q;
    contas = (data ?? []).map((c) => c.id as string);
  } else {
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return acesso.res;
    contas = [body.account_id as string];
  }

  const semana = semanaDe();
  const p: Placar = { coletados: 0, ja_coletados: 0, pendentes: 0, erros: [] };
  const sites = new Set<string>();

  for (const accountId of contas) {
    if (Date.now() - inicio > ORCAMENTO_MS) { p.pendentes++; continue; }
    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) {
      if (!cron) return resposta({ error: alvo.erro }, 409);
      p.erros.push(alvo.erro);
      continue;
    }
    const site = alvo.conta.site_id || "MLB";
    if (!sites.has(site)) {
      sites.add(site);
      await coletar(admin, alvo.token, site, site === "MLB" ? "Mercado Livre Brasil" : site, semana, p);
    }

    const { data: linhas } = await admin.from("ml_listings").select("categoria_id, vendidos")
      .eq("account_id", accountId).eq("status", "active").not("categoria_id", "is", null).limit(5000);
    for (const categoriaId of topCategorias(linhas ?? [])) {
      if (Date.now() - inicio > ORCAMENTO_MS) { p.pendentes++; continue; }
      const escopo = await escopoDaCategoria(admin, alvo.token, categoriaId, semana, p);
      if (escopo && !escopo.lido) await coletar(admin, alvo.token, escopo.id, escopo.nome, semana, p);
    }
  }
  return resposta({ semana, ...p });
});
