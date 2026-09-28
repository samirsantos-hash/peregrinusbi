import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Inativo { user_id: string; email: string; ultimo_acesso: string; dias: number }

export default function AlertaInatividade() {
  const { user } = useAuth();
  const [itens, setItens] = useState<Inativo[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) { setItens([]); return; }
    let ativo = true;
    const carregar = async () => {
      const { data } = await supabase.rpc("alertas_inatividade_pendentes" as any);
      if (ativo) setItens(((data as any[]) ?? []) as Inativo[]);
    };
    carregar();
    const t = setInterval(carregar, 30 * 60_000);
    return () => { ativo = false; clearInterval(t); };
  }, [user?.id]);

  const confirmar = async () => {
    if (!user) return;
    setSalvando(true);
    await supabase.from("alerta_inatividade_ciente" as any).upsert(
      itens.map((i) => ({ destinatario_id: user.id, usuario_inativo_id: i.user_id, ultimo_acesso: i.ultimo_acesso })) as any,
      { onConflict: "destinatario_id,usuario_inativo_id,ultimo_acesso", ignoreDuplicates: true },
    );
    setSalvando(false);
    setItens([]);
  };

  return (
    <AlertDialog open={itens.length > 0}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usuários sem acesso há 3 dias ou mais</AlertDialogTitle>
          <AlertDialogDescription>Estes usuários não entram no painel há pelo menos 3 dias:</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-64 overflow-auto space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i.user_id} className="flex justify-between gap-2 border-b border-border/40 py-1">
              <span className="truncate">{i.email}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{i.dias} dias</span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogAction onClick={confirmar} disabled={salvando}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
