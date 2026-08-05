import { useParams } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import NavegacaoLateral from "@/components/nivel/NavegacaoLateral";
import { useNivel3, useNivel4 } from "@/hooks/nivel/useNivelDados";
import { useTrilha } from "@/hooks/nivel/useTrilha";

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function N4Categoria() {
  const { lojaId = "", programaId = "todos", categoriaId = "" } = useParams();
  const categoria = decodeURIComponent(categoriaId);
  const { data, isLoading, error } = useNivel4(lojaId, programaId, categoria);
  const irmaos = useNivel3(lojaId, programaId === "todos" ? null : programaId);
  const trilha = useTrilha({ lojaId, programaId, categoriaId: categoria });

  const lista = irmaos.data?.itens ?? [];
  const idx = lista.findIndex((i) => i.id === categoria);
  const anterior = idx > 0 ? { rotulo: lista[idx - 1].nome, destino: lista[idx - 1].destino } : null;
  const proximo = idx >= 0 && idx < lista.length - 1 ? { rotulo: lista[idx + 1].nome, destino: lista[idx + 1].destino } : null;

  return (
    <NivelLayout
      nivel={4}
      breadcrumb={trilha}
      acoesTopo={<NavegacaoLateral anterior={anterior} proximo={proximo} />}
      heroi={{ valor: brl(data?.heroi ?? null), rotulo: "Dinheiro não coberto nesta categoria" }}
      kpis={[
        { rotulo: "Anúncios", valor: String(data?.totalFilhos ?? "—") },
        { rotulo: "Sem melhor promoção", valor: String((data?.itens ?? []).filter((i) => i.status !== "verde").length) },
        { rotulo: "Categoria", valor: categoria },
        { rotulo: "Programa", valor: programaId === "todos" ? "Todos" : programaId },
      ]}
      corpo={
        <ListaFilhos
          itens={data?.itens ?? []}
          unidadeGap="pct"
          vazio="Nenhum anúncio elegível nesta categoria."
          reconciliacao={{ totalPai: data?.heroi ?? null, comDado: data?.comDado ?? 0, totalFilhos: data?.totalFilhos ?? 0 }}
        />
      }
      confianca="Fonte: seller_eligibility · gap R$ = (desconto ideal − desconto atual) × TSI diário × 30"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar a categoria." : null}
    />
  );
}
