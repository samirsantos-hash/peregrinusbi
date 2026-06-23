import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

        const hashError = hashParams.get("error_description") || hashParams.get("error");
        if (hashError) {
          if (!cancelled) {
            setErrorMsg(decodeURIComponent(hashError.replace(/\+/g, " ")));
            setChecking(false);
          }
          return;
        }

        // PKCE flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) { setErrorMsg(error.message); setChecking(false); return; }
          window.history.replaceState({}, "", window.location.pathname);
          setReady(true); setChecking(false); return;
        }

        // Implicit flow: #access_token=...&type=recovery
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (error) { setErrorMsg(error.message); setChecking(false); return; }
          window.history.replaceState({}, "", window.location.pathname);
          setReady(true); setChecking(false); return;
        }

        // Token-hash flow: ?token_hash=...&type=recovery
        const tokenHash = url.searchParams.get("token_hash");
        const qType = url.searchParams.get("type");
        if (tokenHash && qType) {
          const { error } = await supabase.auth.verifyOtp({
            type: qType as "recovery",
            token_hash: tokenHash,
          });
          if (cancelled) return;
          if (error) { setErrorMsg(error.message); setChecking(false); return; }
          window.history.replaceState({}, "", window.location.pathname);
          setReady(true); setChecking(false); return;
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data.session) setReady(true);
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Erro ao validar link");
          setChecking(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    void init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha redefinida com sucesso!" });
      navigate("/");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 w-full max-w-sm text-center space-y-4"
        >
          <KeyRound className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Link Inválido ou Expirado</h1>
          <p className="text-sm text-muted-foreground">
            {errorMsg || "Este link de redefinição é inválido ou expirou."}
          </p>
          <p className="text-xs text-muted-foreground">
            Dica: alguns clientes de e-mail (Outlook, antivírus) pré-visitam o link e consomem o token. Abra o link em uma janela anônima ou solicite um novo.
          </p>
          <Button variant="outline" onClick={() => navigate("/forgot-password")} className="w-full">
            Solicitar novo link
          </Button>
          <Button variant="ghost" onClick={() => navigate("/auth")} className="w-full">
            Voltar ao Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <KeyRound className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Nova Senha</h1>
          <p className="text-xs text-muted-foreground">Crie sua nova senha abaixo.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Nova Senha
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;