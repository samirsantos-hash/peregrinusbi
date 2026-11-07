import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Mesmo início de autorização do Admin → Integrações (redirect de página inteira). */
async function iniciarConexao() {
  const { data, error } = await supabase.functions.invoke("ml-oauth-start", { body: {} });
  const destino = (data as { url?: string } | null)?.url;
  if (error || !destino) throw new Error("Não foi possível iniciar a conexão com o Mercado Livre.");
  window.location.href = destino;
}

export default function BotaoConexaoMl({ custId }: { custId?: string }) {
  const [abrindo, setAbrindo] = useState(false);
  const status = useQuery({
    queryKey: ["ml-conexao-loja", custId],
    enabled: !!custId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ml_sync_tema")
        .select("atualizado_em").eq("cust_id", custId).order("atualizado_em", { ascending: false }).limit(1).maybeSingle();
      return (data?.atualizado_em as string | undefined) ?? null;
    },
  });

  const conectar = async () => {
    setAbrindo(true);
    try { await iniciarConexao(); } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar a conexão.");
      setAbrindo(false);
    }
  };

  const base = "h-9 rounded-xl px-4 text-sm font-medium gap-2 transition-[transform,background-color] duration-150 active:scale-[0.98]";

  if (custId && status.isLoading) {
    return <Button variant="outline" disabled className={base}><Loader2 className="h-4 w-4 animate-spin" />Verificando conexão</Button>;
  }

  if (status.data) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={base} aria-label="Mercado Livre conectado — ver detalhes">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="hidden sm:inline">Mercado Livre conectado</span>
            <span className="sm:hidden">Conectado</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3 text-xs">
          <p className="font-medium text-foreground">Conta conectada</p>
          <p className="text-muted-foreground">Última leitura em {new Date(status.data).toLocaleString("pt-BR")}. Os dados atualizam sozinhos.</p>
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={conectar} disabled={abrindo}>
            {abrindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Reconectar
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button onClick={conectar} disabled={abrindo}
      className={`${base} border border-ml-amarelo/40 bg-ml-amarelo/15 text-foreground hover:bg-ml-amarelo/25`}>
      {abrindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
      <span className="hidden sm:inline">Conectar Mercado Livre</span>
      <span className="sm:hidden">Conectar ML</span>
    </Button>
  );
}
