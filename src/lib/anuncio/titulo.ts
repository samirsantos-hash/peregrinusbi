/** Internal editorial heuristic, never search demand or an official ML score. */
export type AchadoTitulo = { tipo: "pontuacao" | "repeticao" | "ruido" | "formatacao"; trecho: string; ocorrencias: number; caracteres: number; explicacao: string };
type Span = { inicio: number; fim: number };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const funcionais = new Set("de da do das dos para pra com sem e ou a o as os em no na nos nas por ao aos".split(" "));
const ruido = ["original", "originais", "promocao", "promocional", "frete gratis", "nota fiscal", "com nf", "melhor preco", "oferta", "barato", "top", "qualidade", "garantia", "envio rapido", "pronta entrega", "imperdivel", "super", "mega", "excelente", "novo lacrado", "em oferta", "liquidacao", "aproveite"];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ano = /\b(?:19|20)\d{2}\b|\b\d{2}\s*(?:a|à|-|\/)\s*\d{2}\b/gi;
const caracteristica = /\b\d+\s?w\s?[/-]?\s?\d+\b|\b\d+(?:[.,]\d+)?\s?(?:mm|cm|ml|kg|aro|pol|l|g|v|w)\b|\b\d+[.,]\d+\b|\bturbo\b|\bflex\b/gi;
export function analisarTitulo(titulo: string, opcoes: { marca?: string; limitePlataforma?: number | null; corteVisual?: number } = {}) {
  const t = titulo.trim();
  if (!t) throw new Error("Título vazio — nada a analisar.");
  const corte = Number.isFinite(opcoes.corteVisual) && Number(opcoes.corteVisual) > 0 ? Math.floor(Number(opcoes.corteVisual)) : 45;
  const limite = typeof opcoes.limitePlataforma === "number" && Number.isInteger(opcoes.limitePlataforma) && opcoes.limitePlataforma > 0 ? opcoes.limitePlataforma : null;
  const achados: AchadoTitulo[] = [];
  const ocupados = new Set<number>();
  const remover = new Set<number>();
  const protegidos = new Set<number>();
  // Preserve decimal commas, dimensions, codes, viscosity, year/size ranges and inch marks.
  for (const re of [/\b\d+[.,]\d+\b/g, /\b[\p{L}\p{N}]+(?:[-/+.][\p{L}\p{N}]+)+\b/gu, /\b\d+\s*(?:x|×|\/)\s*\d+(?:\s*\/\s*\d+)?\b/gi, /\b\d+[wW]\s*\/\s*\d+\b/g, /\b\d+(?:[.,]\d+)?\s*["″]/g]) {
    for (const m of t.matchAll(re)) for (let i = m.index; i < m.index + m[0].length; i++) protegidos.add(i);
  }
  const add = (tipo: AchadoTitulo["tipo"], trecho: string, spans: Span[], explicacao: string, limpar = true) => {
    let novos = 0;
    for (const span of spans) for (let i = span.inicio; i < span.fim; i++) {
      if (!ocupados.has(i)) { ocupados.add(i); novos++; }
      if (limpar) remover.add(i);
    }
    achados.push({ tipo, trecho, ocorrencias: spans.length, caracteres: novos, explicacao });
  };
  const pontuacoes = [
    { re: /[,;:|()[\]{}*#@~^!?+"“”']/g, nome: "pontuação editorial" },
    { re: /\s[-–—]\s/g, nome: "separador isolado" },
    { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}](?:\uFE0F)?/gu, nome: "emoji" },
  ];
  for (const p of pontuacoes) {
    const spans = [...t.matchAll(p.re)].filter(m => !Array.from({ length: m[0].length }, (_, i) => m.index + i).some(i => protegidos.has(i))).map(m => ({ inicio: m.index, fim: m.index + m[0].length }));
    if (spans.length) add("pontuacao", p.nome, spans, "Revise a legibilidade; símbolos técnicos e códigos devem ser preservados.");
  }
  const espacos = [...t.matchAll(/\s{2,}/g)].map(m => ({ inicio: m.index + 1, fim: m.index + m[0].length }));
  if (espacos.length) add("formatacao", "espaços duplicados", espacos, "Espaços extras não acrescentam conteúdo.");
  const tokens = [...t.matchAll(/\S+/g)];
  const grupos = new Map<string, { original: string; spans: Span[] }>();
  for (const token of tokens) {
    const k = normalizar(token[0]).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (k.length < 3 || funcionais.has(k) || /^\d+$/.test(k)) continue;
    const grupo = grupos.get(k) ?? { original: token[0], spans: [] };
    grupo.spans.push({ inicio: token.index, fim: token.index + token[0].length });
    grupos.set(k, grupo);
  }
  for (const grupo of grupos.values()) if (grupo.spans.length > 1) {
    add("repeticao", grupo.original, grupo.spans.slice(1), "Repetição literal: confirme que não descreve aplicações diferentes.");
    const ultimo = achados[achados.length - 1];
    if (ultimo) ultimo.ocorrencias = grupo.spans.length;
  }
  // Review-only: terms such as “Original” may identify a real product/brand.
  const norm = normalizar(t);
  for (const r of ruido) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(r).replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}])`, "gu");
    const spans = [...norm.matchAll(re)].map(m => ({ inicio: m.index, fim: m.index + m[0].length }));
    if (spans.length) add("ruido", r, spans, "Termo promocional ou genérico do estudo; a demanda não foi medida. Preserve se identificar o produto.", false);
  }
  const letras = t.match(/\p{L}/gu) ?? [];
  const maiusculas = t.match(/\p{Lu}/gu) ?? [];
  if (letras.length > 10 && maiusculas.length / letras.length > 0.6) achados.push({ tipo: "formatacao", trecho: "caixa alta excessiva", ocorrencias: 1, caracteres: 0, explicacao: "Revise a leitura, preservando siglas e códigos." });
  const termosForaDaVisao = tokens.filter(m => m.index + m[0].length > corte).map(m => m[0]);
  const chaveForaDaVisao = [...t.matchAll(ano), ...t.matchAll(caracteristica)].filter(m => m.index + m[0].length > corte).map(m => m[0]);
  const caracteresDesperdicados = ocupados.size;
  const densidadeUtil = Math.max(0, Math.min(1, (t.length - caracteresDesperdicados) / t.length));
  // Neither category limit nor estimated visual cut affects the internal density score.
  const nota = densidadeUtil;
  const tituloLimpo = t.split("").map((c, i) => remover.has(i) ? " " : c).join("").replace(/\s+/g, " ").trim();
  const excedeLimite = limite === null ? null : t.length > limite;
  const sugestoes = achados.map(a => `${a.trecho}: ${a.explicacao}`);
  if (excedeLimite) sugestoes.unshift(`Título com ${t.length} caracteres: limite confirmado de ${limite}. Revise redundâncias antes de cortar informações do produto.`);
  if (chaveForaDaVisao.length) sugestoes.push(`${[...new Set(chaveForaDaVisao)].join(", ")} após o corte estimado de ${corte} caracteres; revise a ordem sem presumir perda de conversão.`);
  return { titulo: t, comprimento: t.length, achados: achados.sort((a, b) => b.caracteres - a.caracteres), caracteresDesperdicados, densidadeUtil, nota, limitePlataforma: limite, excedeLimite, corteVisual: corte, termosForaDaVisao, chaveForaDaVisao: [...new Set(chaveForaDaVisao)], sugestoes, tituloLimpo };
}