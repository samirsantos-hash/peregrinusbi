import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePerfilNavegacao } from "@/hooks/nivel/usePerfilNavegacao";
import { nivelPermitido, nivelAcimaPermitido, ROTAS_NIVEL } from "@/lib/navegacao/perfis";
import SeletorVinculo from "./SeletorVinculo";

/** Redireciona à entrada do perfil quando o nível não é permitido. Nunca renderiza 403. */
export default function GuardaNivel({ nivel, children }: { nivel: number; children: React.ReactNode }) {
  const { perfil, entrada, precisaSeletor, loading } = usePerfilNavegacao();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (nivelPermitido(perfil, nivel)) return <>{children}</>;

  if (entrada) return <Navigate to={entrada} replace />;

  if (precisaSeletor) {
    const acima = nivelAcimaPermitido(perfil);
    return <SeletorVinculo perfil={perfil} nivel={acima ?? 2} />;
  }

  return <Navigate to={ROTAS_NIVEL[nivelAcimaPermitido(perfil) ?? 2].split("/:")[0]} replace />;
}
