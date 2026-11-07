import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, Plug, ChartNoAxesCombined, ListFilter, BadgeCheck, History, Package, Tags, Search, LayoutDashboard, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SELLER_TABS, type SellerTab } from "@/config/sellerTabs";
import { RAMOS_ACESSOS, GRUPOS_ACESSOS, destinoAcesso, type AcessoArvore } from "@/config/arvoreAcessos";
import { NovidadeTip } from "@/components/novidades/novidades";
import { Button } from "@/components/ui/button";
import { usePermissoes } from '@/hooks/usePermissoes';
import { SECAO_PERMISSAO } from '@/lib/permissoes';

const CHAVE = "peregrinus.sidebar.collapsed";

const GRUPOS = GRUPOS_ACESSOS;

const ID_ALERTAS = "alertas-riscos";

const ICONES_SUBANALISE: Record<string, LucideIcon> = {
  analise: ChartNoAxesCombined, geral: LayoutDashboard, resumo: LayoutDashboard,
  indicadores: ListFilter, requisitos: BadgeCheck, historico: History, evolucao: History,
  produtos: Package, anuncios: Package, promocoes: Tags, campanhas: Tags,
  concorrentes: Search, insights: Search,
};

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
    <Button variant="ghost"
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "panel-nav-item relative w-full flex items-center gap-2.5 h-10 rounded-lg text-[13px] font-medium transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
        recolhida ? "justify-center px-0" : "px-3",
        ativo
          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          : "text-foreground/80 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {ativo && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-primary" aria-hidden />
      )}
      <Icone className="h-4 w-4 shrink-0" />
      {!recolhida && <span className="truncate">{tab.label}</span>}
      {badge ? (
        <span
          className={cn(
            "ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-crit text-primary-foreground text-[10px] font-semibold tabular-nums inline-flex items-center justify-center",
            recolhida && "absolute -top-0.5 right-1 ml-0",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Button>
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
  consultantAccess?: boolean;
  redeAccess?: boolean;
  custId?: string;
  contaId?: string;
  sellerScope?: "single_store" | "portfolio";
  ativa: string;
  subativa?: string;
  onSubChange?: (secao: string, id: string) => void;
  onChange: (id: string) => void;
  alertas?: number;
  mobileAberto: boolean;
  onMobileChange: (v: boolean) => void;
}

function Conteudo({
  consultantAccess = false,
  redeAccess = false, custId, contaId,
  sellerScope = "portfolio",
  ativa,
  subativa,
  onSubChange,
  onChange,
  alertas,
  recolhida,
  onToggle,
  mostrarToggle,
}: {
  consultantAccess?: boolean;
  redeAccess?: boolean;
  custId?: string;
  contaId?: string;
  sellerScope?: "single_store" | "portfolio";
  ativa: string;
  subativa?: string;
  onSubChange?: (secao: string, id: string) => void;
  onChange: (id: string) => void;
  alertas?: number;
  recolhida: boolean;
  onToggle: () => void;
  mostrarToggle: boolean;
}) {
  const tabAlertas = porId(ID_ALERTAS);
  const { pode } = usePermissoes();
  const navigate = useNavigate();
  const visivel = (a: AcessoArvore) => pode(a.permissao) && (!a.consultor || consultantAccess) && (!a.rede || redeAccess) && (a.caminho !== "/anuncios" || pode("anuncios.visualizar"));
  const filhos = (id: string) => RAMOS_ACESSOS.find(t => t.id === id)?.acessos.filter(visivel) ?? [];
  const [ramos, setRamos] = useState<string[]>([ativa]);
  useEffect(() => { setRamos(atual => atual.includes(ativa) ? atual : [...atual, ativa]); }, [ativa]);
  const tabIntegracao = {
    id: "integracao", label: "Integração", icon: Plug, order: 11.5,
    descricao: "Conectar contas do Mercado Livre",
    juniorTip: "Gere o link de integração e autorize a loja no Mercado Livre.",
  } as SellerTab;
  return (
    <nav aria-label="Seções do painel" className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {GRUPOS.filter(g => g.ids.some(id => filhos(id).length || (SECAO_PERMISSAO[id] && pode(`${SECAO_PERMISSAO[id]}.visualizar`)))).map((g) => (
          <div key={g.titulo} className="mt-5 first:mt-2">
            {!recolhida && (
              <p className="px-3 mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
                {g.titulo}
                {g.titulo === "Visão geral" && <NovidadeTip id="sidebar" />}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.ids.map((id) => {
                const tab = RAMOS_ACESSOS.find(t => t.id === id);
                const subs = filhos(id);
                if (!tab || (!subs.length && !(SECAO_PERMISSAO[id] && pode(`${SECAO_PERMISSAO[id]}.visualizar`)))) return null;
                return (
                  <li key={id}>
                    <Button variant="ghost" aria-label={tab.label} aria-expanded={subs.length ? ramos.includes(id) : undefined}
                      onClick={() => {
                        if (id === "efficiency" && !ramos.includes(id)) {
                          window.__lovableEvents?.track?.("project.summary_tree_opened", {
                            consultant_access: consultantAccess,
                            seller_scope: sellerScope,
                            source_view: "dashboard_sidebar",
                          });
                        }
                        if (recolhida) onToggle();
                        if (subs.length) setRamos(atual => atual.includes(id) ? atual.filter(r => r !== id) : [...atual, id]);
                        else onChange(id);
                      }}
                      className={cn("panel-nav-item w-full min-h-10 h-auto py-2 gap-2 px-3 justify-start text-[13px]", ativa === id ? "bg-muted text-primary" : "text-foreground/80", recolhida && "justify-center px-0")}
                      title={recolhida ? tab.label : undefined}>
                      <tab.icon className="h-4 w-4 shrink-0" />
                      {!recolhida && <><span className="whitespace-normal flex-1 text-left">{tab.label}</span>{subs.length > 0 && (ramos.includes(id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}</>}
                    </Button>
                    {!recolhida && ramos.includes(id) && subs.length > 0 && <ul className="ml-5 pl-2 border-l border-border space-y-1 py-1">
                      {subs.map(sub => { const IconeSub = ICONES_SUBANALISE[sub.id] ?? ChartNoAxesCombined; return <li key={sub.id}><Button variant="ghost" onClick={() => {
                        if ((id === "reputation" || id === "competitiveness" || id === "publicidade") && (ativa !== id || subativa !== sub.id)) {
                          window.__lovableEvents?.track?.("project.seller_section_opened", {
                            section: id === "competitiveness" ? "price" : id === "publicidade" ? "advertising" : "reputation",
                            subsection: sub.id,
                            consultant_access: consultantAccess,
                            seller_scope: sellerScope,
                            source_view: "dashboard_sidebar",
                          });
                        }
                        if (sub.caminho) navigate(destinoAcesso(sub, custId, contaId));
                        else onSubChange?.(sub.secao ?? id, sub.subaba ?? sub.id);
                      }}
                        aria-current={ativa === id && subativa === sub.id ? "page" : undefined}
                        className={cn("w-full min-h-9 h-auto py-2 px-2 justify-start text-left whitespace-normal text-xs leading-5", ativa === id && subativa === sub.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground")}>
                        <IconeSub aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span>{sub.label}</span>
                      </Button></li>; })}
                    </ul>}
                  </li>
                );
              })}
              {g.ids.includes("correlacoes") && pode('integracoes.visualizar') && (
                <ItemNav
                  tab={tabIntegracao}
                  ativo={false}
                  recolhida={recolhida}
                  onSelect={() => navigate("/integracoes")}
                />
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-muted/[0.15] px-2 py-2 space-y-1">
        {mostrarToggle && (
          <Button variant="ghost"
            type="button"
            onClick={onToggle}
            aria-label={recolhida ? "Expandir navegação" : "Recolher navegação"}
            className={cn(
              "w-full flex items-center gap-2.5 h-9 rounded-md text-[13px] font-medium text-foreground/80 hover:bg-muted/50 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
              recolhida ? "justify-center px-0" : "px-3",
            )}
          >
            {recolhida ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!recolhida && <span>Recolher</span>}
          </Button>
        )}
        {tabAlertas && pode('alertas.visualizar') && (
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

export default function PainelSidebar({ redeAccess, custId, contaId, ativa, subativa, onSubChange, onChange, alertas, mobileAberto, onMobileChange, consultantAccess, sellerScope }: Props) {
  const [recolhida, setRecolhida] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const salvo = window.localStorage.getItem(CHAVE);
    if (salvo !== null) return salvo === "true";
    return false;
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
          "painel-navigation panel-sidebar hidden lg:block shrink-0 sticky self-start top-4 z-30 overflow-hidden",
          recolhida ? "w-[64px]" : "w-[248px]",
        )}
      >
        <Conteudo
          redeAccess={redeAccess} custId={custId} contaId={contaId}
          consultantAccess={consultantAccess}
          sellerScope={sellerScope}
          ativa={ativa}
          subativa={subativa}
          onSubChange={onSubChange}
          onChange={onChange}
          alertas={alertas}
          recolhida={recolhida}
          onToggle={() => setRecolhida((v) => !v)}
          mostrarToggle
        />
      </aside>

      {/* Drawer < 1024px */}
      <Sheet open={mobileAberto} onOpenChange={onMobileChange}>
        <SheetContent side="left" className="painel-navigation w-[248px] p-0">
          <SheetTitle className="sr-only">Seções do painel</SheetTitle>
          <SheetDescription className="sr-only">Navegação entre as seções da loja selecionada.</SheetDescription>
          <div className="h-full pt-8">
            <Conteudo
              redeAccess={redeAccess} custId={custId} contaId={contaId}
          consultantAccess={consultantAccess}
              sellerScope={sellerScope}
              ativa={ativa}
              subativa={subativa}
              onSubChange={(secao, id) => { onSubChange?.(secao, id); onMobileChange(false); }}
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
