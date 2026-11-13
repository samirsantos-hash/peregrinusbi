// Regras puras do registro de acessos (testadas em src/lib/conformidade/acessos.test.ts).
export function descreverAparelho(ua: string | null): string {
  if (!ua) return 'Aparelho não identificado';
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const so = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Sistema desconhecido';
  return `${nav} · ${so}`;
}

/** Novo só quando já há histórico e a chave do aparelho não aparece nele. */
export function ehAcessoNovo(anteriores: string[], chave: string): boolean {
  return anteriores.length > 0 && !anteriores.includes(chave);
}
