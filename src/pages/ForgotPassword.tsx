import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendReset();
  };

  const sendReset = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      setSentTo(email);
      setResendCooldown(30);
      toast({ title: "E-mail enviado", description: `Link enviado para ${email}` });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <Mail className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Ecom Peregrinus — Recuperar Senha</h1>
          <p className="text-xs text-muted-foreground">
            {sent
              ? "Verifique sua caixa de entrada para o link de redefinição."
              : "Informe seu e-mail para receber um link de redefinição de senha."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Link
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Link enviado para:</p>
              <p className="text-sm font-medium break-all">{sentTo}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Se este e-mail estiver cadastrado, você receberá o link em instantes. Verifique também a caixa de spam.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading || resendCooldown > 0}
              onClick={sendReset}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar e-mail"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setSent(false); setSentTo(""); }}
            >
              Usar outro e-mail
            </Button>
          </div>
        )}

        <div className="text-center">
          <Link to="/auth" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
