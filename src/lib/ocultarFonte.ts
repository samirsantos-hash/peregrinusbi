/**
 * Remove nomes de colunas das planilhas-fonte (ex.: SCORE_FINAL_BBF, INV_PADS)
 * de textos exibidos ao usuário. Os nomes das fontes são confidenciais.
 */
const COLUNA = /\(?\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b\)?/g;

export function ocultarFonte(texto: string): string {
  if (!texto) return texto;
  return texto
    .replace(/\b(Fonte|Base|Coluna)s?:\s*[^.\n]*\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b[^.\n]*/g, "")
    .replace(COLUNA, "indicador")
    .replace(/\bindicador(\s*[÷/×·−-]\s*indicador)+/g, "indicadores da base")
    .replace(/\s{2,}/g, " ")
    .trim();
}
