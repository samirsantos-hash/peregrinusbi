import { useParams } from "react-router-dom";
import NivelLayout from "@/components/nivel/NivelLayout";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import NavegacaoLateral from "@/components/nivel/NavegacaoLateral";
import { useNivel4, useNivel5 } from "@/hooks/nivel/useNivelDados";
import { useTrilha } from "@/hooks/nivel/useTrilha";
import { useContextoNavegacao } from "@/contexts/ContextoNavegacao";

export default function N5Anuncio() {
  const { lojaId = "", mlb = "" } = useParams();
  const { filtros } = useContextoNavegacao();
  const { data, isLoading, error } = useNivel5(lojaId, mlb);
  const categoria = (filtros.categoria as string) || data?.categoria || "";
  const irmaos = useNivel4(lojaId, "todos", categoria);
  const trilha = useTrilha({ lojaId, categoriaId: categoria || null, mlb });

  const lista = irmaos.data?.itens ?? [];
  const idx = lista.findIndex((i) => i.id === mlb);
  const anterior = idx > 0 ? { rotulo: lista[idx - 1].nome, destino: lista[idx - 1].destino } : null;
  const proximo = idx >= 0 && idx < lista.length - 1 ? { rotulo: lista[idx + 1].nome, destino: lista[idx + 1].destino } : null;

  return (
    <NivelLayout
      nivel={5}
      breadcrumb={trilha}
      acoesTopo={
        <div className="flex items-center gap-2">
          <a
            href={`https://www.mercadolivre.com.br/anuncio/${mlb}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Abrir no Mercado Livre
          </a>
          <NavegacaoLateral anterior={anterior} proximo={proximo} />
        </div>
      }
      corpo={
        <div className="space-y-3">
          <h1 className="text-sm font-medium">{data?.nome ?? mlb}</h1>
          <ListaFilhos
            itens={data?.itens ?? []}
            unidadeGap="pct"
            semNavegacao
            vazio="Nenhum indicador de qualidade disponível para este anúncio."
            reconciliacao={{
              totalPai: null,
              comDado: data?.comDado ?? 0,
              totalFilhos: data?.totalFilhos ?? 0,
              unidade: "pct",
            }}
          />
        </div>
      }
      confianca="Fonte: seller_listings_quality (scores) e seller_eligibility (promoções) · último dia disponível"
      carregando={isLoading}
      erro={error ? "Não foi possível carregar o anúncio." : null}
    />
  );
}
