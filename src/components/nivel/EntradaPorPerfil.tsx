import { Navigate } from "react-router-dom";
import { Loader2, Link2Off } from "lucide-react";
import { usePerfilNavegacao } from "@/hooks/nivel/usePerfilNavegacao";
import SeletorVinculo from "./SeletorVinculo";

/**
 * Redirect pós-login: resolve o escopo do usuário e leva para
 * NAVEGACAO_POR_ESCOPO[escopo].entrada.
 *  - 'global' → /carteira SEMPRE, sem seletor.
 *  - 'grupo'/'loja' com um único vínculo → direto no nível.
 *  - mais de um vínculo sem nível acima que agrupe → seletor.
 */
export default function EntradaPorPerfil({ children }: { children: React.ReactNode }) {
  const { perfil, escopo, entrada, precisaSeletor, semVinculo, loading } = usePerfilNavegacao();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (semVinculo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <Link2Off className="w-6 h-6 mx-auto text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-semibold">Sua conta ainda não está vinculada a nenhuma loja</h1>
          <p className="text-sm text-muted-foreground">
            Peça ao administrador da carteira para vincular sua conta a uma loja ou grupo.
          </p>
        </div>
      </div>
    );
  }

  if (precisaSeletor) return <SeletorVinculo perfil={perfil} nivel={escopo === "grupo" ? 1 : 2} />;
  if (entrada) return <Navigate to={entrada} replace />;

  return <>{children}</>;
}