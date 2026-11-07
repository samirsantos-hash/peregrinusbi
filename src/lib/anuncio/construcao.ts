import { notarFotos, notarFichaTecnica, type NotaParcial, type FotoApi, type AtributoItem, type AtributoCategoria, type ShippingItem } from './dimensoes';

export interface ConstrucaoLida {
  item_id: string; preco: number | null; moeda: string | null; tipo: string | null;
  envio: ShippingItem | null; fotos: FotoApi[] | null;
  atributos: AtributoItem[] | null; categoria: AtributoCategoria[] | null;
}
export interface LoteConstrucao { itens: ConstrucaoLida[]; indisponiveis: string[]; coberturaCompleta: boolean; consultadoEm: string }

export function notasConstrucaoLida(item: ConstrucaoLida): Partial<Record<'fotos' | 'fichaTecnica' | 'preco', NotaParcial>> {
  return {
    fotos: notarFotos(item.fotos),
    fichaTecnica: item.atributos === null ? { nota: null, evidencia: 'ficha técnica não lida', acao: null } : notarFichaTecnica(item.atributos, item.categoria),
    preco: { nota: null, evidencia: item.preco !== null && item.moeda === 'BRL' ? `Preço atual R$ ${item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; sem referência comparável confirmada` : 'preço atual não confirmado', acao: null },
  };
}