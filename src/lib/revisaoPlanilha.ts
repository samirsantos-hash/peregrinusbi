import Papa from "papaparse";

export type TipoAlerta =
  | "id_com_varios_apelidos"
  | "apelido_com_varios_ids"
  | "registro_duplicado"
  | "vendas_sem_visitas"
  | "faturamento_negativo"
  | "unidades_sem_faturamento"
  | "faturamento_sem_unidades"
  | "ticket_fora_do_padrao";

export interface Alerta {
  tipo: TipoAlerta;
  custId: string;
  apelido: string;
  data: string;
  linha: number; // linha da planilha (1 = cabeçalho)
  detalhe: string;
}

export interface ResumoLoja {
  custId: string;
  apelido: string;
  linhas: number;
  faturamento: number;
  unidades: number;
  visitas: number;
  ticket: number | null;
}

export interface AnaliseLocal {
  linhas: number;
  lojas: ResumoLoja[];
  alertas: Alerta[];
  colunas: { custId: string; apelido?: string; data?: string; faturamento?: string; unidades?: string; visitas?: string };
}

const CANDIDATOS = {
  custId: ["CUS_CUST_ID_SEL", "CUST_ID", "SELLER_ID", "ID_SELLER"],
  apelido: ["CUS_NICKNAME", "NICKNAME", "APELIDO", "LOJA"],
  data: ["TIM_DAY", "DATA", "DATE", "DIA"],
  faturamento: ["TGMV_LC", "GMV", "FATURAMENTO", "RECEITA"],
  unidades: ["TSI", "UNIDADES", "QTD", "QUANTIDADE"],
  visitas: ["VISITAS", "VISITS"],
};

export function numeroBR(raw: unknown): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const normId = (v: unknown) => String(v ?? "").trim().split(/[.,]/)[0];

function acharColuna(headers: string[], nomes: string[]) {
  const up = headers.map((h) => h.trim().toUpperCase());
  for (const n of nomes) {
    const i = up.indexOf(n);
    if (i >= 0) return headers[i];
  }
  return undefined;
}

function mediana(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Regras determinísticas; o modelo só resume o que elas encontram. */
export function analisarLinhas(rows: Record<string, string>[], headers: string[]): AnaliseLocal {
  const col = {
    custId: acharColuna(headers, CANDIDATOS.custId),
    apelido: acharColuna(headers, CANDIDATOS.apelido),
    data: acharColuna(headers, CANDIDATOS.data),
    faturamento: acharColuna(headers, CANDIDATOS.faturamento),
    unidades: acharColuna(headers, CANDIDATOS.unidades),
    visitas: acharColuna(headers, CANDIDATOS.visitas),
  };
  if (!col.custId) throw new Error("A planilha precisa de uma coluna com o ID da loja (ex.: CUS_CUST_ID_SEL).");

  const alertas: Alerta[] = [];
  const lojas = new Map<string, ResumoLoja>();
  const apelidosPorId = new Map<string, Set<string>>();
  const idsPorApelido = new Map<string, Set<string>>();
  const chaves = new Map<string, number>();

  rows.forEach((r, i) => {
    const linha = i + 2;
    const custId = normId(r[col.custId!]);
    if (!custId) return;
    const apelido = col.apelido ? String(r[col.apelido] ?? "").trim().toUpperCase() : "";
    const data = col.data ? String(r[col.data] ?? "").trim().slice(0, 10) : "";
    const fat = col.faturamento ? numeroBR(r[col.faturamento]) : null;
    const uni = col.unidades ? numeroBR(r[col.unidades]) : null;
    const vis = col.visitas ? numeroBR(r[col.visitas]) : null;
    const base = { custId, apelido, data, linha };

    if (apelido) {
      (apelidosPorId.get(custId) ?? apelidosPorId.set(custId, new Set()).get(custId)!).add(apelido);
      (idsPorApelido.get(apelido) ?? idsPorApelido.set(apelido, new Set()).get(apelido)!).add(custId);
    }
    if (data) {
      const k = `${custId}|${data}`;
      const prev = chaves.get(k);
      if (prev) alertas.push({ ...base, tipo: "registro_duplicado", detalhe: `Mesma loja e data já aparece na linha ${prev}` });
      else chaves.set(k, linha);
    }
    if (fat != null && fat < 0) alertas.push({ ...base, tipo: "faturamento_negativo", detalhe: `Faturamento ${fat}` });
    if (fat != null && fat > 0 && col.visitas && (vis ?? 0) === 0)
      alertas.push({ ...base, tipo: "vendas_sem_visitas", detalhe: `Faturamento ${fat.toFixed(2)} com 0 visitas` });
    if ((uni ?? 0) > 0 && col.faturamento && (fat ?? 0) === 0)
      alertas.push({ ...base, tipo: "unidades_sem_faturamento", detalhe: `${uni} unidades sem faturamento` });
    if ((fat ?? 0) > 0 && col.unidades && (uni ?? 0) === 0)
      alertas.push({ ...base, tipo: "faturamento_sem_unidades", detalhe: `Faturamento ${fat!.toFixed(2)} com 0 unidades` });

    const l = lojas.get(custId) ?? { custId, apelido, linhas: 0, faturamento: 0, unidades: 0, visitas: 0, ticket: null };
    l.linhas++; l.faturamento += fat ?? 0; l.unidades += uni ?? 0; l.visitas += vis ?? 0;
    if (!l.apelido) l.apelido = apelido;
    lojas.set(custId, l);
  });

  for (const [id, set] of apelidosPorId) if (set.size > 1)
    alertas.push({ tipo: "id_com_varios_apelidos", custId: id, apelido: [...set].join(" / "), data: "", linha: 0, detalhe: `${set.size} apelidos para o mesmo ID` });
  for (const [ap, set] of idsPorApelido) if (set.size > 1)
    alertas.push({ tipo: "apelido_com_varios_ids", custId: [...set].join(" / "), apelido: ap, data: "", linha: 0, detalhe: `${set.size} IDs para o mesmo apelido` });

  // Ticket médio (soma/soma) comparado entre lojas por z-score robusto em log.
  const ls = [...lojas.values()];
  ls.forEach((l) => { l.ticket = l.unidades > 0 && l.faturamento > 0 ? l.faturamento / l.unidades : null; });
  const logs = ls.filter((l) => l.ticket).map((l) => Math.log(l.ticket!));
  if (logs.length >= 5) {
    const med = mediana(logs);
    const mad = mediana(logs.map((x) => Math.abs(x - med))) || 1e-9;
    for (const l of ls) if (l.ticket) {
      const z = (0.6745 * (Math.log(l.ticket) - med)) / mad;
      if (Math.abs(z) > 3.5)
        alertas.push({ tipo: "ticket_fora_do_padrao", custId: l.custId, apelido: l.apelido, data: "", linha: 0,
          detalhe: `Ticket médio R$ ${l.ticket.toFixed(2)} vs mediana R$ ${Math.exp(med).toFixed(2)} (z ${z.toFixed(1)})` });
    }
  }

  return { linhas: rows.length, lojas: ls, alertas, colunas: col as AnaliseLocal["colunas"] };
}

export async function analisarArquivo(file: File): Promise<AnaliseLocal> {
  const texto = (await file.text()).replace(/^\uFEFF/, "");
  const r = Papa.parse<Record<string, string>>(texto, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  return analisarLinhas(r.data, r.meta.fields ?? []);
}

export const ROTULO_ALERTA: Record<TipoAlerta, string> = {
  id_com_varios_apelidos: "ID com vários apelidos",
  apelido_com_varios_ids: "Apelido com vários IDs",
  registro_duplicado: "Registro duplicado",
  vendas_sem_visitas: "Vendas sem visitas",
  faturamento_negativo: "Faturamento negativo",
  unidades_sem_faturamento: "Unidades sem faturamento",
  faturamento_sem_unidades: "Faturamento sem unidades",
  ticket_fora_do_padrao: "Ticket fora do padrão",
};
