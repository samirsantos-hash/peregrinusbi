import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpeg";

type Estado = "carregando" | "pronto" | "ok" | "erro" | "invalido";

const ConectarConvite = () => {
  const { token = "" } = useParams();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [rotulo, setRotulo] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("status");
    if (status === "ok") { setEstado("ok"); return; }
    if (status === "erro") setMsg(p.get("msg") ?? "");
    (async () => {
      const { data, error } = await supabase.functions.invoke("ml-oauth-start", {
        body: { convite: token, apenas_consultar: true },
      });
      if (error || !data || (data as { error?: string }).error) {
        setEstado("invalido");
        return;
      }
      setRotulo((data as { rotulo?: string }).rotulo ?? null);
      setEstado(status === "erro" ? "erro" : "pronto");
    })();
  }, [token]);

  const autorizar = async () => {
    setIndo(true);
    const { data, error } = await supabase.functions.invoke("ml-oauth-start", { body: { convite: token } });
    const url = (data as { url?: string } | null)?.url;
    if (error || !url) { setEstado("invalido"); setIndo(false); return; }
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/60 p-8 space-y-6 text-center">
        <img src={logo} alt="Ecom Peregrinus" className="mx-auto h-16 w-16 rounded-xl object-cover" />
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-primary">Integração Peregrinus</p>
          <h1 className="text-xl font-semibold">Conectar sua loja do Mercado Livre</h1>
          {rotulo && <p className="text-sm text-muted-foreground">{rotulo}</p>}
        </div>

        {estado === "carregando" && (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        )}

        {(estado === "pronto" || estado === "erro") && (
          <>
            {estado === "erro" && (
              <p className="text-xs text-destructive">
                A conexão não foi concluída{msg ? ` (${msg.replace(/_/g, " ")})` : ""}. Tente novamente.
              </p>
            )}
            <ul className="text-left text-xs text-muted-foreground space-y-2">
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                A Peregrinus terá acesso apenas de leitura a vendas e custos, para montar seu painel.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Não alteramos anúncios, preços nem sua senha.</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Entre com a conta principal da loja. Contas de colaborador não conseguem autorizar.</li>
            </ul>
            <Button className="w-full" onClick={autorizar} disabled={indo}>
              {indo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Autorizar conexão Peregrinus
            </Button>
          </>
        )}

        {estado === "ok" && (
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p className="font-medium">Loja conectada com sucesso!</p>
            <p className="text-xs text-muted-foreground">
              Já estamos importando seu histórico. Pode fechar esta página.
            </p>
          </div>
        )}

        {estado === "invalido" && (
          <div className="space-y-2">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-medium">Convite inválido, expirado ou já utilizado</p>
            <p className="text-xs text-muted-foreground">Peça um novo link ao seu consultor Peregrinus.</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">Ecom Peregrinus · conexão segura via Mercado Livre</p>
      </div>
    </div>
  );
};

export default ConectarConvite;
