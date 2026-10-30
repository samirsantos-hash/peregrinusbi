/** Briefing textual do período escolhido, comparado à janela anterior de mesmo tamanho. */
export interface LinhaDiaria {
  date: string;
  tgmv?: number;
  revenue?: number;
  adsInvestment?: number;
  visits?: number;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const fat = (k: LinhaDiaria) => n(k.tgmv) || n(k.revenue);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function addDias(iso: string, d: number) {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}
function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000) + 1;
}

export function briefingPeriodo(serie: LinhaDiaria[], de?: string, ate?: string): string | null {
  if (!de || !ate || !serie.length) return null;
  const dias = diasEntre(de, ate);
  if (dias < 1) return null;
  const dentro = (a: string, b: string) => serie.filter((k) => { const d = String(k.date).slice(0, 10); return d >= a && d <= b; });
  const atual = dentro(de, ate);
  if (!atual.length) return `Nos ${dias} dias selecionados não há dados diários desta loja.`;

  const soma = (rows: LinhaDiaria[], f: (k: LinhaDiaria) => number) => rows.reduce((s, k) => s + f(k), 0);
  const total = soma(atual, fat);
  const ads = soma(atual, (k) => n(k.adsInvestment));
  const visitas = soma(atual, (k) => n(k.visits));
  const melhor = atual.reduce((m, k) => (fat(k) > fat(m) ? k : m), atual[0]);

  const partes: string[] = [];
  partes.push(`Nos ${dias} dias selecionados, a loja faturou ${brl(total)} (média de ${brl(total / dias)} por dia).`);

  const ant = dentro(addDias(de, -dias), addDias(de, -1));
  const totalAnt = soma(ant, fat);
  if (ant.length && totalAnt > 0) {
    const v = ((total - totalAnt) / totalAnt) * 100;
    partes.push(v >= 0
      ? `Isso é ${pct(v)} acima dos ${dias} dias anteriores.`
      : `Isso é ${pct(Math.abs(v))} abaixo dos ${dias} dias anteriores.`);
  } else {
    partes.push(`Não há dados dos ${dias} dias anteriores para comparar.`);
  }
  if (fat(melhor) > 0) partes.push(`Melhor dia: ${dataBr(melhor.date)}, com ${brl(fat(melhor))}.`);
  if (ads > 0 && total > 0) partes.push(`Investimento em Ads de ${brl(ads)}, ${pct((ads / total) * 100)} do faturamento.`);
  if (visitas > 0) partes.push(`${visitas.toLocaleString("pt-BR")} visitas no período.`);
  return partes.join(" ");
}
