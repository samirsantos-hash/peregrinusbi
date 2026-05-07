import Papa from "papaparse";

// ── Column type definitions ──
export type ColType = "number" | "date" | "boolean" | "string" | "integer";

export interface SchemaCol {
  /** CSV header name (case-insensitive match after trim) */
  csv: string;
  /** snake_case DB column name */
  db: string;
  type: ColType;
}

export interface CsvSchema {
  name: string;
  columns: SchemaCol[];
}

export interface ParseResult<T = Record<string, unknown>> {
  rows: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
  warnings: string[];
}

// ── Number parsing (handles mixed BR / EN decimals) ──
function parseNumber(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  let s = String(raw).trim();
  // Remove currency symbols / whitespace
  s = s.replace(/[R$\s]/g, "");
  if (s === "" || s === "-") return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Both present – the LAST one is the decimal separator
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // 1.234,56 → comma is decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 → dot is decimal
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // Only comma → treat as decimal
    s = s.replace(",", ".");
  }
  // else only dot or neither → already fine

  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function parseInteger(raw: string | null | undefined): number {
  const n = parseNumber(raw);
  return Math.round(n);
}

// ── Date parsing ──
function parseDate(raw: string | null | undefined): string | null {
  if (!raw || String(raw).trim() === "") return null;
  const s = String(raw).trim();

  // ISO: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  // BR: DD-MM-YYYY or DD/MM/YYYY
  const brMatch = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  return null;
}

function parseBool(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1";
}

// ── Strip BOM from string ──
function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

// ── Main parser ──
export function parseCsv<T = Record<string, unknown>>(
  fileContent: string,
  schema: CsvSchema
): ParseResult<T> {
  const clean = stripBom(fileContent);
  const warnings: string[] = [];

  const result = Papa.parse(clean, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h: string) => stripBom(h).trim(),
  });

  // Build header lookup (case-insensitive)
  const headerMap = new Map<string, SchemaCol>();
  for (const col of schema.columns) {
    headerMap.set(col.csv.toLowerCase().trim(), col);
  }

  const rows: T[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const raw = result.data[i] as Record<string, string>;
    const row: Record<string, unknown> = {};
    let valid = true;

    for (const [csvHeader, value] of Object.entries(raw)) {
      const col = headerMap.get(csvHeader.toLowerCase().trim());
      if (!col) continue;

      try {
        switch (col.type) {
          case "number":
            row[col.db] = parseNumber(value);
            break;
          case "integer":
            row[col.db] = parseInteger(value);
            break;
          case "date":
            row[col.db] = parseDate(value);
            break;
          case "boolean":
            row[col.db] = parseBool(value);
            break;
          case "string":
          default:
            row[col.db] = value ? String(value).trim() : "";
            break;
        }
      } catch {
        warnings.push(`Row ${i + 1}, col "${csvHeader}": parse error`);
        valid = false;
      }
    }

    if (valid) {
      rows.push(row as T);
    }
  }

  return { rows, errors: result.errors, meta: result.meta, warnings };
}

// ── Deduplication helper ──
export function dedup<T extends Record<string, unknown>>(
  rows: T[],
  keyFields: string[],
  dateField: string
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = keyFields.map((k) => String(row[k] ?? "")).join("|");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
    } else {
      const existingDate = String(existing[dateField] ?? "");
      const newDate = String(row[dateField] ?? "");
      if (newDate > existingDate) {
        map.set(key, row);
      }
    }
  }
  return Array.from(map.values());
}

// ── Normalize helpers ──
export function normalizeCustId(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  const s = String(raw).split(",")[0].split(".")[0].trim();
  return parseInt(s, 10) || 0;
}

export function normalizeUpperStr(raw: string | null | undefined): string {
  return raw ? String(raw).trim().toUpperCase() : "";
}