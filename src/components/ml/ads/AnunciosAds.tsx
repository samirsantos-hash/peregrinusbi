import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ds";
import { MelhoriasDoAnuncio } from "@/components/ml/acoes/MelhoriasDoAnuncio";
import { dataCurta } from "@/components/ml/ads/VisaoGeralAds";
import { type AlertaAds, type GrupoAnalisado, NOME_QUALIDADE, type PainelAds } from "@/lib/adsAnalise";
import { type AcaoEmLote } from "@/lib/mlAcoes";
import { brl, num, pctFracao, vezes } from "@/lib/format";
import { MAX_GRUPOS_LOTE } from "../../../../supabase/functions/_shared/mlAdsGestao";

const comGasto = (g: GrupoAnalisado) => g.ind.investimento > 0;

const FILTROS: Record<string, { rotulo: string; f: (g: GrupoAnalisado) => boolean }> = {
  todos: { rotulo: "Todos", f: () => true },
  com_investimento: { rotulo: "Com investimento no período", f: comGasto },
  alto: { rotulo: "Com alerta crítico", f: (g) => g.alertas.some((a) => a.nivel === "alto") },
  medio: { rotulo: "Com alerta de atenção", f: (g) => g.alertas.some((a) => a.nivel === "medio") },
  oportunidade: { rotulo: "Oportunidades", f: (g) => g.alertas.some((a) => a.nivel === "oportunidade") },
  sem_venda: { rotulo: "Investimento sem venda", f: (g) => comGasto(g) && (g.unidades ?? 0) === 0 },
  qualidade: { rotulo: "Qualidade Básica (com investimento)", f: (g) => comGasto(g) && g.qualidade === "basica" },
  fotos: { rotulo: "Fotos abaixo de 1200 px (com investimento)", f: (g) => comGasto(g) && g.fotosSituacao != null && g.fotosSituacao !== "ok" },
  ficha: { rotulo: "Ficha incompleta (com investimento)", f: (g) => comGasto(g) && g.fichaIncompleta === true },
  estoque: { rotulo: "Sem estoque ou pausado no ML (com investimento)", f: (g) => comGasto(g) && (g.semEstoque === true || g.pausadoNoMl === true) },
  sem_analise: { rotulo: "Sem análise de qualidade (com investimento)", f: (g) => comGasto(g) && g.analisado_em == null },
};

const COR_ALERTA: Record<AlertaAds["nivel"], string> = { alto: "text-destructive", medio: "text-ec-ambar", oportunidade: "text-ec-verde-txt" };
const NOME_TIPO: Record<string, string> = { ITEM: "anúncio", FAMILY: "família de variações", CATALOG: "produto de catálogo" };
const POR_PAGINA = 100;

export function AnunciosAds({ painel, acao, accountId, filtroInicial }: {
  painel: PainelAds;
  acao: AcaoEmLote;
  accountId: string;
  filtroInicial: string | null;
}) {
  const [filtro, setFiltro] = useState(filtroInicial && FILTROS[filtroInicial] ? filtroInicial : "com_investimento");
  const [campanha, setCampanha] = useState("todas");
  const [termo, setTermo] = useState("");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [destino, setDestino] = useState("");
  const [melhorias, setMelhorias] = useState<{ item_id: string; titulo: string | null } | null>(null);

  useEffect(() => { if (filtroInicial && FILTROS[filtroInicial]) setFiltro(filtroInicial); }, [filtroInicial]);
  useEffect(() => { setSel(new Set()); setMostrar(POR_PAGINA); }, [filtro, campanha, termo, accountId]);

  const nomes = useMemo(() => new Map(painel.campanhas.map((c) => [c.campaign_id, c.name ?? `Campanha ${c.campaign_id}`])), [painel.campanhas]);
  const lista = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return painel.grupos
      .filter(FILTROS[filtro].f)
      .filter((g) => campanha === "todas" || (campanha === "sem" ? g.campaign_id == null : String(g.campaign_id) === campanha))
      .filter((g) => !t || [g.titulo, g.external_id, g.item_id, String(g.ad_group_id)].some((x) => x?.toLowerCase().includes(t)))
      .sort((a, b) => b.ind.investimento - a.ind.investimento || (b.alertas.length - a.alertas.length));
  }, [painel.grupos, filtro, campanha, termo]);

  const visiveis = lista.slice(0, mostrar);
  const alternar = (id: number) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else if (n.size < MAX_GRUPOS_LOTE) n.add(id);
    return n;
  });
  const todosMarcados = visiveis.length > 0 && visiveis.slice(0, MAX_GRUPOS_LOTE).every((g) => sel.has(g.ad_group_id));
  const marcarTodos = () => setSel(todosMarcados ? new Set() : new Set(visiveis.slice(0, MAX_GRUPOS_LOTE).map((g) => g.ad_group_id)));
  const ids = [...sel];
  const enviar = (dados: Record<string, unknown>) => {
    acao.previa({ ...dados, ad_group_ids: ids });
    setSel(new Set());
  };
  const per = `${dataCurta(painel.periodo.atual.de)} a ${dataCurta(painel.periodo.atual.ate)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Título ou MLB" className="pl-8 w-56 h-9" aria-label="Filtrar anúncios" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-72 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FILTROS).map(([k, v]) => <SelectItem key={k} value={k}>{v.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={campanha} onValueChange={setCampanha}>
          <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as campanhas</SelectItem>
            <SelectItem value="sem">Fora de campanha</SelectItem>
            {painel.campanhas.map((c) => <SelectItem key={c.campaign_id} value={String(c.campaign_id)}>{nomes.get(c.campaign_id)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground tabular-nums">{num(lista.length)} anúncio(s) · métricas de {per}</span>
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border border-border [border-width:0.5px] p-2 text-sm">
          <span className="tabular-nums">{sel.size} selecionado(s) (máx. {MAX_GRUPOS_LOTE})</span>
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger className="w-56 h-8"><SelectValue placeholder="Campanha de destino" /></SelectTrigger>
            <SelectContent>
              {painel.campanhas.map((c) => <SelectItem key={c.campaign_id} value={String(c.campaign_id)}>{nomes.get(c.campaign_id)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!destino} onClick={() => enviar({ tipo: "grupos_incluir", campaign_id: Number(destino) })}>Incluir / mover</Button>
          <Button size="sm" variant="outline" onClick={() => enviar({ tipo: "grupos_status", status: "active" })}>Ativar</Button>
          <Button size="sm" variant="outline" onClick={() => enviar({ tipo: "grupos_status", status: "paused" })}>Pausar</Button>
          <Button size="sm" variant="outline" onClick={() => enviar({ tipo: "grupos_remover" })}>Remover da campanha</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Limpar</Button>
        </div>
      )}

      {lista.length === 0 ? (
        <EmptyState falta="Nenhum anúncio neste filtro." acao="Troque o filtro ou clique em Atualizar para reler o Mercado Livre." />
      ) : (
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2 w-6"><Checkbox checked={todosMarcados} onCheckedChange={marcarTodos} aria-label="Selecionar visíveis" /></th>
                <th className="pr-2">Anúncio</th>
                <th className="pr-2">Campanha</th>
                <th className="pr-2 text-right">Investimento</th>
                <th className="pr-2 text-right">Receita</th>
                <th className="pr-2 text-right">ROAS</th>
                <th className="pr-2 text-right">ACOS</th>
                <th className="pr-2 text-right">CTR</th>
                <th className="pr-2 text-right">Conversão</th>
                <th className="pr-2">No Mercado Livre</th>
                <th className="pr-2">Alertas</th>
                <th className="pr-2" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((g) => (
                <tr key={g.ad_group_id} className="border-t border-border align-top">
                  <td className="py-2 px-2"><Checkbox checked={sel.has(g.ad_group_id)} onCheckedChange={() => alternar(g.ad_group_id)} aria-label="Selecionar" /></td>
                  <td className="py-1.5 pr-2 min-w-[220px]">
                    <div className="flex gap-2">
                      {g.thumbnail && <img src={g.thumbnail} alt="" className="h-9 w-9 object-contain border border-border shrink-0" />}
                      <div className="min-w-0">
                        <span className="line-clamp-2">{g.titulo ?? g.external_id ?? g.ad_group_id}</span>
                        <span className="text-muted-foreground">
                          {g.external_id ?? g.ad_group_id}{g.tipo && g.tipo !== "ITEM" ? ` · ${NOME_TIPO[g.tipo] ?? g.tipo}` : ""}
                          {g.link && <a href={g.link} target="_blank" rel="noreferrer" className="ml-1 inline-flex text-primary"><ExternalLink className="h-3 w-3" /></a>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="pr-2 py-1.5">
                    {g.campaign_id != null ? (
                      <>
                        <span className="block line-clamp-1">{nomes.get(g.campaign_id) ?? g.campaign_id}</span>
                        <span className={g.status === "active" ? "text-ec-verde-txt" : "text-muted-foreground"}>{g.status === "active" ? "Ativo" : "Pausado"}</span>
                      </>
                    ) : <span className="text-muted-foreground">Fora de campanha</span>}
                  </td>
                  <td className="pr-2 py-1.5 text-right" title={`antes: ${brl(g.indAnt.investimento, true)}`}>{brl(g.ind.investimento, true)}</td>
                  <td className="pr-2 py-1.5 text-right">{brl(g.ind.receita, true)}</td>
                  <td className="pr-2 py-1.5 text-right" title={`antes: ${vezes(g.indAnt.roas)}`}>{vezes(g.ind.roas)}</td>
                  <td className="pr-2 py-1.5 text-right">{pctFracao(g.ind.acos)}</td>
                  <td className="pr-2 py-1.5 text-right">{pctFracao(g.ind.ctr, 2)}</td>
                  <td className="pr-2 py-1.5 text-right">{pctFracao(g.ind.cvr)}</td>
                  <td className="pr-2 py-1.5 min-w-[150px]"><SituacaoMl g={g} /></td>
                  <td className="pr-2 py-1.5 max-w-[320px]">
                    {g.alertas.length === 0 ? <span className="text-muted-foreground">—</span> : g.alertas.map((a) => (
                      <p key={a.id} className={COR_ALERTA[a.nivel]} title={a.acao}>{a.texto}</p>
                    ))}
                  </td>
                  <td className="pr-2 py-1 text-right">
                    {g.item_id && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setMelhorias({ item_id: g.item_id!, titulo: g.titulo })}>Melhorias</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.length > mostrar && (
        <Button size="sm" variant="outline" onClick={() => setMostrar((m) => m + POR_PAGINA)}>Mostrar mais ({num(lista.length - mostrar)})</Button>
      )}
      <p className="text-xs text-muted-foreground">
        Passe o mouse sobre um alerta para ver a ação sugerida. "No Mercado Livre" vem da última análise de Melhorias e da cópia local dos anúncios; família e catálogo usam o anúncio mais vendido do grupo.
        Conversão = unidades vendidas por Ads ÷ cliques.
      </p>

      <MelhoriasDoAnuncio accountId={accountId} item={melhorias} aoFechar={() => setMelhorias(null)} />
    </div>
  );
}

function SituacaoMl({ g }: { g: GrupoAnalisado }) {
  if (g.anuncios === 0) return <span className="text-muted-foreground">anúncio não encontrado na cópia local</span>;
  const linhas: { texto: string; ruim: boolean }[] = [];
  if (g.analisado_em == null) linhas.push({ texto: "sem análise de qualidade", ruim: false });
  else {
    linhas.push({ texto: `qualidade ${g.qualidade ? NOME_QUALIDADE[g.qualidade] : g.qualidade_nivel ?? "—"}${g.qualidade_score != null ? ` (${num(g.qualidade_score)})` : ""}`, ruim: g.qualidade === "basica" });
    if (g.fotosSituacao && g.fotosSituacao !== "ok") {
      linhas.push({ texto: g.fotosSituacao === "abaixo_minimo" ? `${g.fotos_abaixo_minimo} foto(s) < 500 px` : `${g.fotos_abaixo_recomendado} foto(s) < 1200 px`, ruim: true });
    }
    if (g.fichaIncompleta) linhas.push({ texto: `${g.ficha_obrigatorios} obrigatório(s) vazio(s)`, ruim: true });
  }
  linhas.push({ texto: g.semEstoque ? "sem estoque" : `estoque ${num(g.estoque)}`, ruim: !!g.semEstoque });
  if (g.pausadoNoMl) linhas.push({ texto: "pausado no ML", ruim: true });
  if (g.frete_gratis === false) linhas.push({ texto: "sem frete grátis", ruim: false });
  return (
    <>
      {linhas.map((l) => <span key={l.texto} className={`block ${l.ruim ? "text-ec-ambar" : "text-muted-foreground"}`}>{l.texto}</span>)}
    </>
  );
}
