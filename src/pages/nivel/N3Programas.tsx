import { useParams } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import { useNivel3 } from "@/hooks/nivel/useNivelDados";
import { useTrilha } from "@/hooks/nivel/useTrilha";
import { useContextoNavegacao } from "@/contexts/ContextoNavegacao";
import { statusPorMeta } from "@/lib/navegacao/tipos";

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function N3Programas() {
  const { lojaId = "" } = useParams();
  const { programaId } = useContextoNavegacao();
  const { data, isLoading, error } = useNivel3(lojaId, programaId);
  const trilha = useTrilha({ lojaId, programaId: programaId ?? "todos" });

  return (
    <NivelLayout
      nivel={3}
      breadcrumb={trilha}
      status={statusPorMeta(data?.gmv ?? null, data?.meta ?? null)}
      heroi={{ valor: brl(data?.heroi ?? null), rotulo: `Gap para a meta do programa · ${data?.nomePrograma ?? ""}` }}
      kpis={[
        { rotulo: "Realizado", valor: brl(data?.gmv ?? null) },
        { rotulo: "Meta", valor: brl(data?.meta ?? null) },
        { rotulo: "Categorias", valor: String(data?.totalFilhos ?? "—") },
        {
          rotulo: "Atingimento",
          valor: data?.gmv && data?.meta ? `${((data.gmv / data.meta) * 100).toFixed(0)}%` : "—",
        },
      ]}
      corpo={
        <ListaFilhos
          itens={data?.itens ?? []}
          vazio="Este programa não tem categorias mapeadas."
          reconciliacao={{
            totalPai: null,
            comDado: data?.comDado ?? 0,
            totalFilhos: data?.totalFilhos ?? 0,
            unidade: "pct",
          }}
        />
      }
      confianca="Fonte: cpp_mensal (meta e realizado) · live_listings e seller_eligibility (cobertura por categoria)"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar o programa." : null}
    />
  );
}
