import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DadoRealProvider } from "@/components/programas/DadoRealContext";
import SeletorPrograma from "@/components/programas/SeletorPrograma";
import PainelAlavancas from "@/components/programas/PainelAlavancas";
import TabelaEcossistema from "@/components/programas/TabelaEcossistema";
import FaixaConfianca from "@/components/programas/FaixaConfianca";
import { useParticipacoes } from "@/hooks/useParticipacoes";
import type { Alavanca, Parceiro } from "@/types/programas";

const ProgramasLoja = () => {
  const { lojaId } = useParams<{ lojaId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { participacoes, programasPorId } = useParticipacoes(lojaId);

  const selecionado = searchParams.get("programa") ?? "consolidado";
  const selecionarPrograma = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("programa", id);
    setSearchParams(next, { replace: true });
  };

  const visiveis = useMemo(
    () => (selecionado === "consolidado" ? participacoes : participacoes.filter((p) => p.programaId === selecionado)),
    [participacoes, selecionado],
  );

  const alavancas: Alavanca[] = useMemo(
    () => visiveis.flatMap((p) => p.alavancas.map((a) => ({ ...a, id: `${p.programaId}:${a.id}` }))),
    [visiveis],
  );

  const parceiros: Parceiro[] = useMemo(() => {
    const mapa = new Map<string, Parceiro>();
    visiveis.forEach((p) => p.parceiros.forEach((x) => mapa.set(x.id, x)));
    return [...mapa.values()];
  }, [visiveis]);

  const cobertura = visiveis.length
    ? Math.round(visiveis.reduce((s, p) => s + p.coberturaDadosPct, 0) / visiveis.length)
    : 0;
  const atualizadoEm = visiveis.map((p) => p.atualizadoEm).sort().slice(-1)[0] ?? new Date().toISOString();
  const participacaoBase = visiveis[0];

  return (
    <TooltipProvider delayDuration={150}>
      <DadoRealProvider>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[1500px] px-4 py-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground">
                  <Link to="/"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar</Link>
                </Button>
                <h1 className="text-xl font-semibold text-foreground">Programas</h1>
                {participacaoBase && (
                  <p className="text-xs text-muted-foreground">
                    Seller {participacaoBase.sellerId} · {participacaoBase.grupo} — {participacaoBase.grupoDescricao}
                  </p>
                )}
              </div>
            </header>

            {participacoes.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <p className="text-sm text-muted-foreground">Esta loja não está vinculada a nenhum programa.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>
                  Vincular programa
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <SeletorPrograma
                  participacoes={participacoes}
                  programasPorId={programasPorId}
                  selecionado={selecionado}
                  onSelecionar={selecionarPrograma}
                />
                <PainelAlavancas alavancas={alavancas} parceiros={parceiros} />
                <TabelaEcossistema parceiros={parceiros} alavancas={alavancas} />
                <FaixaConfianca
                  participacoes={visiveis}
                  atualizadoEm={atualizadoEm}
                  coberturaDadosPct={cobertura}
                />
              </div>
            )}
          </div>
        </div>
      </DadoRealProvider>
    </TooltipProvider>
  );
};

export default ProgramasLoja;
