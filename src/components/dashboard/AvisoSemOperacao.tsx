import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  kpis: any[];
  nickname?: string | null;
  contexto?: string | null;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Aviso (somente informativo) para lojas sem operação no período:
 * quando faturamento, itens vendidos e visitas estão zerados em todas as linhas
 * do período selecionado. Não altera nenhum cálculo — apenas explica os zeros.
 */
export default function AvisoSemOperacao({ kpis, nickname, contexto }: Props) {
  const { semOperacao, totalVisitas, linhas } = useMemo(() => {
    const linhas = (kpis || []).length;
    let gmv = 0;
    let tsi = 0;
    let visitas = 0;
    for (const k of kpis || []) {
      gmv += num(k?.gmv) || num(k?.revenue);
      tsi += num(k?.tsi) || num(k?.unitsSold) || num(k?.itemsSold);
      visitas += num(k?.visits) || num(k?.visitas);
    }
    return {
      semOperacao: linhas > 0 && gmv <= 0 && tsi <= 0 && visitas <= 5,
      totalVisitas: visitas,
      linhas,
    };
  }, [kpis]);

  if (!semOperacao) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-500">
          Sem operação no período{nickname ? ` — ${nickname}` : ""}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          A base recebeu {linhas} dia(s) de dados{contexto ? ` (${contexto})` : ""}, porém com
          faturamento, itens vendidos e demais indicadores zerados
          {totalVisitas > 0 ? ` e apenas ${totalVisitas} visita(s)` : " e nenhuma visita"}. Isso
          indica loja parada ou em churn — não é falha de ingestão nem restrição de acesso. Os
          painéis abaixo aparecerão zerados por esse motivo. Aviso informativo, nenhuma ação
          automática foi tomada.
        </p>
      </div>
    </div>
  );
}
