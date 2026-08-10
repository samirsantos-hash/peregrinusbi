import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CHAVE = "peregrinus.novidades.v1";
const UMA_SEMANA = 7 * 24 * 60 * 60 * 1000;
const EVENTO = "peregrinus:novidades";

type Escolha = "sim" | "nao";
type Estado = "pendente" | Escolha;

interface Registro {
  escolha: Escolha;
  ate: number;
}

/** Textos explicativos das novas seções do painel. */
export const NOVIDADES: Record<string, { titulo: string; texto: string }> = {
  pock: {
    titulo: "Nova aba Pock",
    texto:
      "Nova aba Pock: consolida identidade da loja, medidores de qualidade de atendimento e a evolução mensal de TGMV, LL, conversão, visitas, Flex, FBM, PADS, CDP e Clips em um único lugar.",
  },
  "alertas-riscos": {
    titulo: "Novo painel Alertas & Riscos",
    texto:
      "Novo painel consolidado de risco: cruza BPC (limiar estatístico por vertical), reputação (claims e atrasos) e churn (queda mês a mês fora do padrão da vertical) para priorizar as lojas que exigem ação.",
  },
  "gmv-mes-vs-mes": {
    titulo: "Novo gráfico GMV mês vs mês",
    texto:
      "Novo gráfico de comparação mensal: escolha dois meses e compare dia a dia em modo Diário, Acumulado ou Índice 100 (mês comparado = 100, mês base como índice relativo).",
  },
  sidebar: {
    titulo: "Nova navegação lateral",
    texto:
      "As abas horizontais viraram um menu lateral fixo, agrupado por Visão, Performance, Operação e Estratégia, com Alertas & Riscos fixado no rodapé e estado recolhido salvo no navegador.",
  },
};

function ler(): Estado {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return "pendente";
    const reg = JSON.parse(cru) as Registro;
    if (!reg?.escolha || !reg?.ate || Date.now() > reg.ate) return "pendente";
    return reg.escolha;
  } catch {
    return "pendente";
  }
}

/** Controla se o usuário quer ver as explicações das novidades (validade de 1 semana). */
export function useNovidades() {
  const [estado, setEstado] = useState<Estado>("pendente");

  useEffect(() => {
    setEstado(ler());
    const sync = () => setEstado(ler());
    window.addEventListener(EVENTO, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENTO, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const definir = useCallback((escolha: Escolha) => {
    try {
      const reg: Registro = { escolha, ate: Date.now() + UMA_SEMANA };
      localStorage.setItem(CHAVE, JSON.stringify(reg));
    } catch {
      /* storage indisponível: mantém só em memória */
    }
    setEstado(escolha);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { estado, ativo: estado === "sim", definir };
}

/** Ícone de ajuda que só aparece quando o usuário optou por ver as novidades. */
export function NovidadeTip({ id, className = "" }: { id: keyof typeof NOVIDADES | string; className?: string }) {
  const { ativo } = useNovidades();
  const item = NOVIDADES[id];
  if (!ativo || !item) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Novidade: ${item.titulo}`}
            className={`inline-flex items-center gap-1 rounded-full border border-brand-blue/40 bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue cursor-help align-middle ${className}`}
          >
            <Sparkles className="h-3 w-3" />
            Novo
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-xs leading-relaxed">
          <p className="font-semibold mb-1">{item.titulo}</p>
          <p className="text-muted-foreground">{item.texto}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Convite inicial: pergunta se o usuário quer ver as explicações das novidades. */
export function NovidadesPrompt({ className = "" }: { className?: string }) {
  const { estado, definir } = useNovidades();
  if (estado !== "pendente") return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-2 ${className}`}
    >
      <Sparkles className="h-4 w-4 text-brand-blue shrink-0" />
      <p className="text-xs text-foreground flex-1 min-w-[200px]">
        Há novas seções no painel. Quer ver explicações rápidas sobre elas?
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-[11px]" onClick={() => definir("sim")}>
          Ver explicações
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] gap-1"
          onClick={() => definir("nao")}
        >
          <X className="h-3 w-3" />
          Agora não
        </Button>
      </div>
    </div>
  );
}