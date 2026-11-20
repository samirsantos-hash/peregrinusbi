export function progressoConsultas(consultas: ReadonlyMap<string, boolean>) {
  const total = consultas.size;
  const concluidas = [...consultas.values()].filter(Boolean).length;
  return { total, concluidas, percentual: total === 0 ? 0 : Math.floor(concluidas * 100 / total) };
}