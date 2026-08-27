import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials" ?
        "E-mail ou senha inválidos" :
        error.message,
        variant: "destructive"
      });
    }
    // Em caso de sucesso NÃO navegamos manualmente: o estado de sessão troca a rota
    // sozinho. Navegar aqui remontava a árvore no meio da animação e quebrava o DOM
    // com "insertBefore".
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-sm space-y-6 animate-fade-in">


        <div className="text-center space-y-3">
          <div className="w-24 h-24 mx-auto rounded-xl bg-background/80 border border-border/50 p-3 flex items-center justify-center shadow-lg shadow-primary/10">
            <img alt="Ecom Peregrinus" className="w-full h-full object-contain rounded-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" src="/lovable-uploads/2ea2c914-0a18-466e-8316-75cd37bbddd8.png" />
          </div>
          <h1 className="font-bold tracking-tight font-mono bg-primary-foreground px-0 text-2xl">Ecom Peregrinus — Acesso ao Painel</h1>
          <p className="text-xs text-muted-foreground">Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required />

          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required />

          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            Entrar
          </Button>
        </form>
        <div className="text-center">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
      </motion.div>
    </div>);

};

export default Auth;