/** Resolve only an explicitly identified, currently manageable store. Never selects the first account. */
export function resolverContaPublicidade<T extends { id: string; ml_user_id: number }>(
  contas: readonly T[] | undefined,
  custId: string | null,
  contaId: string | null,
): T | undefined {
  if (!contas) return undefined;
  if (custId) {
    const conta = contas.find(c => String(c.ml_user_id) === custId);
    return conta && (!contaId || conta.id === contaId) ? conta : undefined;
  }
  return contaId ? contas.find(c => c.id === contaId) : undefined;
}