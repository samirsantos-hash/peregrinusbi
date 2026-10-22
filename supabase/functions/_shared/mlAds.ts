// Leitura de Product Ads. A API devolve no máximo 90 dias de métricas.
// CTR, CPC, ACOS, ROAS e CVR vêm prontos: ausência fica null, nunca vira zero inventado.

export const JANELA_METRICAS_ADS_DIAS = 90;

export const METRICAS =
  "clicks,prints,ctr,cost,cpc,acos,direct_amount,indirect_amount,total_amount,units_quantity,roas,cvr";

const CHAVES = [
  "clicks",
  "prints",
  "ctr",
  "cost",
  "cpc",
  "acos",
  "direct_amount",
  "indirect_amount",
  "total_amount",
  "units_quantity",
  "roas",
  "cvr",
] as const;

export type MetricasAds = Record<(typeof CHAVES)[number], number | null>;

export function janelaMetricasAds(agora: Date, timeZone = "America/Sao_Paulo"): { date_from: string; date_to: string } {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, dia));
  inicio.setUTCDate(inicio.getUTCDate() - (JANELA_METRICAS_ADS_DIAS - 1));
  return { date_from: inicio.toISOString().slice(0, 10), date_to: hoje };
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() && Number.isFinite(Number(valor))) return Number(valor);
  return null;
}

export function lerMetricas(fonte: unknown): MetricasAds {
  const m = fonte && typeof fonte === "object" ? (fonte as Record<string, unknown>) : {};
  const saida = {} as MetricasAds;
  for (const chave of CHAVES) saida[chave] = numero(m[chave]);
  return saida;
}

export type PontoDiario = { dia: string; metricas: MetricasAds };

export function serieDiaria(json: unknown): PontoDiario[] {
  if (!json || typeof json !== "object") return [];
  const corpo = json as { results?: unknown };
  const lista = Array.isArray(corpo.results) ? corpo.results : Array.isArray(json) ? json : [];
  const pontos: PontoDiario[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const diaBruto = typeof row.date === "string" ? row.date : null;
    if (!diaBruto || !/^\d{4}-\d{2}-\d{2}/.test(diaBruto)) continue;
    const fonte = row.metrics && typeof row.metrics === "object" ? row.metrics : row;
    pontos.push({ dia: diaBruto.slice(0, 10), metricas: lerMetricas(fonte) });
  }
  return pontos;
}

export function metricasPorGrupo(json: unknown): { ad_group_id: number; metricas: MetricasAds }[] {
  if (!json || typeof json !== "object") return [];
  const corpo = json as { results?: unknown };
  const lista = Array.isArray(corpo.results) ? corpo.results : Array.isArray(json) ? json : [];
  const saida: { ad_group_id: number; metricas: MetricasAds }[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = numero(row.ad_group_id ?? row.id);
    if (id == null) continue;
    const fonte = row.metrics && typeof row.metrics === "object" ? row.metrics : row;
    saida.push({ ad_group_id: id, metricas: lerMetricas(fonte) });
  }
  return saida;
}

// Dias de métrica de Ad Group que ainda precisam ser lidos, do mais recente ao mais antigo.
// O ML atribui venda até 14 dias depois do clique: um dia só fica fechado quando foi lido 15 dias depois.
export function diasPendentes(
  janela: { date_from: string; date_to: string },
  lidos: Map<string, string>,
): string[] {
  const dias: string[] = [];
  const fim = Date.parse(`${janela.date_to}T00:00:00Z`);
  for (let t = fim; t >= Date.parse(`${janela.date_from}T00:00:00Z`); t -= 86_400_000) {
    const dia = new Date(t).toISOString().slice(0, 10);
    const lidoEm = lidos.get(dia);
    if (!lidoEm || Date.parse(lidoEm) < t + 15 * 86_400_000) dias.push(dia);
  }
  return dias;
}

export type Anunciante = { advertiser_id: number; site_id: string; advertiser_name: string | null; account_name: string | null };

export function lerAnunciantes(json: unknown): Anunciante[] {
  const lista = json && typeof json === "object" ? (json as { advertisers?: unknown }).advertisers : null;
  if (!Array.isArray(lista)) return [];
  const saida: Anunciante[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = numero(row.advertiser_id);
    const site = typeof row.site_id === "string" ? row.site_id : "";
    if (id == null || !site) continue;
    saida.push({
      advertiser_id: id,
      site_id: site,
      advertiser_name: typeof row.advertiser_name === "string" ? row.advertiser_name : null,
      account_name: typeof row.account_name === "string" ? row.account_name : null,
    });
  }
  return saida;
}
