import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Setup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    // We can't check directly due to RLS, so we'll try the endpoint
    setChecking(false);
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-admin", {
        body: { email, password },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === "Admin already exists") {
          setAdminExists(true);
          toast({ title: "Admin já existe", description: "Faça login normalmente.", variant: "destructive" });
        } else {
          throw new Error(data.error);
        }
        setLoading(false);
        return;
      }

      toast({ title: "Admin criado com sucesso!" });
      // Auto login
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 w-full max-w-sm text-center space-y-4">
          <ShieldCheck className="w-10 h-10 text-emerald mx-auto" />
          <h1 className="text-xl font-bold">Admin já configurado</h1>
          <Button onClick={() => navigate("/auth")}>Ir para Login</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-neon-blue mx-auto" />
          <h1 className="text-xl font-bold">Configuração Inicial</h1>
          <p className="text-xs text-muted-foreground">Crie a conta de administrador</p>
        </div>
        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail do Admin</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Criar Admin
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Setup;
