import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { requireEnv } from '../_shared/env.ts';
import { tokenAtual } from '../_shared/mlTokenAtual.ts';
import { janelaAnalise, projetarPedidos } from '../_shared/mlAnaliseLoja.ts';
import { lerQualidade } from '../_shared/mlMelhorias.ts';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const user = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: auth } = await user.auth.getUser();
  if (!auth.user) return json({ error: 'Faça login.' }, 401);
  const body = z.object({ cust_id: z.string().regex(/^\d+$/), modo: z.enum(['resumo', 'full']) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: 'Informe loja e análise válidas.' }, 400);
  const { cust_id, modo } = body.data;
  // Reuse existing store visibility; developer status does not grant business access.
  const { data: vis, error: visError } = await user.from('ml_sync_tema').select('account_id').eq('cust_id', cust_id).limit(1);
  if (visError || !vis?.length) return json({ error: 'Loja sem conexão disponível na sua carteira.' }, 403);
  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: conta } = await db.from('ml_accounts').select('id').eq('id', vis[0].account_id).eq('status', 'active').maybeSingle();
  if (!conta) return json({ error: 'Loja não conectada.' }, 404);
  const token = await tokenAtual(db, conta.id);
  if (!token?.access_token) return json({ error: 'Autorização indisponível.' }, 409);
  const access = token.access_token, started = Date.now();
  async function get(path: string): Promise<any> {
    if (Date.now() - started > 95_000) throw new Error('Consulta incompleta; tente novamente.');
    const r = await fetch('https://api.mercadolibre.com' + path, { headers: { Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('O Mercado Livre não disponibilizou todos os dados desta análise.');
    return r.json();
  }
  try {
    const periodo = janelaAnalise(), completo = janelaAnalise(new Date(), modo === 'resumo' ? 60 : 30);
    const orders: any[] = [];
    let total = Infinity;
    for (let off = 0; off < 1000; off += 50) {
      const page = await get(`/orders/search?seller=${cust_id}&order.date_created.from=${encodeURIComponent(completo.inicio + 'T00:00:00.000Z')}&order.date_created.to=${encodeURIComponent(completo.fim + 'T23:59:59.999Z')}&limit=50&offset=${off}`);
      if (!Array.isArray(page.results) || !Number.isFinite(page.paging?.total)) throw new Error('Cobertura de pedidos não confirmada.');
      orders.push(...page.results); total = page.paging.total;
      if (orders.length >= total) break;
    }
    if (orders.length < total) return json({ error: 'Há mais de 1.000 pedidos no período; análise suspensa para não apresentar totais parciais.' }, 422);
    const atual = projetarPedidos(orders, periodo.inicio, periodo.fim);
    if (modo === 'resumo') {
      const anteriorFim = new Date(Date.parse(periodo.inicio) - 864e5).toISOString().slice(0, 10);
      const anterior = projetarPedidos(orders, completo.inicio, anteriorFim);
      let visits: any = null;
      try { visits = await get(`/users/${cust_id}/items_visits/time_window?last=60&unit=day`); } catch { /* unknown stays null */ }
      const map = new Map<string, number>();
      for (const r of visits?.results ?? []) if (typeof r.total === 'number') map.set(String(r.date).slice(0, 10), r.total);
      const enrich = (p: ReturnType<typeof projetarPedidos>) => {
        const covered = p.serie.every(r => map.has(r.data));
        const visitas = covered ? p.serie.reduce((s, r) => s + (map.get(r.data) ?? 0), 0) : null;
        const { itens: _, ...clean } = p;
        return { ...clean, visitas, conversao: visitas != null && visitas > 0 ? p.pedidos / visitas : null };
      };
      return json({ periodo, anteriorPeriodo: { inicio: completo.inicio, fim: anteriorFim }, atual: enrich(atual), anterior: enrich(anterior), consultadoEm: new Date().toISOString() });
    }
    // Candidate universe is actual paid demand, never lifetime sold_quantity.
    const ranked = [...atual.itens].sort((a, b) => b.faturamento - a.faturamento);
    const candidates: any[] = [];
    for (let off = 0; off < ranked.length && candidates.length < 20; off += 20) {
      const ids = ranked.slice(off, off + 20).map(i => i.id);
      const items = await get(`/items?ids=${ids.join(',')}`);
      for (const entry of items) {
        const item = entry.body;
        if (entry.code !== 200 || String(item?.seller_id) !== cust_id) continue;
        if (item.shipping?.logistic_type === 'fulfillment') continue;
        const demand = atual.itens.find(i => i.id === item.id);
        if (!demand) continue;
        let qualidade: any = null;
        try { qualidade = lerQualidade(await get(`/item/${item.id}/performance`)); } catch { /* unknown */ }
        // Original dimensions only; thumbnails do not prove low resolution.
        const fotos = (item.pictures ?? []).map((p: any) => {
          const m = typeof p.max_size === 'string' ? p.max_size.match(/^(\d+)x(\d+)$/) : null;
          return m ? { largura: Number(m[1]), altura: Number(m[2]) } : { largura: null, altura: null };
        });
        candidates.push({ id: item.id, titulo: item.title, sku: item.seller_custom_field ?? null, link: item.permalink, foto: item.thumbnail ?? null, estoque: typeof item.available_quantity === 'number' ? item.available_quantity : null, status: item.status, saude: typeof item.health === 'number' ? item.health : null, qualidade, fotos, unidades: demand.unidades, faturamento: demand.faturamento, diario: atual.serie.map(d => ({ data: d.data, faturamento: demand.diario[d.data] ?? 0 })) });
        if (candidates.length === 20) break;
      }
    }
    return json({ periodo, candidatos: candidates, universoVendido: ranked.length, limite: 20, consultadoEm: new Date().toISOString(), elegibilidadeFull: null });
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'Leitura indisponível.' }, 502); }
});