/** Visual intent only: does not change query keys, permissions or cached data. */
export function sinalizarSelecaoCarregamento() {
  window.dispatchEvent(new Event('painel-selecao-carregamento'));
}