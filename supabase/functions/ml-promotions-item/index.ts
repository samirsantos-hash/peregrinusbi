// ml-promotions-item
// Lê ao vivo as promoções de um anúncio (convites, participações e o desconto individual). Não escreve no ML.
//
// Contrato
// POST JWT de quem gerencia a conta.  { account_id: uuid, item_id: "MLB…" }
// 200 { item: { item_id, titulo, preco, status }, promocoes: [{ ...PromoDoItem, nome_tipo, preco_por, pode: { aderir, alterar, sair }, motivo_sair }] }
// 400 dados inválidos · 401 sem login · 403 conta ou anúncio de outra pessoa · 502 o ML não respondeu

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { lerItemPreco } from "../_shared/mlPreco.ts";
import { candidato, lerPromosDoItem, motivoSemSaida, participa, TIPOS_PROMO } from "../_shared/mlPromocoes.ts";

const API = "https://api.mercadolibre.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const body = await req.json().catch(() => null) as { account_id?: string; item_id?: unknown } | null;
  if (!body) return resposta({ error: "Corpo inválido." }, 400);
  const acesso = await exigirGestor(req, body.account_id);
  if (!acesso.ok) return acesso.res;
  const itemId = typeof body.item_id === "string" && /^[A-Z]{3}\d+$/.test(body.item_id) ? body.item_id : null;
  if (!itemId) return resposta({ error: "Anúncio inválido." }, 400);

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const alvo = await contaComToken(admin, body.account_id as string);
  if (!alvo.ok) return resposta({ error: alvo.erro }, 409);

  const it = await buscarMl(`${API}/items/${itemId}?attributes=id,seller_id,status,title,price,currency_id,variations`, alvo.token);
  if (!it.ok) return resposta({ error: it.erro, codigo_ml: it.codigo }, it.status === 404 ? 404 : 502);
  const item = lerItemPreco(it.json);
  if (!item || (item.seller_id !== null && item.seller_id !== Number(alvo.conta.ml_user_id))) {
    return resposta({ error: "Este anúncio não é desta conta." }, 403);
  }

  const r = await buscarMl(`${API}/seller-promotions/items/${itemId}?app_version=v2`, alvo.token);
  if (!r.ok && r.status !== 404) return resposta({ error: r.erro, codigo_ml: r.codigo }, 502);
  const promocoes = (r.ok ? lerPromosDoItem(r.json) : []).map((p) => {
    const tipo = TIPOS_PROMO[p.tipo];
    const entrada = { item_id: itemId, promotion_type: p.tipo, promotion_id: p.promotion_id };
    const motivo = tipo ? motivoSemSaida(entrada, p) : "O painel ainda não opera este tipo. Use o Mercado Livre.";
    return {
      ...p,
      nome_tipo: tipo?.nome ?? p.tipo,
      preco_por: tipo?.preco ?? null,
      pede_estoque: tipo?.estoque ?? false,
      pede_datas: tipo?.datas ?? false,
      pode: {
        aderir: !!tipo && candidato(p.status),
        alterar: !!tipo?.alterar && participa(p.status),
        sair: !!tipo && participa(p.status) && motivo === null,
      },
      motivo_sair: participa(p.status) ? motivo : null,
    };
  });

  return resposta({
    item: { item_id: item.item_id, titulo: item.titulo, preco: item.preco, status: item.status, variacoes: item.variacoes.length },
    promocoes,
  });
});
