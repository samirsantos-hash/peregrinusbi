// Recomendação de reposição Full para lojas conectadas: estoque e preço da API,
// ritmo de venda observado (7 dias), qualidade, perguntas e promoções por anúncio.
export const ALVO_DIAS = 28;
export const QUALIDADE_MIN = 70;

export type EntradaRuptura = {
  itemId: string;
  titulo: string;
  estoque: number | null;
  preco: number | null;
  saude: number | null; // 0–1 ou 0–100
  logistica: string | null;
  vendas7d: number | null;
  perguntas30d: number;
  emPromocao: boolean;
  promocaoDisponivel: boolean;
};

export type LinhaRuptura = EntradaRuptura & {
  qualidade: number | null;
  cobertura: number | null;
  envio: number | null;
  valorEnvio: number | null;
  severidade: "critical" | "warn" | "ok" | "sem";
  acoes: string[];
};

export function normalizarQualidade(s: number | null): number | null {
  if (s == null || !Number.isFinite(s)) return null;
  return Math.round(s <= 1 ? s * 100 : s);
}

export function avaliarRuptura(e: EntradaRuptura): LinhaRuptura {
  const qualidade = normalizarQualidade(e.saude);
  const diaria = e.vendas7d != null && e.vendas7d > 0 ? e.vendas7d / 7 : null;
  const cobertura = diaria != null && e.estoque != null ? Math.round((e.estoque / diaria) * 10) / 10 : null;
  // Zero paid sales observed in 7 days is a real number: nothing to send.
  const envio = e.vendas7d === 0 && e.estoque != null ? 0
    : diaria != null && e.estoque != null ? Math.max(0, Math.ceil(diaria * ALVO_DIAS) - e.estoque) : null;
  const valorEnvio = envio != null && e.preco != null ? envio * e.preco : null;
  const severidade: LinhaRuptura["severidade"] =
    cobertura == null ? "sem" : cobertura < 7 ? "critical" : cobertura < 14 ? "warn" : "ok";
  const acoes: string[] = [];
  if (severidade === "critical" || severidade === "warn") acoes.push(e.logistica === "fulfillment" ? "Repor no Full" : "Enviar para o Full");
  if (qualidade != null && qualidade < QUALIDADE_MIN) acoes.push("Melhorar qualidade");
  if (!e.emPromocao && e.promocaoDisponivel) acoes.push("Ativar promoção");
  if (e.perguntas30d >= 5) acoes.push("Atenção às perguntas");
  return { ...e, qualidade, cobertura, envio, valorEnvio, severidade, acoes };
}
