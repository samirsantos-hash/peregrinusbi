import { supabase } from "@/integrations/supabase/client";
import type { Alavanca, EstadoAlavanca, Metrica, Okr, StatusOkr } from "@/types/programas";
import { flag, mapIntegrador, cobertura } from "./flags";

/* ═══════ Camada de agregação: raw_* (texto) → modelo do painel ═══════
   A ingestão grava tudo como texto. A conversão de tipo é feita AQUI.
   Campo vazio no CSV chega como null e permanece null — nunca zero.     */

export type LinhaRaw = { tim_month_id: string; dados: Record<string, string | null> };

export const FONTE_CPP = "SFTP CPP_MENSAL";
export const FONTE_CDP = "SFTP CDP_MENSAL";

/** Converte texto → número. Vazio/nulo/inválido → null (nunca 0). */
export function num(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function txt(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

/** Chave do seller sempre TEXTO: CPP vem como "3294245579,0", CDP como "82935283". */
export function normalizarCustId(v: string | number | null | undefined): string {
  const s = String(v ?? "").trim();
  if (s === "") return "";
  return s.replace(/[.,]\d+$/, "").replace(/\D/g, "");
}

/** Taxas REP_* vêm em fração (0,125 = 12,5%). O ×100 acontece só aqui. */
export const fmtTaxa = (fracao: number | null, casas = 1): string =>
  fracao == null ? "—" : `${(fracao * 100).toFixed(casas).replace(".", ",")}%`;

export { mapIntegrador, cobertura };

/** REP_CURRENT_LEVEL vazio é sem_dado — NÃO é um nível. */
export type NivelReputacao = "verde" | "atencao" | "critico" | "newbie" | "sem_dado";
export function mapReputacao(v: string | null | undefined): NivelReputacao {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "") return "sem_dado";
  if (["green", "light_green", "green_gold", "green_platinum", "green_silver"].includes(s)) return "verde";
  if (s === "yellow") return "atencao";
  if (s === "orange" || s === "red") return "critico";
  if (s === "newbie") return "newbie";
  return "sem_dado";
}
const REP_INDICE: Record<NivelReputacao, number | null> = {
  verde: 3, atencao: 2, critico: 1, newbie: 0, sem_dado: null,
};

const met = (
  valor: number | null,
  unidade: Metrica["unidade"],
  fonte: string,
  atualizadoEm: string,
  procedencia: Metrica["procedencia"] = "real",
  formula?: string,
): Metrica => ({ valor, unidade, procedencia, fonte, atualizadoEm, formula });

/** 'AAAAMM' → '2026-08' */
export const periodoDe = (mes: string) => `${mes.slice(0, 4)}-${mes.slice(4, 6)}`;

export interface RawSeller {
  custId: string;
  cpp: LinhaRaw[];
  cdp: LinhaRaw[];
}

export async function carregarRawDoSeller(lojaId: string): Promise<RawSeller | null> {
  const { data: seller } = await supabase
    .from("sellers").select("cust_id").eq("id", lojaId).maybeSingle();
  const custId = normalizarCustId((seller as { cust_id?: string } | null)?.cust_id);
  if (!custId) return null;

  const [cpp, cdp] = await Promise.all([
    (supabase as any).from("raw_cpp_mensal")
      .select("tim_month_id,dados").eq("cus_cust_id_sel", custId).order("tim_month_id"),
    (supabase as any).from("raw_cdp_mensal")
      .select("tim_month_id,dados").eq("cus_cust_id_sel", custId).order("tim_month_id"),
  ]);

  return {
    custId,
    cpp: (cpp.data ?? []) as LinhaRaw[],
    cdp: (cdp.data ?? []) as LinhaRaw[],
  };
}

const ultimo = (rows: LinhaRaw[]) => (rows.length ? rows[rows.length - 1] : null);
const serie = (rows: LinhaRaw[], col: string) =>
  rows.map((r) => ({ periodo: periodoDe(r.tim_month_id), valor: num(r.dados[col]) }));

function estado(valor: number | null, contratado: number | null): EstadoAlavanca {
  if (valor == null) return "sem_dado";
  if (valor <= 0) return "nao_ativado";
  if (contratado != null && valor < contratado) return "parcial";
  return "ativo";
}

/** Sobrepõe os valores reais nas alavancas (Bloco 2), preservando metas/parceiros do cadastro. */
export function overlayAlavancas(base: Alavanca[], raw: RawSeller): Alavanca[] {
  const c = ultimo(raw.cpp)?.dados ?? {};
  const d = ultimo(raw.cdp)?.dados ?? {};
  const at = periodoDe(ultimo(raw.cpp)?.tim_month_id ?? ultimo(raw.cdp)?.tim_month_id ?? "");

  const invPads = num(c.INV_PADS);
  const gmvPads = num(c.TGMV_LC_PADS);
  // SELLERS_* são sinalizadores (repetem o CUS_CUST_ID_SEL) — booleano, nunca soma.
  const investePads = flag(c.SELLERS_INVEST_PADS);
  const preAcordo = num(d.F_TGMV_LC_PRE_ACORDO);
  const itensFull = num(c.ITENS_FULL);
  const publicaClips = flag(c.SELLERS_CLIPS_PUBLI);
  const gmvClips = num(c.TGMV_LC_CLIPS);
  const promo = [num(d.F_TGMV_LC_CUPOM), num(d.F_TGMV_LC_DOD), num(d.F_TGMV_LC_LIGHTNING)];
  const promoTotal = promo.every((v) => v == null) ? null : promo.reduce<number>((s, v) => s + (v ?? 0), 0);

  return base.map((a) => {
    switch (a.id) {
      case "ads":
        return { ...a,
          estado: estado(invPads, a.valorContratado.valor),
          valorAtual: met(invPads, "BRL", FONTE_CPP, at),
          resultadoAtribuido: met(gmvPads, "BRL", FONTE_CPP, at),
        };
      case "pads":
        return { ...a,
          estado: investePads == null
            ? estado(gmvPads, null)
            : investePads ? "ativo" : "nao_ativado",
          valorAtual: met(invPads, "BRL", FONTE_CPP, at),
          resultadoAtribuido: met(gmvPads, "BRL", FONTE_CPP, at),
        };
      case "clips":
        return { ...a,
          estado: publicaClips == null ? "sem_dado" : publicaClips ? "ativo" : "nao_ativado",
          valorAtual: met(
            publicaClips == null ? null : publicaClips ? 1 : 0,
            "un", FONTE_CPP, at, "derivado",
            "SELLERS_CLIPS_PUBLI é sinalizador (0/1), não contagem de clips",
          ),
          resultadoAtribuido: met(gmvClips, "BRL", FONTE_CPP, at),
        };
      case "full":
        return { ...a,
          estado: estado(itensFull, null),
          valorAtual: met(itensFull, "un", FONTE_CPP, at),
        };
      case "cdp":
        return { ...a,
          estado: estado(promoTotal, null),
          valorAtual: met(promoTotal, "BRL", FONTE_CDP, at, "derivado", "cupom + DOD + relâmpago"),
          resultadoAtribuido: met(promoTotal, "BRL", FONTE_CDP, at, "derivado"),
        };
      case "pre-acordo":
        return { ...a,
          estado: estado(preAcordo, null),
          valorAtual: met(preAcordo, "BRL", FONTE_CDP, at),
          resultadoAtribuido: met(preAcordo, "BRL", FONTE_CDP, at),
        };
      default:
        return a;
    }
  });
}

function statusPorMeta(valor: number | null, meta: number | null, tipo: Okr["metaTipo"]): StatusOkr {
  if (valor == null || meta == null) return "sem_dado";
  const razao = meta === 0 ? null : valor / meta;
  if (tipo === "maximo") return valor <= meta ? "verde" : valor <= meta * 1.2 ? "atencao" : "critico";
  if (razao == null) return "sem_dado";
  return razao >= 1 ? "verde" : razao >= 0.8 ? "atencao" : "critico";
}

/** Sobrepõe OKRs (Bloco 3) com valor atual + histórico mensal real (sparkline). */
export function overlayOkrs(base: Okr[], raw: RawSeller): Okr[] {
  const c = ultimo(raw.cpp)?.dados ?? {};
  const at = periodoDe(ultimo(raw.cpp)?.tim_month_id ?? "");

  const nivelRep = mapReputacao(c.REP_CURRENT_LEVEL);
  const histRep = raw.cpp.map((r) => ({
    periodo: periodoDe(r.tim_month_id),
    valor: REP_INDICE[mapReputacao(r.dados.REP_CURRENT_LEVEL)],
  }));

  return base.map((o) => {
    switch (o.id) {
      case "okr-rep": {
        const valor = REP_INDICE[nivelRep];
        return { ...o,
          atual: met(valor, "indice", FONTE_CPP, at),
          historico: histRep,
          status: nivelRep === "sem_dado" ? "sem_dado"
            : nivelRep === "verde" ? "verde"
            : nivelRep === "atencao" ? "atencao" : "critico",
        };
      }
      case "okr-qual": {
        const valor = num(c.SCORE_FINAL_BBF);
        return { ...o,
          atual: met(valor, "indice", FONTE_CPP, at),
          historico: serie(raw.cpp, "SCORE_FINAL_BBF"),
          status: statusPorMeta(valor, o.meta.valor, o.metaTipo),
        };
      }
      case "okr-ads": {
        const valor = num(c.SCORE_FINAL_PADS);
        return { ...o,
          atual: met(valor, "indice", FONTE_CPP, at),
          historico: serie(raw.cpp, "SCORE_FINAL_PADS"),
          status: statusPorMeta(valor, o.meta.valor, o.metaTipo),
        };
      }
      case "okr-exped": {
        const valor = num(c.REP_DELAYED_HT_RATE);
        return { ...o,
          atual: met(valor, "pct", FONTE_CPP, at),
          historico: serie(raw.cpp, "REP_DELAYED_HT_RATE"),
          status: statusPorMeta(valor, o.meta.valor ?? 2, "maximo"),
        };
      }
      default:
        return o;
    }
  });
}
