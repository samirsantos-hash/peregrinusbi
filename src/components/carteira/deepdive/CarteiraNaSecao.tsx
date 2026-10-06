import { useMemo } from "react";
import { Loader2, AlertTriangle, Briefcase } from "lucide-react";
import { useCarteiraDeepDive } from "@/hooks/carteira/useCarteiraDeepDive";
import { diagnosticar, ordenarPlano, cruzamentos, movimentacao, agregarTotal, type Totais } from "@/lib/carteiraDeepDive/calculo";
import FaixaKpis, { type ContagemCarteira } from "./FaixaKpis";
import PlanoAcao from "./PlanoAcao";
import Retencao from "./Retencao";
import Movimentacao from "./Movimentacao";
import CurvaAPreco from "./CurvaAPreco";

/** Qual leitura de carteira cada seção existente do painel recebe. */
export type SecaoCarteira =
  | "efficiency" | "executive" | "logistics" | "publicidade"
  | "competitiveness" | "clips" | "opportunities" | "alertas-riscos";

function contar(mapa: Map<string, Totais>, ids: Set<string>): Omit<ContagemCarteira, "entrando" | "saindo"> {
  if (mapa.size === 0) return { ativas: null, comVenda: null, ociosas: null };
  let ativas = 0, comVenda = 0, ociosas = 0;
  for (const id of ids) {
    const t = mapa.get(id);
    if (!t) continue;
    ativas++;
    if (t.gmv > 0) comVenda++; else ociosas++;
  }
  return { ativas, comVenda, ociosas };
}

const ALAVANCAS: Partial<Record<SecaoCarteira, string[]>> = {
  logistics: ["full", "flex"],
  publicidade: ["ads"],
  competitiveness: ["competitividade"],
  clips: ["clips"],
  opportunities: ["promocao", "afiliados"],
};

export default function CarteiraNaSecao({ secao }: { secao: SecaoCarteira }) {
  const { data, isLoading, error } = useCarteiraDeepDive();

  const calc = useMemo(() => {
    if (!data) return null;
    const diag = data.lojas.map((l) => diagnosticar(l, data.atual.get(l.id), data.anterior.get(l.id)));
    const ids = new Set(data.lojas.map((l) => l.id));
    const mov = movimentacao(data.lojas, data.atual, data.janelas.atual);
    let pedidos: number | null = null;
    for (const id of ids) { const p = data.pedidos.get(id); if (p !== undefined) pedidos = (pedidos ?? 0) + p; }
    return {
      mov, pedidos,
      plano: ordenarPlano(diag),
      cruz: cruzamentos(diag),
      tAtual: agregarTotal(data.atual), tAnterior: agregarTotal(data.anterior), tAno: agregarTotal(data.anoAnterior),
      cAtual: { ...contar(data.atual, ids), entrando: mov.entrando.length, saindo: mov.saindo.length + mov.saindoSemReceita.length },
      cAnterior: { ...contar(data.anterior, ids), entrando: null, saindo: null },
      cAno: { ...contar(data.anoAnterior, ids), entrando: null, saindo: null },
    };
  }, [data]);

  const titulo = (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      <Briefcase className="w-4 h-4 text-primary" /> Leitura da carteira
    </h2>
  );

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando leitura da carteira…</div>;
  if (error) return <p className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="w-4 h-4" />{(error as Error).message}</p>;
  if (!data || !calc) return null;

  const kpis = (props: { volume?: boolean; carteira?: boolean; alavancasVisiveis?: string[] }) => (
    <FaixaKpis janelas={data.janelas} atual={calc.tAtual} anterior={calc.tAnterior} anoAnterior={calc.tAno}
      cAtual={calc.cAtual} cAnterior={calc.cAnterior} cAno={calc.cAno} pedidos={calc.pedidos} {...props} />
  );

  return (
    <section className="space-y-4 rounded-lg border border-border/50 bg-card/30 p-4">
      {titulo}
      {secao === "efficiency" && kpis({ volume: false, carteira: true, alavancasVisiveis: [] })}
      {secao === "executive" && kpis({ volume: true, carteira: false, alavancasVisiveis: [] })}
      {ALAVANCAS[secao] && kpis({ volume: false, carteira: false, alavancasVisiveis: ALAVANCAS[secao] })}
      {secao === "competitiveness" && <CurvaAPreco />}
      {secao === "alertas-riscos" && (
        <>
          <PlanoAcao itens={calc.plano} />
          <Retencao {...calc.cruz} />
          <Movimentacao m={calc.mov} />
        </>
      )}
    </section>
  );
}
