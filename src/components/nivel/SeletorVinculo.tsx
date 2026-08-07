import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ListaFilhos from "./ListaFilhos";
import type { ItemFilho } from "@/lib/navegacao/tipos";
import type { StatusOkr } from "@/types/programas";
import type { Perfil } from "@/lib/navegacao/perfis";

/** Semáforo pelo nível de reputação do último mês; vazio = sem_dado. */
function statusPorReputacao(nivel: string | null | undefined): StatusOkr {
  const s = (nivel ?? "").trim().toLowerCase();
  if (s === "") return "sem_dado";
  if (s.startsWith("green") || s === "light_green") return "verde";
  if (s === "yellow") return "atencao";
  if (s === "orange" || s === "red") return "critico";
  return "sem_dado";
}

/** Mostrado quando o usuário tem mais de um vínculo no nível de entrada. */
export default function SeletorVinculo({ perfil, nivel }: { perfil: Perfil; nivel: number }) {
  const grupos = nivel <= 1;
  const [busca, setBusca] = useState("");

  const { data } = useQuery<ItemFilho[]>({
    queryKey: ["seletor-vinculo", perfil, grupos],
    queryFn: async () => {
      if (grupos) {
        const { data } = await supabase.from("grupos").select("id, nome").eq("ativo", true).order("nome");
        return (data || []).map((g) => ({
          id: g.id,
          nome: g.nome,
          status: "sem_dado" as StatusOkr,
          valor: null,
          unidade: "BRL" as const,
          gap: null,
          serie: [],
          acao: "abrir",
          destino: `/grupos/${g.id}`,
        }));
      }

      const [{ data: lojas }, { data: kpis }] = await Promise.all([
        supabase.from("sellers").select("id, nickname").order("nickname"),
        supabase
          .from("sellers_kpi")
          .select("seller_id, data, tgmv_lc, rep_current_level")
          .order("data", { ascending: false }),
      ]);

      const ultimo = new Map<string, { tgmv_lc: number | null; rep_current_level: string | null }>();
      for (const k of kpis || []) if (!ultimo.has(k.seller_id)) ultimo.set(k.seller_id, k as never);

      return (lojas || []).map((s) => {
        const k = ultimo.get(s.id);
        return {
          id: s.id,
          nome: s.nickname || "—",
          status: statusPorReputacao(k?.rep_current_level),
          valor: k?.tgmv_lc ?? null,
          unidade: "BRL" as const,
          gap: null,
          serie: [],
          acao: "abrir",
          destino: `/lojas/${s.id}`,
        };
      });
    },
  });

  const itens = useMemo(() => {
    const todos = data || [];
    const q = busca.trim().toLowerCase();
    return q ? todos.filter((i) => i.nome.toLowerCase().includes(q)) : todos;
  }, [data, busca]);

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6">
      <div className="w-full max-w-3xl space-y-3 pt-16">
        <h1 className="text-lg font-semibold">Escolha por onde começar</h1>
        <p className="text-sm text-muted-foreground">
          Você tem acesso a mais de {grupos ? "um grupo" : "uma loja"} — ordenados por urgência.
        </p>

        {(data || []).length > 10 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={grupos ? "Buscar grupo" : "Buscar loja"}
              aria-label={grupos ? "Buscar grupo" : "Buscar loja"}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <ListaFilhos itens={itens} vazio={grupos ? "Nenhum grupo disponível" : "Nenhuma loja disponível"} />
      </div>
    </div>
  );
}
