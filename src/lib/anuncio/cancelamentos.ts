export type OcorrenciasAnuncio = { item_id: string; vendas: number; cancelamentos: number | null };

/** Only measured, unambiguous counts participate in the ranking. */
export function anunciosMaisCancelados(ocorrencias: OcorrenciasAnuncio[], titulos: Map<string, string>) {
  return ocorrencias.filter((r): r is OcorrenciasAnuncio & { cancelamentos: number } =>
    r.cancelamentos !== null && Number.isSafeInteger(r.cancelamentos) && r.cancelamentos > 0 && Number.isSafeInteger(r.vendas) && r.vendas >= 0
  ).map(r => ({ ...r, titulo: titulos.get(r.item_id) ?? r.item_id, taxa: r.cancelamentos / (r.vendas + r.cancelamentos) }))
    .sort((a, b) => b.cancelamentos - a.cancelamentos || b.taxa - a.taxa || a.item_id.localeCompare(b.item_id));
}