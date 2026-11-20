import type { linhasVinculo } from './vinculoPromocao';

export type MetricaPromocao = 'faturamento' | 'pedidos' | 'unidades' | 'ticket';
export function compararPromocoes(linhas: ReturnType<typeof linhasVinculo>, metrica: MetricaPromocao) {
  return linhas.flatMap(linha => {
    const grupo = linha.grupo;
    if (!grupo) return [];
    if (![grupo.faturamento, grupo.pedidos, grupo.unidades].every(v => Number.isFinite(v) && v >= 0)) return [];
    const ticket = grupo.pedidos > 0 ? grupo.faturamento / grupo.pedidos : null;
    const valor = metrica === 'ticket' ? ticket : grupo[metrica];
    if (valor == null) return [];
    return [{ chave: linha.chave, nome: linha.promo?.nome ?? linha.promo?.nome_tipo ?? `Promoção ${grupo.id}`, valor, ticket, ...grupo }];
  }).sort((a, b) => b.valor - a.valor || a.chave.localeCompare(b.chave));
}