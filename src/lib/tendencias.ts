// Comparação semanal dos termos em alta guardados em ml_trends_weekly. Funções puras.

export type Grupo = "crescimento" | "desejadas" | "populares";
export type Termo = { semana: string; posicao: number; palavra: string; url: string | null; grupo: Grupo };
export type Movimento =
  | { tipo: "nova" }
  | { tipo: "subiu" | "caiu"; de: number; passos: number }
  | { tipo: "igual" };
export type Linha = Termo & { movimento: Movimento | null; semanas: number; grupoAntes: Grupo | null };

export const chaveTermo = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Semana mais recente comparada com a coleta anterior do mesmo escopo.
 * `semanas` = semanas seguidas no ranking até a atual, contando só as semanas que foram coletadas.
 * Sem coleta anterior, `movimento` fica null: não há base para dizer o que é novo.
 */
export function compararSemanas(historico: Termo[]): { semana: string | null; anterior: string | null; linhas: Linha[]; sairam: Termo[] } {
  const semanas = [...new Set(historico.map((t) => t.semana))].sort().reverse();
  if (!semanas.length) return { semana: null, anterior: null, linhas: [], sairam: [] };
  const porSemana = new Map(semanas.map((s) => [s, new Map<string, Termo>()]));
  for (const t of historico) porSemana.get(t.semana)!.set(chaveTermo(t.palavra), t);

  const [atual, anterior = null] = semanas;
  const deAgora = porSemana.get(atual)!;
  const antes = anterior ? porSemana.get(anterior)! : null;

  const linhas = [...deAgora.entries()].map(([chave, t]) => {
    let seguidas = 0;
    for (const s of semanas) {
      if (!porSemana.get(s)!.has(chave)) break;
      seguidas++;
    }
    const a = antes?.get(chave) ?? null;
    const movimento: Movimento | null = !antes
      ? null
      : !a
        ? { tipo: "nova" }
        : a.posicao > t.posicao
          ? { tipo: "subiu", de: a.posicao, passos: a.posicao - t.posicao }
          : a.posicao < t.posicao
            ? { tipo: "caiu", de: a.posicao, passos: t.posicao - a.posicao }
            : { tipo: "igual" };
    return { ...t, movimento, semanas: seguidas, grupoAntes: a?.grupo ?? null };
  }).sort((x, y) => x.posicao - y.posicao);

  const sairam = antes ? [...antes.entries()].filter(([k]) => !deAgora.has(k)).map(([, t]) => t).sort((x, y) => x.posicao - y.posicao) : [];
  return { semana: atual, anterior, linhas, sairam };
}
