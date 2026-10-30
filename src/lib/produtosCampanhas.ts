export const PRODUTOS_INICIAIS = 10;
export function produtosVisiveis<T>(itens: T[], expandido: boolean) {
  return expandido ? itens : itens.slice(0, PRODUTOS_INICIAIS);
}
export function fonteProdutos(conta: { status: string } | null) {
  return conta?.status === 'active' ? 'api' : 'planilha';
}
export function campanhaElegivel(status: string) {
  return status === 'candidate' || status === 'candidated';
}