import { classificarAbc, type ItemVendas } from './curvaAbc';
import { notarExperiencia, type NotaParcial } from './dimensoes';

export interface ExperienciaLida { item_id: string; vendas: number; reclamacoes: number | null; atrasos: number | null; cancelamentos: number | null; disponivel: boolean }
export interface LoteExperiencia { periodo: { inicio: string; fim: string }; itens: Pick<ExperienciaLida, 'item_id' | 'disponivel' | 'reclamacoes' | 'atrasos'>[]; coberturaCompleta: boolean }
export function anunciosExperienciaA(itens: ItemVendas[]) { return classificarAbc(itens, 'faturamento').itens.filter(i => i.classe === 'A').map(i => i.mlb); }
export function notaExperienciaLida(e?: ExperienciaLida): NotaParcial {
  if (!e) return { nota: null, evidencia: 'Fora da curva A de faturamento ou leitura ainda não concluída.', acao: null };
  if (e.reclamacoes === null || e.atrasos === null || e.cancelamentos === null) return { nota: null, evidencia: `${e.vendas} pedidos pagos; ${e.cancelamentos === null ? 'cancelamentos sem vínculo inequívoco' : `${e.cancelamentos} pedidos cancelados confirmados`}. Reclamações ${e.reclamacoes ?? 'sem medição'}; atrasos ${e.atrasos ?? 'sem medição'}. Sem ocorrências completas na mesma janela, a nota permanece indisponível.`, acao: null };
  return notarExperiencia({ vendas: e.vendas, reclamacoes: e.reclamacoes, atrasos: e.atrasos, cancelamentos: e.cancelamentos });
}