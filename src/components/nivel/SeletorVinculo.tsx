import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavegarPreservando } from "@/contexts/ContextoNavegacao";
import type { Perfil } from "@/lib/navegacao/perfis";

/** Mostrado quando o usuário tem mais de um vínculo no nível de entrada. */
export default function SeletorVinculo({ perfil, nivel }: { perfil: Perfil; nivel: number }) {
  const navegar = useNavegarPreservando();
  const grupos = nivel <= 1;

  const { data } = useQuery({
    queryKey: ["seletor-vinculo", perfil, grupos],
    queryFn: async () => {
      if (grupos) {
        const { data } = await supabase.from("grupos").select("id, nome").eq("ativo", true).order("nome");
        return (data || []).map((g) => ({ id: g.id, nome: g.nome, destino: `/grupos/${g.id}` }));
      }
      const { data } = await supabase.from("sellers").select("id, nickname").order("nickname");
      return (data || []).map((s) => ({ id: s.id, nome: s.nickname || "—", destino: `/lojas/${s.id}` }));
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3">
        <h1 className="text-lg font-semibold">Escolha por onde começar</h1>
        <p className="text-sm text-muted-foreground">
          Você tem acesso a mais de {grupos ? "um grupo" : "uma loja"}.
        </p>
        <div className="rounded-lg border border-border divide-y divide-border">
          {(data || []).map((o) => (
            <button
              key={o.id}
              onClick={() => navegar(o.destino)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
            >
              {o.nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
