import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ds";
import { num } from "@/lib/format";
import { chamarFuncaoMl, dataHoraBr } from "@/lib/mlFuncoes";

type Gravidade = "alta" | "media" | "baixa";
type Achado = { frente: string; gravidade: Gravidade; texto: string; link?: string | null };
type Pendencia = { grupo: string | null; titulo: string; acao: string | null; link: string | null; modo: string | null };

export type Melhoria = {
  item_id: string;
  titulo: string | null;
  diagnostico: {
    titulo: { texto: string; tamanho: number; max: number | null };
    descricao: { tamanho: number; max: number | null };
    fotos: { quantidade: number; max: number | null; abaixo_minimo: number; abaixo_recomendado: number };
    qualidade: { score: number | null; nivel: string | null; calculado_em: string | null; pendencias: Pendencia[] } | null;
    ficha: { obrigatorios: { nome: string }[]; condicionais: { nome: string }[]; opcionais_vazios: { nome: string }[]; preenchidos: unknown[] };
    achados: Achado[];
  };
  ia: {
    resumo: string;
    recomendacoes: { frente: string; prioridade: Gravidade; origem: "regra" | "ia"; titulo: string; texto: string }[];
    titulos_sugeridos: string[];
    descricao_sugerida: string | null;
  } | null;
  erro_ia: string | null;
  origem: "manual" | "diario";
  gerado_em: string;
  verificado_em: string;
};

export const FRENTE: Record<string, string> = {
  qualidade_ml: "Qualidade do ML",
  ficha: "Ficha técnica",
  titulo: "Título",
  descricao: "Descrição",
  fotos: "Fotos",
  geral: "Geral",
};
const COR: Record<Gravidade, string> = { alta: "text-destructive", media: "text-ec-ambar", baixa: "text-muted-foreground" };
const ROTULO: Record<Gravidade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const copiar = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Copiado.");
  } catch {
    toast.error("Não foi possível copiar.");
  }
};

/** Achados das regras e sugestões da IA para um anúncio. Só leitura: o consultor copia o que quiser usar. */
export function MelhoriasDoAnuncio({ accountId, item, aoFechar }: {
  accountId: string;
  item: { item_id: string; titulo: string | null } | null;
  aoFechar: () => void;
}) {
  const qc = useQueryClient();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tentou = useRef<string | null>(null);

  const salva = useQuery({
    queryKey: ["ml-melhoria", accountId, item?.item_id],
    enabled: !!item,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_listing_improvements").select("*")
        .eq("account_id", accountId).eq("item_id", item!.item_id).maybeSingle();
      if (error) throw error;
      return data as Melhoria | null;
    },
  });

  const gerar = async (forcar: boolean) => {
    if (!item) return;
    setGerando(true);
    setErro(null);
    try {
      const r = await chamarFuncaoMl<{ status: "gerado" | "sem_mudanca"; melhoria: Melhoria }>("ml-listing-improve", { account_id: accountId, item_id: item.item_id, forcar });
      qc.setQueryData(["ml-melhoria", accountId, item.item_id], r.melhoria);
      qc.invalidateQueries({ queryKey: ["ml-melhorias", accountId] });
      if (r.status === "sem_mudanca") toast.info("O anúncio não mudou desde a última análise.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível analisar agora.");
    } finally {
      setGerando(false);
    }
  };

  useEffect(() => {
    if (item && salva.data === null && !gerando && tentou.current !== item.item_id) {
      tentou.current = item.item_id;
      gerar(false);
    }
    if (!item) tentou.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, salva.data]);

  const m = salva.data;
  const d = m?.diagnostico;

  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && aoFechar()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Melhorias do anúncio</SheetTitle>
          <SheetDescription>{item?.titulo ?? item?.item_id} · {item?.item_id}</SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {m ? `Fonte: Mercado Livre + IA · analisado em ${dataHoraBr(m.gerado_em)}${m.origem === "diario" ? " (automático)" : ""} · verificado em ${dataHoraBr(m.verificado_em)}` : "Fonte: Mercado Livre + IA"}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => gerar(false)} disabled={gerando || !item}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${gerando ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={() => gerar(true)} disabled={gerando || !m}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar de novo
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">A IA só sugere. Nada é alterado no Mercado Livre; copie o que quiser usar.</p>

        <div className="mt-4 space-y-5 text-sm">
          {(salva.isLoading || gerando) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {gerando ? "Lendo o anúncio e gerando sugestões. Pode levar até 1 minuto…" : "Carregando…"}
            </div>
          )}
          {salva.isError && <EmptyState falta="Não foi possível carregar a análise." acao="Tente Atualizar em instantes." />}
          {erro && !gerando && <EmptyState falta={erro} acao="Tente Atualizar em instantes." />}

          {m && d && (
            <>
              {m.ia ? (
                <section className="space-y-1">
                  <h3 className="font-medium">Resumo</h3>
                  <p>{m.ia.resumo}</p>
                </section>
              ) : (
                <p className="text-ec-ambar">A IA não respondeu{m.erro_ia ? `: ${m.erro_ia}` : "."} Os achados das regras estão abaixo; use Gerar de novo mais tarde.</p>
              )}

              {m.ia && m.ia.recomendacoes.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-medium">Recomendações</h3>
                  {m.ia.recomendacoes.map((r, i) => (
                    <div key={i} className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground">
                        <span className={COR[r.prioridade]}>{ROTULO[r.prioridade]}</span> · {FRENTE[r.frente] ?? r.frente} · {r.origem === "regra" ? "Regra do painel" : "Análise da IA"}
                      </p>
                      <p className="font-medium">{r.titulo}</p>
                      <p className="text-muted-foreground">{r.texto}</p>
                    </div>
                  ))}
                </section>
              )}

              <section className="space-y-2">
                <h3 className="font-medium">Qualidade do Mercado Livre</h3>
                {d.qualidade ? (
                  <>
                    <p className="tabular-nums">
                      Nota {d.qualidade.score == null ? "sem dado" : num(d.qualidade.score)} de 100{d.qualidade.nivel ? ` · ${d.qualidade.nivel}` : ""}
                      {d.qualidade.calculado_em ? <span className="text-muted-foreground"> · calculada em {dataHoraBr(d.qualidade.calculado_em)}</span> : null}
                    </p>
                    {d.qualidade.pendencias.length === 0 && <p className="text-muted-foreground">Sem pendências apontadas pelo Mercado Livre.</p>}
                    {d.qualidade.pendencias.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 border-t border-border pt-2">
                        <div>
                          <p>{p.titulo}</p>
                          <p className="text-xs text-muted-foreground">{p.grupo}{p.modo === "WARNING" ? " · reduz a nota até ser resolvido" : ""}</p>
                        </div>
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary hover:underline inline-flex items-center gap-1">
                            {p.acao ?? "Abrir no ML"} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground">O Mercado Livre ainda não calculou a qualidade deste anúncio.</p>
                )}
              </section>

              <section className="space-y-1">
                <h3 className="font-medium">Ficha técnica</h3>
                <Lista rotulo="Obrigatórios vazios" itens={d.ficha.obrigatorios} cor="text-destructive" />
                <Lista rotulo="Podem ser obrigatórios (conferir)" itens={d.ficha.condicionais} cor="text-ec-ambar" />
                <Lista rotulo="Opcionais vazios" itens={d.ficha.opcionais_vazios} cor="text-muted-foreground" />
                {!d.ficha.obrigatorios.length && !d.ficha.condicionais.length && !d.ficha.opcionais_vazios.length && (
                  <p className="text-muted-foreground">Todos os atributos da categoria estão preenchidos.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Título</h3>
                <p>{d.titulo.texto} <span className="text-xs text-muted-foreground tabular-nums">({d.titulo.tamanho}{d.titulo.max ? ` de ${d.titulo.max}` : ""} caracteres)</span></p>
                {m.ia?.titulos_sugeridos.map((t) => (
                  <div key={t} className="flex items-start justify-between gap-2 border-t border-border pt-2">
                    <p>{t} <span className="text-xs text-muted-foreground tabular-nums">({t.length})</span></p>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copiar(t)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
                  </div>
                ))}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Descrição</h3>
                <p className="text-muted-foreground tabular-nums">
                  Atual: {d.descricao.tamanho ? `${num(d.descricao.tamanho)} caracteres` : "sem descrição"}
                </p>
                {m.ia?.descricao_sugerida ? (
                  <div className="space-y-2">
                    <pre className="whitespace-pre-wrap font-sans text-sm border border-border [border-width:0.5px] p-3">{m.ia.descricao_sugerida}</pre>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copiar(m.ia!.descricao_sugerida!)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar descrição</Button>
                  </div>
                ) : m.ia ? (
                  <p className="text-muted-foreground">A IA não teve dados suficientes para sugerir uma descrição.</p>
                ) : null}
              </section>

              <section className="space-y-1">
                <h3 className="font-medium">Fotos</h3>
                <p className="tabular-nums">
                  {d.fotos.quantidade} foto(s){d.fotos.max ? ` de ${d.fotos.max} permitidas` : ""}
                  {d.fotos.abaixo_minimo ? ` · ${d.fotos.abaixo_minimo} abaixo de 500 px` : ""}
                  {d.fotos.abaixo_recomendado ? ` · ${d.fotos.abaixo_recomendado} abaixo de 1200 px` : ""}
                </p>
                <p className="text-xs text-muted-foreground">Contagem e resolução informadas pelo Mercado Livre; a IA não olha as imagens.</p>
              </section>

              {d.achados.length > 0 && (
                <section className="space-y-1">
                  <h3 className="font-medium">Achados das regras</h3>
                  {d.achados.map((a, i) => (
                    <p key={i}><span className={COR[a.gravidade]}>{ROTULO[a.gravidade]}</span> · {FRENTE[a.frente] ?? a.frente}: {a.texto}</p>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Lista({ rotulo, itens, cor }: { rotulo: string; itens: { nome: string }[]; cor: string }) {
  if (!itens.length) return null;
  return <p><span className={cor}>{rotulo} ({itens.length}):</span> {itens.map((i) => i.nome).join(", ")}</p>;
}
