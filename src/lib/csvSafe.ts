/**
 * Neutralização de CSV injection na exportação.
 *
 * Excel/Sheets executam fórmulas em células que começam com = + - @ (e com
 * TAB/CR, usados para burlar o filtro). Um nickname de loja vindo do
 * marketplace é dado de terceiro: tratamos como hostil na saída.
 *
 * Não altera o parser de importação — é só a camada de escrita.
 */
const PERIGOSO = /^[=+\-@\t\r]/;

/** Escapa uma célula para CSV e neutraliza fórmulas. */
export function celulaCsvSegura(valor: unknown, delimitador = ";"): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);

  if (PERIGOSO.test(texto)) texto = `'${texto}`;

  const precisaAspas =
    texto.includes(delimitador) ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r");

  return precisaAspas ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Monta uma linha CSV já sanitizada. */
export function linhaCsvSegura(valores: unknown[], delimitador = ";"): string {
  return valores.map((v) => celulaCsvSegura(v, delimitador)).join(delimitador);
}
