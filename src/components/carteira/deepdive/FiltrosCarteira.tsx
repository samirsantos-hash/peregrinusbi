import type { TipoAlerta } from "@/lib/carteiraDeepDive/calculo";
import { ROTULO } from "./PlanoAcao";

export const SEM_VERTICAL = "__sem__";
export const FAIXAS = [
  { id: "todas", rotulo: "Todas as faixas", min: -Infinity, max: Infinity },
  { id: "f0", rotulo: "Até R$ 10 mil", min: -Infinity, max: 10_000 },
  { id: "f1", rotulo: "R$ 10 mil – 100 mil", min: 10_000, max: 100_000 },
  { id: "f2", rotulo: "R$ 100 mil – 1 mi", min: 100_000, max: 1_000_000 },
  { id: "f3", rotulo: "Acima de R$ 1 mi", min: 1_000_000, max: Infinity },
] as const;

export interface Filtros { vertical: string; faixa: string; alerta: "" | TipoAlerta; movimento: "" | "entrando" | "saindo" }

interface Props { f: Filtros; set: (f: Filtros) => void; verticais: string[]; total: number; filtradas: number }

const sel = "h-8 rounded-md border border-border/60 bg-card px-2 text-xs";

export default function FiltrosCarteira({ f, set, verticais, total, filtradas }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Vertical" className={sel} value={f.vertical} onChange={(e) => set({ ...f, vertical: e.target.value })}>
        <option value="">Todas as verticais</option>
        {verticais.map((v) => <option key={v} value={v}>{v}</option>)}
        <option value={SEM_VERTICAL}>Sem vertical identificada</option>
      </select>
      <select aria-label="Faixa de faturamento" className={sel} value={f.faixa} onChange={(e) => set({ ...f, faixa: e.target.value })}>
        {FAIXAS.map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
      </select>
      <select aria-label="Tipo de alerta" className={sel} value={f.alerta} onChange={(e) => set({ ...f, alerta: e.target.value as Filtros["alerta"] })}>
        <option value="">Todos os alertas</option>
        {(Object.keys(ROTULO) as TipoAlerta[]).map((k) => <option key={k} value={k}>{ROTULO[k]}</option>)}
      </select>
      <select aria-label="Movimentação" className={sel} value={f.movimento} onChange={(e) => set({ ...f, movimento: e.target.value as Filtros["movimento"] })}>
        <option value="">Todas as lojas</option>
        <option value="entrando">Entrando</option>
        <option value="saindo">Saindo</option>
      </select>
      <span className="text-xs text-muted-foreground tabular-nums">{filtradas.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} lojas</span>
    </div>
  );
}
