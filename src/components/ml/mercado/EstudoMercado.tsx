import { ExternalLink } from "lucide-react";
import { brl, num, pctFracao } from "@/lib/format";
import { dataHoraBr } from "@/lib/mlFuncoes";
import { LOGISTICA, TIPO_ANUNCIO } from "@/lib/mlRotulos";

export type Sinal = "verde" | "amarelo" | "vermelho" | "sem_dado";
type Quartis = { n: number; min: number; q1: number; mediana: number; q3: number; max: number };
type Fator = { id: string; nome: string; sinal: Sinal; medido: string; regra: string };
type Tendencia = { posicao: number; palavra: string; url: string | null; grupo: "crescimento" | "desejadas" | "populares"; no_titulo: boolean; relacionada: boolean };
type Margem = { preco: number; tarifa: number; custo: number; frete: number; valor: number; percentual: number };
type Tarifa = { valor: number; percentual: number | null; fixa: number | null };

export type Estudo = {
  id: string;
  account_id: string;
  item_id: string;
  titulo: string | null;
  categoria_nome: string | null;
  custo: number | null;
  frete: number | null;
  criado_em: string;
  sinais_verdes: number;
  sinais_amarelos: number;
  sinais_vermelhos: number;
  erro_ia: string | null;
  ia: { parecer: string; pontos_fortes: string[]; riscos: string[]; proximos_passos: string[] } | null;
  resultado: {
    anuncio: { item_id: string; titulo: string; preco: number | null; tipo_anuncio: string | null; logistica: string | null; full: boolean; frete_gratis: boolean; catalogo: boolean; permalink: string | null };
    categoria: { id: string; nome: string | null } | null;
    produtos: { id: string; nome: string | null; correspondencia: "anuncio" | "gtin" | "busca"; ofertas_total: number | null }[];
    concorrencia: { ofertas: number; vendedores: number; precos: Quartis | null; full: number | null; frete_gratis: number | null; lojas_oficiais: number | null; novos: number | null };
    ofertas: { item_id: string; produto_id: string; preco: number; preco_original: number | null; condicao: string | null; tipo_anuncio: string | null; logistica: string | null; full: boolean; frete_gratis: boolean; loja_oficial: boolean }[];
    competicao: { status: string | null; preco_para_ganhar: number | null; visibilidade: string | null; motivos: string[]; oportunidades: string[]; vencedor: { item_id: string | null; preco: number | null } | null } | null;
    destaques: { categoria: { posicao: number; id: string; tipo: string; nome: string | null; preco: number | null; seu: boolean }[]; minha_posicao: number | null; produto_posicao: number | null };
    tendencias: { categoria: Tendencia[]; categoria_de: { id: string; nome: string | null } | null; site: Tendencia[] };
    tarifa: { no_seu_preco: Tarifa | null; na_mediana: Tarifa | null };
    margem: { seu_preco: Margem | null; mediana: Margem | null; minima_conta: number | null } | null;
    fatores: Fator[];
    avisos: string[];
  };
};

export const COR_SINAL: Record<Sinal, string> = {
  verde: "bg-ec-verde",
  amarelo: "bg-ec-ambar",
  vermelho: "bg-ec-vermelho",
  sem_dado: "bg-muted",
};
const ROTULO_SINAL: Record<Sinal, string> = { verde: "Verde", amarelo: "Amarelo", vermelho: "Vermelho", sem_dado: "Sem dado" };
const CORRESPONDENCIA = { anuncio: "Produto do anúncio", gtin: "Mesmo código de barras", busca: "Parecido pelo título" };
const GRUPO = { crescimento: "Maior crescimento", desejadas: "Mais desejados", populares: "Mais populares" };
const STATUS_CATALOGO: Record<string, string> = {
  winning: "Ganhando",
  sharing_first_place: "Dividindo o primeiro lugar",
  competing: "Perdendo",
  listed: "Só listado",
};
const VANTAGEM: Record<string, string> = {
  fulfillment: "Full",
  free_installments: "Parcelamento sem juros",
  free_shipping: "Frete grátis",
  shipping_collect: "Coleta",
  same_day_shipping: "Envio no mesmo dia",
  shipping_quarantine: "Envio normal",
};
const MOTIVO: Record<string, string> = {
  non_trusted_seller: "vendedor não confiável",
  reputation_below_threshold: "reputação abaixo da exigida",
  winner_has_better_reputation: "vencedor com reputação melhor",
  manufacturing_time: "prazo de fabricação",
  item_paused: "anúncio pausado",
  item_not_opted_in: "anúncio sem adesão ao catálogo",
  shipping_mode: "modo de envio inferior ao do vencedor",
  newbie_program_seller: "limite do programa de iniciantes",
};

const linkItem = (id: string) => `https://produto.mercadolivre.com.br/${id.slice(0, 3)}-${id.slice(3)}`;
const linkProduto = (id: string) => `https://www.mercadolivre.com.br/p/${id}`;

export const Quadrado = ({ sinal }: { sinal: Sinal }) => (
  <span className={`inline-block h-2.5 w-2.5 shrink-0 ${COR_SINAL[sinal]}`} aria-label={ROTULO_SINAL[sinal]} title={ROTULO_SINAL[sinal]} />
);

/** Um estudo guardado. `anterior` é o estudo anterior do mesmo anúncio, para comparar. */
export function EstudoMercado({ estudo, anterior }: { estudo: Estudo; anterior: Estudo | null }) {
  const r = estudo.resultado;
  const c = r.concorrencia;
  const p = c.precos;
  const fatorAntes = new Map((anterior?.resultado.fatores ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-6 text-sm">
      {r.avisos.length > 0 && (
        <div className="border border-ec-ambar [border-width:0.5px] p-3 text-xs space-y-1">
          <p className="font-medium">Partes que o Mercado Livre não devolveu</p>
          {r.avisos.map((a, i) => <p key={i} className="text-muted-foreground">{a}</p>)}
        </div>
      )}

      <section className="space-y-2">
        <h3 className="font-medium">Parecer</h3>
        {estudo.ia ? (
          <>
            <p>{estudo.ia.parecer}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Topicos titulo="Pontos fortes" itens={estudo.ia.pontos_fortes} />
              <Topicos titulo="Riscos" itens={estudo.ia.riscos} />
              <Topicos titulo="Próximos passos" itens={estudo.ia.proximos_passos} />
            </div>
            <p className="text-xs text-muted-foreground">Escrito pela IA só com os números deste estudo. Os sinais vêm das regras do painel, não da IA.</p>
          </>
        ) : (
          <p className="text-ec-ambar">A IA não respondeu{estudo.erro_ia ? `: ${estudo.erro_ia}` : "."} Os fatores medidos estão abaixo.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Fatores</h3>
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Fator</th>
                <th className="pr-2">Medido</th>
                <th className="pr-2">Regra</th>
                {anterior && <th className="pr-2">Estudo de {dataHoraBr(anterior.criado_em)}</th>}
              </tr>
            </thead>
            <tbody>
              {r.fatores.map((f) => {
                const antes = fatorAntes.get(f.id);
                return (
                  <tr key={f.id} className="border-t border-border align-top">
                    <td className="py-2 px-2 whitespace-nowrap"><span className="inline-flex items-center gap-2"><Quadrado sinal={f.sinal} />{f.nome}</span></td>
                    <td className="py-2 pr-2">{f.medido}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{f.regra}</td>
                    {anterior && (
                      <td className="py-2 pr-2 text-muted-foreground">
                        {antes ? <span className="inline-flex items-start gap-2"><Quadrado sinal={antes.sinal} />{antes.medido}</span> : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Preços dos concorrentes</h3>
        {p ? (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 border border-border [border-width:0.5px] tabular-nums">
              <Numero rotulo="Menor" valor={brl(p.min, true)} />
              <Numero rotulo="1º quartil" valor={brl(p.q1, true)} />
              <Numero rotulo="Mediana" valor={brl(p.mediana, true)} destaque />
              <Numero rotulo="3º quartil" valor={brl(p.q3, true)} />
              <Numero rotulo="Maior" valor={brl(p.max, true)} />
              <Numero rotulo="Seu preço" valor={brl(r.anuncio.preco, true)} />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {num(c.ofertas)} ofertas de {num(c.vendedores)} vendedores · Full {pctFracao(c.full, 0)} · frete grátis {pctFracao(c.frete_gratis, 0)} · lojas oficiais {pctFracao(c.lojas_oficiais, 0)} · novos {pctFracao(c.novos, 0)}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Sem ofertas concorrentes no catálogo para comparar.</p>
        )}
      </section>

      {(r.tarifa.no_seu_preco || r.margem) && (
        <section className="space-y-2">
          <h3 className="font-medium">Tarifa e margem</h3>
          <div className="overflow-x-auto border border-border [border-width:0.5px]">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground text-left">
                <tr className="border-b border-border">
                  <th className="py-2 px-2">Preço</th>
                  <th className="pr-2 text-right">Tarifa do ML</th>
                  {r.margem && <th className="pr-2 text-right">Custo + frete</th>}
                  {r.margem && <th className="pr-2 text-right">Margem</th>}
                </tr>
              </thead>
              <tbody>
                <LinhaMargem rotulo="Seu preço" preco={r.anuncio.preco} tarifa={r.tarifa.no_seu_preco} margem={r.margem?.seu_preco ?? null} comMargem={!!r.margem} />
                {p && <LinhaMargem rotulo="Mediana dos concorrentes" preco={p.mediana} tarifa={r.tarifa.na_mediana} margem={r.margem?.mediana ?? null} comMargem={!!r.margem} />}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Tarifa calculada pelo Mercado Livre para o tipo de anúncio e o envio deste anúncio; já inclui a taxa fixa. Não inclui impostos nem Product Ads.
            {!r.margem && " Informe o custo do produto para ver a margem."}
          </p>
        </section>
      )}

      {r.competicao && (
        <section className="space-y-1">
          <h3 className="font-medium">Competição no catálogo</h3>
          <p>
            {STATUS_CATALOGO[r.competicao.status ?? ""] ?? r.competicao.status ?? "Sem status"}
            {r.competicao.preco_para_ganhar != null && ` · preço para ganhar ${brl(r.competicao.preco_para_ganhar, true)}`}
            {r.competicao.vencedor?.preco != null && ` · vencedor atual ${brl(r.competicao.vencedor.preco, true)}`}
          </p>
          {r.competicao.oportunidades.length > 0 && (
            <p className="text-muted-foreground">Aumentaria a chance de ganhar: {r.competicao.oportunidades.map((o) => VANTAGEM[o] ?? o).join(", ")}.</p>
          )}
          {r.competicao.motivos.length > 0 && (
            <p className="text-muted-foreground">Motivo de não competir: {r.competicao.motivos.map((m) => MOTIVO[m] ?? m).join(", ")}.</p>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-medium">Produtos comparados</h3>
        {r.produtos.length === 0 && <p className="text-muted-foreground">O catálogo do Mercado Livre não tem produto correspondente a este anúncio.</p>}
        {r.produtos.map((pr) => (
          <p key={pr.id}>
            <a href={linkProduto(pr.id)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{pr.nome ?? pr.id}</a>
            <span className="text-muted-foreground"> · {CORRESPONDENCIA[pr.correspondencia]}{pr.ofertas_total != null ? ` · ${num(pr.ofertas_total)} ofertas` : ""}</span>
          </p>
        ))}
        {r.produtos.some((pr) => pr.correspondencia === "busca") && (
          <p className="text-xs text-muted-foreground">Produtos achados pelo título podem não ser idênticos ao seu. Confira antes de comparar preço.</p>
        )}
      </section>

      {r.ofertas.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-medium">Ofertas dos concorrentes <span className="text-xs font-normal text-muted-foreground">(as {num(r.ofertas.length)} mais baratas)</span></h3>
          <div className="max-h-96 overflow-auto border border-border [border-width:0.5px]">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground text-left sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="py-2 px-2">Anúncio</th>
                  <th className="pr-2 text-right">Preço</th>
                  <th className="pr-2">Tipo</th>
                  <th className="pr-2">Envio</th>
                  <th className="pr-2">Condição</th>
                </tr>
              </thead>
              <tbody>
                {r.ofertas.map((o) => (
                  <tr key={o.item_id} className="border-t border-border">
                    <td className="py-1.5 px-2">
                      <a href={linkItem(o.item_id)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{o.item_id} <ExternalLink className="h-3 w-3" /></a>
                      {o.loja_oficial && <span className="text-muted-foreground"> · loja oficial</span>}
                    </td>
                    <td className="pr-2 text-right">
                      {brl(o.preco, true)}
                      {o.preco_original && o.preco_original > o.preco && <span className="block text-muted-foreground line-through">{brl(o.preco_original, true)}</span>}
                    </td>
                    <td className="pr-2">{TIPO_ANUNCIO[o.tipo_anuncio ?? ""] ?? o.tipo_anuncio ?? "—"}</td>
                    <td className="pr-2">{LOGISTICA[o.logistica ?? ""] ?? (o.logistica ? "Outro" : "—")}{o.frete_gratis ? " · frete grátis" : ""}</td>
                    <td className="pr-2">{o.condicao === "new" ? "Novo" : o.condicao === "used" ? "Usado" : o.condicao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-medium">Mais vendidos da categoria{r.categoria?.nome ? ` · ${r.categoria.nome}` : ""}</h3>
        {r.destaques.categoria.length === 0 ? (
          <p className="text-muted-foreground">O Mercado Livre não tem lista de mais vendidos para esta categoria.</p>
        ) : (
          <ol className="space-y-1">
            {r.destaques.categoria.map((d) => (
              <li key={d.id} className={d.seu ? "font-medium" : ""}>
                <span className="tabular-nums text-muted-foreground">{d.posicao}º</span>{" "}
                <a href={d.tipo === "PRODUCT" ? linkProduto(d.id) : linkItem(d.id)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.nome ?? d.id}</a>
                {d.preco != null && <span className="text-muted-foreground tabular-nums"> · {brl(d.preco, true)}</span>}
                {d.seu && <span className="text-ec-verde-txt"> · seu</span>}
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted-foreground">Ordem do Mercado Livre. A API não informa quantas unidades cada um vendeu.</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Termos em alta</h3>
        <Tendencias titulo={`Categoria${r.tendencias.categoria_de?.nome ? ` · ${r.tendencias.categoria_de.nome}` : ""}`} itens={r.tendencias.categoria} />
        <Tendencias titulo="Mercado Livre Brasil" itens={r.tendencias.site} />
        <p className="text-xs text-muted-foreground">Ranking semanal do Mercado Livre, sem volume de busca. Negrito: termo inteiro no seu título. Azul: termo com palavra do seu título.</p>
      </section>
    </div>
  );
}

function Topicos({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <ul className="list-disc pl-4 space-y-0.5">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="p-2 border-r border-border [border-right-width:0.5px] last:border-r-0">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={destaque ? "font-medium text-primary" : ""}>{valor}</p>
    </div>
  );
}

function LinhaMargem({ rotulo, preco, tarifa, margem, comMargem }: { rotulo: string; preco: number | null; tarifa: Tarifa | null; margem: Margem | null; comMargem: boolean }) {
  return (
    <tr className="border-t border-border">
      <td className="py-1.5 px-2">{rotulo} · {brl(preco, true)}</td>
      <td className="pr-2 text-right">{tarifa ? `${brl(tarifa.valor, true)}${tarifa.percentual != null ? ` (${num(tarifa.percentual, 1)}%)` : ""}` : "Sem dado"}</td>
      {comMargem && <td className="pr-2 text-right">{margem ? brl(margem.custo + margem.frete, true) : "—"}</td>}
      {comMargem && (
        <td className={`pr-2 text-right ${margem && margem.valor < 0 ? "text-destructive" : ""}`}>
          {margem ? `${brl(margem.valor, true)} (${pctFracao(margem.percentual, 1)})` : "Sem dado"}
        </td>
      )}
    </tr>
  );
}

function Tendencias({ titulo, itens }: { titulo: string; itens: Tendencia[] }) {
  if (!itens.length) return <p className="text-muted-foreground">{titulo}: sem termos em alta nesta semana.</p>;
  const grupos = (["crescimento", "desejadas", "populares"] as const).map((g) => ({ g, lista: itens.filter((t) => t.grupo === g) }));
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {grupos.map(({ g, lista }) => (
          <div key={g}>
            <p className="text-xs font-medium">{GRUPO[g]}</p>
            <ol className="text-xs space-y-0.5">
              {lista.map((t) => (
                <li key={t.posicao} className={t.no_titulo ? "font-semibold" : ""}>
                  <span className="text-muted-foreground tabular-nums">{t.posicao}.</span>{" "}
                  {t.url
                    ? <a href={t.url} target="_blank" rel="noreferrer" className={t.relacionada ? "text-primary hover:underline" : "hover:underline"}>{t.palavra}</a>
                    : <span className={t.relacionada ? "text-primary" : ""}>{t.palavra}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
