import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader } from "@/components/ds";
import { chamarFuncaoMl, dataHoraBr, useContasMl } from "@/lib/mlFuncoes";

const LIMITE = 2000;

type Pergunta = {
  question_id: number;
  item_id: string | null;
  item_titulo: string | null;
  item_thumbnail: string | null;
  item_link: string | null;
  texto: string | null;
  status: string;
  data_criacao: string | null;
  resposta_texto: string | null;
  resposta_data: string | null;
  synced_at: string;
};

type Filtro = "sem_resposta" | "respondidas" | "todas";

type Previa = {
  pergunta: Pergunta;
  texto: string;
  chave: string;
};

const STATUS: Record<string, string> = {
  UNANSWERED: "Sem resposta",
  ANSWERED: "Respondida",
  UNDER_REVIEW: "Em revisão",
  CLOSED_UNANSWERED: "Encerrada sem resposta",
  BANNED: "Removida",
  DELETED: "Removida",
  DISABLED: "Removida",
};

export default function Perguntas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contas = useContasMl();
  const [contaId, setContaId] = useState<string>("");
  const [filtro, setFiltro] = useState<Filtro>("sem_resposta");
  const [rascunhos, setRascunhos] = useState<Record<number, string>>({});
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [revisando, setRevisando] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    if (!contaId && contas.data?.length) setContaId(contas.data[0].id);
  }, [contas.data, contaId]);

  const perguntas = useQuery({
    queryKey: ["ml-questions", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ml_questions")
        .select("question_id, item_id, item_titulo, item_thumbnail, item_link, texto, status, data_criacao, resposta_texto, resposta_data, synced_at")
        .eq("account_id", contaId)
        .order("data_criacao", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Pergunta[];
    },
  });

  useEffect(() => {
    if (!contaId) return;
    const canal = supabase
      .channel(`ml_questions_${contaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ml_questions", filter: `account_id=eq.${contaId}` }, () =>
        qc.invalidateQueries({ queryKey: ["ml-questions", contaId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [contaId, qc]);

  const lista = useMemo(() => {
    const todas = perguntas.data ?? [];
    if (filtro === "sem_resposta") return todas.filter((p) => p.status === "UNANSWERED");
    if (filtro === "respondidas") return todas.filter((p) => p.status === "ANSWERED");
    return todas;
  }, [perguntas.data, filtro]);

  const semResposta = (perguntas.data ?? []).filter((p) => p.status === "UNANSWERED").length;
  const ultimaLeitura = (perguntas.data ?? []).map((p) => p.synced_at).sort().pop();

  const atualizar = async () => {
    if (!contaId) return;
    setAtualizando(true);
    try {
      const r = await chamarFuncaoMl<{ contas: { erro: string | null }[] }>("ml-questions-sync", { account_id: contaId });
      const erro = r.contas?.[0]?.erro;
      if (erro) toast.error(erro);
      else toast.success("Perguntas atualizadas do Mercado Livre.");
      qc.invalidateQueries({ queryKey: ["ml-questions", contaId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally {
      setAtualizando(false);
    }
  };

  const revisar = async (p: Pergunta) => {
    const texto = (rascunhos[p.question_id] ?? "").trim();
    if (!texto) return toast.error("Escreva a resposta.");
    const chave = crypto.randomUUID();
    setRevisando(p.question_id);
    try {
      await chamarFuncaoMl("ml-questions-answer", {
        account_id: contaId, question_id: p.question_id, texto, idempotency_key: chave, etapa: "previa",
      });
      setPrevia({ pergunta: p, texto, chave });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível preparar a resposta.");
      qc.invalidateQueries({ queryKey: ["ml-questions", contaId] });
    } finally {
      setRevisando(null);
    }
  };

  const confirmar = async () => {
    if (!previa || enviando) return;
    setEnviando(true);
    try {
      await chamarFuncaoMl("ml-questions-answer", {
        account_id: contaId, question_id: previa.pergunta.question_id, texto: previa.texto, idempotency_key: previa.chave, etapa: "confirmar",
      });
      toast.success("Resposta publicada no Mercado Livre.");
      setRascunhos((r) => { const n = { ...r }; delete n[previa.pergunta.question_id]; return n; });
      setPrevia(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O Mercado Livre não recebeu a resposta.");
    } finally {
      setEnviando(false);
      qc.invalidateQueries({ queryKey: ["ml-questions", contaId] });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Painel
        </Button>
        <PageHeader
          titulo="Perguntas"
          periodo={ultimaLeitura ? `Fonte: Mercado Livre · atualizado em ${dataHoraBr(ultimaLeitura)}` : "Fonte: Mercado Livre"}
          acoes={
            <div className="flex flex-wrap items-center gap-2">
              {(contas.data?.length ?? 0) > 1 && (
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {contas.data!.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nickname ?? c.ml_user_id} · {c.site_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={atualizar} disabled={!contaId || atualizando}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} />
                {atualizando ? "Atualizando…" : "Atualizar"}
              </Button>
            </div>
          }
        />

        {contas.isLoading && <Carregando />}
        {contas.isError && <EmptyState falta="Não foi possível carregar suas contas." acao="Recarregue a página." />}
        {contas.data && contas.data.length === 0 && (
          <EmptyState
            falta="Nenhuma conta do Mercado Livre ligada ao seu usuário."
            acao="O acesso vem das contas liberadas para você no Admin. Peça a liberação ao administrador."
          />
        )}

        {contaId && (
          <>
            <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
              <TabsList>
                <TabsTrigger value="sem_resposta">Sem resposta ({semResposta})</TabsTrigger>
                <TabsTrigger value="respondidas">Respondidas</TabsTrigger>
                <TabsTrigger value="todas">Todas</TabsTrigger>
              </TabsList>
            </Tabs>

            {perguntas.isLoading && <Carregando />}
            {perguntas.isError && <EmptyState falta="Não foi possível ler as perguntas." acao="Tente Atualizar." />}
            {perguntas.data && perguntas.data.length === 0 && (
              <EmptyState falta="Ainda não há perguntas importadas desta conta." acao="Use Atualizar para buscar no Mercado Livre." />
            )}
            {perguntas.data && perguntas.data.length > 0 && lista.length === 0 && (
              <EmptyState falta={filtro === "sem_resposta" ? "Nenhuma pergunta esperando resposta." : "Nenhuma pergunta neste filtro."} />
            )}

            <ul className="space-y-3">
              {lista.map((p) => {
                const rascunho = rascunhos[p.question_id] ?? "";
                return (
                  <li key={p.question_id} className="border border-border bg-card p-4 space-y-3 [border-width:0.5px]">
                    <div className="flex items-start gap-3">
                      {p.item_thumbnail && <img src={p.item_thumbnail} alt="" className="h-12 w-12 object-contain border border-border" />}
                      <div className="min-w-0 flex-1">
                        {p.item_link ? (
                          <a href={p.item_link} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline line-clamp-1">
                            {p.item_titulo ?? p.item_id}
                          </a>
                        ) : (
                          <p className="text-sm font-medium line-clamp-1">{p.item_titulo ?? p.item_id ?? "Anúncio"}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {p.item_id} · {dataHoraBr(p.data_criacao)} · {STATUS[p.status] ?? p.status}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{p.texto || "Texto indisponível."}</p>

                    {p.resposta_texto && (
                      <div className="border-l-2 border-primary pl-3">
                        <p className="text-xs text-muted-foreground">Resposta · {dataHoraBr(p.resposta_data)}</p>
                        <p className="text-sm">{p.resposta_texto}</p>
                      </div>
                    )}

                    {p.status === "UNANSWERED" && (
                      <div className="space-y-2">
                        <Textarea
                          value={rascunho}
                          maxLength={LIMITE}
                          rows={3}
                          placeholder="Escreva a resposta ao comprador"
                          onChange={(e) => setRascunhos((r) => ({ ...r, [p.question_id]: e.target.value }))}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground tabular-nums">{rascunho.length}/{LIMITE}</span>
                          <Button size="sm" onClick={() => revisar(p)} disabled={!rascunho.trim() || revisando === p.question_id}>
                            {revisando === p.question_id ? "Conferindo…" : "Revisar resposta"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <AlertDialog open={!!previa} onOpenChange={(aberto) => { if (!aberto && !enviando) setPrevia(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar resposta no Mercado Livre?</AlertDialogTitle>
            <AlertDialogDescription>O comprador vê a resposta no anúncio. Depois de publicada, ela não pode ser editada.</AlertDialogDescription>
          </AlertDialogHeader>
          {previa && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Pergunta</p>
                <p>{previa.pergunta.texto}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Antes</p>
                  <p>Sem resposta</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Depois</p>
                  <p className="whitespace-pre-wrap break-words">{previa.texto}</p>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Voltar</AlertDialogCancel>
            <Button onClick={confirmar} disabled={enviando}>
              {enviando ? "Publicando…" : "Publicar resposta"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const Carregando = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
  </div>
);
