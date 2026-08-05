import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavegarPreservando } from "@/contexts/ContextoNavegacao";
import { usePerfilNavegacao } from "@/hooks/nivel/usePerfilNavegacao";
import { nivelPermitido } from "@/lib/navegacao/perfis";
import SemaforoStatus from "@/components/programas/base/SemaforoStatus";
import { statusPorMeta } from "@/lib/navegacao/tipos";
import { useIsMobile } from "@/hooks/use-mobile";
import type { StatusOkr } from "@/types/programas";
import { cn } from "@/lib/utils";

export interface SegmentoBreadcrumb {
  nivel: number;
  rotulo: string;
  destino: string;
  /** Como buscar os irmãos deste segmento. */
  irmaos?:
    | { tipo: "grupos" }
    | { tipo: "lojas"; grupoId?: string | null }
    | { tipo: "programas"; lojaId: string }
    | { tipo: "categorias"; lojaId: string; programaId: string }
    | { tipo: "anuncios"; lojaId: string; categoriaId?: string | null };
}

interface Irmao {
  id: string;
  nome: string;
  status: StatusOkr;
  destino: string;
}

function useIrmaos(cfg: SegmentoBreadcrumb["irmaos"], aberto: boolean) {
  return useQuery<Irmao[]>({
    queryKey: ["irmaos", cfg],
    enabled: aberto && !!cfg,
    queryFn: async () => {
      if (!cfg) return [];
      if (cfg.tipo === "grupos") {
        const { data } = await supabase.from("grupos").select("id, nome").eq("ativo", true).order("nome");
        return (data || []).map((g) => ({ id: g.id, nome: g.nome, status: "sem_dado" as StatusOkr, destino: `/grupos/${g.id}` }));
      }
      if (cfg.tipo === "lojas") {
        const q = supabase.from("sellers").select("id, nickname, grupo_id").order("nickname");
        const { data } = cfg.grupoId && cfg.grupoId !== "sem-grupo" ? await q.eq("grupo_id", cfg.grupoId) : await q;
        const lojas = data || [];
        const { data: kpis } = await supabase
          .from("sellers_kpi")
          .select("seller_id, tgmv_lc, f_tgmv_lc")
          .in("seller_id", lojas.slice(0, 200).map((l) => l.id));
        const ag = new Map<string, { t: number; m: number }>();
        for (const k of kpis || []) {
          const a = ag.get(k.seller_id) ?? { t: 0, m: 0 };
          a.t += Number(k.tgmv_lc ?? 0);
          a.m += Number(k.f_tgmv_lc ?? 0);
          ag.set(k.seller_id, a);
        }
        return lojas.map((l) => {
          const a = ag.get(l.id);
          return {
            id: l.id,
            nome: l.nickname || "—",
            status: statusPorMeta(a?.t ?? null, a?.m ?? null),
            destino: `/lojas/${l.id}`,
          };
        });
      }
      if (cfg.tipo === "programas") {
        const { data: loja } = await supabase.from("sellers").select("cust_id").eq("id", cfg.lojaId).maybeSingle();
        const { data } = await supabase
          .from("cpp_mensal")
          .select("programa, nombre_solucion, tgmv_lc, f_tgmv_lc")
          .eq("cust_id_text", String(loja?.cust_id ?? ""));
        const ag = new Map<string, { nome: string; t: number; m: number }>();
        for (const r of data || []) {
          const chave = String(r.programa || "sem_programa");
          const a = ag.get(chave) ?? { nome: r.nombre_solucion || chave, t: 0, m: 0 };
          a.t += Number(r.tgmv_lc ?? 0);
          a.m += Number(r.f_tgmv_lc ?? 0);
          ag.set(chave, a);
        }
        return [...ag.entries()].map(([id, a]) => ({
          id,
          nome: a.nome,
          status: statusPorMeta(a.t || null, a.m || null),
          destino: `/lojas/${cfg.lojaId}/programas?programa=${encodeURIComponent(id)}`,
        }));
      }
      if (cfg.tipo === "categorias") {
        const { data } = await supabase
          .from("live_listings")
          .select("dom_domain_agg1, categoria")
          .eq("seller_id", cfg.lojaId)
          .limit(2000);
        const nomes = [...new Set((data || []).map((l) => l.dom_domain_agg1 || l.categoria || "Sem categoria"))];
        return nomes.map((n) => ({
          id: n,
          nome: n,
          status: "sem_dado" as StatusOkr,
          destino: `/lojas/${cfg.lojaId}/programas/${encodeURIComponent(cfg.programaId)}/categorias/${encodeURIComponent(n)}`,
        }));
      }
      const q = supabase
        .from("seller_eligibility")
        .select("item_id, item_name, dom_domain_agg1, flag_best_promo")
        .eq("seller_id", cfg.lojaId)
        .limit(300);
      const { data } = cfg.categoriaId ? await q.eq("dom_domain_agg1", cfg.categoriaId) : await q;
      const vistos = new Set<string>();
      return (data || [])
        .filter((e) => e.item_id && !vistos.has(e.item_id) && vistos.add(e.item_id))
        .map((e) => ({
          id: e.item_id!,
          nome: e.item_name || e.item_id!,
          status: (e.flag_best_promo ? "verde" : "atencao") as StatusOkr,
          destino: `/lojas/${cfg.lojaId}/anuncios/${e.item_id}`,
        }));
    },
  });
}

function DropdownIrmaos({ seg }: { seg: SegmentoBreadcrumb }) {
  const [aberto, setAberto] = useState(false);
  const navegar = useNavegarPreservando();
  const { data, isLoading } = useIrmaos(seg.irmaos, aberto);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
          aria-label={`Trocar ${seg.rotulo}`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1 max-h-80 overflow-auto">
        {isLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Carregando…</div>}
        {!isLoading && !data?.length && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum irmão.</div>}
        {(data || []).map((i) => (
          <button
            key={i.id}
            onClick={() => {
              setAberto(false);
              navegar(i.destino);
            }}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-muted/60"
          >
            <span className="truncate">{i.nome}</span>
            <SemaforoStatus status={i.status} compacto />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function BreadcrumbSeletor({ segmentos }: { segmentos: SegmentoBreadcrumb[] }) {
  const navegar = useNavegarPreservando();
  const { perfil } = usePerfilNavegacao();
  const isMobile = useIsMobile();

  const visiveis = segmentos.filter((s) => nivelPermitido(perfil, s.nivel));
  if (!visiveis.length) return null;

  const atual = visiveis[visiveis.length - 1];
  const pai = visiveis[visiveis.length - 2];
  const ancestrais = visiveis.slice(0, Math.max(0, visiveis.length - 2));

  const Segmento = ({ seg, ultimo }: { seg: SegmentoBreadcrumb; ultimo: boolean }) => (
    <span className="flex items-center gap-1 min-w-0">
      <button
        onClick={() => !ultimo && navegar(seg.destino)}
        disabled={ultimo}
        className={cn(
          "truncate max-w-[180px]",
          ultimo ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {seg.rotulo}
      </button>
      {seg.irmaos && <DropdownIrmaos seg={seg} />}
    </span>
  );

  if (isMobile) {
    return (
      <nav aria-label="Navegação hierárquica" className="flex items-center gap-1.5 text-xs min-w-0">
        {ancestrais.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Ancestrais">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {ancestrais.map((a) => (
                <button
                  key={a.destino}
                  onClick={() => navegar(a.destino)}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted/60 truncate"
                >
                  {a.rotulo}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
        {ancestrais.length > 0 && <span className="text-muted-foreground">/</span>}
        {pai && (
          <>
            <Segmento seg={pai} ultimo={false} />
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <Segmento seg={atual} ultimo />
      </nav>
    );
  }

  return (
    <nav aria-label="Navegação hierárquica" className="flex items-center gap-1.5 text-xs min-w-0 flex-wrap">
      {visiveis.map((seg, i) => (
        <span key={`${seg.nivel}-${seg.destino}`} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          <Segmento seg={seg} ultimo={i === visiveis.length - 1} />
        </span>
      ))}
    </nav>
  );
}
