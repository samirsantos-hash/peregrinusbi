import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useCarteiraDeepDive } from "@/hooks/carteira/useCarteiraDeepDive";
import {
  diagnosticar, ordenarPlano, cruzamentos, movimentacao, agregarTotal, type Totais,
} from "@/lib/carteiraDeepDive/calculo";
import FaixaKpis, { type ContagemCarteira } from "@/components/carteira/deepdive/FaixaKpis";
import PlanoAcao from "@/components/carteira/deepdive/PlanoAcao";
import Retencao from "@/components/carteira/deepdive/Retencao";
import Movimentacao from "@/components/carteira/deepdive/Movimentacao";
import CurvaAPreco from "@/components/carteira/deepdive/CurvaAPreco";
import FiltrosCarteira, { FAIXAS, SEM_VERTICAL, type Filtros } from "@/components/carteira/deepdive/FiltrosCarteira";
import { dataBR } from "@/components/carteira/deepdive/fmt";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function contar(mapa: Map<string, Totais>, ids: Set<string>): Omit<ContagemCarteira, "entrando" | "saindo"> {
  let ativas = 0, comVenda = 0, ociosas = 0;
  for (const id of ids) {
    const t = mapa.get(id);
    if (!t) continue;
    ativas++;
    if (t.gmv > 0) comVenda++; else ociosas++;
  }
  return { ativas, comVenda, ociosas };
}

export default function CarteiraDeepDive() {
  const { data, isLoading, error } = useCarteiraDeepDive();
  const [f, setF] = useState<Filtros>({ vertical: "", faixa: "todas", alerta: "", movimento: "" });

  const calc = useMemo(() => {
    if (!data) return null;
    const diagAll = data.lojas.map((l) => diagnosticar(l, data.atual.get(l.id), data.anterior.get(l.id)));
    const movAll = movimentacao(data.lojas, data.atual, data.janelas.atual);
    const entrandoIds = new Set(movAll.entrando.map((x) => x.loja.id));
    const saindoIds = new Set([...movAll.saindo, ...movAll.saindoSemReceita].map((x) => x.loja.id));
    const faixa = FAIXAS.find((x) => x.id === f.faixa);
    if (!faixa) throw new Error(`Faixa desconhecida: ${f.faixa}`);

    const filtrados = diagAll.filter((d) => {
      if (f.vertical === SEM_VERTICAL ? d.loja.vertical !== null : f.vertical && d.loja.vertical !== f.vertical) return false;
      if (f.faixa !== "todas" && (d.gmv === null || d.gmv < faixa.min || d.gmv >= faixa.max)) return false;
      if (f.alerta && !d.alertas.some((a) => a.tipo === f.alerta)) return false;
      if (f.movimento === "entrando" && !entrandoIds.has(d.loja.id)) return false;
      if (f.movimento === "saindo" && !saindoIds.has(d.loja.id)) return false;
      return true;
    });
    const ids = new Set(filtrados.map((d) => d.loja.id));
    const mov = movimentacao(filtrados.map((d) => d.loja), data.atual, data.janelas.atual);
    let pedidos: number | null = null;
    for (const id of ids) { const p = data.pedidos.get(id); if (p !== undefined) pedidos = (pedidos ?? 0) + p; }
    const verticais = [...new Set(data.lojas.map((l) => l.vertical).filter((v): v is string => !!v))].sort();

    return {
      filtrados, mov, pedidos, verticais,
      plano: ordenarPlano(filtrados),
      cruz: cruzamentos(filtrados),
      tAtual: agregarTotal(data.atual, ids),
      tAnterior: agregarTotal(data.anterior, ids),
      tAno: agregarTotal(data.anoAnterior, ids),
      cAtual: { ...contar(data.atual, ids), entrando: mov.entrando.length, saindo: mov.saindo.length + mov.saindoSemReceita.length },
      cAnterior: { ...contar(data.anterior, ids), entrando: null, saindo: null },
      cAno: { ...contar(data.anoAnterior, ids), entrando: null, saindo: null },
    };
  }, [data, f]);

  const mesRef = data ? `${MESES[Number(data.ref.slice(5, 7)) - 1]} de ${data.ref.slice(0, 4)}` : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        <Link to="/carteira" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Carteira
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight">Carteira</h1>
            <p className="text-[13px] text-muted-foreground">
              Ecom Consult · Programa CPP{data ? ` · ${dataBR(data.janelas.atual.ini)} a ${dataBR(data.ref)}` : ""}
            </p>
          </div>
          {data && calc && (
            <div className="text-right">
              <p className="text-sm font-semibold capitalize">{mesRef}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{calc.filtrados.length.toLocaleString("pt-BR")} lojas</p>
            </div>
          )}
        </header>

        {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {error && (
          <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" /> {(error as Error).message}
          </p>
        )}

        {data && calc && (
          <>
            <FiltrosCarteira f={f} set={setF} verticais={calc.verticais} total={data.lojas.length} filtradas={calc.filtrados.length} />
            <FaixaKpis janelas={data.janelas} atual={calc.tAtual} anterior={calc.tAnterior} anoAnterior={calc.tAno}
              cAtual={calc.cAtual} cAnterior={calc.cAnterior} cAno={calc.cAno} pedidos={calc.pedidos} />
            <PlanoAcao itens={calc.plano} />
            <Retencao {...calc.cruz} />
            <Movimentacao m={calc.mov} />
            <CurvaAPreco />
          </>
        )}
      </div>
    </div>
  );
}
