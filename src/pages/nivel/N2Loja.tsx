import { useParams } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import { useNivel2, useNivel3, useNivel4 } from "@/hooks/nivel/useNivelDados";
import { useTrilha } from "@/hooks/nivel/useTrilha";
import { useContextoNavegacao } from "@/contexts/ContextoNavegacao";

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
  { id: "programas", rotulo: "Programas" },
  { id: "anuncios", rotulo: "Anúncios" },
  { id: "operacao", rotulo: "Operação" },
];

export default function N2Loja() {
  const { lojaId = "" } = useParams();
  const { aba, setAba } = useContextoNavegacao();
  const abaAtiva = aba ?? "visao";
  const { data, isLoading, error } = useNivel2(lojaId);
  const trilha = useTrilha({ lojaId });

  const anuncios = useNivel4(abaAtiva === "anuncios" ? lojaId : "", "todos", "");
  const categorias = useNivel3(abaAtiva === "operacao" ? lojaId : "", null);

  const corpo =
    abaAtiva === "anuncios" ? (
      <ListaFilhos
        itens={anuncios.data?.itens ?? []}
        vazio="Esta loja não tem anúncios elegíveis mapeados."
        reconciliacao={{ totalPai: null, comDado: anuncios.data?.comDado ?? 0, totalFilhos: anuncios.data?.totalFilhos ?? 0 }}
      />
    ) : abaAtiva === "operacao" ? (
      <ListaFilhos
        itens={categorias.data?.itens ?? []}
        vazio="Esta loja não tem categorias mapeadas."
        reconciliacao={{ totalPai: null, comDado: categorias.data?.comDado ?? 0, totalFilhos: categorias.data?.totalFilhos ?? 0, unidade: "pct" }}
      />
    ) : (
      <ListaFilhos
        itens={data?.itens ?? []}
        vazio="Sem dados de programas (CPP) carregados na base para o período. Não é restrição de acesso: a base de programas está vazia até o próximo import."
        reconciliacao={{ totalPai: data?.heroi ?? null, comDado: data?.comDado ?? 0, totalFilhos: data?.totalFilhos ?? 0 }}
      />
    );

  return (
    <NivelLayout
      nivel={2}
      breadcrumb={trilha}
      status={data?.status}
      heroi={{ valor: brl(data?.heroi ?? null), rotulo: `Faturamento · meta ${brl(data?.meta ?? null)}` }}
      kpis={[
        { rotulo: "Itens vendidos (TSI)", valor: data?.kpis.tsi != null ? data.kpis.tsi.toLocaleString("pt-BR") : "—" },
        {
          rotulo: "Taxa de reclamações",
          valor: data?.kpis.reputacao != null ? `${data.kpis.reputacao.toFixed(2)}%` : "—",
        },
        { rotulo: "Score Full", valor: data?.kpis.scoreFull != null ? data.kpis.scoreFull.toFixed(0) : "—" },
        { rotulo: "Gap vs. meta", valor: brl(data?.heroi != null && data?.meta != null ? data.heroi - data.meta : null) },
      ]}
      abas={ABAS}
      abaAtiva={abaAtiva}
      onAba={setAba}
      corpo={corpo}
      confianca="Fonte: sellers_kpi, cpp_mensal, seller_eligibility · período do contexto"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar a loja." : null}
    />
  );
}
