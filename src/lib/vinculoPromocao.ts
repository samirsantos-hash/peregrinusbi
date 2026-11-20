export type PromoAtual = { promotion_id: string | null; tipo: string; nome: string | null; nome_tipo: string; status: string; inicio: string | null; fim: string | null };
export type VendaGrupo = { id: string; tipo: string | null; pedidos: number; unidades: number; faturamento: number };
export type VendasPromocao = { porPromocao: VendaGrupo[]; semDesconto: Omit<VendaGrupo, 'id' | 'tipo'>; descontoSemPromocao: Omit<VendaGrupo, 'id' | 'tipo'>; naoLidos: number; completo: boolean };

// Membership is presentation only: sales must already carry explicit promotion identity.
export function linhasVinculo(promos: PromoAtual[], vendas: VendasPromocao | null | undefined) {
  const unicas = new Map<string, PromoAtual>();
  for (const p of promos) if (p.promotion_id) unicas.set(`${p.tipo}:${p.promotion_id}`, p);
  const grupos = new Map<string, VendaGrupo>();
  for (const g of vendas?.porPromocao ?? []) grupos.set(`${g.tipo}:${g.id}`, g);
  const chaves = new Set([...unicas.keys(), ...grupos.keys()]);
  return [...chaves].map(chave => {
    const promo = unicas.get(chave), grupo = grupos.get(chave);
    return { chave, promo, grupo, ativa: promo?.status === 'active' || promo?.status === 'started', confirmada: !!grupo,
      // No confirmed sales is not proof of zero when discounts are unidentified or unread.
      zeroConfirmado: !grupo && !!vendas?.completo && vendas.descontoSemPromocao.pedidos === 0 };
  });
}

export type MetricaAnuncioDia = { campaign_id: number; ad_group_id: number; dia: string; cost: number | null; total_amount: number | null };
export function roasCampanhasAnuncio(linhas: MetricaAnuncioDia[], inicio: string, fim: string) {
  const campanhas = new Map<number, MetricaAnuncioDia[]>();
  const vistos = new Set<string>();
  for (const r of linhas) {
    if (r.dia < inicio || r.dia > fim) continue;
    const chave = `${r.campaign_id}:${r.ad_group_id}:${r.dia}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const lista = campanhas.get(r.campaign_id) ?? []; lista.push(r); campanhas.set(r.campaign_id, lista);
  }
  return [...campanhas].map(([id, rows]) => {
    const medidas = rows.filter(r => r.cost != null && Number.isFinite(r.cost) && r.cost >= 0 && r.total_amount != null && Number.isFinite(r.total_amount) && r.total_amount >= 0);
    const custo = medidas.reduce((s, r) => s + (r.cost ?? 0), 0);
    const receita = medidas.reduce((s, r) => s + (r.total_amount ?? 0), 0);
    const dias = new Set(medidas.map(r => r.dia)).size;
    return { id, custo: medidas.length ? custo : null, receita: medidas.length ? receita : null, dias, roas: custo > 0 ? receita / custo : null,
      incompletas: medidas.length !== rows.length };
  });
}