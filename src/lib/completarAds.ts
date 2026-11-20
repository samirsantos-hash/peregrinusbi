/** Faltam dias recentes de métricas de campanha? (último dia antes de ontem, ou nenhum dia). */
export function precisaCompletar(ultimoDia: string | null | undefined, hoje: string): boolean {
  if (!ultimoDia) return true;
  const ontem = new Date(Date.parse(`${hoje}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return ultimoDia.slice(0, 10) < ontem;
}
