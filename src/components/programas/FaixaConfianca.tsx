import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useDadoReal } from "./DadoRealContext";
import type { Participacao } from "@/types/programas";

interface Props {
  participacoes: Participacao[];
  atualizadoEm: string;
  coberturaDadosPct: number;
}

function fontesPorBloco(ps: Participacao[]) {
  const mapa: Record<string, Set<string>> = {
    Alavancas: new Set(),
    OKRs: new Set(),
    "Meta e cascata": new Set(),
    Categorias: new Set(),
  };
  ps.forEach((p) => {
    p.alavancas.forEach((a) => [a.valorAtual, a.valorContratado, a.resultadoAtribuido, a.impactoEstimado].forEach((m) => mapa.Alavancas.add(m.fonte)));
    p.okrs.forEach((o) => [o.atual, o.meta].forEach((m) => mapa.OKRs.add(m.fonte)));
    p.cascata.forEach((n) => mapa["Meta e cascata"].add(n.meta.fonte));
    p.categorias.forEach((c) => [c.gmv12m, c.potencial].forEach((m) => mapa.Categorias.add(m.fonte)));
  });
  return mapa;
}

const FaixaConfianca = ({ participacoes, atualizadoEm, coberturaDadosPct }: Props) => {
  const { soDadoReal, setSoDadoReal } = useDadoReal();
  const fontes = fontesPorBloco(participacoes);

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex h-11 items-center gap-4 border-t border-border bg-muted/60 px-4 backdrop-blur-md text-[11px] text-muted-foreground overflow-x-auto scrollbar-thin">
      <span className="whitespace-nowrap">
        Atualizado em {new Date(atualizadoEm).toLocaleDateString("pt-BR")}
      </span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        Cobertura de dados: <span className="font-mono tabular-nums text-foreground">{coberturaDadosPct}%</span>
        <span className="h-1.5 w-16 rounded-full bg-border">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${coberturaDadosPct}%` }} />
        </span>
      </span>
      <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
        <Switch checked={soDadoReal} onCheckedChange={setSoDadoReal} aria-label="Mostrar só métricas com dado real" />
        Mostrar só métricas com dado real
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]">Fontes</Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 text-xs">
          {Object.entries(fontes).map(([bloco, set]) => (
            <div key={bloco} className="mb-2 last:mb-0">
              <p className="font-semibold text-foreground">{bloco}</p>
              <ul className="mt-0.5 list-disc pl-4 text-muted-foreground">
                {[...set].map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FaixaConfianca;
