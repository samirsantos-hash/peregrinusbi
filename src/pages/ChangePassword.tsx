import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const doisDigitos = (n: number) => String(Math.floor(n)).padStart(2, "0");

const formatarRestante = (ms: number) => {
  const totalSeg = Math.floor(ms / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  return `${doisDigitos(horas)}:${doisDigitos(min)}:${doisDigitos(seg)}`;
};

const traduzirErro = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("weak") || m.includes("known to be weak") || m.includes("pwned")) {
    return "Essa senha é muito comum e já apareceu em vazamentos. Escolha uma senha única (frase com números e símbolos).";
  }
  if (m.includes("should be different") || m.includes("same as the old")) {
    return "A nova senha precisa ser diferente da senha provisória.";
  }
  if (m.includes("at least") || m.includes("too short")) {
    return "A senha é curta demais. Use pelo menos 8 caracteres.";
  }
  if (m.includes("current password")) {
    return "Informe a senha provisória atual no campo acima para confirmar a troca.";
  }
  return msg;
};

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [precisaSenhaAtual, setPrecisaSenhaAtual] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const { updatePassword, tempPasswordExpiresAt, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const restante = useMemo(() => {
    if (!tempPasswordExpiresAt) return null;
    return new Date(tempPasswordExpiresAt).getTime() - agora;
  }, [tempPasswordExpiresAt, agora]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (newPassword.length < 8) {
      setErro("Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErro("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword, precisaSenhaAtual ? currentPassword : undefined);
    setLoading(false);
    if (error) {
      const msg = traduzirErro(error.message);
      if (error.message.toLowerCase().includes("current password")) setPrecisaSenhaAtual(true);
      setErro(msg);
      toast({ title: "Não foi possível salvar", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Senha alterada com sucesso!" });
    // Recarrega a aplicação em vez de trocar a árvore React durante a animação
    // (evita o erro "insertBefore" ao remontar as rotas protegidas).
    window.location.replace("/");
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <KeyRound className="w-8 h-8 text-neon-blue mx-auto" />
          <h1 className="text-xl font-bold">Alterar Senha</h1>
          <p className="text-xs text-muted-foreground">
            Você está usando uma senha provisória. Crie uma senha definitiva para continuar.
          </p>
        </div>

        {restante !== null && (
          <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-center space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> Prazo recomendado da senha provisória
            </p>
            {restante > 0 ? (
              <p className="text-lg font-semibold tabular-nums">{formatarRestante(restante)}</p>
            ) : (
              <p className="text-xs text-warning">
                Prazo recomendado encerrado — seu acesso continua liberado, é só criar a nova senha abaixo.
              </p>
            )}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default ChangePassword;
