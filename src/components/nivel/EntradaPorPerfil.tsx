import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePerfilNavegacao } from "@/hooks/nivel/usePerfilNavegacao";
import SeletorVinculo from "./SeletorVinculo";

/**
 * Redirect pós-login: leva cada perfil para PROFUNDIDADE[perfil].entrada.
 * Consultor (admin/gerente) continua na tela legada de "/", que já é
 * escopada por RLS e serve de hub para os demais painéis.
 */
export default function EntradaPorPerfil({ children }: { children: React.ReactNode }) {
  const { perfil, entrada, precisaSeletor, loading } = usePerfilNavegacao();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (perfil === "consultor") return <>{children}</>;
  if (entrada) return <Navigate to={entrada} replace />;
  if (precisaSeletor) return <SeletorVinculo perfil={perfil} nivel={perfil === "dono_grupo" ? 1 : 2} />;

  return <>{children}</>;
}