import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Tendencia } from "./mlMercado.ts";

/**
 * Grava a semana de um escopo ("MLB" para o Brasil ou o id da categoria). Regrava a semana inteira
 * para não sobrar termo de uma leitura anterior. Coleta vazia também é registrada.
 */
export async function gravarSemana(
  admin: SupabaseClient,
  escopo: string,
  semana: string,
  termos: Tendencia[],
  nome: string | null,
): Promise<string | null> {
  const agora = new Date().toISOString();
  const { error: e1 } = await admin.from("ml_trends_weekly").delete().eq("escopo", escopo).eq("semana", semana);
  if (e1) return e1.message;
  if (termos.length) {
    const { error } = await admin.from("ml_trends_weekly").insert(termos.map((t) => ({
      escopo, semana, posicao: t.posicao, palavra: t.palavra, url: t.url, grupo: t.grupo, coletado_em: agora,
    })));
    if (error) return error.message;
  }
  const { error: e2 } = await admin.from("ml_trends_coletas").upsert({ escopo, semana, nome, termos: termos.length, coletado_em: agora });
  return e2?.message ?? null;
}
