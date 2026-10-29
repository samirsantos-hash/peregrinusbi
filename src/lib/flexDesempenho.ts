export interface FlexLoja { id: string; nickname: string; custId: string }
export interface FlexMes { seller_id: string; tim_month_id: number; tgmv_lc: number | null; tgmv_lc_flex: number | null; tsi_flex: number | null }
export interface FlexCidade { cust_id: string; nome: string; cidade: string | null; uf: string | null }

export function capitalPaulista(cidade: string | null, uf: string | null) {
  const normalizar = (v: string | null) => (v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  return normalizar(cidade) === 'SAO PAULO' && normalizar(uf) === 'SP';
}

export function mesAnterior(mes: number) {
  const ano = Math.floor(mes / 100), numero = mes % 100;
  return numero === 1 ? (ano - 1) * 100 + 12 : ano * 100 + numero - 1;
}

export function variacaoFlex(atual: number | null, anterior: number | null) {
  return atual !== null && anterior !== null && anterior > 0 ? (atual / anterior - 1) * 100 : null;
}

/** A ausência de uma medição nunca é convertida em venda zero. */
export function resumoFlex(lojas: FlexLoja[], dados: FlexMes[], mes: number) {
  const indice = new Map(dados.map(d => [`${d.seller_id}:${d.tim_month_id}`, d]));
  const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const linhas = lojas.map(loja => {
    const d = indice.get(`${loja.id}:${mes}`), a = indice.get(`${loja.id}:${mesAnterior(mes)}`);
    const faturamento = finito(d?.tgmv_lc_flex) ? d.tgmv_lc_flex : null;
    const unidades = finito(d?.tsi_flex) ? d.tsi_flex : null;
    const total = finito(d?.tgmv_lc) ? d.tgmv_lc : null;
    const anterior = finito(a?.tgmv_lc_flex) ? a.tgmv_lc_flex : null;
    return { ...loja, faturamento, unidades, total, anterior,
      participacao: faturamento !== null && total !== null && total > 0 ? faturamento / total * 100 : null,
      variacao: variacaoFlex(faturamento, anterior) };
  }).sort((a, b) => (b.faturamento ?? -1) - (a.faturamento ?? -1) || a.nickname.localeCompare(b.nickname));
  const somar = (campo: 'tgmv_lc_flex' | 'tsi_flex' | 'tgmv_lc', periodo: number) => {
    const valores = lojas.map(l => indice.get(`${l.id}:${periodo}`)?.[campo]);
    const medidos = valores.filter(finito);
    return { valor: medidos.length ? medidos.reduce((s, v) => s + v, 0) : null,
      cobertura: medidos.length, completa: lojas.length > 0 && medidos.length === lojas.length };
  };
  const faturamento = somar('tgmv_lc_flex', mes), unidades = somar('tsi_flex', mes), total = somar('tgmv_lc', mes);
  const faturamentoAnterior = somar('tgmv_lc_flex', mesAnterior(mes)), unidadesAnterior = somar('tsi_flex', mesAnterior(mes));
  const participacao = faturamento.completa && total.completa && total.valor !== null && total.valor > 0 && faturamento.valor !== null
    ? faturamento.valor / total.valor * 100 : null;
  return { linhas, faturamento, unidades, participacao,
    variacaoFaturamento: faturamento.completa && faturamentoAnterior.completa ? variacaoFlex(faturamento.valor, faturamentoAnterior.valor) : null,
    variacaoUnidades: unidades.completa && unidadesAnterior.completa ? variacaoFlex(unidades.valor, unidadesAnterior.valor) : null };
}
/** Série mensal de uma loja: Flex, restante do faturamento total e crescimento mês a mês do Flex. Sem medição = null. */
export function serieFlexLoja(dados: FlexMes[], sellerId: string, meses: number[]) {
  const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const indice = new Map(dados.filter(d => d.seller_id === sellerId).map(d => [d.tim_month_id, d]));
  return meses.map(mes => {
    const d = indice.get(mes), a = indice.get(mesAnterior(mes));
    const flex = finito(d?.tgmv_lc_flex) ? d.tgmv_lc_flex : null;
    const total = finito(d?.tgmv_lc) ? d.tgmv_lc : null;
    return { mes, flex, total,
      outras: flex !== null && total !== null ? Math.max(total - flex, 0) : null,
      participacao: flex !== null && total !== null && total > 0 ? flex / total * 100 : null,
      crescimento: variacaoFlex(flex, finito(a?.tgmv_lc_flex) ? a.tgmv_lc_flex : null) };
  });
}
