import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useNavigate } from "react-router-dom";
import CompararAnuncios from "./CompararAnuncios";
import { AbaMelhorias } from "./acoes/AbaMelhorias";
import { AbaPromocoes } from "./acoes/AbaPromocoes";
import { brl, num } from "@/lib/format";
import { LOGISTICA } from "@/lib/mlRotulos";
import AnalisadorTitulo from "./AnalisadorTitulo";

type Item = { item_id: string; titulo: string | null; categoria_id?: string | null; sku: string | null; link: string | null; preco: number | null; estoque: number | null; vendidos: number | null; logistica: string | null; tipo_anuncio: string | null };

const TOPICOS = [
  { id: "desempenho", label: "Desempenho e comparação", permissao: "qualidade.visualizar" },
  { id: "conteudo", label: "Título, descrição e qualidade", permissao: "qualidade.visualizar" },
  { id: "titulo", label: "Analisador de título", permissao: "qualidade.visualizar" },
  { id: "oferta", label: "Full, estoque e oferta", permissao: "anuncios.visualizar" },
  { id: "promocoes", label: "Promoções e descontos", permissao: "promocoes.visualizar" },
  { id: "metodologia", label: "Fontes e limites do estudo", permissao: "correlacoes.visualizar" },
];

export default function CorrelacoesAnuncios({ accountId, custId, itens, carregando, erro }: { accountId: string; custId: string; itens: Item[]; carregando?: boolean; erro?: boolean }) {
  const { pode } = usePermissoes();
  const navigate = useNavigate();
  const [topico, setTopico] = useState("desempenho");
  const [limite, setLimite] = useState(10);
  const opcoes = TOPICOS.filter(t => pode(t.permissao));
  const atual = opcoes.find(t => t.id === topico) ?? opcoes[0];
  if (!atual) return <p className="text-sm text-muted-foreground">Nenhuma análise liberada para esta conta.</p>;

  return <section className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div><h2 className="text-xl font-semibold">Correlações dos anúncios</h2><p className="mt-1 text-sm text-muted-foreground">Evidências observadas · sem previsão de posição na busca</p></div>
      <Select value={atual.id} onValueChange={setTopico}><SelectTrigger aria-label="Assunto da análise" className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{opcoes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
    </header>
    {atual.id === "desempenho" && <>
      <p className="text-sm text-muted-foreground">Pedidos pagos, visitas e conversão nas mesmas datas. Promoções atuais não comprovam atribuição das vendas.</p>
      <CompararAnuncios key={accountId} custId={custId} itens={itens.filter(i => i.preco !== null && i.titulo !== null && i.link !== null).map(i => ({ id: i.item_id, titulo: i.titulo ?? i.item_id, link: i.link ?? "", preco: i.preco ?? 0, sku: i.sku, tipo: i.tipo_anuncio, vendidos: i.vendidos ?? undefined }))} />
    </>}
    {atual.id === "conteudo" && <AbaMelhorias key={accountId} accountId={accountId} />}
    {atual.id === "titulo" && <AnalisadorTitulo key={accountId} itens={itens} carregando={carregando} erro={erro} />}
    {atual.id === "promocoes" && <><p className="text-sm text-muted-foreground">Adesões e descontos atuais. Retorno por promoção depende de vendas atribuídas e custos confirmados.</p><AbaPromocoes key={accountId} accountId={accountId} /></>}
    {atual.id === "oferta" && <>
      <p className="text-sm text-muted-foreground">Última leitura dos anúncios. Full não confirma entrega amanhã; estoque não determina posição na busca.</p>
      {carregando ? <p role="status">Carregando anúncios…</p> : erro ? <p role="alert" className="text-destructive">Não foi possível carregar as ofertas.</p> : itens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anúncio disponível nesta leitura.</p> : <>
        <div className="overflow-x-auto"><table className="w-full text-sm tnum text-left"><thead className="text-muted-foreground"><tr>{["Anúncio", "Preço atual", "Estoque", "Logística", "Vendidos acumulados"].map(t => <th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{itens.slice(0, limite).map(i => <tr key={i.item_id} className="border-t border-border"><td className="p-3 min-w-52"><span>{i.titulo ?? i.item_id}</span><p className="text-xs text-muted-foreground">{i.item_id}</p></td><td className="p-3 whitespace-nowrap">{i.preco === null ? "Sem dado" : brl(i.preco, true)}</td><td className="p-3">{i.estoque === null ? "Sem dado" : num(i.estoque)}</td><td className="p-3">{i.logistica ? LOGISTICA[i.logistica] ?? "Outra modalidade" : "Sem dado"}</td><td className="p-3">{i.vendidos === null ? "Sem dado" : num(i.vendidos)}</td></tr>)}</tbody></table></div>
        {itens.length > limite && <Button variant="outline" size="sm" onClick={() => setLimite(n => n + 10)}>Mostrar mais 10</Button>}
      </>}
    </>}
    {atual.id === "metodologia" && <div className="space-y-4 text-sm">
      <p>Os pesos do estudo não são publicados pelo Mercado Livre. Não calculamos nota oficial de ranking nem ganho de posição.</p>
      <dl className="divide-y divide-border">{[
        ["Entrega amanhã", "Depende de destino, horário e promessa confirmada; não é deduzida do Full."],
        ["Desconto no Pix", "Exige identificação explícita do meio de pagamento; desconto genérico não comprova Pix."],
        ["Avaliações e parcelamento", "Estrelas e condições sem juros ainda não estão confirmadas nesta leitura; qualidade do anúncio é outra métrica."],
        ["Título e descrição", "Requisitos dependem da categoria; regras de chassi são específicas de autopeças."],
        ["Ranking e confiança", "Quantidade de sinais disponíveis não valida os pesos nem explica o algoritmo; posição orgânica não foi confirmada."],
      ].map(([nome, texto]) => <div key={nome} className="py-3 grid gap-1 sm:grid-cols-[180px_1fr]"><dt className="font-medium">{nome}</dt><dd className="text-muted-foreground">{texto}</dd></div>)}</dl>
    </div>}
    <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
      {pode("preco.visualizar") && <Button variant="outline" size="sm" onClick={() => navigate(`/?aba=competitiveness&subaba=concorrentes&loja=${encodeURIComponent(custId)}`)}>Preço e concorrentes<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>}
      {pode("reputacao.visualizar") && <Button variant="outline" size="sm" onClick={() => navigate(`/?aba=reputation&subaba=requisitos&loja=${encodeURIComponent(custId)}`)}>Reputação, medalha e tier<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>}
    </footer>
  </section>;
}