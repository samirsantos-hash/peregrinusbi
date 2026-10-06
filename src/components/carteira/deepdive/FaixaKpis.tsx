import { AlertTriangle } from "lucide-react";
import { LIMIARES } from "@/config/limiaresCarteira";
import { alavancas, ticket, variacao, possivelMudancaMix, type Totais, type Janelas } from "@/lib/carteiraDeepDive/calculo";
import { brl, int, pct, dataBR, Delta, HACHURA } from "./fmt";

export interface ContagemCarteira { ativas: number | null; comVenda: number | null; ociosas: number | null; entrando: number | null; saindo: number | null }

interface Props {
  janelas: Janelas;
  atual: Totais; anterior: Totais; anoAnterior: Totais;
  cAtual: ContagemCarteira; cAnterior: ContagemCarteira; cAno: ContagemCarteira;
  pedidos: number | null;
}

interface Linha { rotulo: string; valor: string; delta: number | null; ano: string; nota?: string; julgamento?: { ok: boolean; texto: string } }

function Card({ l }: { l: Linha }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/60 p-3 min-w-0">
      <p className="text-[11px] text-muted-foreground">{l.rotulo}</p>
      <p className="text-lg font-semibold tabular-nums leading-tight mt-0.5">{l.valor}</p>
      <div className="flex items-center justify-between gap-2 text-[11px] mt-1">
        <Delta v={l.delta} />
        <span className="text-muted-foreground tabular-nums truncate">ano ant. {l.ano}</span>
      </div>
      {l.julgamento && (
        <p className={`text-[11px] mt-1 ${l.julgamento.ok ? "text-[hsl(var(--ok))]" : "text-[hsl(var(--crit))]"}`}>
          {l.julgamento.ok ? "✓ na meta" : "✕ abaixo"} · {l.julgamento.texto}
        </p>
      )}
      {l.nota && <p className="text-[10px] text-muted-foreground mt-1">{l.nota}</p>}
    </div>
  );
}

function Bloco({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{titulo}</h2>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        {linhas.map((l) => <Card key={l.rotulo} l={l} />)}
      </div>
    </section>
  );
}

export default function FaixaKpis({ janelas, atual, anterior, anoAnterior, cAtual, cAnterior, cAno, pedidos }: Props) {
  const tA = ticket(atual), tP = ticket(anterior), tY = ticket(anoAnterior);
  const dItens = variacao(atual.itens, anterior.itens);
  const dTicket = variacao(tA, tP);
  const mix = possivelMudancaMix(dItens, dTicket);
  const aA = alavancas(atual), aP = alavancas(anterior), aY = alavancas(anoAnterior);
  const difPp = (x: number | null, y: number | null) => (x === null || y === null ? null : x - y);

  const volume: Linha[] = [
    { rotulo: "Faturamento", valor: brl(atual.gmv), delta: variacao(atual.gmv, anterior.gmv), ano: brl(anoAnterior.linhas ? anoAnterior.gmv : null) },
    { rotulo: "Itens vendidos", valor: int(atual.itens), delta: dItens, ano: int(anoAnterior.linhas ? anoAnterior.itens : null), nota: mix ? "Ticket subiu junto: possível mudança de mix" : undefined },
    { rotulo: "Ticket médio", valor: brl(tA), delta: dTicket, ano: brl(tY) },
    { rotulo: "Pedidos", valor: pedidos === null ? "Sem dado" : int(pedidos), delta: null, ano: "—", nota: pedidos === null ? "A planilha mensal não traz pedidos deste mês" : "Total do mês na planilha mensal; sem recorte por dia, então sem comparação" },
    { rotulo: "Visitas", valor: int(atual.visitas), delta: variacao(atual.visitas, anterior.visitas), ano: int(anoAnterior.linhas ? anoAnterior.visitas : null) },
  ];
  const carteira: Linha[] = [
    { rotulo: "Lojas ativas", valor: int(cAtual.ativas), delta: variacao(cAtual.ativas, cAnterior.ativas), ano: int(cAno.ativas) },
    { rotulo: "Lojas com venda", valor: int(cAtual.comVenda), delta: variacao(cAtual.comVenda, cAnterior.comVenda), ano: int(cAno.comVenda) },
    { rotulo: "Lojas ociosas", valor: int(cAtual.ociosas), delta: variacao(cAtual.ociosas, cAnterior.ociosas), ano: int(cAno.ociosas), nota: "Com dado no período e faturamento zero" },
    { rotulo: "Entrando", valor: int(cAtual.entrando), delta: null, ano: "—", nota: "Entrada no programa neste mês" },
    { rotulo: "Saindo", valor: int(cAtual.saindo), delta: null, ano: "—", nota: "Saída prevista em até 60 dias" },
  ];
  const lev = (rotulo: string, k: keyof typeof aA, meta?: { min: number; rotulo: string }): Linha => ({
    rotulo, valor: pct(aA[k]), delta: null, ano: pct(aY[k]),
    nota: `vs mês ant.: ${difPp(aA[k], aP[k]) === null ? "—" : `${(difPp(aA[k], aP[k])! * 100).toFixed(1).replace(".", ",")} p.p.`}${meta ? "" : " · sem meta definida"}`,
    julgamento: meta && aA[k] !== null ? { ok: aA[k]! >= meta.min, texto: meta.rotulo } : undefined,
  });
  const alav: Linha[] = [
    lev("% Full", "full", LIMIARES.full),
    lev("% Flex", "flex"),
    lev("% Ads", "ads", LIMIARES.ads),
    lev("% Promoção", "promocao", LIMIARES.promocao),
    lev("Competitividade de preço", "competitividade", LIMIARES.competitividade),
    lev("% Clips", "clips"),
    { rotulo: "% Afiliados", valor: "Sem dado", delta: null, ano: "—", nota: "Nenhum arquivo enviado traz afiliados" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!janelas.mesCompleto && (
          <span className="rounded-md border border-border/60 px-2 py-1 font-medium" style={HACHURA}>
            Mês parcial: {janelas.atual.dias} dias
          </span>
        )}
        <span className="text-muted-foreground">
          Comparação na mesma janela: {dataBR(janelas.atual.ini)}–{dataBR(janelas.atual.fim)} vs {dataBR(janelas.anterior.ini)}–{dataBR(janelas.anterior.fim)} ({janelas.anterior.dias} dias) · ano anterior {dataBR(janelas.anoAnterior.ini)}–{dataBR(janelas.anoAnterior.fim)}
        </span>
      </div>
      {mix && (
        <p className="flex items-start gap-2 text-xs rounded-md border border-[hsl(var(--attention-text))]/40 p-2 text-[hsl(var(--attention-text))]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Os itens vendidos caíram {pct(dItens)} e o ticket médio subiu {pct(dTicket)}. Isso pode ser mudança de mix, não queda de demanda.
        </p>
      )}
      <Bloco titulo="Volume" linhas={volume} />
      <Bloco titulo="Carteira" linhas={carteira} />
      <Bloco titulo="Alavancas" linhas={alav} />
    </div>
  );
}
