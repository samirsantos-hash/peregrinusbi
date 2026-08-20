import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { getUpliftFull } from "@/lib/queries/upliftFull";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const RESSALVA =
  "Benchmark de mercado (Top 100K anúncios, ML/EcomConsult). Correlação, não causalidade: sellers tendem a colocar no FULL os itens que já vendem melhor.";

type Props = { custId?: string | number };

const UpliftFullPanel = ({ custId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["uplift-full", custId],
    queryFn: () => getUpliftFull(custId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading)
    return (
      <div className="glass-card p-6 text-center text-xs text-muted-foreground">
        Calculando estimativa de uplift do FULL…
      </div>
    );
  if (!data) return null;

  const pctFator = Math.round(data.fatorConservadorismo * 100);
  const formula = `estimativa = Σ (GMV do item × [1 + (uplift do benchmark − 1) × ${data.fatorConservadorismo.toLocaleString("pt-BR")}]), aplicada item a item · Fonte: ${data.fonte ?? "—"} · Data do benchmark: ${data.dataFonte ?? "—"}`;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="w-4 h-4 text-neon-blue" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Estimativa de uplift do FULL
        </h3>
        <span className="rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          estimado
        </span>
        <TooltipInfo text={`${formula}\n\n${RESSALVA}`} />
        <span className="ml-auto text-[11px] text-muted-foreground">
          estimativa a {pctFator}% do benchmark de mercado
        </span>
      </div>

      {!data.disponivel ? (
        <p className="text-xs text-muted-foreground">{data.motivoIndisponivel}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Realizado hoje</p>
              <p className="font-mono tabular-nums text-lg text-foreground">{fmtBRL(data.realizado)}</p>
              <p className="text-[10px] text-muted-foreground">
                {data.periodoInicio} a {data.periodoFim} · dado real
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Estimativa conservadora
              </p>
              <p className="font-mono tabular-nums text-lg text-muted-foreground">
                {fmtBRL(data.estimativaConservadora)}
              </p>
              <p className="text-[10px] text-muted-foreground">a {pctFator}% do benchmark</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Teto do benchmark</p>
              <p className="font-mono tabular-nums text-lg text-muted-foreground">
                {fmtBRL(data.tetoBenchmark)}
              </p>
              <p className="text-[10px] text-muted-foreground">uplift integral, sem desconto</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {data.exclusoes.total} itens fora da estimativa: {data.exclusoes.ja_no_full} já no FULL,{" "}
            {data.exclusoes.sem_modal} sem modal identificado, {data.exclusoes.modal_desabilitado} em modal
            não usado em estimativa (base amostral instável), {data.exclusoes.sem_venda} sem venda no
            período.
          </p>

          <p className="text-[11px] text-muted-foreground">
            Reconciliação: {data.itens.length} itens compõem a soma exibida
            {data.diferencaReconciliacao !== 0
              ? ` · diferença não conciliada de ${fmtBRL(data.diferencaReconciliacao)}`
              : " · soma dos ganhos por item confere com o total"}
            .
          </p>

          {data.itens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="py-1 pr-2 font-normal">Anúncio</th>
                    <th className="py-1 pr-2 font-normal">Modal atual</th>
                    <th className="py-1 pr-2 text-right font-normal">GMV (real)</th>
                    <th className="py-1 pr-2 text-right font-normal">Ganho est. (conservador)</th>
                    <th className="py-1 text-right font-normal">Ganho no teto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itens.slice(0, 15).map((i) => (
                    <tr key={i.mlb} className="border-b border-border/40">
                      <td className="py-1 pr-2 truncate max-w-[220px]" title={i.titulo}>
                        {i.titulo || i.mlb}
                      </td>
                      <td className="py-1 pr-2 text-muted-foreground">
                        {i.modal} ({i.modal_origem})
                      </td>
                      <td className="py-1 pr-2 text-right font-mono tabular-nums">{fmtBRL(i.gmv)}</td>
                      <td className="py-1 pr-2 text-right font-mono tabular-nums text-muted-foreground">
                        {fmtBRL(i.ganho_conservador)}
                      </td>
                      <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                        {fmtBRL(i.ganho_teto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {data.benchmarks.map((b) => (
          <div key={b.modal_origem} className="rounded-md border border-border/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {b.modal_origem} → FULL {b.usar_em_estimativa ? "" : "· não usado"}
            </p>
            <p className="font-mono tabular-nums text-xs text-foreground">
              vendas {b.uplift_vendas.toLocaleString("pt-BR")}×
            </p>
            <p className="text-[10px] text-muted-foreground">
              {b.uplift_visitas ? `visitas ${b.uplift_visitas.toLocaleString("pt-BR")}× · ` : ""}
              {b.conversao_pct ? `conversão ${b.conversao_pct.toLocaleString("pt-BR")}% · ` : ""}
              {b.base_amostra}
            </p>
            {b.observacao && <p className="text-[10px] text-muted-foreground">{b.observacao}</p>}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Apenas o uplift de vendas estima receita. Os índices de visitas e de conversão são de painéis com
        populações diferentes e não são encadeados (vendas ≠ visitas × conversão nesta fonte; a razão
        declarada de 3,0× para conversão não confere com 4,2/1,2 = 3,50× e precisa ser confirmada na
        fonte). {RESSALVA}
      </p>
    </div>
  );
};

export default UpliftFullPanel;
