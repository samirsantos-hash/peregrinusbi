import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Resultado = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<Resultado>;
  approveAuthorization: (id: string) => Promise<Resultado>;
  denyAuthorization: (id: string) => Promise<Resultado>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Pedido de autorização inválido ou ausente.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError("Este pedido expirou ou não é válido. Inicie a conexão de novo.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("Não foi possível carregar o pedido. Tente novamente.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) throw error;
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("sem retorno");
      window.location.href = target;
    } catch {
      setBusy(false);
      setError(approve ? "Não foi possível aprovar a conexão." : "Não foi possível cancelar a conexão.");
    }
  }

  const cliente = details?.client?.name ?? details?.client?.client_name ?? "Um aplicativo";
  const scopes: string[] = String(details?.scope ?? "").split(" ").filter(Boolean);
  const rotulo = (s: string) =>
    s === "openid" ? "Confirmar sua identidade" : s === "email" ? "Compartilhar seu e-mail" : s === "profile" ? "Compartilhar seu perfil básico" : `Permissão adicional solicitada: ${s}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md space-y-5">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !details ? (
          <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Conectar {cliente} ao Peregrinus</h1>
            <p className="text-sm text-muted-foreground">
              {cliente} poderá consultar as lojas e indicadores do painel em seu nome, enquanto você estiver conectado como <strong className="text-foreground">{email}</strong>.
            </p>
            {details?.redirect_uri && <p className="text-xs text-muted-foreground break-all">Retorno: {details.redirect_uri}</p>}
            {scopes.length > 0 && (
              <ul className="text-sm list-disc pl-5 space-y-1">{scopes.map((s) => <li key={s}>{rotulo(s)}</li>)}</ul>
            )}
            <p className="text-xs text-muted-foreground">Isso não ignora as permissões da sua conta: só aparecem as lojas da sua carteira.</p>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1">Aprovar</Button>
              <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">Cancelar conexão</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
