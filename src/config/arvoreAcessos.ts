import { Package, Search, Store } from 'lucide-react';
import { SELLER_TABS, SUBANALISES, type SellerTab } from './sellerTabs';
import { SECAO_PERMISSAO } from '@/lib/permissoes';

export type AcessoArvore = { id: string; label: string; secao?: string; subaba?: string; caminho?: string; aba?: string; permissao: string; consultor?: boolean; rede?: boolean };
export type RamoArvore = SellerTab & { acessos: AcessoArvore[] };
const externo = (id: string, label: string, caminho: string, permissao: string, aba?: string): AcessoArvore => ({ id, label, caminho, permissao, aba, consultor: caminho !== '/multilojas', rede: caminho === '/multilojas' });
const extras: Record<string, AcessoArvore[]> = {
  publicidade: [externo('gestao-campanhas', 'Gerenciar campanhas', '/publicidade', 'publicidade.visualizar', 'campanhas'), externo('gestao-ads', 'Anúncios patrocinados', '/publicidade', 'publicidade.visualizar', 'anuncios')],
  opportunities: [externo('participacao', 'Anúncios em promoções', '/anuncios', 'promocoes.visualizar', 'participacao'), externo('gerenciar', 'Gerenciar promoções', '/anuncios', 'promocoes.visualizar', 'promocoes')],
  perguntas: [externo('responder', 'Consultar e responder', '/perguntas', 'perguntas.visualizar')],
};
export const RAMOS_ACESSOS: RamoArvore[] = SELLER_TABS.map(tab => ({ ...tab,
  label: tab.id === 'opportunities' ? 'Promoções e oportunidades' : tab.label,
  acessos: (SUBANALISES[tab.id] ?? (tab.id === 'perguntas' ? [{ id: 'resumo', label: 'Indicadores de perguntas' }] : [])).filter(s => tab.id !== 'correlacoes' || s.id === 'geral').map<AcessoArvore>(s => ({ id: s.id, label: tab.id === 'opportunities' && s.id === 'promocoes' ? 'Desempenho de promoções' : s.label, secao: tab.id, subaba: s.id, permissao: `${SECAO_PERMISSAO[tab.id]}.visualizar` })).concat(extras[tab.id] ?? []),
}));
RAMOS_ACESSOS.push(
  { id: 'anuncios', label: 'Anúncios', icon: Package, order: 2, descricao: 'Anúncios, desempenho e produtos', juniorTip: '', acessos: [externo('lista', 'Lista de anúncios', '/anuncios', 'anuncios.visualizar', 'anuncios'), externo('desempenho', 'Desempenho de anúncios', '/anuncios', 'correlacoes.visualizar', 'correlacoes'), externo('abc', 'Curva ABC de produtos', '/anuncios', 'correlacoes.visualizar', 'abc'), externo('melhorias', 'Conteúdo e melhorias', '/anuncios', 'qualidade.visualizar', 'melhorias')] },
  { id: 'mercado', label: 'Mercado', icon: Search, order: 12, descricao: 'Estudos e tendências', juniorTip: '', acessos: [externo('estudos', 'Estudos de mercado', '/mercado', 'mercado.visualizar', 'estudos'), externo('tendencias', 'Tendências', '/mercado', 'mercado.visualizar', 'tendencias')] },
  { id: 'multilojas', label: 'Multilojas', icon: Store, order: 13, descricao: 'Rede de lojas', juniorTip: '', acessos: [externo('rede', 'Visão da rede de lojas', '/multilojas', 'multilojas.visualizar')] },
);
export const GRUPOS_ACESSOS = [
  { titulo: 'Visão geral', ids: ['efficiency', 'reputation'] },
  { titulo: 'Anúncios', ids: ['anuncios', 'quality', 'clips'] },
  { titulo: 'Desempenho comercial', ids: ['opportunities', 'competitiveness', 'publicidade', 'mercado'] },
  { titulo: 'Operação', ids: ['logistics', 'perguntas'] },
  { titulo: 'Planejamento', ids: ['pock', 'metas', 'correlacoes', 'multilojas'] },
];

export function destinoAcesso(a: AcessoArvore, custId?: string, contaId?: string) {
  const params = new URLSearchParams();
  if (!a.caminho) { params.set('aba', a.secao ?? 'efficiency'); if (a.subaba) params.set('subaba', a.subaba); }
  else if (a.aba) params.set('aba', a.aba);
  if (a.caminho === '/mercado' || a.caminho === '/publicidade' || a.caminho === '/perguntas') { if (contaId) params.set('conta', contaId); }
  else if (a.caminho !== '/multilojas' && custId) params.set('loja', custId);
  return `${a.caminho ?? '/'}${params.toString() ? `?${params.toString()}` : ''}`;
}