export type FuncaoPermissao = { id: string; nome: string; grupo: string; acoes: { id: string; nome: string }[] };
const funcao = (id: string, nome: string, grupo: string, acoes: [string, string][] = []): FuncaoPermissao => ({ id, nome, grupo, acoes: acoes.map(([id, nome]) => ({ id, nome })) });
export const FUNCOES_PERMISSAO = [
  funcao('resumo', 'Visão geral', 'Resultados'),
  funcao('reputacao', 'Reputação', 'Resultados'),
  funcao('preco', 'Preço e concorrentes', 'Resultados', [['preco.alterar', 'Alterar preços']]),
  funcao('publicidade', 'Publicidade', 'Resultados', [['publicidade.campanhas', 'Criar e editar campanhas'], ['publicidade.anuncios', 'Incluir, mover, ativar, pausar e remover anúncios Ads']]),
  funcao('promocoes', 'Oportunidades e promoções', 'Resultados', [['promocoes.aplicar', 'Aplicar promoções e cupons'], ['promocoes.remover', 'Remover promoções e cupons']]),
  funcao('clips', 'Clips', 'Resultados'),
  funcao('logistica', 'Logística e Flex', 'Operação'),
  funcao('qualidade', 'Qualidade', 'Operação'),
  funcao('anuncios', 'Anúncios', 'Operação'),
  funcao('perguntas', 'Perguntas', 'Operação', [['perguntas.responder', 'Responder perguntas']]),
  funcao('full', 'Full', 'Planejamento'),
  funcao('metas', 'Metas', 'Planejamento', [['metas.alterar', 'Editar metas']]),
  funcao('correlacoes', 'Correlações', 'Planejamento'),
  funcao('alertas', 'Alertas e riscos', 'Planejamento'),
  funcao('mercado', 'Estudos de mercado e tendências', 'Planejamento'),
  funcao('integracoes', 'Integrações', 'Gestão', [['integracoes.conectar', 'Conectar lojas e gerar convites'], ['integracoes.atualizar', 'Atualizar dados das lojas'], ['integracoes.configurar', 'Editar configurações da integração']]),
  funcao('carteiras', 'Carteiras', 'Gestão', [['carteiras.alterar', 'Alterar carteiras e vínculos de lojas']]),
  funcao('multilojas', 'Multilojas', 'Gestão'),
  funcao('usuarios', 'Usuários', 'Gestão', [['usuarios.criar', 'Criar usuários'], ['usuarios.pausar', 'Pausar ou remover usuários'], ['usuarios.senhas', 'Redefinir senhas']]),
  funcao('dados', 'Importação e revisão de dados', 'Gestão', [['dados.importar', 'Importar dados']]),
  funcao('relatorios', 'Relatórios', 'Gestão', [['relatorios.exportar', 'Exportar relatórios']]),
] satisfies FuncaoPermissao[];
export const PERMISSOES_VALIDAS = FUNCOES_PERMISSAO.flatMap(f => [`${f.id}.visualizar`, ...f.acoes.map(a => a.id)]);
export const PERMISSAO_PAI = Object.fromEntries(FUNCOES_PERMISSAO.flatMap(f => f.acoes.map(a => [a.id, `${f.id}.visualizar`])));
export const SECAO_PERMISSAO: Record<string, string> = { efficiency: 'resumo', reputation: 'reputacao', competitiveness: 'preco', publicidade: 'publicidade', opportunities: 'promocoes', clips: 'clips', logistics: 'logistica', quality: 'qualidade', perguntas: 'perguntas', pock: 'full', metas: 'metas', correlacoes: 'correlacoes', 'alertas-riscos': 'alertas' };
export function alterarChecklist(atuais: string[], permissao: string, marcada: boolean): string[] {
  if (!PERMISSOES_VALIDAS.includes(permissao)) return atuais;
  const novo = new Set(atuais);
  if (marcada) { novo.add(permissao); const pai = PERMISSAO_PAI[permissao]; if (pai) novo.add(pai); }
  else { novo.delete(permissao); for (const [filha, pai] of Object.entries(PERMISSAO_PAI)) if (pai === permissao) novo.delete(filha); }
  return [...novo].sort();
}
export type EstadoPermissoes = { master: boolean; legado: boolean; revisado: boolean; permissoes: string[] };
export function podeExecutar(estado: EstadoPermissoes | undefined, permissao: string) {
  if (!estado || !PERMISSOES_VALIDAS.includes(permissao)) return false;
  return estado.master || (estado.permissoes.includes(permissao) && (!PERMISSAO_PAI[permissao] || estado.permissoes.includes(PERMISSAO_PAI[permissao])));
}export type NivelCliente = 'tiro' | 'medius' | 'peritus';
// Tiro (plano básico): só a Análise geral do Resumo, como leitura consolidada de tudo.
const VER_TIRO = ['resumo.visualizar'];
const VER_MEDIUS = [...VER_TIRO, ...['reputacao', 'preco', 'publicidade', 'promocoes', 'clips', 'logistica', 'qualidade', 'anuncios', 'perguntas', 'full', 'metas', 'correlacoes', 'alertas', 'mercado', 'relatorios'].map(f => `${f}.visualizar`), 'relatorios.exportar'];
const PERITUS = PERMISSOES_VALIDAS.filter(p => !p.startsWith('usuarios.'));
export const NIVEIS_CLIENTE: { id: NivelCliente; nome: string; descricao: string; permissoes: string[] }[] = [
  { id: 'tiro', nome: 'Tiro', descricao: 'Plano básico: somente a Análise geral (resumo de todas as informações), sem alterar dados.', permissoes: [...VER_TIRO].sort() },
  { id: 'medius', nome: 'Medius', descricao: 'Mais análises e relatórios, com consumo médio de recursos; sem alterar dados.', permissoes: [...VER_MEDIUS].sort() },
  { id: 'peritus', nome: 'Peritus', descricao: 'Nível de consultor: visualiza e faz a gestão.', permissoes: [...PERITUS].sort() },
];
export function nivelDoChecklist(permissoes: string[]): NivelCliente | null {
  const atual = [...permissoes].sort().join('|');
  return NIVEIS_CLIENTE.find(n => n.permissoes.join('|') === atual)?.id ?? null;
}

/** Subanálises liberadas pelo nível; null = todas. Tiro vê só a Análise geral do Resumo. */
export function subanalisesDoNivel(permissoes: string[] | undefined, master = false): Record<string, string[]> | null {
  if (master || !permissoes) return null;
  return nivelDoChecklist(permissoes) === 'tiro' ? { efficiency: ['analise'] } : null;
}
