import { Link } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import { Button } from "@/components/ui/button";
import { useNivel0 } from "@/hooks/nivel/useNivelDados";

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function N0Carteira() {
  const { data, isLoading, error } = useNivel0();

  return (
    <NivelLayout
      nivel={0}
      breadcrumb={[{ nivel: 0, rotulo: "Carteira", destino: "/carteira" }]}
      acoesTopo={<Button asChild size="sm" variant="outline"><Link to="/carteira/visao">Visão Deep Dive</Link></Button>}
      heroi={{ valor: String(data?.heroi ?? "—"), rotulo: "contas em risco hoje" }}
      kpis={[
        { rotulo: "Grupos", valor: String(data?.kpis.grupos ?? "—") },
        { rotulo: "Lojas", valor: String(data?.kpis.lojas ?? "—") },
        { rotulo: "GMV no período", valor: brl(data?.kpis.gmv ?? null) },
        { rotulo: "Meta no período", valor: brl(data?.kpis.meta ?? null) },
      ]}
      corpo={
        <ListaFilhos
          itens={data?.itens ?? []}
          vazio="Nenhum grupo cadastrado na carteira."
          reconciliacao={{
            totalPai: data?.kpis.gmv ?? null,
            comDado: data?.comDado ?? 0,
            totalFilhos: data?.totalFilhos ?? 0,
          }}
        />
      }
      confianca="Fonte: sellers_kpi (mensal) · meta = F_TGMV_LC · grupos definidos em cadastro"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar a carteira." : null}
    />
  );
}
