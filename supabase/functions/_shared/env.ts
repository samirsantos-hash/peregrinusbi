/**
 * Leitura de segredos com falha alta.
 *
 * Um segredo ausente NÃO pode virar string vazia: isso faz a função seguir
 * adiante e falhar depois, longe da causa (ou pior, gravar dado errado).
 * Aqui o erro estoura imediatamente, com o nome da variável no log.
 */
export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    const msg = `Segredo obrigatório ausente no ambiente da Edge Function: ${name}`;
    console.error(msg);
    throw new Error(msg);
  }
  return value;
}

/** Segredo opcional: retorna undefined quando não configurado. */
export function optionalEnv(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.length > 0 ? value : undefined;
}
