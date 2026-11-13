import { num, pctFracao } from '@/lib/format';

export type DiagnosticoCampanhas = {
  periodo: { inicio: string; fim: string };
  amostra: true;
  atribuicaoConfirmada: false;
  diagnostico: {
    consultados: number; disponiveis: number; indisponiveis: number;
    comCampanha: number; campanhaReconhecida: number; ofertaReconhecida: number;
  };
};

/** Evidence from a bounded diagnostic never authorizes a performance chart. */
export function coberturaCampanhas(dados: DiagnosticoCampanhas) {
  const d = dados.diagnostico;
  return {
    leituras: d.consultados > 0 ? d.disponiveis / d.consultados : null,
    correspondencias: d.campanhaReconhecida + d.ofertaReconhecida,
    podeExibirDesempenho: false,
  };
}

export function leituraCampanhas(dados: DiagnosticoCampanhas, loja: string) {
  const d = dados.diagnostico, cobertura = coberturaCampanhas(dados);
  const data = (iso: string) => iso.split('-').reverse().join('/');
  const resultado = d.consultados === 0
    ? 'Nenhum pedido pago foi encontrado na amostra consultada. Isso não comprova ausência de vendas no período completo.'
    : `Foram consultados ${num(d.consultados)} pedidos pagos: ${num(d.disponiveis)} tiveram leitura de descontos (${pctFracao(cobertura.leituras)}) e ${num(d.indisponiveis)} ficaram sem leitura disponível. Essas falhas não significam vendas sem promoção.`;
  const vinculo = cobertura.correspondencias === 0
    ? 'Nenhum identificador correspondeu às promoções e ofertas locais verificadas. Portanto, ainda não é possível dizer qual promoção recebeu cada venda.'
    : `Foram encontradas ${num(cobertura.correspondencias)} correspondências de identificadores, não necessariamente pedidos distintos. Elas ainda não comprovam qual promoção estava aplicada no momento da venda.`;
  return [
    `${loja} · ${data(dados.periodo.inicio)} a ${data(dados.periodo.fim)} (dias completos em UTC). ${resultado}`,
    vinculo,
    'O gráfico por promoção permanece indisponível para não mostrar atribuições incorretas. A participação atual do anúncio não substitui a promoção aplicada na venda; esta amostra não permite calcular faturamento, custo por venda ou evolução diária por campanha.',
  ];
}