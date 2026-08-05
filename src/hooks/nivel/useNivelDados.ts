import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContextoNavegacao } from "@/contexts/ContextoNavegacao";
import { mesParaId, ordenarPorUrgencia, statusPorMeta, type ItemFilho } from "@/lib/navegacao/tipos";
import type { StatusOkr } from "@/types/programas";

interface KpiLoja {
  seller_id: string;
  tim_month_id: number | null;
  tgmv_lc: number | null;
  f_tgmv_lc: number | null;
}

function usePeriodoIds() {
  const { periodo } = useContextoNavegacao();
  return { ini: mesParaId(periodo.inicio), fim: mesParaId(periodo.fim) };
}

async function carregarKpis(sellerIds: string[], ini: number, fim: number) {
  if (!sellerIds.length) return [] as KpiLoja[];
  const out: KpiLoja[] = [];
  const passo = 200;
  for (let i = 0; i < sellerIds.length; i += passo) {
    const { data } = await supabase
      .from("sellers_kpi")
      .select("seller_id, tim_month_id, tgmv_lc, f_tgmv_lc")
      .in("seller_id", sellerIds.slice(i, i + passo))
      .gte("tim_month_id", ini)
      .lte("tim_month_id", fim);
    out.push(...((data || []) as KpiLoja[]));
  }
  return out;
}

function agregarPorLoja(kpis: KpiLoja[]) {
  const mapa = new Map<string, { total: number | null; meta: number | null; serie: Map<number, number> }>();
  for (const k of kpis) {
    const atual = mapa.get(k.seller_id) ?? { total: null, meta: null, serie: new Map<number, number>() };
    if (k.tgmv_lc !== null) atual.total = (atual.total ?? 0) + Number(k.tgmv_lc);
    if (k.f_tgmv_lc !== null) atual.meta = (atual.meta ?? 0) + Number(k.f_tgmv_lc);
    if (k.tim_month_id) atual.serie.set(k.tim_month_id, (atual.serie.get(k.tim_month_id) ?? 0) + Number(k.tgmv_lc ?? 0));
    mapa.set(k.seller_id, atual);
  }
  return mapa;
}

function serieOrdenada(serie?: Map<number, number>) {
  if (!serie) return [];
  return [...serie.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([periodo, valor]) => ({ periodo: String(periodo), valor }));
}

/** L0 — carteira: filhos são os grupos econômicos. */
export function useNivel0() {
  const { ini, fim } = usePeriodoIds();
  return useQuery({
    queryKey: ["nivel0", ini, fim],
    queryFn: async () => {
      const [{ data: grupos }, { data: lojas }] = await Promise.all([
        supabase.from("grupos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("sellers").select("id, nickname, grupo_id"),
      ]);
      const todasLojas = lojas || [];
      const kpis = await carregarKpis(todasLojas.map((l) => l.id), ini, fim);
      const porLoja = agregarPorLoja(kpis);

      const construir = (id: string, nome: string, membros: typeof todasLojas): ItemFilho => {
        let total: number | null = null;
        let meta: number | null = null;
        const serie = new Map<number, number>();
        for (const l of membros) {
          const ag = porLoja.get(l.id);
          if (!ag) continue;
          if (ag.total !== null) total = (total ?? 0) + ag.total;
          if (ag.meta !== null) meta = (meta ?? 0) + ag.meta;
          ag.serie.forEach((v, k) => serie.set(k, (serie.get(k) ?? 0) + v));
        }
        const status = statusPorMeta(total, meta);
        return {
          id,
          nome,
          status,
          valor: total,
          unidade: "BRL",
          gap: total !== null && meta !== null ? total - meta : null,
          serie: serieOrdenada(serie),
          acao: status === "critico" ? "Priorizar grupo" : "Abrir grupo",
          destino: `/grupos/${id}`,
        };
      };

      const itens: ItemFilho[] = (grupos || []).map((g) =>
        construir(g.id, g.nome, todasLojas.filter((l) => l.grupo_id === g.id)),
      );
      const semGrupo = todasLojas.filter((l) => !l.grupo_id);
      if (semGrupo.length) itens.push(construir("sem-grupo", "Lojas sem grupo", semGrupo));

      const lojasEmRisco = todasLojas.filter((l) => {
        const ag = porLoja.get(l.id);
        return statusPorMeta(ag?.total ?? null, ag?.meta ?? null) === "critico";
      }).length;

      const gmvTotal = [...porLoja.values()].reduce((s, a) => s + (a.total ?? 0), 0);
      const metaTotal = [...porLoja.values()].reduce((s, a) => s + (a.meta ?? 0), 0);

      return {
        itens: ordenarPorUrgencia(itens),
        heroi: lojasEmRisco,
        kpis: {
          grupos: (grupos || []).length,
          lojas: todasLojas.length,
          gmv: gmvTotal || null,
          meta: metaTotal || null,
        },
        comDado: [...porLoja.keys()].length,
        totalFilhos: todasLojas.length,
      };
    },
  });
}

/** L1 — grupo: filhos são as lojas. */
export function useNivel1(grupoId: string) {
  const { ini, fim } = usePeriodoIds();
  return useQuery({
    queryKey: ["nivel1", grupoId, ini, fim],
    enabled: !!grupoId,
    queryFn: async () => {
      const [{ data: grupo }, lojasRes] = await Promise.all([
        grupoId === "sem-grupo"
          ? Promise.resolve({ data: { id: "sem-grupo", nome: "Lojas sem grupo" } as any })
          : supabase.from("grupos").select("id, nome").eq("id", grupoId).maybeSingle(),
        grupoId === "sem-grupo"
          ? supabase.from("sellers").select("id, nickname, grupo_id").is("grupo_id", null).order("nickname")
          : supabase.from("sellers").select("id, nickname, grupo_id").eq("grupo_id", grupoId).order("nickname"),
      ]);
      const lojas = lojasRes.data || [];
      const kpis = await carregarKpis(lojas.map((l) => l.id), ini, fim);
      const porLoja = agregarPorLoja(kpis);

      const itens: ItemFilho[] = lojas.map((l) => {
        const ag = porLoja.get(l.id);
        const status = statusPorMeta(ag?.total ?? null, ag?.meta ?? null);
        return {
          id: l.id,
          nome: l.nickname || "—",
          status,
          valor: ag?.total ?? null,
          unidade: "BRL",
          gap: ag && ag.total !== null && ag.meta !== null ? ag.total - ag.meta : null,
          serie: serieOrdenada(ag?.serie),
          acao: status === "critico" ? "Diagnosticar loja" : "Abrir loja",
          destino: `/lojas/${l.id}`,
        };
      });

      const gmv = [...porLoja.values()].reduce((s, a) => s + (a.total ?? 0), 0);
      const meta = [...porLoja.values()].reduce((s, a) => s + (a.meta ?? 0), 0);

      return {
        nome: (grupo as any)?.nome || "Grupo",
        itens: ordenarPorUrgencia(itens),
        heroi: gmv || null,
        meta: meta || null,
        kpis: { lojas: lojas.length, criticas: itens.filter((i) => i.status === "critico").length },
        comDado: porLoja.size,
        totalFilhos: lojas.length,
      };
    },
  });
}

/** L2 — loja: filhos são os programas contratados. */
export function useNivel2(lojaId: string) {
  const { ini, fim } = usePeriodoIds();
  return useQuery({
    queryKey: ["nivel2", lojaId, ini, fim],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data: loja } = await supabase
        .from("sellers")
        .select("id, nickname, cust_id, grupo_id, vertical_dominant")
        .eq("id", lojaId)
        .maybeSingle();
      if (!loja) throw new Error("Loja não encontrada");

      const [{ data: kpis }, { data: cpp }] = await Promise.all([
        supabase
          .from("sellers_kpi")
          .select("tim_month_id, tgmv_lc, f_tgmv_lc, tsi, rep_claims_rate, score_final_full")
          .eq("seller_id", lojaId)
          .gte("tim_month_id", ini)
          .lte("tim_month_id", fim)
          .order("tim_month_id"),
        supabase
          .from("cpp_mensal")
          .select("programa, nombre_solucion, tim_month_id, tgmv_lc, f_tgmv_lc")
          .eq("cust_id_text", String(loja.cust_id))
          .gte("tim_month_id", ini)
          .lte("tim_month_id", fim),
      ]);

      const linhas = kpis || [];
      const gmv = linhas.reduce((s, r) => s + Number(r.tgmv_lc ?? 0), 0);
      const meta = linhas.reduce((s, r) => s + Number(r.f_tgmv_lc ?? 0), 0);
      const tsi = linhas.reduce((s, r) => s + Number(r.tsi ?? 0), 0);
      const ultimo = linhas[linhas.length - 1];

      const porPrograma = new Map<string, { nome: string; gmv: number; meta: number; serie: Map<number, number> }>();
      for (const r of cpp || []) {
        const chave = (r.programa || "sem_programa").toString();
        const atual = porPrograma.get(chave) ?? {
          nome: r.nombre_solucion || r.programa || "Programa",
          gmv: 0,
          meta: 0,
          serie: new Map<number, number>(),
        };
        atual.gmv += Number(r.tgmv_lc ?? 0);
        atual.meta += Number(r.f_tgmv_lc ?? 0);
        if (r.tim_month_id) atual.serie.set(r.tim_month_id, (atual.serie.get(r.tim_month_id) ?? 0) + Number(r.tgmv_lc ?? 0));
        porPrograma.set(chave, atual);
      }

      const itens: ItemFilho[] = [...porPrograma.entries()].map(([id, p]) => {
        const status = statusPorMeta(p.gmv || null, p.meta || null);
        return {
          id,
          nome: p.nome,
          status,
          valor: p.gmv || null,
          unidade: "BRL",
          gap: p.meta ? p.gmv - p.meta : null,
          serie: serieOrdenada(p.serie),
          acao: status === "critico" ? "Corrigir programa" : "Abrir programa",
          destino: `/lojas/${lojaId}/programas?programa=${encodeURIComponent(id)}`,
        };
      });

      return {
        loja,
        itens: ordenarPorUrgencia(itens),
        heroi: gmv || null,
        meta: meta || null,
        status: statusPorMeta(gmv || null, meta || null) as StatusOkr,
        kpis: {
          tsi: tsi || null,
          reputacao: ultimo?.rep_claims_rate != null ? Number(ultimo.rep_claims_rate) * 100 : null,
          scoreFull: ultimo?.score_final_full != null ? Number(ultimo.score_final_full) : null,
        },
        comDado: linhas.length,
        totalFilhos: porPrograma.size,
      };
    },
  });
}

/** L3 — programa: filhos são as categorias com estoque/anúncios. */
export function useNivel3(lojaId: string, programaId: string | null) {
  const { ini, fim } = usePeriodoIds();
  return useQuery({
    queryKey: ["nivel3", lojaId, programaId, ini, fim],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data: loja } = await supabase
        .from("sellers")
        .select("id, nickname, cust_id")
        .eq("id", lojaId)
        .maybeSingle();

      const [{ data: cpp }, { data: listings }, { data: eleg }] = await Promise.all([
        supabase
          .from("cpp_mensal")
          .select("programa, nombre_solucion, tgmv_lc, f_tgmv_lc")
          .eq("cust_id_text", String(loja?.cust_id ?? ""))
          .gte("tim_month_id", ini)
          .lte("tim_month_id", fim),
        supabase
          .from("live_listings")
          .select("dom_domain_agg1, categoria, itens, data")
          .eq("seller_id", lojaId)
          .order("data", { ascending: false })
          .limit(4000),
        supabase
          .from("seller_eligibility")
          .select("dom_domain_agg1, item_id, pedidos_7d, discount_best, discount_total, flag_best_promo")
          .eq("seller_id", lojaId)
          .limit(5000),
      ]);

      const doPrograma = (cpp || []).filter((r) => !programaId || String(r.programa) === programaId);
      const gmv = doPrograma.reduce((s, r) => s + Number(r.tgmv_lc ?? 0), 0);
      const meta = doPrograma.reduce((s, r) => s + Number(r.f_tgmv_lc ?? 0), 0);

      const cat = new Map<string, { itens: number; cobertos: number; pedidos: number }>();
      for (const l of listings || []) {
        const chave = l.dom_domain_agg1 || l.categoria || "Sem categoria";
        const atual = cat.get(chave) ?? { itens: 0, cobertos: 0, pedidos: 0 };
        atual.itens += Number(l.itens ?? 0);
        cat.set(chave, atual);
      }
      for (const e of eleg || []) {
        const chave = e.dom_domain_agg1 || "Sem categoria";
        const atual = cat.get(chave) ?? { itens: 0, cobertos: 0, pedidos: 0 };
        if (e.flag_best_promo) atual.cobertos += 1;
        atual.pedidos += Number(e.pedidos_7d ?? 0);
        cat.set(chave, atual);
      }

      const itens: ItemFilho[] = [...cat.entries()].map(([nome, c]) => {
        const cobertura = c.itens ? (c.cobertos / c.itens) * 100 : null;
        const status: StatusOkr =
          cobertura === null ? "sem_dado" : cobertura >= 60 ? "verde" : cobertura >= 30 ? "atencao" : "critico";
        return {
          id: nome,
          nome,
          status,
          valor: cobertura,
          unidade: "pct",
          gap: cobertura === null ? null : cobertura - 60,
          serie: [],
          acao: status === "critico" ? "Cobrir categoria" : "Abrir categoria",
          destino: `/lojas/${lojaId}/programas/${encodeURIComponent(programaId || "todos")}/categorias/${encodeURIComponent(nome)}`,
        };
      });

      return {
        loja,
        nomePrograma:
          doPrograma[0]?.nombre_solucion || (programaId ? String(programaId) : "Todos os programas"),
        programas: [...new Set((cpp || []).map((r) => String(r.programa || "sem_programa")))],
        itens: ordenarPorUrgencia(itens),
        heroi: meta ? gmv - meta : null,
        gmv: gmv || null,
        meta: meta || null,
        comDado: itens.filter((i) => i.status !== "sem_dado").length,
        totalFilhos: itens.length,
      };
    },
  });
}

/** L4 — categoria: filhos são os anúncios (MLB). */
export function useNivel4(lojaId: string, programaId: string, categoriaId: string) {
  return useQuery({
    queryKey: ["nivel4", lojaId, programaId, categoriaId],
    enabled: !!lojaId && !!categoriaId,
    queryFn: async () => {
      const { data: loja } = await supabase
        .from("sellers")
        .select("id, nickname, cust_id")
        .eq("id", lojaId)
        .maybeSingle();

      const { data: eleg } = await supabase
        .from("seller_eligibility")
        .select(
          "item_id, item_name, dom_domain_agg1, pedidos_7d, media_tsi_diario_7d, discount_best, discount_total, discount_seller_percentage, flag_best_promo, acao_recomendada, estoque_medio_7d",
        )
        .eq("seller_id", lojaId)
        .eq("dom_domain_agg1", categoriaId)
        .limit(2000);

      const vistos = new Set<string>();
      const itens: ItemFilho[] = [];
      let gapTotal = 0;
      for (const e of eleg || []) {
        if (!e.item_id || vistos.has(e.item_id)) continue;
        vistos.add(e.item_id);
        const melhor = Number(e.discount_best ?? 0);
        const atual = Number(e.discount_total ?? 0);
        const gapDesconto = melhor - atual;
        const tsi = Number(e.media_tsi_diario_7d ?? 0);
        const gapReais = gapDesconto > 0 ? (gapDesconto / 100) * tsi * 30 : 0;
        gapTotal += gapReais;
        const status: StatusOkr = e.flag_best_promo
          ? "verde"
          : gapDesconto > 10
            ? "critico"
            : gapDesconto > 0
              ? "atencao"
              : e.discount_best == null
                ? "sem_dado"
                : "verde";
        itens.push({
          id: e.item_id,
          nome: e.item_name || e.item_id,
          status,
          valor: gapReais || null,
          unidade: "BRL",
          gap: gapDesconto || null,
          serie: [],
          acao: status === "verde" ? "Revisar anúncio" : "Corrigir anúncio",
          destino: `/lojas/${lojaId}/anuncios/${e.item_id}`,
        });
      }

      return {
        loja,
        categoria: categoriaId,
        programaId,
        itens: ordenarPorUrgencia(itens),
        heroi: gapTotal || null,
        comDado: itens.filter((i) => i.status !== "sem_dado").length,
        totalFilhos: itens.length,
      };
    },
  });
}

/** L5 — anúncio: sem herói, lista do que corrigir. */
export function useNivel5(lojaId: string, mlb: string) {
  return useQuery({
    queryKey: ["nivel5", lojaId, mlb],
    enabled: !!lojaId && !!mlb,
    queryFn: async () => {
      const { data: loja } = await supabase
        .from("sellers")
        .select("id, nickname, cust_id")
        .eq("id", lojaId)
        .maybeSingle();

      const [{ data: eleg }, { data: qualidade }] = await Promise.all([
        supabase
          .from("seller_eligibility")
          .select("*")
          .eq("seller_id", lojaId)
          .eq("item_id", mlb)
          .order("data", { ascending: false })
          .limit(1),
        supabase
          .from("seller_listings_quality")
          .select("*")
          .eq("seller_id", lojaId)
          .eq("item_id", mlb)
          .order("data", { ascending: false })
          .limit(1),
      ]);

      const e: any = eleg?.[0] || null;
      const q: any = qualidade?.[0] || null;

      const correcoes: ItemFilho[] = [];
      const push = (id: string, nome: string, valor: number | null, alvo: number, acao: string) => {
        const status: StatusOkr =
          valor === null ? "sem_dado" : valor >= alvo ? "verde" : valor >= alvo * 0.7 ? "atencao" : "critico";
        correcoes.push({
          id,
          nome,
          status,
          valor,
          unidade: "pct",
          gap: valor === null ? null : valor - alvo,
          serie: [],
          acao,
          destino: "",
        });
      };

      push("fotos", "Fotos", q?.ll_pictures_score != null ? Number(q.ll_pictures_score) : null, 80, "Trocar fotos");
      push("titulo", "Título", q?.ll_title_score != null ? Number(q.ll_title_score) : null, 80, "Reescrever título");
      push("ficha", "Ficha técnica", q?.ll_tech_specs_score != null ? Number(q.ll_tech_specs_score) : null, 80, "Completar ficha");
      push("descricao", "Descrição", q?.ll_description_score != null ? Number(q.ll_description_score) : null, 80, "Revisar descrição");
      push("preco", "Preço", q?.ll_price_score != null ? Number(q.ll_price_score) : null, 80, "Ajustar preço");
      push("estoque", "Disponibilidade", q?.ll_stock_availability_score != null ? Number(q.ll_stock_availability_score) : null, 80, "Repor estoque");
      push("frete", "Frete grátis", q?.ll_free_shipping_score != null ? Number(q.ll_free_shipping_score) : null, 80, "Habilitar frete");
      push("promo", "Promoções", q?.ll_promotions_score != null ? Number(q.ll_promotions_score) : null, 80, "Aderir à promoção");

      return {
        loja,
        mlb,
        nome: e?.item_name || mlb,
        categoria: e?.dom_domain_agg1 || null,
        elegibilidade: e,
        itens: ordenarPorUrgencia(correcoes),
        comDado: correcoes.filter((c) => c.status !== "sem_dado").length,
        totalFilhos: correcoes.length,
      };
    },
  });
}
