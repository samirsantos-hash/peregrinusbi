/** Cálculos do Resumo executivo (macro): cobertura de datas e denominadores pareados. */
export type DiaResumo = {
  date: string; gmv?: number; tgmv?: number; adsInvestment?: number; tgmvPads?: number;
  visits?: number; visitsMedidas?: boolean; tsi?: number; repCancellationsRate?: number;
};

const n = (v: unknown) => Number(v) || 0;
const visitaMedida = (k: DiaResumo) => k.visitsMedidas !== false && k.visits != null && Number.isFinite(Number(k.visits));

export function totaisResumo(ks: DiaResumo[]) {
  const tgmv = ks.reduce((a, k) => a + n(k.tgmv || k.gmv), 0);
  const gmv = ks.reduce((a, k) => a + n(k.gmv), 0);
  const ads = ks.reduce((a, k) => a + n(k.adsInvestment), 0);
  const vendasAds = ks.reduce((a, k) => a + n(k.tgmvPads), 0);
  // Visitas e razões por visita usam somente as datas com visitas medidas.
  const comVisita = ks.filter(visitaMedida);
  const visitas = comVisita.reduce((a, k) => a + n(k.visits), 0);
  const tgmvPareado = comVisita.reduce((a, k) => a + n(k.tgmv || k.gmv), 0);
  const adsPareado = comVisita.reduce((a, k) => a + n(k.adsInvestment), 0);
  const diasComVisita = new Set(comVisita.map((k) => k.date.slice(0, 10))).size;
  const dias = new Set(ks.map((k) => k.date.slice(0, 10))).size;
  return {
    tgmv, gmv, ads,
    visitas: diasComVisita > 0 ? visitas : null,
    diasComVisita, dias,
    roas: ads > 0 ? vendasAds / ads : null,
    cpv: visitas > 0 && adsPareado > 0 ? adsPareado / visitas : null,
    receitaVisita: visitas > 0 ? tgmvPareado / visitas : null,
  };
}

/** Período anterior só serve de base quando cobre as mesmas quantidades de datas do atual. */
export function anteriorComparavel(atualDias: number, anteriorDias: number) {
  return anteriorDias > 0 && anteriorDias === atualDias;
}

export const variacaoPct = (a: number | null, b: number | null | undefined) =>
  a != null && b != null && b > 0 ? ((a - b) / b) * 100 : null;
