/* Ingestão do relatório nativo de Vendas do Mercado Livre / Mercado Shops.
 * Trata as armadilhas mapeadas: cabeçalho móvel, colunas homônimas,
 * "março" truncado por \w, e deslocamento de dia por toISOString(). */
import * as XLSX from "xlsx";

export type PedidoML = {
  id: string; dt: Date; dia: string; mes: string; dow: number; hora: number;
  loja: string; mlb: string; sku: string; titulo: string; canal: string;
  tipoAnun: string; logi: string; uf: string; cidade: string; doc: string;
  un: number; gmv: number; acre: number; tarifa: number;
  freteCusto: number; freteRec: number; desc: number; estorno: number; liq: number;
  preco: number; ads: boolean; b2b: boolean; nfeOk: boolean; nfeSt: string;
  recl: boolean; status: string; canc: boolean; devol: boolean; medi: boolean; entregue: boolean;
};

export type Diagnostico = {
  arquivo: string;
  linhas: number; validas: number; aproveitamento: number;
  headerRow: number; camposMapeados: number; camposTotal: number;
  faltando: { campo: string; impacto: string }[];
  lojas: string[]; dias: number; ini: string; fim: string;
  duplicados: number;
  semReceita: number; semUf: number; semNfe: number; semLogi: number;
};

/* ---------------- normalização ---------------- */
export const norm = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const MESES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  enero: 0, febrero: 1, marzo: 2, mayo: 4, junio: 5, julio: 6,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/** "13 de julho de 2026 16:49 hs." → Date local. Captura o mês com [^\s]+
 *  (\w não casa ç e truncaria "março" em "mar"). */
export function parseDataML(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (d) return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+de\s+([^\s]+)\s+de\s+(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?/i);
  if (m) {
    const mes = MESES[norm(m[2])];
    if (mes === undefined) return null;
    return new Date(+m[3], mes, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1], br[4] ? +br[4] : 0, br[5] ? +br[5] : 0);
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

/** YYYY-MM-DD a partir de componentes locais — nunca via toISOString(). */
export const diaLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendário contínuo em UTC puro (imune a horário de verão). */
export function rangeDias(ini: string, fim: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${ini}T00:00:00Z`);
  const end = Date.parse(`${fim}T00:00:00Z`);
  while (t <= end) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86400000;
  }
  return out;
}

export function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/[R$\s\u00a0]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- mapeamento de colunas ---------------- */
type Spec = { campo: string; re: RegExp; impacto: string };

/* A ordem importa: specs mais específicos consomem o índice antes dos genéricos
 * (ex.: "tipo de anuncio" antes de "# de anuncio"; status "estado" antes da UF "estado 2"). */
const SPECS: Spec[] = [
  { campo: "id", re: /^n\s?o?\s?de venda|^numero de venda|^n de venda/, impacto: "identificação de pedido" },
  { campo: "dt", re: /data da venda/, impacto: "toda a análise temporal" },
  { campo: "status", re: /^estado$/, impacto: "cancelamentos, devoluções e mediações" },
  { campo: "uf", re: /^estado \d$/, impacto: "análise geográfica" },
  { campo: "tipoAnun", re: /tipo de anuncio/, impacto: "comparação clássico × premium" },
  { campo: "mlb", re: /de anuncio/, impacto: "concentração por anúncio" },
  { campo: "loja", re: /loja/, impacto: "consolidação multilojas" },
  { campo: "sku", re: /sku/, impacto: "análise por SKU" },
  { campo: "titulo", re: /titulo/, impacto: "leitura dos rankings" },
  { campo: "canal", re: /canal de venda|^canal/, impacto: "separação Livre × Shops" },
  { campo: "logi", re: /forma de entrega|tipo de envio|metodo de envio/, impacto: "mix logístico" },
  { campo: "cidade", re: /cidade/, impacto: "top cidades" },
  { campo: "doc", re: /^cpf|^cnpj|documento/, impacto: "compradores únicos e recompra" },
  { campo: "un", re: /^unidades$/, impacto: "unidades por pedido" },
  { campo: "gmv", re: /receita por produtos/, impacto: "GMV bruto" },
  { campo: "acre", re: /acrescimo/, impacto: "cascata do resultado" },
  { campo: "tarifa", re: /tarifa de venda/, impacto: "take rate" },
  { campo: "freteRec", re: /receita por envio/, impacto: "cascata do resultado" },
  { campo: "f1", re: /tarifas de envio/, impacto: "custo de frete" },
  { campo: "f2", re: /custo de envio com base nas medidas/, impacto: "custo de frete" },
  { campo: "f3", re: /custo por diferencas nas medidas/, impacto: "custo de frete" },
  { campo: "f4", re: /custo de envio por troca/, impacto: "custo de frete" },
  { campo: "desc", re: /desconto/, impacto: "cascata do resultado" },
  { campo: "estorno", re: /cancelamentos e reembolsos/, impacto: "estornos" },
  { campo: "liq", re: /^total/, impacto: "receita líquida e margem" },
  { campo: "preco", re: /preco unitario/, impacto: "distribuição de preço" },
  { campo: "ads", re: /venda por publicidade/, impacto: "aba de publicidade" },
  { campo: "b2b", re: /empresa|b2b/, impacto: "corte B2B" },
  { campo: "nfeSt", re: /nf e/, impacto: "acompanhamento fiscal" },
  { campo: "recl", re: /reclamac/, impacto: "reclamações" },
];

/** Deduplica cabeçalhos homônimos: "estado", "estado 2", "estado 3". */
export function dedupHeaders(row: unknown[]): string[] {
  const seen: Record<string, number> = {};
  return row.map((h) => {
    const base = norm(h);
    if (!base) return "";
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : `${base} ${seen[base]}`;
  });
}

const ANCHORS = [/de venda$/, /data da venda/, /de anuncio/];

export function detectHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const hs = (rows[i] || []).map(norm);
    const hits = ANCHORS.filter((a) => hs.some((h) => a.test(h))).length;
    if (hits >= 2) return i;
  }
  return 0;
}

export function mapColunas(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  const usados = new Set<number>();
  for (const spec of SPECS) {
    const i = headers.findIndex((h, j) => h && !usados.has(j) && spec.re.test(h));
    if (i >= 0) { idx[spec.campo] = i; usados.add(i); }
  }
  if (idx.uf === undefined) {
    const i = headers.findIndex((h, j) => h && !usados.has(j) && /^estado|^uf$|^provincia/.test(h));
    if (i >= 0) { idx.uf = i; usados.add(i); }
  }
  return idx;
}

/* ---------------- leitura ---------------- */
export type ResultadoCarga = { pedidos: PedidoML[]; diag: Diagnostico };

export async function lerPlanilhaML(
  file: File,
  onProgress?: (pct: number, label: string) => void,
): Promise<ResultadoCarga> {
  onProgress?.(5, "Lendo o arquivo");
  const buf = await file.arrayBuffer();
  onProgress?.(20, "Decodificando a planilha");
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => norm(n).includes("vendas")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" }) as unknown[][];
  onProgress?.(40, "Detectando o cabeçalho");

  const headerRow = detectHeaderRow(rows);
  const headers = dedupHeaders(rows[headerRow] || []);
  const idx = mapColunas(headers);
  const body = rows.slice(headerRow + 1).filter((r) => r && r.some((c) => String(c ?? "").trim() !== ""));

  const get = (r: unknown[], c: string) => (idx[c] === undefined ? "" : r[idx[c]]);
  const gnum = (r: unknown[], c: string) => (idx[c] === undefined ? 0 : toNum(r[idx[c]]));

  const pedidos: PedidoML[] = [];
  const vistos = new Set<string>();
  let duplicados = 0, semReceita = 0, semUf = 0, semNfe = 0, semLogi = 0;

  for (let i = 0; i < body.length; i++) {
    if (i % 20000 === 0) onProgress?.(40 + Math.round((i / Math.max(1, body.length)) * 45), "Convertendo as linhas");
    const r = body[i];
    const dt = parseDataML(get(r, "dt"));
    if (!dt) continue;
    const id = String(get(r, "id") ?? "").trim() || `s/id_${i}`;
    const key = `${id}|${String(get(r, "mlb") ?? "")}`;
    if (vistos.has(key)) duplicados++;
    vistos.add(key);

    const statusTxt = String(get(r, "status") ?? "").trim();
    const st = norm(statusTxt);
    const docRaw = String(get(r, "doc") ?? "").replace(/\D/g, "");
    const nfeSt = String(get(r, "nfeSt") ?? "").trim();
    const uf = String(get(r, "uf") ?? "").trim().toUpperCase().replace(/^BR-/, "");
    const logi = String(get(r, "logi") ?? "").trim();

    const gmv = gnum(r, "gmv");
    if (!gmv) semReceita++;
    if (!uf) semUf++;
    if (norm(nfeSt) !== "autorizada") semNfe++;
    if (!logi) semLogi++;

    pedidos.push({
      id, dt, dia: diaLocal(dt), mes: diaLocal(dt).slice(0, 7), dow: dt.getDay(), hora: dt.getHours(),
      loja: String(get(r, "loja") ?? "").trim() || "(sem loja oficial)",
      mlb: String(get(r, "mlb") ?? "").trim(),
      sku: String(get(r, "sku") ?? "").trim(),
      titulo: String(get(r, "titulo") ?? "").trim(),
      canal: String(get(r, "canal") ?? "").trim(),
      tipoAnun: String(get(r, "tipoAnun") ?? "").trim(),
      logi, uf, cidade: String(get(r, "cidade") ?? "").trim(),
      doc: docRaw || `anon_${id}`,
      un: gnum(r, "un") || 1,
      gmv,
      acre: gnum(r, "acre"),
      tarifa: Math.abs(gnum(r, "tarifa")),
      freteCusto: Math.abs(gnum(r, "f1")) + Math.abs(gnum(r, "f2")) + Math.abs(gnum(r, "f3")) + Math.abs(gnum(r, "f4")),
      freteRec: gnum(r, "freteRec"),
      desc: gnum(r, "desc"),
      estorno: Math.abs(gnum(r, "estorno")),
      liq: gnum(r, "liq"),
      preco: gnum(r, "preco"),
      ads: ["sim", "si", "yes"].includes(norm(get(r, "ads"))),
      b2b: /sim|yes|si/.test(norm(get(r, "b2b"))),
      nfeOk: norm(nfeSt) === "autorizada",
      nfeSt,
      recl: /sim|yes|si/.test(norm(get(r, "recl"))),
      status: statusTxt,
      canc: /cancelad/.test(st),
      devol: /devoluc|devolvid/.test(st),
      medi: /mediac/.test(st),
      entregue: /entregue/.test(st),
    });
  }

  onProgress?.(92, "Montando o diagnóstico");
  const dias = Array.from(new Set(pedidos.map((p) => p.dia))).sort();
  const faltando = SPECS
    .filter((s) => !/^f[1-4]$/.test(s.campo) && idx[s.campo] === undefined)
    .map((s) => ({ campo: s.campo, impacto: s.impacto }));

  const diag: Diagnostico = {
    arquivo: file.name,
    linhas: body.length,
    validas: pedidos.length,
    aproveitamento: body.length ? pedidos.length / body.length : 0,
    headerRow: headerRow + 1,
    camposMapeados: Object.keys(idx).length,
    camposTotal: SPECS.length,
    faltando,
    lojas: Array.from(new Set(pedidos.map((p) => p.loja))).sort(),
    dias: dias.length,
    ini: dias[0] || "—",
    fim: dias[dias.length - 1] || "—",
    duplicados,
    semReceita, semUf, semNfe, semLogi,
  };
  onProgress?.(100, "Concluído");
  return { pedidos, diag };
}