export type Perfil = 'consultor' | 'dono_grupo' | 'gestor_loja';

/** Escopo de atuação: define o nível de entrada do usuário após o login. */
export type Escopo = 'global' | 'grupo' | 'loja';

export const ESCOPO_POR_PAPEL: Record<Perfil, Escopo> = {
  consultor: 'global',
  dono_grupo: 'grupo',
  gestor_loja: 'loja',
};

export const NAVEGACAO_POR_ESCOPO: Record<Escopo, { entrada: string; agrupaVinculos: boolean }> = {
  // 'global' tem um nível acima que agrupa tudo (a carteira): nunca precisa de seletor.
  global: { entrada: '/carteira', agrupaVinculos: true },
  grupo: { entrada: '/grupos/:grupoId', agrupaVinculos: false },
  loja: { entrada: '/lojas/:lojaId', agrupaVinculos: false },
};

export const PROFUNDIDADE: Record<Perfil, { entrada: string; niveisPermitidos: number[] }> = {
  consultor:   { entrada: '/carteira',        niveisPermitidos: [0, 1, 2, 3, 4, 5] },
  dono_grupo:  { entrada: '/grupos/:grupoId', niveisPermitidos: [1, 2, 3] },
  gestor_loja: { entrada: '/lojas/:lojaId',   niveisPermitidos: [2, 3] },
};

export function nivelPermitido(perfil: Perfil, nivel: number) {
  return PROFUNDIDADE[perfil].niveisPermitidos.includes(nivel);
}

/** Resolve os placeholders da rota de entrada com os vínculos do usuário. */
export function resolverEntrada(
  perfil: Perfil,
  vinculo: { grupoId?: string | null; lojaId?: string | null },
): string | null {
  const entrada = PROFUNDIDADE[perfil].entrada;
  if (entrada.includes(':grupoId')) {
    return vinculo.grupoId ? entrada.replace(':grupoId', vinculo.grupoId) : null;
  }
  if (entrada.includes(':lojaId')) {
    return vinculo.lojaId ? entrada.replace(':lojaId', vinculo.lojaId) : null;
  }
  return entrada;
}

/** Nível acima permitido, usado quando o usuário tem mais de um vínculo na entrada. */
export function nivelAcimaPermitido(perfil: Perfil): number | null {
  const niveis = PROFUNDIDADE[perfil].niveisPermitidos;
  return niveis.length ? Math.min(...niveis) : null;
}

export const ROTAS_NIVEL: Record<number, string> = {
  0: '/carteira',
  1: '/grupos/:grupoId',
  2: '/lojas/:lojaId',
  3: '/lojas/:lojaId/programas',
  4: '/lojas/:lojaId/programas/:programaId/categorias/:categoriaId',
  5: '/lojas/:lojaId/anuncios/:mlb',
};
