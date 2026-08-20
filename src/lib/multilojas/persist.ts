/* Persistência do módulo Multilojas: cargas versionadas, pedidos sem dado pessoal
 * e leitura paginada do painel. A fronteira de segurança é o RLS no Postgres —
 * o recorte feito aqui é conveniência de renderização. */
import { supabase } from "@/integrations/supabase/client";
import type { Diagnostico, PedidoML } from "./parse";
import { diaLocal } from "./parse";

export interface LojaRef { id: string; chave_tecnica: string; nome_publico: string }

export interface CargaResumo {
  id: string;
  fonte_id: string;
  responsavel: string | null;
  linhas: number | null;
  validas: number | null;
  periodo_ini: string | null;
  periodo_fim: string | null;
  gmv: number | null;
  ativa: boolean;
  created_at: string;
  arquivo?: string | null;
  hash?: string | null;
  bytes?: number | null;
  diagnostico?: unknown;
}

/** SHA-256 hexadecimal — assinatura da carga e hash irreversível do documento. */
export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const buf = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cargaJaExiste(hash: string) {
  const { data } = await supabase.from("multilojas_carga").select("id, arquivo, created_at").eq("hash", hash).maybeSingle();
  return data as { id: string; arquivo: string; created_at: string } | null;
}

export async function listarCargas(admin: boolean): Promise<CargaResumo[]> {
  const from = admin ? "multilojas_carga" : "multilojas_carga_publica";
  const { data, error } = await supabase.from(from as "multilojas_carga").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CargaResumo[];
}

export async function arquivarCarga(id: string, ativa: boolean) {
  const { error } = await supabase.from("multilojas_carga").update({ ativa }).eq("id", id);
  if (error) throw error;
}

/** Garante uma linha de loja oficial para cada chave técnica vista na carga. */
async function resolverLojas(chaves: string[], podeCriar: boolean): Promise<Map<string, string>> {
  const { data: existentes } = await supabase.from("multilojas_loja").select("id, chave_tecnica");
  const mapa = new Map<string, string>((existentes || []).map((l) => [l.chave_tecnica, l.id]));
  const novas = chaves.filter((c) => c && !mapa.has(c));
  if (novas.length && podeCriar) {
    const { data } = await supabase
      .from("multilojas_loja")
      .insert(novas.map((c) => ({ chave_tecnica: c, nome_publico: c, vinculo: "automatico" })))
      .select("id, chave_tecnica");
    (data || []).forEach((l) => mapa.set(l.chave_tecnica, l.id));
  }
  return mapa;
}

export interface PublicacaoResultado { cargaId: string; inseridos: number; lojasNovas: number }

/** Publica uma carga de Vendas: cabeçalho de auditoria + pedidos em lotes. */
export async function publicarCargaVendas(opts: {
  pedidos: PedidoML[];
  diag: Diagnostico;
  arquivoBytes: number;
  hash: string;
  fonteId: string;
  responsavel: string;
  userId: string | null;
  podeCriarLoja: boolean;
  onProgress?: (pct: number, label: string) => void;
}): Promise<PublicacaoResultado> {
  const { pedidos, diag, hash, fonteId, responsavel, userId, arquivoBytes, podeCriarLoja, onProgress } = opts;

  onProgress?.(5, "Vinculando lojas oficiais");
  const chaves = Array.from(new Set(pedidos.map((p) => p.loja)));
  const lojasAntes = (await supabase.from("multilojas_loja").select("id", { count: "exact", head: true })).count || 0;
  const mapa = await resolverLojas(chaves, podeCriarLoja);
  const lojasNovas = Math.max(0, mapa.size - lojasAntes);

  onProgress?.(12, "Registrando a carga");
  const gmv = pedidos.reduce((s, p) => s + (p.gmv || 0), 0);
  const { data: carga, error: errCarga } = await supabase
    .from("multilojas_carga")
    .insert({
      fonte_id: fonteId, arquivo: diag.arquivo, hash, bytes: arquivoBytes,
      enviado_por: userId, responsavel,
      linhas: diag.linhas, validas: diag.validas,
      periodo_ini: diag.ini !== "—" ? diag.ini : null,
      periodo_fim: diag.fim !== "—" ? diag.fim : null,
      gmv, diagnostico: diag as unknown as never,
    })
    .select("id")
    .single();
  if (errCarga) throw errCarga;
  const cargaId = carga.id as string;

  // hash irreversível do documento — nenhum dado pessoal é persistido
  onProgress?.(20, "Anonimizando compradores");
  const docs = Array.from(new Set(pedidos.map((p) => p.doc)));
  const hashes = new Map<string, string>();
  for (const d of docs) hashes.set(d, (await sha256Hex(`peregrinus:${d}`)).slice(0, 32));

  const linhas = pedidos.map((p) => ({
    carga_id: cargaId,
    loja_id: mapa.get(p.loja) ?? null,
    loja_chave: p.loja,
    pedido_id: p.id,
    dt: p.dt.toISOString(),
    mlb: p.mlb || "",
    sku: p.sku || null, titulo: p.titulo || null, canal: p.canal || null,
    tipo_anuncio: p.tipoAnun || null, logistica: p.logi || null,
    uf: p.uf || null, cidade: p.cidade || null,
    doc_hash: hashes.get(p.doc) ?? null,
    un: p.un, gmv: p.gmv, acre: p.acre, tarifa: p.tarifa,
    frete_custo: p.freteCusto, frete_rec: p.freteRec, desconto: p.desc,
    estorno: p.estorno, liquido: p.liq, preco: p.preco,
    ads: p.ads, b2b: p.b2b, nfe_ok: p.nfeOk, nfe_status: p.nfeSt || null,
    status: p.status || null, cancelado: p.canc, devolvido: p.devol,
    mediacao: p.medi, reclamacao: p.recl,
  }));

  // deduplica pela chave primária (carga, pedido, anúncio)
  const vistos = new Set<string>();
  const unicas = linhas.filter((l) => {
    const k = `${l.pedido_id}|${l.mlb}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  const LOTE = 800;
  for (let i = 0; i < unicas.length; i += LOTE) {
    const { error } = await supabase.from("multilojas_pedido").insert(unicas.slice(i, i + LOTE));
    if (error) throw error;
    onProgress?.(25 + Math.round(((i + LOTE) / unicas.length) * 70), "Publicando pedidos");
  }

  onProgress?.(100, "Carga publicada");
  return { cargaId, inseridos: unicas.length, lojasNovas };
}

const PAGINA = 1000;
const PARALELO = 6;

/** Lê os pedidos publicados (já recortados pelo RLS) e devolve no formato do painel. */
export async function carregarPedidos(
  onProgress?: (n: number) => void,
): Promise<{ pedidos: PedidoML[]; lojas: Map<string, string> }> {
  /* Metadados em paralelo — não há dependência entre lojas e cargas. */
  const [{ data: ls }, { data: cargas }] = await Promise.all([
    supabase.from("multilojas_loja").select("id, nome_publico, chave_tecnica"),
    supabase.from("multilojas_carga_publica").select("id").eq("ativa", true),
  ]);
  const nomes = new Map<string, string>((ls || []).map((l) => [l.id, l.nome_publico]));
  const ativas = (cargas || []).map((c) => c.id as string);

  /* Filtra as cargas ativas no servidor e conta antes de paginar, para poder
   * disparar as páginas em paralelo em vez de uma cascata sequencial. */
  const consulta = () => {
    const q = supabase.from("multilojas_pedido").select("*");
    return ativas.length ? q.in("carga_id", ativas) : q;
  };

  const { count } = await (ativas.length
    ? supabase.from("multilojas_pedido").select("carga_id", { count: "exact", head: true }).in("carga_id", ativas)
    : supabase.from("multilojas_pedido").select("carga_id", { count: "exact", head: true }));

  const total = count || 0;
  const paginas = Math.max(1, Math.ceil(total / PAGINA));
  const brutos: Record<string, unknown>[] = [];

  for (let i = 0; i < paginas; i += PARALELO) {
    const lote = Array.from({ length: Math.min(PARALELO, paginas - i) }, (_, k) => i + k);
    const resultados = await Promise.all(
      lote.map((pag) =>
        consulta()
          .order("dt", { ascending: true })
          .range(pag * PAGINA, pag * PAGINA + PAGINA - 1),
      ),
    );
    for (const { data, error } of resultados) {
      if (error) throw error;
      brutos.push(...((data || []) as Record<string, unknown>[]));
    }
    onProgress?.(brutos.length);
  }

  const pedidos: PedidoML[] = [];
  for (const row of brutos) {
    const r = row as never as Record<string, never>;
    const dt = new Date(r.dt as string);
      const dia = diaLocal(dt);
      pedidos.push({
        id: String(r.pedido_id), dt, dia, mes: dia.slice(0, 7), dow: dt.getDay(), hora: dt.getHours(),
        loja: (r.loja_id && nomes.get(r.loja_id as string)) || String(r.loja_chave || "(sem loja oficial)"),
        mlb: r.mlb || "", sku: r.sku || "", titulo: r.titulo || "", canal: r.canal || "",
        tipoAnun: r.tipo_anuncio || "", logi: r.logistica || "", uf: r.uf || "", cidade: r.cidade || "",
        doc: r.doc_hash || `anon_${r.pedido_id}`,
        un: Number(r.un) || 1, gmv: Number(r.gmv) || 0, acre: Number(r.acre) || 0,
        tarifa: Number(r.tarifa) || 0, freteCusto: Number(r.frete_custo) || 0,
        freteRec: Number(r.frete_rec) || 0, desc: Number(r.desconto) || 0,
        estorno: Number(r.estorno) || 0, liq: Number(r.liquido) || 0, preco: Number(r.preco) || 0,
        ads: !!r.ads, b2b: !!r.b2b, nfeOk: !!r.nfe_ok, nfeSt: r.nfe_status || "",
        recl: !!r.reclamacao, status: r.status || "", canc: !!r.cancelado,
        devol: !!r.devolvido, medi: !!r.mediacao, entregue: /entregue/i.test(String(r.status || "")),
      });
  }
  onProgress?.(pedidos.length);

  return { pedidos, lojas: nomes };
}

/** Diagnóstico sintético para o painel quando os dados vêm do banco. */
export function diagnosticoDaBase(pedidos: PedidoML[], cargas: CargaResumo[]): Diagnostico {
  const dias = Array.from(new Set(pedidos.map((p) => p.dia))).sort();
  return {
    arquivo: `${cargas.length} carga${cargas.length === 1 ? "" : "s"} publicada${cargas.length === 1 ? "" : "s"}`,
    linhas: pedidos.length, validas: pedidos.length, aproveitamento: 1,
    headerRow: 0, camposMapeados: 0, camposTotal: 0, faltando: [],
    lojas: Array.from(new Set(pedidos.map((p) => p.loja))).sort(),
    dias: dias.length, ini: dias[0] || "—", fim: dias[dias.length - 1] || "—",
    duplicados: 0, semReceita: 0, semUf: 0, semNfe: 0, semLogi: 0,
  };
}
