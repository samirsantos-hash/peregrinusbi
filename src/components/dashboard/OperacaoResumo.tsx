import { useMemo } from "react";
import { KpiCard, type Faixa } from "@/components/ds";
import { pct } from "@/lib/format";
import { statusReputacao, type StatusUrgencia } from "@/lib/reputationStatus";

type K = {
  date: string;
  tgmv?: number;
  tgmvFull?: number;
  tgmvFlex?: number;
  pctFull?: number;
  pctFlex?: number;
  pctPostagem?: number;
  repLevel?: string;
  repClaimsRate?: number;
  repDelayedRate?: number;
  repCancellationsRate?: number;
};

const NIVEL: Record<string, string> = {
  green_platinum: "Verde · MercadoLíder Platinum",
  green_gold: "Verde · MercadoLíder Gold",
  green_silver: "Verde · MercadoLíder",
  green: "Verde",
  light_green: "Verde-claro",
  yellow: "Amarelo",
  orange: "Laranja",
  red: "Vermelho",
  newbie: "Novo vendedor",
};

function nivelLegivel(n?: string) {
  if (!n) return "Sem dado";
  const key = n.toLowerCase();
  if (NIVEL[key]) return NIVEL[key];
  const m = key.match(/^(.*?)(?:_(platinum|gold|silver|leader))?$/);
  const base = m?.[1] ?? key;
  const medalha = m?.[2];
  const cor: Record<string, string> = {
    green: "Verde",
    light_green: "Verde-claro",
    yellow: "Amarelo",
    orange: "Laranja",
    red: "Vermelho",
  };
  return [cor[base] ?? base, medalha ? `MercadoLíder ${medalha[0].toUpperCase()}${medalha.slice(1)}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function faixaDeUrgencia(u: StatusUrgencia): Faixa {
  if (u === "critico") return "critico";
  if (u === "atencao") return "abaixo";
  return "bom";
}

function faixaFull(share: number): Faixa {
  if (share >= 60) return "bom";
  if (share >= 40) return "intermediario";
  if (share >= 30) return "abaixo";
  return "critico";
}

function faixaAgencia(share: number): Faixa {
  if (share <= 30) return "bom";
  if (share <= 50) return "abaixo";
  return "critico";
}

/**
 * Resumo dos KPIs principais de reputação, atrasos de envio e mix logístico.
 * Snapshot do último dia com dado (reputação) + mix por GMV no período (logística).
 */
export default function OperacaoResumo({ diario, somenteLogistica = false }: { diario: K[]; somenteLogistica?: boolean }) {
  const d = useMemo(() => {
    const ord = [...diario].filter((k) => k.date).sort((a, b) => a.date.localeCompare(b.date));
    if (!ord.length) return null;

    const lat = ord[ord.length - 1];
    const claimsPct = (Number(lat.repClaimsRate) || 0) * 100;
    const delayPct = (Number(lat.repDelayedRate) || 0) * 100;
    const cancPct = (Number(lat.repCancellationsRate) || 0) * 100;

    const stClaims = statusReputacao("reclamacoes", claimsPct, 0);
    const stDelay = statusReputacao("atrasos", delayPct, 0);
    const stCanc = statusReputacao("cancelamentos", cancPct, 0);

    let tgmv = 0;
    let tgmvFull = 0;
    let tgmvFlex = 0;
    for (const k of ord) {
      tgmv += Number(k.tgmv) || 0;
      tgmvFull += Number(k.tgmvFull) || 0;
      tgmvFlex += Number(k.tgmvFlex) || 0;
    }
    const tgmvAgencia = Math.max(0, tgmv - tgmvFull - tgmvFlex);
    const shareFull = tgmv > 0 ? (tgmvFull / tgmv) * 100 : Number(lat.pctFull) || 0;
    const shareFlex = tgmv > 0 ? (tgmvFlex / tgmv) * 100 : Number(lat.pctFlex) || 0;
    const shareAgencia = tgmv > 0 ? (tgmvAgencia / tgmv) * 100 : Number(lat.pctPostagem) || 0;

    return {
      nivel: nivelLegivel(lat.repLevel),
      claimsPct,
      delayPct,
      cancPct,
      stClaims,
      stDelay,
      stCanc,
      shareFull,
      shareFlex,
      shareAgencia,
      dataRef: lat.date.slice(0, 10),
    };
  }, [diario]);

  if (!d) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground" role="status">
        Sem dados de reputação ou logística no período.
      </p>
    );
  }

  const dataBr = d.dataRef.slice(8, 10) + "/" + d.dataRef.slice(5, 7) + "/" + d.dataRef.slice(0, 4);

  return (
    <div className="operacao-resumo space-y-6">
      {!somenteLogistica && <section aria-labelledby="operacao-reputacao-titulo" className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="operacao-reputacao-titulo" className="text-sm font-semibold text-foreground tracking-normal">Reputação e atendimento</h3>
          <span className="text-xs text-muted-foreground tabular-nums">Último registro · {dataBr}</span>
        </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          focal
          rotulo="Termômetro"
          valor={d.nivel}
          referencia="Nível informado pelo Mercado Livre"
        />
        <KpiCard
          rotulo="Reclamações"
          valor={pct(d.claimsPct, 2)}
          melhorQuando="descer"
          faixa={faixaDeUrgencia(d.stClaims.urgencia)}
          referencia="Meta abaixo de 2%"
        />
        <KpiCard
          rotulo="Atrasos no envio"
          valor={pct(d.delayPct, 2)}
          melhorQuando="descer"
          faixa={faixaDeUrgencia(d.stDelay.urgencia)}
          referencia="Meta abaixo de 5% · HT"
        />
        <KpiCard
          rotulo="Cancelamentos"
          valor={pct(d.cancPct, 2)}
          melhorQuando="descer"
          faixa={faixaDeUrgencia(d.stCanc.urgencia)}
          referencia="Meta abaixo de 2%"
        />
      </div>
      </section>}

      <section aria-labelledby="operacao-logistica-titulo" className="space-y-3">
        <h3 id="operacao-logistica-titulo" className="text-sm font-semibold text-foreground tracking-normal">Participação logística</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          rotulo="Full · participação no GMV"
          valor={pct(d.shareFull, 1)}
          faixa={faixaFull(d.shareFull)}
          referencia="Meta ≥ 60% do GMV · Full eleva conversão"
        />
        <KpiCard
          rotulo="Flex · participação no GMV"
          valor={pct(d.shareFlex, 1)}
          faixa={d.shareFlex >= 10 ? "bom" : d.shareFlex > 0 ? "intermediario" : "abaixo"}
          referencia="Canal complementar ao Full"
        />
        <KpiCard
          rotulo="Agência / outros"
          valor={pct(d.shareAgencia, 1)}
          melhorQuando="descer"
          faixa={faixaAgencia(d.shareAgencia)}
          referencia="Meta ≤ 30% · migrar para Full"
        />
      </div>

      <div className="operacao-mix space-y-3 pt-1" aria-label="Mix logístico do período">
        <p className="text-xs font-medium text-muted-foreground">Mix de envio no período</p>
        <div className="painel-mix-envio-trilha" aria-hidden="true">
          <span className="painel-mix-envio-full" style={{ width: `${Math.max(0, Math.min(100, d.shareFull))}%` }} />
          <span className="painel-mix-envio-flex" style={{ width: `${Math.max(0, Math.min(100, d.shareFlex))}%` }} />
          <span className="painel-mix-envio-outros" style={{ width: `${Math.max(0, Math.min(100, d.shareAgencia))}%` }} />
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
          {[
            { nome: "Full", valor: d.shareFull, classe: "operacao-mix-full" },
            { nome: "Flex", valor: d.shareFlex, classe: "operacao-mix-flex" },
            { nome: "Agência / outros", valor: d.shareAgencia, classe: "operacao-mix-outros" },
          ].map(({ nome, valor, classe }) => (
            <li key={nome} className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${classe}`} aria-hidden="true" />
              <span>{nome}</span>
              <span className="ml-auto tabular-nums font-semibold text-foreground">{pct(valor, 1)}</span>
            </li>
          ))}
        </ul>
      </div>
      </section>
    </div>
  );
}
