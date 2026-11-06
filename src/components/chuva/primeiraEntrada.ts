const prefix = 'peregrinus:boas-vindas:';
const seenInMemory = new Set<string>();

/** Account-scoped preference, independent of session/query cache cleanup. */
export function consumirPrimeiraEntrada(userId: string): boolean {
  const key = `${prefix}${userId}`;
  if (seenInMemory.has(key)) return false;
  seenInMemory.add(key);
  try {
    if (window.localStorage.getItem(key) === '1') return false;
    window.localStorage.setItem(key, '1');
  } catch {
    // Blocked storage still suppresses repeats for the current page lifetime.
  }
  return true;
}