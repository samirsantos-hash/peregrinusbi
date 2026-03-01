import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NoAccess = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 w-full max-w-md text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
        <h1 className="text-xl font-bold">Painel em Processamento</h1>
        <p className="text-sm text-muted-foreground">
          Seu painel está sendo configurado. Assim que suas lojas forem vinculadas, você terá acesso ao dashboard.
        </p>
        <p className="text-xs text-muted-foreground">
          Entre em contato com o suporte para mais informações.
        </p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </motion.div>
    </div>
  );
};

export default NoAccess;
