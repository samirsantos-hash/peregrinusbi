import * as XLSX from "xlsx";
import type { CarteiraDataset, CarteiraSeller, CarteiraPoint, CarteiraListing } from "@/hooks/carteira/useCarteiraData";

/* ═══════════ Schema esperado do arquivo diário ═══════════ */
export const REQUIRED_COLS = [
  "Date Month", "Seller ID", "Seller Nickname", "Seller Reputation", "Item ID", "Item Title",
  "Stock", "Item Status", "Official Store", "Date Date", "Logistic Type Order", "SKU",
  "Part Number", "Buybox", "Psj Order", "Shops Order",
  "Category Name L1", "Category Name L2", "Category Name L3",
  "Tgmv Lc Forecast", "Tsi Forecast", "Tasp Lc Forecast",
] as const;

/** Linha agregada por loja × dia × loja oficial */
export interface DayRow { c: string; d: string; s: string; g: number; t: number }
/** Linha agregada por loja × loja oficial × categoria L1 */
export interface CatRow { c: string; s: string; k: string; i: number; g: number; t: number }

export interface Extraction {
  id: string;
  fileName: string;
  extractedAt: string | null;   // ISO datetime do nome do arquivo
  periodStart: string;          // YYYY-MM-DD
  periodEnd: string;
  rowCount: number;
  sellerCount: number;
  stores: string[];
  sellersInFile: { c: string; nick: string; g: number }[];
  days: DayRow[];
  cats: CatRow[];
}

const num = (v: any) => {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[R$\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function toIsoDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** BRASIL__Daily__Julho_2026-07-27T1830.xlsx → 2026-07-27T18:30 */
export function extractedAtFromName(name: string): string | null {
  const m = name.match(/(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})/);
  if (m) return `${m[1]}T${m[2]}:${m[3]}`;
  const d = name.match(/(\d{4}-\d{2}-\d{2})/);
  return d ? `${d[1]}T00:00` : null;
}

export class SchemaError extends Error {}

/** Normaliza cabeçalhos: remove sufixos como " (Yes / No)" e espaços extras. */
const normHeader = (h: string) =>
  h.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();

/** Reindexa a linha por cabeçalho normalizado. */
const normRow = (r: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const k of Object.keys(r)) out[normHeader(k)] = r[k];
  return out;
};

export type ParseProgress = (p: { step: string; label: string; pct: number }) => void;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function parseExtraction(file: File, onProgress?: ParseProgress): Promise<Extraction> {
  const report = async (step: string, label: string, pct: number) => {
    onProgress?.({ step, label, pct });
    await tick();
  };

  await report("read", "Lendo o arquivo…", 5);
  const buf = await file.arrayBuffer();

  await report("decode", "Decodificando a planilha (.xlsx)…", 20);
  const wb = XLSX.read(buf, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new SchemaError("A planilha não contém nenhuma aba legível.");

  await report("rows", "Convertendo linhas…", 40);
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
  const rows = rawRows.map(normRow);
  if (!rows.length) throw new SchemaError("A planilha está vazia.");

  await report("schema", "Validando colunas obrigatórias…", 55);
  const headers = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_COLS.filter((c) => !headers.has(c));
  if (missing.length) {
    throw new SchemaError(
      `Arquivo fora do padrão: falta${missing.length > 1 ? "m" : ""} a(s) coluna(s) ${missing.map((m) => `"${m}"`).join(", ")}.`
    );
  }

  const dayMap = new Map<string, DayRow>();
  const catMap = new Map<string, CatRow & { items: Set<string> }>();
  const sellerMap = new Map<string, { c: string; nick: string; g: number }>();
  let min = "9999-12-31", max = "0000-01-01";
  const stores = new Set<string>();

  await report("aggregate", `Agregando ${rows.length.toLocaleString("pt-BR")} linhas…`, 60);
  let i = 0;
  for (const r of rows) {
    if (++i % 20000 === 0) {
      await report(
        "aggregate",
        `Agregando linhas… ${i.toLocaleString("pt-BR")}/${rows.length.toLocaleString("pt-BR")}`,
        60 + Math.round((i / rows.length) * 30)
      );
    }
    const cust = String(r["Seller ID"] ?? "").split(".")[0].trim();
    if (!cust) continue;
    const date = toIsoDate(r["Date Date"]);
    if (!date) continue;
    const store = String(r["Official Store"] ?? "").trim() || "ND";
    const gmv = num(r["Tgmv Lc Forecast"]);
    const tsi = num(r["Tsi Forecast"]);
    const cat = String(r["Category Name L1"] ?? "").trim() || "ND";
    const item = String(r["Item ID"] ?? "").trim();

    stores.add(store);
    if (date < min) min = date;
    if (date > max) max = date;

    const dk = `${cust}|${date}|${store}`;
    const d = dayMap.get(dk) ?? { c: cust, d: date, s: store, g: 0, t: 0 };
    d.g += gmv; d.t += tsi; dayMap.set(dk, d);

    const ck = `${cust}|${store}|${cat}`;
    const c = catMap.get(ck) ?? { c: cust, s: store, k: cat, i: 0, g: 0, t: 0, items: new Set<string>() };
    c.g += gmv; c.t += tsi; if (item) c.items.add(item);
    catMap.set(ck, c);

    const sl = sellerMap.get(cust) ?? { c: cust, nick: String(r["Seller Nickname"] ?? "").trim() || cust, g: 0 };
    sl.g += gmv; sellerMap.set(cust, sl);
  }

  const cats: CatRow[] = Array.from(catMap.values()).map(({ items, ...rest }) => ({ ...rest, i: items.size }));

  await report("done", "Extração pronta para conferência.", 100);
  return {
    id: `${file.name}::${Date.now()}`,
    fileName: file.name,
    extractedAt: extractedAtFromName(file.name),
    periodStart: min === "9999-12-31" ? "" : min,
    periodEnd: max === "0000-01-01" ? "" : max,
    rowCount: rows.length,
    sellerCount: sellerMap.size,
    stores: Array.from(stores).sort(),
    sellersInFile: Array.from(sellerMap.values()).sort((a, b) => b.g - a.g),
    days: Array.from(dayMap.values()),
    cats,
  };
}

export interface BuildResult {
  dataset: CarteiraDataset;
  ignored: { c: string; nick: string; g: number }[];
  matched: number;
}

/**
 * Constrói o dataset do painel a partir da extração, isolando estritamente
 * os cust IDs da carteira mestre. Nada fora da lista entra nos agregados.
 */
export function buildDatasetFromExtraction(
  ex: Extraction,
  master: CarteiraSeller[],
  base: CarteiraDataset,
  storeFilter: string | null
): BuildResult {
  const byCust = new Map(master.map((s) => [s.custId, s]));
  const ignored = ex.sellersInFile.filter((s) => !byCust.has(s.c));

  const keep = (custId: string, store: string) =>
    byCust.has(custId) && (!storeFilter || store === storeFilter);

  // KPIs auxiliares (visitas / PADS) que não existem no arquivo diário:
  // são preservados da base para não zerar as abas Tráfego e PADS.
  const auxDaily = new Map(base.daily.map((p) => [`${p.sellerId}|${p.data}`, p]));

  const dailyMap = new Map<string, CarteiraPoint>();
  const usedSellers = new Set<string>();

  for (const d of ex.days) {
    if (!keep(d.c, d.s)) continue;
    const seller = byCust.get(d.c)!;
    usedSellers.add(seller.id);
    const k = `${seller.id}|${d.d}`;
    const cur = dailyMap.get(k) ?? {
      sellerId: seller.id, data: d.d, gmv: 0, tsi: 0,
      visitas: 0, invPads: 0, gmvPads: 0, tsiPads: 0,
    };
    cur.gmv += d.g; cur.tsi += d.t;
    dailyMap.set(k, cur);
  }
  for (const [k, p] of dailyMap) {
    const aux = auxDaily.get(k);
    if (aux) { p.visitas = aux.visitas; p.invPads = aux.invPads; p.gmvPads = aux.gmvPads; p.tsiPads = aux.tsiPads; }
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.data.localeCompare(b.data));

  // mensal = agregação por mês-calendário da própria extração
  const monthMap = new Map<string, CarteiraPoint>();
  for (const p of daily) {
    const mk = `${p.sellerId}|${p.data.slice(0, 7)}-01`;
    const cur = monthMap.get(mk) ?? {
      sellerId: p.sellerId, data: `${p.data.slice(0, 7)}-01`, gmv: 0, tsi: 0,
      visitas: 0, invPads: 0, gmvPads: 0, tsiPads: 0,
    };
    cur.gmv += p.gmv; cur.tsi += p.tsi; cur.visitas += p.visitas;
    cur.invPads += p.invPads; cur.gmvPads += p.gmvPads; cur.tsiPads += p.tsiPads;
    monthMap.set(mk, cur);
  }
  const monthly = Array.from(monthMap.values()).sort((a, b) => a.data.localeCompare(b.data));

  const listings: CarteiraListing[] = [];
  for (const c of ex.cats) {
    if (!keep(c.c, c.s)) continue;
    const seller = byCust.get(c.c)!;
    usedSellers.add(seller.id);
    listings.push({ sellerId: seller.id, data: ex.periodEnd, categoria: c.k, vertical: c.k, itens: c.i });
  }

  const sellers = master.filter((s) => usedSellers.has(s.id));
  const ids = new Set(sellers.map((s) => s.id));

  return {
    matched: sellers.length,
    ignored,
    dataset: {
      sellers,
      sellerById: new Map(sellers.map((s) => [s.id, s])),
      daily, monthly, listings,
      eligibility: base.eligibility.filter((e) => ids.has(e.sellerId)),
      grants: base.grants.filter((g) => ids.has(g.sellerId)),
      refDate: ex.periodEnd || base.refDate,
    },
  };
}

/** Totais de uma extração já isolada na carteira (para o modo comparar posições). */
export function totalsOf(ex: Extraction, master: CarteiraSeller[], storeFilter: string | null) {
  const byCust = new Map(master.map((s) => [s.custId, s]));
  const perSeller = new Map<string, { custId: string; nick: string; gmv: number; tsi: number }>();
  let gmv = 0, tsi = 0;
  for (const d of ex.days) {
    if (!byCust.has(d.c) || (storeFilter && d.s !== storeFilter)) continue;
    gmv += d.g; tsi += d.t;
    const cur = perSeller.get(d.c) ?? { custId: d.c, nick: byCust.get(d.c)!.nick, gmv: 0, tsi: 0 };
    cur.gmv += d.g; cur.tsi += d.t;
    perSeller.set(d.c, cur);
  }
  return { gmv, tsi, ticket: tsi > 0 ? gmv / tsi : 0, perSeller };
}