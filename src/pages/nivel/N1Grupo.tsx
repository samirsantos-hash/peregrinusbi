import { useParams } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import { useNivel1 } from "@/hooks/nivel/useNivelDados";
import { useTrilha } from "@/hooks/nivel/useTrilha";
import { statusPorMeta } from "@/lib/navegacao/tipos";

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function N1Grupo() {
  const { grupoId = "" } = useParams();
  const { data, isLoading, error } = useNivel1(grupoId);
  const trilha = useTrilha({ grupoId });

  const gap = data?.heroi != null && data?.meta != null ? data.heroi - data.meta : null;

  return (
    <NivelLayout
      nivel={1}
      breadcrumb={trilha}
      status={statusPorMeta(data?.heroi ?? null, data?.meta ?? null)}
      heroi={{ valor: brl(data?.heroi ?? null), rotulo: `GMV do grupo · meta ${brl(data?.meta ?? null)}` }}
      kpis={[
        { rotulo: "Lojas", valor: String(data?.kpis.lojas ?? "—") },
        { rotulo: "Lojas críticas", valor: String(data?.kpis.criticas ?? "—") },
        { rotulo: "Gap vs. meta", valor: brl(gap) },
        { rotulo: "Grupo", valor: data?.nome ?? "—" },
      ]}
      corpo={
        <ListaFilhos
          itens={data?.itens ?? []}
          vazio="Nenhuma loja neste grupo."
          reconciliacao={{
            totalPai: data?.heroi ?? null,
            comDado: data?.comDado ?? 0,
            totalFilhos: data?.totalFilhos ?? 0,
          }}
        />
      }
      confianca="Fonte: sellers_kpi (mensal) · gap = TGMV_LC − F_TGMV_LC"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar o grupo." : null}
    />
  );
}
