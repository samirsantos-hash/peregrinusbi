import { useMemo } from "react";
import { ExternalLink, Video } from "lucide-react";
import { KpiCard } from "@/components/ds";
import { brl, num, pct } from "@/lib/format";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { ListingQuality } from "@/hooks/useListingsQuality";
import type { EligibilityItem } from "@/hooks/useEligibility";

function hasClipData(visitasClips: number, siClips: number, ordersClips: number) {
  return visitasClips > 0 || siClips > 0 || ordersClips > 0;
}

function statusClip(visitas: number, orders: number, mediaOrders: number): { label: string; className: string } {
  if (visitas <= 0 && orders <= 0) {
    return { label: "Sem alcance", className: "bg-amber-100 text-amber-800" };
  }
  if (orders >= Math.max(3, mediaOrders)) {
    return { label: "Campeão", className: "bg-emerald-100 text-emerald-800" };
  }
  if (orders < 3) {
    return { label: "Baixa conversão", className: "bg-slate-100 text-slate-600" };
  }
  return { label: "Ativo", className: "bg-sky-100 text-sky-800" };
}

/**
 * Seção 3 do Resumo — Clips & Vídeos (compacto).
 * KPIs somam o período (mesmo grão diário das outras seções).
 * A lista por MLB é snapshot da última base de qualidade — rotulada à parte.
 */
export default function ClipsResumo({
  kpis,
  listingsQuality,
  eligibilityItems,
  periodo,
}: {
  kpis: SellerKPI[];
  listingsQuality?: ListingQuality[];
  eligibilityItems?: EligibilityItem[];
  periodo?: string;
}) {
  const totais = useMemo(() => {
    let visitas = 0;
    let tgmv = 0;
    let visitasClips = 0;
    let tgmvClips = 0;
    let ordersClips = 0;
    for (const k of kpis) {
      visitas += Number(k.visits) || 0;
      tgmv += Number(k.tgmv) || Number(k.gmv) || 0;
      visitasClips += Number(k.visitasClips) || 0;
      tgmvClips += Number(k.tgmvLcClips) || 0;
      ordersClips += Number(k.ordersClips) || 0;
    }
    return { visitas, tgmv, visitasClips, tgmvClips, ordersClips };
  }, [kpis]);

  const participacao = totais.tgmv > 0 ? (totais.tgmvClips / totais.tgmv) * 100 : null;
  const temPeriodo =
    totais.visitasClips > 0 || totais.tgmvClips > 0 || totais.ordersClips > 0;

  const topClips = useMemo(() => {
    // Ranking só faz sentido junto dos KPIs do período — evita lista “cheia” com cards em zero.
    if (!temPeriodo) return [];

    const nomes = new Map<string, string>();
    for (const e of eligibilityItems || []) {
      if (e.itemId && e.itemName) nomes.set(String(e.itemId), e.itemName);
    }

    const byId = new Map<string, ListingQuality>();
    for (const lq of listingsQuality || []) {
      const key = String(lq.itemId);
      const prev = byId.get(key);
      if (!prev) {
        byId.set(key, { ...lq });
        continue;
      }
      const base = { ...prev };
      base.visitasClips = Math.max(prev.visitasClips || 0, lq.visitasClips || 0);
      base.siClips = Math.max(prev.siClips || 0, lq.siClips || 0);
      base.ordersClips = Math.max(prev.ordersClips || 0, lq.ordersClips || 0);
      base.tgmvLcClips = Math.max(prev.tgmvLcClips || 0, lq.tgmvLcClips || 0);
      byId.set(key, base);
    }

    const comClip = Array.from(byId.values()).filter((lq) =>
      hasClipData(lq.visitasClips, lq.siClips, lq.ordersClips),
    );
    const mediaOrders =
      comClip.length > 0
        ? comClip.reduce((s, lq) => s + (lq.ordersClips || 0), 0) / comClip.length
        : 0;

    return comClip
      .sort((a, b) => (b.visitasClips || 0) - (a.visitasClips || 0))
      .slice(0, 5)
      .map((lq) => ({
        id: lq.itemId,
        nome: nomes.get(String(lq.itemId)) || lq.itemId,
        visitas: lq.visitasClips || 0,
        pedidos: lq.ordersClips || 0,
        link: lq.mlbLink,
        status: statusClip(lq.visitasClips || 0, lq.ordersClips || 0, mediaOrders),
      }));
  }, [listingsQuality, eligibilityItems, temPeriodo]);

  return (
    <section aria-label="Clips e vídeos" className="space-y-3">
      <h2 className="ds-rotulo">
        3 · Clips & vídeos{periodo ? ` · ${periodo}` : ""}
      </h2>

      {!temPeriodo ? (
        <div className="ds-kpi rounded-xl p-5 text-sm text-slate-600">
          Sem atividade de clips no período. Quando houver visitas ou TGMV via vídeo, o resumo aparece aqui.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard
              rotulo="Visitas via vídeo"
              valor={num(totais.visitasClips)}
              referencia={
                totais.visitas > 0
                  ? `${pct((totais.visitasClips / totais.visitas) * 100, 1)} das visitas totais`
                  : "Sem visitas totais no período"
              }
            />
            <KpiCard
              rotulo="TGMV gerado por vídeos"
              valor={brl(totais.tgmvClips)}
              referencia={`${num(totais.ordersClips)} pedidos atribuídos a clips`}
            />
            <KpiCard
              focal
              rotulo="Participação no TGMV"
              valor={participacao != null ? pct(participacao, 1) : "Sem dado"}
              referencia="TGMV clips ÷ TGMV total do período"
            />
          </div>

          {topClips.length > 0 && (
            <div className="ds-kpi rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-slate-500" />
                  <p className="text-xs font-medium text-slate-600">Vídeos com maior tração</p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Snapshot por MLB · base de qualidade (não é o somatório do período)
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {topClips.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800" title={c.nome}>
                        {c.nome}
                      </p>
                      <p className="tabular-nums text-[11px] text-slate-500 font-mono">
                        {num(c.visitas)} visitas · {num(c.pedidos)} conversões
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${c.status.className}`}>
                      {c.status.label}
                    </span>
                    {c.link && (
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-slate-400 hover:text-slate-700"
                        aria-label={`Abrir anúncio ${c.id}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
