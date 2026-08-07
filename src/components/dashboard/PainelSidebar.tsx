import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SELLER_TABS, type SellerTab } from "@/config/sellerTabs";

const CHAVE = "peregrinus.sidebar.collapsed";

const GRUPOS: { titulo: string; ids: string[] }[] = [
  { titulo: "Visão", ids: ["efficiency", "pock"] },
  { titulo: "Performance", ids: ["executive", "competitiveness", "publicidade"] },
  { titulo: "Operação", ids: ["logistics", "quality", "clips"] },
  { titulo: "Estratégia", ids: ["opportunities", "reputation", "correlacoes"] },
];

const ID_ALERTAS = "alertas-riscos";

function porId(id: string): SellerTab | undefined {
  return SELLER_TABS.find((t) => t.id === id);
}

interface ItemProps {
  tab: SellerTab;
  ativo: boolean;
  recolhida: boolean;
  onSelect: (id: string) => void;
  badge?: number;
}

function ItemNav({ tab, ativo, recolhida, onSelect, badge }: ItemProps) {
  const Icone = tab.icon;
  const botao = (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "relative w-full flex items-center gap-2.5 h-9 rounded-md text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
        recolhida ? "justify-center px-0" : "px-3",
        ativo
          ? "bg-brand-blue/[0.12] text-brand-blue"
          : "text-muted-alt hover:bg-muted/[0.35]",
      )}
    >
      {ativo && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-brand-blue" aria-hidden />
      )}
      <Icone className={cn("h-4 w-4 shrink-0", ativo ? "text-brand-blue" : "text-muted-alt")} />
      {!recolhida && <span className="truncate">{tab.label}</span>}
      {badge ? (
        <span
          className={cn(
            "ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-crit text-white text-[10px] font-semibold tabular-nums inline-flex items-center justify-center",
            recolhida && "absolute -top-0.5 right-1 ml-0",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );

  if (!recolhida) return <li>{botao}</li>;
  return (
    <li>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{botao}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-[240px] text-xs">
          <p className="font-semibold">{tab.label}</p>
          <p className="text-muted-foreground">{tab.juniorTip}</p>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

interface Props {
  ativa: string;
  onChange: (id: string) => void;
  alertas?: number;
  mobileAberto: boolean;
  onMobileChange: (v: boolean) => void;
}

function Conteudo({
  ativa,
  onChange,
  alertas,
  recolhida,
  onToggle,
  mostrarToggle,
}: {
  ativa: string;
  onChange: (id: string) => void;
  alertas?: number;
  recolhida: boolean;
  onToggle: () => void;
  mostrarToggle: boolean;
}) {
  const tabAlertas = porId(ID_ALERTAS);
  return (
    <nav aria-label="Seções do painel" className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="mt-5 first:mt-2">
            {!recolhida && (
              <p className="px-3 mb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-alt">
                {g.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.ids.map((id) => {
                const tab = porId(id);
                if (!tab) return null;
                return (
                  <ItemNav
                    key={id}
                    tab={tab}
                    ativo={ativa === id}
                    recolhida={recolhida}
                    onSelect={onChange}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-muted/[0.15] px-2 py-2 space-y-1">
        {mostrarToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={recolhida ? "Expandir navegação" : "Recolher navegação"}
            className={cn(
              "w-full flex items-center gap-2.5 h-9 rounded-md text-[13px] font-medium text-muted-alt hover:bg-muted/[0.35] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
              recolhida ? "justify-center px-0" : "px-3",
            )}
          >
            {recolhida ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!recolhida && <span>Recolher</span>}
          </button>
        )}
        {tabAlertas && (
          <ul>
            <ItemNav
              tab={tabAlertas}
              ativo={ativa === ID_ALERTAS}
              recolhida={recolhida}
              onSelect={onChange}
              badge={alertas && alertas > 0 ? alertas : undefined}
            />
          </ul>
        )}
      </div>
    </nav>
  );
}

export default function PainelSidebar({ ativa, onChange, alertas, mobileAberto, onMobileChange }: Props) {
  const [recolhida, setRecolhida] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const salvo = window.localStorage.getItem(CHAVE);
    if (salvo !== null) return salvo === "true";
    return window.innerWidth < 1280;
  });

  useEffect(() => {
    window.localStorage.setItem(CHAVE, String(recolhida));
  }, [recolhida]);

  const selecionar = (id: string) => {
    onChange(id);
    onMobileChange(false);
  };

  return (
    <>
      {/* Desktop / tablet */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 sticky self-start top-4 border-r border-muted/[0.15] bg-surface-alt rounded-l-lg",
          recolhida ? "w-[56px]" : "w-[224px]",
        )}
        style={{ height: "calc(100vh - 2rem)" }}
      >
        <Conteudo
          ativa={ativa}
          onChange={onChange}
          alertas={alertas}
          recolhida={recolhida}
          onToggle={() => setRecolhida((v) => !v)}
          mostrarToggle
        />
      </aside>

      {/* Drawer < 1024px */}
      <Sheet open={mobileAberto} onOpenChange={onMobileChange}>
        <SheetContent side="left" className="w-[248px] p-0 bg-surface-alt">
          <div className="h-full pt-8">
            <Conteudo
              ativa={ativa}
              onChange={selecionar}
              alertas={alertas}
              recolhida={false}
              onToggle={() => {}}
              mostrarToggle={false}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { AlertTriangle };
