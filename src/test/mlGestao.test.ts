import { describe, expect, it, vi } from "vitest";
import { diasPendentes, janelaMetricasAds, lerAnunciantes, lerMetricas, metricasPorGrupo, serieDiaria, ordenarCampanhasAds } from "../../supabase/functions/_shared/mlAds";
import { buscarMl, enviarMl } from "../../supabase/functions/_shared/mlHttp";
import { entraNaBusca, lerAnuncio, ordemDeLeitura } from "../../supabase/functions/_shared/mlAnuncios";
import { estadoPergunta, lerListaPerguntas, lerPergunta, motivoSemResposta, validarResposta } from "../../supabase/functions/_shared/mlPerguntas";
import {
  assinatura,
  atributosDaFicha,
  diagnosticar,
  lerCategoria,
  lerFotos,
  lerQualidade,
  palavrasRepetidas,
  quaseTudoMaiusculo,
  validarIa,
} from "../../supabase/functions/_shared/mlMelhorias";
import { aplicarRegra, corpoPreco, erroPreco, estadoPreco, lerItemPreco, precoIgnorado, quedaGrande } from "../../supabase/functions/_shared/mlPreco";
import {
  acharPromo,
  corpoAdesao,
  cursorSeguinte,
  estadoPromo,
  hojeSaoPaulo,
  lerEntrada,
  lerPromosDoItem,
  motivoSemSaida,
  querySaida,
  validarCupom,
} from "../../supabase/functions/_shared/mlPromocoes";
import {
  aplicacaoConfere,
  caminhoRecurso,
  chaveDedupe,
  decidirIdempotencia,
  jsonMl,
  lerAviso,
  segredoConfere,
  topicoAceito,
  traduzirErroMl,
  validarSettings,
} from "../../supabase/functions/_shared/mlGestao";
import {
  avaliarFatores,
  calcularMargem,
  contarSinais,
  type EntradaFatores,
  grupoDaPosicao,
  lerCompeticao,
  lerDestaques,
  lerOfertas,
  lerTarifa,
  lerTendencias,
  quartis,
  resumirConcorrencia,
  validarParecer,
} from "../../supabase/functions/_shared/mlMercado";
import { cadeiaDeCategorias, semanaDe, topCategorias } from "../../supabase/functions/_shared/mlTendencias";
import { compararSemanas, type Termo } from "../lib/tendencias";
import {
  alertaOrcamento,
  alertasDesempenho,
  estadoCampanha,
  estadoGrupo,
  indicadores,
  lerCampanhaMl,
  lerDadosCampanha,
  lerGrupoMl,
  lerLimites,
  LIMITES_PADRAO,
  mudancasCampanha,
  somar,
  textoCampanha,
} from "../../supabase/functions/_shared/mlAdsGestao";
import {
  analisarGrupos,
  associacoes,
  type GrupoPainel,
  investimentoEmRisco,
  mediana,
  montarPainel,
  nivelQualidade,
  periodos,
  somasPorPeriodo,
} from "../lib/adsAnalise";

const aviso = {
  _id: "abc",
  resource: "/questions/99",
  user_id: 123,
  topic: "questions",
  application_id: 555,
  attempts: 1,
  sent: "2026-10-21T18:00:00.000Z",
};

describe("aviso do Mercado Livre", () => {
  it("lê o formato oficial e deduplica pelo id", () => {
    const lido = lerAviso(aviso);
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.aviso.userId).toBe(123);
    expect(lido.aviso.applicationId).toBe("555");
    expect(chaveDedupe(lido.aviso)).toBe("id:abc");
    expect(topicoAceito(lido.aviso.topic)).toBe(true);
  });

  it("rejeita corpo sem user_id e recurso que não é caminho da API", () => {
    expect(lerAviso({ topic: "questions", resource: "/questions/1", application_id: 1 }).ok).toBe(false);
    expect(caminhoRecurso("https://evil.example/questions/1")).toBeNull();
    expect(caminhoRecurso("/questions/../tokens")).toBeNull();
    expect(caminhoRecurso("/questions/99")).toBe("/questions/99");
  });

  it("preserva application_id longo como texto", () => {
    const bruto = '{"topic":"questions","resource":"/questions/1","user_id":468424240,"application_id":9007199254740993}';
    const lido = lerAviso(jsonMl(bruto));
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.aviso.applicationId).toBe("9007199254740993");
    expect(aplicacaoConfere(lido.aviso.applicationId, "9007199254740993")).toBe(true);
  });

  it("só aceita o application_id do próprio app", () => {
    expect(aplicacaoConfere("555", "555")).toBe(true);
    expect(aplicacaoConfere("556", "555")).toBe(false);
  });

  it("compara o segredo sem aceitar tamanho diferente", () => {
    expect(segredoConfere("aaaa", "aaaa")).toBe(true);
    expect(segredoConfere("aaab", "aaaa")).toBe(false);
    expect(segredoConfere("aaaa", "aaa")).toBe(false);
  });
});

describe("configuração da conta", () => {
  it("aceita 3% como 0.03 e recusa ponto percentual cru", () => {
    const ok = validarSettings({ meta_investimento_ads: 0.03, margem_minima: null });
    expect(ok.ok).toBe(true);
    const ruim = validarSettings({ meta_investimento_ads: 3 });
    expect(ruim.ok).toBe(false);
  });

  it("não deixa o alerta de ACOS vazio", () => {
    const r = validarSettings({ alerta_acos: null });
    expect(r.ok).toBe(false);
  });
});

describe("idempotência", () => {
  it("repita o commit quando a chave já foi executada", () => {
    expect(decidirIdempotencia(null, "h1")).toBe("criar");
    expect(decidirIdempotencia({ status: "committed", estadoHash: "h1" }, "h1")).toBe("ja_feito");
    expect(decidirIdempotencia({ status: "preview", estadoHash: "h1" }, "h2")).toBe("conflito");
    expect(decidirIdempotencia({ status: "preview", estadoHash: "h1" }, "h1")).toBe("repetir_preview");
  });
});

describe("Product Ads", () => {
  it("retoma campanhas sem custo completo antes das já lidas e não aceita null como zero", () => {
    const janela = { date_from: '2026-10-27', date_to: '2026-10-28' };
    const rows = [
      { campaign_id: 1, dia: '2026-10-27', cost: 10, synced_at: '2026-10-29T02:00:00Z' },
      { campaign_id: 1, dia: '2026-10-28', cost: 0, synced_at: '2026-10-29T02:00:00Z' },
      { campaign_id: 2, dia: '2026-10-27', cost: null, synced_at: '2026-10-29T02:00:00Z' },
    ];
    const r = ordenarCampanhasAds([{ campaign_id: 1 }, { campaign_id: 2 }, { campaign_id: 3 }], rows, janela);
    expect(r.ordenadas.map(c => c.campaign_id)).toEqual([3, 2, 1]);
    expect(r.incompletas).toBe(2);
  });
  it("pede os 90 dias que a API permite, no calendário de São Paulo", () => {
    const janela = janelaMetricasAds(new Date("2026-10-21T15:00:00.000Z"));
    expect(janela.date_to).toBe("2026-10-21");
    expect(janela.date_from).toBe("2026-07-24");
  });

  it("guarda o anunciante de qualquer site e não transforma métrica ausente em zero", () => {
    expect(lerAnunciantes({
      advertisers: [
        { advertiser_id: 10, site_id: "MLB", advertiser_name: "Loja" },
        { advertiser_id: 11, site_id: "MLA", advertiser_name: "Outra" },
      ],
    })).toHaveLength(2);
    const m = lerMetricas({ clicks: 4, prints: 10 });
    expect(m.clicks).toBe(4);
    expect(m.roas).toBeNull();
    expect(m.cost).toBeNull();
  });

  it("só monta série diária quando a resposta traz a data", () => {
    const serie = serieDiaria({ results: [{ date: "2026-10-20", clicks: 1, prints: 2 }, { clicks: 9 }] });
    expect(serie).toEqual([{ dia: "2026-10-20", metricas: expect.objectContaining({ clicks: 1, prints: 2, roas: null }) }]);
  });

  it("lê métricas de Ad Group aninhadas ou no nível da linha", () => {
    const grupos = metricasPorGrupo({ results: [{ id: 7, metrics: { cost: 3 } }, { ad_group_id: 8, cost: 4 }, { cost: 9 }] });
    expect(grupos.map((g) => [g.ad_group_id, g.metricas.cost])).toEqual([[7, 3], [8, 4]]);
  });

  it("relê o dia até fechar a janela de atribuição de 14 dias", () => {
    const janela = { date_from: "2026-10-01", date_to: "2026-10-03" };
    const lidos = new Map([
      ["2026-10-01", "2026-10-20T00:00:00.000Z"],
      ["2026-10-02", "2026-10-05T00:00:00.000Z"],
    ]);
    expect(diasPendentes(janela, lidos)).toEqual(["2026-10-03", "2026-10-02"]);
  });
});

describe("Anúncios da loja", () => {
  const item = {
    id: "MLB123456789",
    title: "Jogo de Cordas para Violino",
    price: 89.9,
    original_price: 99.9,
    available_quantity: 7,
    sold_quantity: 40,
    status: "active",
    listing_type_id: "gold_pro",
    shipping: { logistic_type: "fulfillment", free_shipping: true },
    health: 0.82,
    seller_custom_field: "CAMPO-ANTIGO",
    attributes: [{ id: "SELLER_SKU", value_name: "CORDA-VL-01" }],
    variations: [
      {
        id: 1,
        price: 89.9,
        available_quantity: 3,
        sold_quantity: 10,
        attribute_combinations: [{ name: "Tamanho", value_name: "4/4" }],
        attributes: [{ id: "SELLER_SKU", value_name: "CORDA-VL-44" }],
      },
      { id: 2, seller_custom_field: "CORDA-VL-34", attribute_combinations: [{ name: "Tamanho", value_name: "3/4" }] },
    ],
  };

  it("prefere o atributo SELLER_SKU e junta os SKUs das variações para a busca", () => {
    const a = lerAnuncio(item)!;
    expect(a.sku).toBe("CORDA-VL-01");
    expect(a.skus).toEqual(["CORDA-VL-01", "CORDA-VL-44", "CORDA-VL-34"]);
    expect(a.variacoes[0].combinacao).toBe("Tamanho: 4/4");
    expect(a.logistica).toBe("fulfillment");
    expect(a.frete_gratis).toBe(true);
  });

  it("guarda família e produto de catálogo para ligar aos anúncios de Ads", () => {
    const a = lerAnuncio({ ...item, family_id: 987654, catalog_product_id: "MLB1977" })!;
    expect(a.family_id).toBe("987654");
    expect(a.catalog_product_id).toBe("MLB1977");
    expect(lerAnuncio(item)!.family_id).toBeNull();
  });

  it("sem saúde no ML fica sem dado, não zero", () => {
    const { health: _h, ...semSaude } = item;
    expect(lerAnuncio(semSaude)!.saude).toBeNull();
  });

  it("só ativos e pausados entram na busca", () => {
    expect(entraNaBusca("active")).toBe(true);
    expect(entraNaBusca("paused")).toBe(true);
    expect(entraNaBusca("closed")).toBe(false);
    expect(entraNaBusca("under_review")).toBe(false);
  });

  it("lê primeiro o que nunca foi lido, depois o mais antigo", () => {
    const lidos = new Map([["A", "2026-10-20T00:00:00Z"], ["B", "2026-10-10T00:00:00Z"]]);
    expect(ordemDeLeitura(["A", "B", "C"], lidos)).toEqual(["C", "B", "A"]);
  });
});

describe("Perguntas", () => {
  const doMl = {
    id: 3957150025,
    answer: { date_created: "2016-02-29T11:21:27.831-04:00", status: "ACTIVE", text: "Test answer..." },
    date_created: "2016-02-29T11:19:42.000-04:00",
    item_id: "MLA608007087",
    seller_id: 202593498,
    status: "ANSWERED",
    text: "Test question.",
    from: { id: 207119838 },
  };

  it("lê a pergunta no formato da documentação e grava datas em UTC", () => {
    const p = lerPergunta(doMl)!;
    expect(p.question_id).toBe(3957150025);
    expect(p.resposta_texto).toBe("Test answer...");
    expect(p.data_criacao).toBe("2016-02-29T15:19:42.000Z");
    expect(p.seller_id).toBe(202593498);
  });

  it("lê a lista da busca e ignora linhas sem id", () => {
    const r = lerListaPerguntas({ total: 2, questions: [doMl, { status: "UNANSWERED" }] });
    expect(r.perguntas).toHaveLength(1);
    expect(r.total).toBe(2);
  });

  it("recusa resposta vazia e acima de 2000 caracteres", () => {
    expect(validarResposta("   ").ok).toBe(false);
    expect(validarResposta("a".repeat(2001)).ok).toBe(false);
    expect(validarResposta("  Temos sim.  ")).toEqual({ ok: true, texto: "Temos sim." });
  });

  it("só aceita responder pergunta sem resposta", () => {
    expect(motivoSemResposta("UNANSWERED")).toBeNull();
    expect(motivoSemResposta("ANSWERED")).toMatch(/já foi respondida/);
    expect(motivoSemResposta("CLOSED_UNANSWERED")).toMatch(/encerrado/);
  });

  it("muda a assinatura quando a pergunta é respondida no ML depois da prévia", () => {
    const aberta = lerPergunta({ ...doMl, status: "UNANSWERED", answer: null })!;
    const respondida = lerPergunta(doMl)!;
    expect(estadoPergunta(aberta)).not.toBe(estadoPergunta(respondida));
  });

  it("não repete a escrita em 5xx e marca o resultado como incerto", async () => {
    let chamadas = 0;
    const buscar = async () => { chamadas++; return new Response("{}", { status: 503 }); };
    const r = await enviarMl("POST", "https://api.mercadolibre.com/answers", "t", { question_id: 1, text: "x" }, buscar);
    expect(chamadas).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.incerto).toBe(true);
  });
});

describe("erros do Mercado Livre", () => {
  it("traduz 403 e guarda a ideia de permissão", () => {
    expect(traduzirErroMl(403, "PA_UNAUTHORIZED", "blocked")).toMatch(/permissão/i);
    expect(traduzirErroMl(429, null, null)).toMatch(/limitou/i);
  });

  it("repete 429 e desiste de 404", async () => {
    const buscar = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "too_many" }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "MLB1" }), { status: 200 }));
    const ok = await buscarMl("https://api.mercadolibre.com/questions/1", "tok", buscar);
    expect(ok.ok).toBe(true);
    expect(buscar).toHaveBeenCalledTimes(2);

    const uma = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "not found", error: "not_found" }), { status: 404 }));
    const ruim = await buscarMl("https://api.mercadolibre.com/questions/2", "tok", uma);
    expect(ruim.ok).toBe(false);
    expect(uma).toHaveBeenCalledTimes(1);
  });
});

describe("alteração de preço", () => {
  const item = lerItemPreco({ id: "MLB1", seller_id: 9, status: "active", title: "Camisa", price: 100, currency_id: "BRL", variations: [{ id: 11, price: 100 }, { id: 12, price: 100 }] })!;

  it("aplica valor, percentual e soma em centavos", () => {
    expect(aplicarRegra(100, { tipo: "valor", valor: 89.999 })).toBe(90);
    expect(aplicarRegra(59.9, { tipo: "percentual", valor: -10 })).toBe(53.91);
    expect(aplicarRegra(100, { tipo: "soma", valor: -0.5 })).toBe(99.5);
  });

  it("recusa preço zero ou negativo", () => {
    expect(erroPreco(0)).not.toBeNull();
    expect(erroPreco(-1)).not.toBeNull();
    expect(erroPreco(10)).toBeNull();
  });

  it("avisa queda de 20% ou mais, sem bloquear", () => {
    expect(quedaGrande(100, 80)).toBe(true);
    expect(quedaGrande(100, 81)).toBe(false);
    expect(quedaGrande(100, 150)).toBe(false);
  });

  it("envia todas as variações com o mesmo preço", () => {
    expect(corpoPreco(item, 90)).toEqual({ variations: [{ id: 11, price: 90 }, { id: 12, price: 90 }] });
    const simples = lerItemPreco({ id: "MLB2", price: 50 })!;
    expect(corpoPreco(simples, 45)).toEqual({ price: 45 });
  });

  it("estado muda quando o preço de uma variação muda", () => {
    const outro = lerItemPreco({ id: "MLB1", price: 100, variations: [{ id: 11, price: 100 }, { id: 12, price: 95 }] })!;
    expect(estadoPreco(item)).not.toBe(estadoPreco(outro));
  });

  it("detecta preço ignorado por automação", () => {
    expect(precoIgnorado({ warnings: [{ code: "item.price.not_modifiable" }] })).toBe(true);
    expect(precoIgnorado({ id: "MLB1" })).toBe(false);
  });
});

describe("promoções", () => {
  const lista = lerPromosDoItem([
    { id: "P-MLB1", type: "DEAL", status: "candidate", original_price: 200, min_discounted_price: 150, max_discounted_price: 190, suggested_discounted_price: 180 },
    { id: "P-MLB2", type: "SMART", status: "candidate", ref_id: "CANDIDATE-MLB9-1", price: 170, original_price: 200 },
    { type: "PRICE_DISCOUNT", status: "candidate", original_price: 200 },
    { id: "P-MLB3", type: "LIGHTNING", status: "started", price: 150, original_price: 200 },
  ]);
  const hoje = "2026-10-21";

  it("acha a promoção pelo id e o desconto individual pelo tipo", () => {
    expect(acharPromo(lista, "DEAL", "P-MLB1")?.max).toBe(190);
    expect(acharPromo(lista, "PRICE_DISCOUNT", null)?.preco_original).toBe(200);
    expect(acharPromo(lista, "DEAL", "P-OUTRA")).toBeNull();
  });

  it("monta o corpo da campanha tradicional dentro da faixa do ML", () => {
    const e = lerEntrada({ item_id: "MLB9", promotion_type: "DEAL", promotion_id: "P-MLB1", deal_price: 185 })!;
    const r = corpoAdesao(e, acharPromo(lista, "DEAL", "P-MLB1"), hoje);
    expect(r).toEqual({ ok: true, corpo: { promotion_type: "DEAL", promotion_id: "P-MLB1", deal_price: 185 } });
    const caro = corpoAdesao({ ...e, deal_price: 195 }, acharPromo(lista, "DEAL", "P-MLB1"), hoje);
    expect(caro.ok).toBe(false);
  });

  it("usa o offer_id do candidato nas campanhas automatizadas", () => {
    const e = lerEntrada({ item_id: "MLB9", promotion_type: "SMART", promotion_id: "P-MLB2" })!;
    const r = corpoAdesao(e, acharPromo(lista, "SMART", "P-MLB2"), hoje);
    expect(r).toEqual({ ok: true, corpo: { promotion_type: "SMART", promotion_id: "P-MLB2", offer_id: "CANDIDATE-MLB9-1" } });
  });

  it("valida o desconto individual: 5% a 80% e até 14 dias", () => {
    const atual = acharPromo(lista, "PRICE_DISCOUNT", null);
    const base = { item_id: "MLB9", promotion_type: "PRICE_DISCOUNT", deal_price: 180, start_date: hoje, finish_date: "2026-10-27" };
    const ok = corpoAdesao(lerEntrada(base)!, atual, hoje);
    expect(ok).toEqual({ ok: true, corpo: { promotion_type: "PRICE_DISCOUNT", deal_price: 180, start_date: "2026-10-21T00:00:00", finish_date: "2026-10-27T23:59:59" } });
    expect(corpoAdesao(lerEntrada({ ...base, deal_price: 195 })!, atual, hoje).ok).toBe(false);
    expect(corpoAdesao(lerEntrada({ ...base, deal_price: 40 })!, atual, hoje).ok).toBe(false);
    expect(corpoAdesao(lerEntrada({ ...base, finish_date: "2026-11-04" })!, atual, hoje).ok).toBe(false);
    expect(corpoAdesao(lerEntrada({ ...base, start_date: "2026-10-20" })!, atual, hoje).ok).toBe(false);
  });

  it("oferta relâmpago exige estoque e não sai depois de começar", () => {
    const e = lerEntrada({ item_id: "MLB9", promotion_type: "LIGHTNING", promotion_id: "P-MLB3", deal_price: 150 })!;
    expect(corpoAdesao(e, null, hoje).ok).toBe(false);
    expect(motivoSemSaida(e, acharPromo(lista, "LIGHTNING", "P-MLB3"))).toMatch(/não pode ser removida/);
  });

  it("monta a saída com offer_id só quando o tipo pede", () => {
    const smart = lerEntrada({ item_id: "MLB9", promotion_type: "SMART", promotion_id: "P-MLB2" })!;
    expect(querySaida(smart, acharPromo(lista, "SMART", "P-MLB2"))).toBe("promotion_type=SMART&app_version=v2&promotion_id=P-MLB2&offer_id=CANDIDATE-MLB9-1");
    const pd = lerEntrada({ item_id: "MLB9", promotion_type: "PRICE_DISCOUNT" })!;
    expect(querySaida(pd, null)).toBe("promotion_type=PRICE_DISCOUNT&app_version=v2");
  });

  it("estado muda quando status ou preço mudam", () => {
    const p = acharPromo(lista, "DEAL", "P-MLB1")!;
    expect(estadoPromo(p)).not.toBe(estadoPromo({ ...p, status: "started" }));
    expect(estadoPromo(null)).toBe("ausente");
  });

  it("lê o cursor search_after nos dois nomes", () => {
    expect(cursorSeguinte({ paging: { searchAfter: "abc" } })).toBe("abc");
    expect(cursorSeguinte({ search_after: "x" })).toBe("x");
    expect(cursorSeguinte({ paging: [] })).toBeNull();
  });

  it("valida cupom percentual com as regras documentadas", () => {
    const base = { name: "Black", sub_type: "FIXED_PERCENTAGE", fixed_percentage: 10, min_purchase_amount: 100, max_purchase_amount: 50, start_date: hoje, finish_date: "2026-11-20", budget: 1000 };
    const ok = validarCupom(base, hoje);
    expect(ok.ok && ok.corpo).toMatchObject({ promotion_type: "SELLER_COUPON_CAMPAIGN", start_date: "2026-10-21T00:00:00", fixed_percentage: 10 });
    expect(validarCupom({ ...base, fixed_percentage: 4 }, hoje).ok).toBe(false);
    expect(validarCupom({ ...base, budget: 40 }, hoje).ok).toBe(false);
    expect(validarCupom({ ...base, finish_date: "2026-11-30" }, hoje).ok).toBe(false);
    expect(validarCupom({ ...base, min_purchase_amount: 600 }, hoje).ok).toBe(false);
    expect(validarCupom({ ...base, partial_coupon_code: "CODIGO-LONGO" }, hoje).ok).toBe(false);
  });

  it("valida cupom de valor fixo menor que a compra mínima", () => {
    const base = { name: "Fixo", sub_type: "FIXED_AMOUNT", fixed_amount: 20, min_purchase_amount: 100, start_date: hoje, finish_date: "2026-10-30", budget: 500 };
    expect(validarCupom(base, hoje).ok).toBe(true);
    expect(validarCupom({ ...base, fixed_amount: 100 }, hoje).ok).toBe(false);
  });

  it("data de hoje no fuso de São Paulo", () => {
    expect(hojeSaoPaulo(new Date("2026-10-22T02:30:00Z"))).toBe("2026-10-21");
  });
});

describe("melhorias de anúncio", () => {
  const performance = {
    score: 62,
    level_wording: "Satisfatória",
    calculated_at: "2026-10-20T10:00:00Z",
    buckets: [{
      title: "Dados do produto",
      variables: [
        { title: "GTIN", rules: [{ status: "COMPLETED", mode: "OPPORTUNITY", wordings: { title: "ok" } }] },
        { title: "Fotos", rules: [{ status: "PENDING", mode: "WARNING", wordings: { title: "Troque a foto de capa", label: "Mudar foto", link: "https://ml/x" } }] },
      ],
    }],
  };

  it("lê só as pendências da qualidade do ML", () => {
    const q = lerQualidade(performance)!;
    expect(q.score).toBe(62);
    expect(q.nivel).toBe("Satisfatória");
    expect(q.pendencias).toEqual([{ grupo: "Dados do produto", titulo: "Troque a foto de capa", acao: "Mudar foto", link: "https://ml/x", modo: "WARNING" }]);
  });

  it("separa atributos obrigatórios, condicionais e opcionais vazios", () => {
    const categoria = [
      { id: "BRAND", name: "Marca", tags: { required: true } },
      { id: "MODEL", name: "Modelo", tags: { required: true } },
      { id: "GTIN", name: "Código universal", tags: { conditional_required: true } },
      { id: "COLOR", name: "Cor", tags: { allow_variations: true } },
      { id: "WARRANTY", name: "Garantia", tags: {} },
      { id: "INTERNAL", name: "Interno", tags: { read_only: true } },
      { id: "HIDDEN", name: "Oculto", tags: { hidden: true } },
      { id: "NEW_ONLY", name: "Só novo", tags: { new_required: true } },
    ];
    const item = [
      { id: "BRAND", name: "Marca", value_name: "Acme" },
      { id: "GTIN", name: "Código universal", value_id: "-1", value_name: null },
    ];
    const f = atributosDaFicha(categoria, item, "new", ["COLOR"]);
    expect(f.obrigatorios.map((a) => a.id)).toEqual(["MODEL", "NEW_ONLY"]);
    expect(f.condicionais).toEqual([]);
    expect(f.opcionais_vazios.map((a) => a.id)).toEqual(["WARRANTY"]);
    expect(f.preenchidos).toEqual([{ nome: "Marca", valor: "Acme" }]);
    expect(atributosDaFicha(categoria, item, "used").obrigatorios.map((a) => a.id)).toEqual(["MODEL"]);
  });

  it("aponta título, descrição e fotos com os limites da categoria", () => {
    const d = diagnosticar({
      titulo: "TENIS CORRIDA TENIS MASCULINO",
      descricao: "",
      fotos: lerFotos([{ max_size: "1200x1200" }, { max_size: "800x600" }, { size: "400x500" }]),
      categoria: lerCategoria({ name: "Tênis", settings: { max_title_length: 60, max_pictures_per_item: 12, max_description_length: 50000 } }),
      qualidade: lerQualidade(performance),
      ficha: { obrigatorios: [{ id: "MODEL", nome: "Modelo" }], condicionais: [], opcionais_vazios: [], preenchidos: [] },
    });
    const textos = d.achados.map((a) => `${a.gravidade}:${a.frente}`);
    expect(textos.slice(0, 4).every((t) => t.startsWith("alta"))).toBe(true);
    expect(textos).toContain("alta:descricao");
    expect(textos).toContain("alta:fotos");
    expect(textos).toContain("alta:ficha");
    expect(textos).toContain("alta:qualidade_ml");
    expect(d.fotos).toEqual({ quantidade: 3, max: 12, abaixo_minimo: 1, abaixo_recomendado: 2 });
    expect(d.titulo.max).toBe(60);
  });

  it("detecta maiúsculas e palavras repetidas sem acento", () => {
    expect(quaseTudoMaiusculo("TENIS CORRIDA MASCULINO")).toBe(true);
    expect(quaseTudoMaiusculo("Tênis Corrida Masculino")).toBe(false);
    expect(palavrasRepetidas("Tênis tenis corrida 42 42")).toEqual(["tenis"]);
  });

  it("descarta títulos acima do limite e repetidos", () => {
    const r = validarIa({
      resumo: "Anúncio bom.",
      recomendacoes: [{ frente: "titulo", prioridade: "alta", origem: "regra", titulo: "X", texto: "Y" }, { frente: "x", prioridade: "urgente", origem: "ia", titulo: "a", texto: "b" }],
      titulos_sugeridos: ["Tênis Corrida Acme", "tênis corrida acme", "x".repeat(61)],
      descricao_sugerida: "",
    }, 60, 50000)!;
    expect(r.titulos_sugeridos).toEqual(["Tênis Corrida Acme"]);
    expect(r.recomendacoes).toHaveLength(1);
    expect(r.descricao_sugerida).toBeNull();
    expect(validarIa({ recomendacoes: [] }, 60, null)).toBeNull();
  });

  it("assinatura muda com o conteúdo", () => {
    expect(assinatura({ a: 1 })).toBe(assinatura({ a: 1 }));
    expect(assinatura({ a: 1 })).not.toBe(assinatura({ a: 2 }));
  });
});

describe("estudo de mercado", () => {
  it("quartis por interpolação linear, sem média", () => {
    expect(quartis([10, 20, 30, 40, 50])).toEqual({ n: 5, min: 10, q1: 20, mediana: 30, q3: 40, max: 50 });
    expect(quartis([4, 1, 3, 2])).toEqual({ n: 4, min: 1, q1: 1.75, mediana: 2.5, q3: 3.25, max: 4 });
    expect(quartis([])).toBeNull();
  });

  it("tendências: grupo pela posição e marcação contra o título, sem acento", () => {
    expect([1, 10, 11, 30, 31, 50].map(grupoDaPosicao)).toEqual(["crescimento", "crescimento", "desejadas", "desejadas", "populares", "populares"]);
    const t = lerTendencias([
      { keyword: "tênis corrida", url: "https://x" },
      { keyword: "tenis infantil" },
      { keyword: "bola" },
      { url: "sem palavra" },
    ], "Tenis de Corrida Masculino Acme");
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ posicao: 1, no_titulo: true, relacionada: true, grupo: "crescimento" });
    expect(t[1]).toMatchObject({ no_titulo: false, relacionada: true, url: null });
    expect(t[2]).toMatchObject({ no_titulo: false, relacionada: false });
  });

  it("mais vendidos em ordem de posição", () => {
    const d = lerDestaques({ content: [{ id: "MLB2", position: 2, type: "PRODUCT" }, { id: "MLB1", position: 1, type: "ITEM" }, { position: 3 }] });
    expect(d.map((x) => x.id)).toEqual(["MLB1", "MLB2"]);
    expect(lerDestaques(null)).toEqual([]);
  });

  it("ofertas do catálogo e resumo sem as do próprio vendedor", () => {
    const { ofertas, total } = lerOfertas({
      paging: { total: 4 },
      results: [
        { item_id: "MLB1", seller_id: 1, price: 100, condition: "new", shipping: { logistic_type: "fulfillment", free_shipping: true }, official_store_id: 9 },
        { item_id: "MLB2", seller_id: 2, price: 120, condition: "new", shipping: { logistic_type: "drop_off", free_shipping: true }, official_store_id: null },
        { item_id: "MLB3", seller_id: 2, price: 140, condition: "used", shipping: { logistic_type: "drop_off", free_shipping: false } },
        { item_id: "MLB4", seller_id: 7, price: 90, shipping: {} },
        { item_id: "MLB5", seller_id: 3 },
      ],
    }, "MLBP");
    expect(total).toBe(4);
    expect(ofertas).toHaveLength(4);
    expect(ofertas[0]).toMatchObject({ full: true, frete_gratis: true, loja_oficial: true, produto_id: "MLBP" });
    const r = resumirConcorrencia(ofertas, 7);
    expect(r.ofertas).toBe(3);
    expect(r.vendedores).toBe(2);
    expect(r.precos?.mediana).toBe(120);
    expect(r.full).toBeCloseTo(0.333, 3);
    expect(r.frete_gratis).toBeCloseTo(0.667, 3);
    expect(resumirConcorrencia([], 7)).toMatchObject({ ofertas: 0, precos: null, full: null });
  });

  it("competição no catálogo e tarifa (objeto, lista ou lista de listas)", () => {
    const c = lerCompeticao({
      status: "competing", current_price: 110, price_to_win: 99.9, visit_share: "minimum", reason: ["shipping_mode"],
      boosts: [{ id: "fulfillment", status: "opportunity" }, { id: "free_shipping", status: "boosted" }],
      winner: { item_id: "MLB9", price: 99.9 },
    })!;
    expect(c).toMatchObject({ status: "competing", preco_para_ganhar: 99.9, motivos: ["shipping_mode"], oportunidades: ["fulfillment"], vencedor: { item_id: "MLB9", preco: 99.9 } });
    const tarifa = { listing_type_id: "gold_pro", sale_fee_amount: 18.5, sale_fee_details: { percentage_fee: 16.5, fixed_fee: 0 } };
    expect(lerTarifa(tarifa, "gold_pro")).toEqual({ valor: 18.5, percentual: 16.5, fixa: 0 });
    expect(lerTarifa([[tarifa]], "gold_pro")?.valor).toBe(18.5);
    expect(lerTarifa([{ listing_type_id: "free", sale_fee_amount: 0 }, tarifa], "gold_pro")?.valor).toBe(18.5);
    expect(lerTarifa([{ listing_type_id: "free", sale_fee_amount: 0 }], "gold_pro")).toBeNull();
  });

  it("margem = preço − tarifa − custo − frete", () => {
    expect(calcularMargem(100, 16.5, 50, 10)).toEqual({ preco: 100, tarifa: 16.5, custo: 50, frete: 10, valor: 23.5, percentual: 0.235 });
    expect(calcularMargem(100, 16.5, 90).valor).toBe(-6.5);
  });

  const base: EntradaFatores = {
    produtosEncontrados: 1,
    concorrencia: { ofertas: 10, vendedores: 8, precos: { n: 10, min: 80, q1: 90, mediana: 100, q3: 110, max: 150 }, full: 0.6, frete_gratis: 0.2, lojas_oficiais: 0, novos: 1 },
    meu: { preco: 105, full: false, frete_gratis: true, loja_oficial: false, catalogo: true },
    competicao: lerCompeticao({ status: "winning", price_to_win: 105 }),
    destaques: { categoriaTem: true, minhaPosicao: null, produtoPosicao: null },
    tendenciasRelacionadas: 2,
    tendenciasTotal: 50,
    margem: null,
    margemMinima: null,
  };
  const sinal = (e: EntradaFatores, id: string) => avaliarFatores(e).find((f) => f.id === id)?.sinal;

  it("sinais por regras fixas", () => {
    expect(sinal(base, "concorrencia")).toBe("amarelo");
    expect(sinal(base, "preco")).toBe("amarelo");
    expect(sinal({ ...base, meu: { ...base.meu, preco: 100 } }, "preco")).toBe("verde");
    expect(sinal({ ...base, meu: { ...base.meu, preco: 111 } }, "preco")).toBe("vermelho");
    expect(sinal(base, "full")).toBe("vermelho");
    expect(sinal(base, "frete")).toBe("verde");
    expect(sinal(base, "lojas_oficiais")).toBe("verde");
    expect(sinal(base, "catalogo")).toBe("verde");
    expect(sinal(base, "mais_vendidos")).toBe("amarelo");
    expect(sinal({ ...base, destaques: { categoriaTem: true, minhaPosicao: 3, produtoPosicao: null } }, "mais_vendidos")).toBe("verde");
    expect(sinal(base, "tendencias")).toBe("verde");
    expect(avaliarFatores(base).some((f) => f.id === "margem")).toBe(false);
  });

  it("sem dados vira sem_dado, nunca um sinal inventado", () => {
    const vazio: EntradaFatores = {
      ...base,
      produtosEncontrados: 0,
      concorrencia: resumirConcorrencia([], 1),
      meu: { ...base.meu, catalogo: false },
      competicao: null,
      destaques: { categoriaTem: false, minhaPosicao: null, produtoPosicao: null },
      tendenciasRelacionadas: 0,
      tendenciasTotal: 0,
    };
    expect(avaliarFatores(vazio).every((f) => f.sinal === "sem_dado")).toBe(true);
    expect(sinal({ ...base, concorrencia: { ...base.concorrencia, precos: { n: 2, min: 1, q1: 1, mediana: 1, q3: 1, max: 1 } } }, "preco")).toBe("sem_dado");
  });

  it("margem usa a margem mínima da conta quando definida", () => {
    const comMargem = (valor: number, minima: number | null) => ({ ...base, margem: calcularMargem(100, 15, 100 - 15 - valor), margemMinima: minima });
    expect(sinal(comMargem(-5, null), "margem")).toBe("vermelho");
    expect(sinal(comMargem(5, null), "margem")).toBe("verde");
    expect(sinal(comMargem(5, 0.1), "margem")).toBe("amarelo");
    expect(sinal(comMargem(15, 0.1), "margem")).toBe("verde");
    expect(contarSinais(avaliarFatores(base))).toEqual({ verdes: 4, amarelos: 3, vermelhos: 1 });
  });

  it("parecer da IA validado e limitado", () => {
    expect(validarParecer({ parecer: "  Ok.  ", pontos_fortes: ["a", "", 3, "b"], riscos: Array(8).fill("r"), proximos_passos: [] }))
      .toEqual({ parecer: "Ok.", pontos_fortes: ["a", "b"], riscos: Array(5).fill("r"), proximos_passos: [] });
    expect(validarParecer({ parecer: "" })).toBeNull();
  });
});

describe("histórico de tendências", () => {
  it("semana começa na segunda-feira em São Paulo", () => {
    expect(semanaDe(new Date("2026-10-22T15:00:00Z"))).toBe("2026-10-19");
    expect(semanaDe(new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-12");
    expect(semanaDe(new Date("2026-10-19T03:00:00Z"))).toBe("2026-10-19");
  });

  it("categorias mais vendidas e cadeia para subir quando vier vazia", () => {
    expect(topCategorias([
      { categoria_id: "A", vendidos: 5 }, { categoria_id: "B", vendidos: 10 }, { categoria_id: "A", vendidos: 6 },
      { categoria_id: null, vendidos: 99 }, { categoria_id: "C", vendidos: null },
    ], 2)).toEqual(["A", "B"]);
    const caminho = [{ id: "C1", nome: "Esportes" }, { id: "C2", nome: "Corrida" }, { id: "C3", nome: "Tênis" }, { id: "C4", nome: "Masculino" }];
    expect(cadeiaDeCategorias("C4", caminho).map((c) => c.id)).toEqual(["C4", "C3", "C2"]);
    expect(cadeiaDeCategorias("C2", caminho).map((c) => c.id)).toEqual(["C2", "C1"]);
    expect(cadeiaDeCategorias("X", caminho.slice(0, 1)).map((c) => c.id)).toEqual(["X", "C1"]);
  });

  it("compara com a coleta anterior: nova, subiu, caiu, saiu e semanas seguidas", () => {
    const t = (semana: string, posicao: number, palavra: string, grupo: Termo["grupo"] = "crescimento"): Termo => ({ semana, posicao, palavra, url: null, grupo });
    const r = compararSemanas([
      t("2026-10-19", 1, "Tênis corrida"), t("2026-10-19", 2, "bola"), t("2026-10-19", 3, "meia"),
      t("2026-10-12", 1, "bola"), t("2026-10-12", 2, "luva"), t("2026-10-12", 3, "tenis  corrida", "desejadas"),
      t("2026-10-05", 5, "tênis corrida"),
    ]);
    expect(r.semana).toBe("2026-10-19");
    expect(r.anterior).toBe("2026-10-12");
    expect(r.linhas.map((l) => [l.palavra, l.movimento, l.semanas])).toEqual([
      ["Tênis corrida", { tipo: "subiu", de: 3, passos: 2 }, 3],
      ["bola", { tipo: "caiu", de: 1, passos: 1 }, 2],
      ["meia", { tipo: "nova" }, 1],
    ]);
    expect(r.linhas[0].grupoAntes).toBe("desejadas");
    expect(r.sairam.map((s) => s.palavra)).toEqual(["luva"]);
  });

  it("primeira semana não tem base para movimento", () => {
    const r = compararSemanas([{ semana: "2026-10-19", posicao: 1, palavra: "bola", url: null, grupo: "crescimento" }]);
    expect(r.linhas[0].movimento).toBeNull();
    expect(r.sairam).toEqual([]);
    expect(compararSemanas([]).semana).toBeNull();
  });
});

describe("Publicidade: campanhas e anúncios", () => {
  it("criar exige todos os campos; editar aceita um; ROAS alvo de 1 a 35", () => {
    expect(lerDadosCampanha({ name: "Verão" }, true).ok).toBe(false);
    const ok = lerDadosCampanha({ name: " Verão ", budget: 50.123, strategy: "profitability", status: "active", roas_target: 8 }, true);
    expect(ok).toEqual({ ok: true, dados: { name: "Verão", budget: 50.12, strategy: "profitability", status: "active", roas_target: 8 } });
    expect(lerDadosCampanha({ budget: 30 }, false)).toEqual({ ok: true, dados: { budget: 30 } });
    expect(lerDadosCampanha({}, false).ok).toBe(false);
    expect(lerDadosCampanha({ roas_target: 0.5 }, false).ok).toBe(false);
    expect(lerDadosCampanha({ roas_target: 36 }, false).ok).toBe(false);
    expect(lerDadosCampanha({ budget: 0 }, false).ok).toBe(false);
    expect(lerDadosCampanha({ strategy: "outra" }, false).ok).toBe(false);
  });

  it("lê a campanha do ML em minúsculas e envia só o que muda", () => {
    const c = lerCampanhaMl({ id: 10, name: "Verão", status: "ACTIVE", budget: 50, strategy: "PROFITABILITY", roas_target: 8 })!;
    expect(c).toEqual({ id: 10, name: "Verão", status: "active", budget: 50, strategy: "profitability", roas_target: 8 });
    expect(lerCampanhaMl({ id: 11, daily_budget: 20 })!.budget).toBe(20);
    expect(mudancasCampanha(c, { name: "Verão", budget: 60, status: "active" })).toEqual({ budget: 60 });
    expect(estadoCampanha(c)).not.toBe(estadoCampanha({ ...c, budget: 60 }));
    expect(textoCampanha(c)).toBe("Verão · R$ 50,00/dia · ROAS alvo 8× · Rentabilidade · Ativa");
  });

  it("Ad Group sem campanha vira null e o estado compara campanha e status", () => {
    const g = lerGrupoMl({ id: 5, campaign_id: 0, status: "PAUSED", ad_group_type: "FAMILY", ad_group_external_id: "123" })!;
    expect(g.campaign_id).toBeNull();
    expect(g.status).toBe("paused");
    expect(g.external_id).toBe("123");
    expect(estadoGrupo(g)).toBe("-|paused");
    expect(estadoGrupo({ ...g, campaign_id: 9, status: "active" })).toBe("9|active");
  });

  it("indicadores vêm das somas, não de média de razões", () => {
    const s = somar([
      { cost: 10, total_amount: 100, clicks: 10, prints: 1000, units_quantity: 1 },
      { cost: 30, total_amount: 20, clicks: 30, prints: 1000, units_quantity: 1 },
    ]);
    const i = indicadores(s, 2000);
    expect(i.roas).toBe(3);
    expect(i.acos).toBeCloseTo(40 / 120);
    expect(i.ctr).toBe(0.02);
    expect(i.cpc).toBe(1);
    expect(i.cvr).toBe(0.05);
    expect(i.tacos).toBe(0.02);
    expect(indicadores(somar([])).roas).toBeNull();
  });

  it("alertas de desempenho usam os limites da conta e somem sem investimento", () => {
    const l = lerLimites({ alerta_roas: "4", alerta_acos: 0.2 });
    expect(l).toEqual({ ...LIMITES_PADRAO, alerta_roas: 4, alerta_acos: 0.2 });
    const ruim = indicadores({ custo: 100, receita: 300, cliques: 50, impressoes: 100000, unidades: 2, dias: 30 }, 1000);
    const a = alertasDesempenho(ruim, l);
    expect(a.some((x) => x.startsWith("ACOS"))).toBe(true);
    expect(a.some((x) => x.startsWith("ROAS"))).toBe(true);
    expect(a.some((x) => x.startsWith("CTR"))).toBe(true);
    expect(a.some((x) => x.startsWith("TACOS"))).toBe(true);
    expect(alertasDesempenho(indicadores({ custo: 50, receita: 0, cliques: 10, impressoes: 1000, unidades: 0, dias: 30 }), l)).toContain("Investimento sem receita atribuída");
    expect(alertasDesempenho(indicadores(somar([])), l)).toEqual([]);
  });

  it("orçamento mensal projetado contra a meta sobre o faturamento de 30 dias", () => {
    expect(alertaOrcamento(10, 100000, 0.03)).toBeNull();
    expect(alertaOrcamento(200, 100000, 0.03)).toContain("acima da meta de 3%");
    expect(alertaOrcamento(10, null, 0.03)).toContain("Sem faturamento");
  });
});

const grupo = (p: Partial<GrupoPainel> & { ad_group_id: number }): GrupoPainel => ({
  campaign_id: 1, status: "active", tipo: "ITEM", external_id: `MLB${p.ad_group_id}`, titulo: `Anúncio ${p.ad_group_id}`,
  custo: 0, receita: 0, cliques: 0, impressoes: 0, unidades: 0, dias: 30,
  custo_ant: null, receita_ant: null, cliques_ant: null, impressoes_ant: null, unidades_ant: null, dias_ant: 0,
  item_id: `MLB${p.ad_group_id}`, thumbnail: null, link: null, anuncios: 1, anuncios_ativos: 1, estoque: 10,
  frete_gratis: true, logistica: "fulfillment", preco: 100,
  qualidade_score: 80, qualidade_nivel: "Profissional", fotos: 6, fotos_abaixo_minimo: 0, fotos_abaixo_recomendado: 0,
  ficha_obrigatorios: 0, achados_altos: 0, analisado_em: "2026-10-20T00:00:00Z",
  ...p,
});

describe("Publicidade: análise da tela", () => {
  const ctx = { limites: LIMITES_PADRAO, roasAlvo: new Map<number, number | null>([[1, 8]]) };

  it("períodos e somas por dia em São Paulo, sem misturar janelas", () => {
    expect(periodos("2026-10-22", 30)).toEqual({ atual: { de: "2026-09-23", ate: "2026-10-22" }, anterior: { de: "2026-08-24", ate: "2026-09-22" } });
    const l = (dia: string, cost: number) => ({ dia, cost, total_amount: cost * 5, clicks: 1, prints: 10, units_quantity: 0 });
    const s = somasPorPeriodo([l("2026-10-22", 10), l("2026-10-22", 5), l("2026-09-22", 7), l("2026-08-01", 99)], "2026-10-22", 30);
    expect(s.atual.custo).toBe(15);
    expect(s.atual.dias).toBe(1);
    expect(s.anterior.custo).toBe(7);
  });

  it("lê o nível de qualidade do texto do ML", () => {
    expect(nivelQualidade("Básica")).toBe("basica");
    expect(nivelQualidade("Satisfatória")).toBe("satisfatoria");
    expect(nivelQualidade("Profissional")).toBe("profissional");
    expect(nivelQualidade(null)).toBeNull();
    expect(mediana([3, 1, 2, 10])).toBe(2.5);
  });

  it("cruza qualidade, fotos, ficha e estoque com o desempenho do anúncio", () => {
    const { grupos } = analisarGrupos([
      grupo({ ad_group_id: 1, custo: 100, receita: 200, cliques: 60, impressoes: 5000, unidades: 1, qualidade_nivel: "Básica" }),
      grupo({ ad_group_id: 2, custo: 10, receita: 200, cliques: 20, impressoes: 30000, unidades: 2, fotos_abaixo_recomendado: 3 }),
      grupo({ ad_group_id: 3, custo: 40, receita: 0, cliques: 40, impressoes: 4000, unidades: 0 }),
      grupo({ ad_group_id: 4, custo: 5, receita: 100, cliques: 5, impressoes: 500, unidades: 1, estoque: 0 }),
      grupo({ ad_group_id: 5, custo: 10, receita: 200, cliques: 30, impressoes: 3000, unidades: 3 }),
    ], ctx);
    const ids = (id: number) => grupos.find((g) => g.ad_group_id === id)!.alertas.map((a) => a.id);
    expect(ids(1)).toContain("qualidade_roas");
    expect(ids(2)).toContain("fotos_ctr");
    expect(ids(3)).toContain("sem_venda");
    expect(ids(4)).toContain("sem_estoque");
    expect(ids(4)).not.toContain("escalar");
    expect(ids(5)).toEqual(["escalar"]);
  });

  it("associação só com 5 anúncios de cada lado, por mediana e sem afirmar causa", () => {
    const linhas = [
      ...[1, 2, 3, 4, 5].map((i) => grupo({ ad_group_id: i, custo: 10, receita: 20 + i, qualidade_nivel: "Básica" })),
      ...[6, 7, 8, 9, 10].map((i) => grupo({ ad_group_id: i, custo: 10, receita: 80 + i })),
    ];
    const { grupos } = analisarGrupos(linhas, ctx);
    const q = associacoes(grupos).find((a) => a.id === "qualidade_roas")!;
    expect(q.com).toMatchObject({ n: 5, mediana: 2.3 });
    expect(q.sem).toMatchObject({ n: 5, mediana: 8.8 });
    expect(q.pior).toBe(true);
    expect(q.leitura).toContain("não prova de causa");
    const poucos = associacoes(analisarGrupos(linhas.slice(0, 7), ctx).grupos).find((a) => a.id === "qualidade_roas")!;
    expect(poucos.pior).toBeNull();
    expect(poucos.leitura).toContain("Poucos anúncios");
  });

  it("mostra quanto do investimento está em anúncios com problema", () => {
    const { grupos } = analisarGrupos([
      grupo({ ad_group_id: 1, custo: 75, qualidade_nivel: "Básica" }),
      grupo({ ad_group_id: 2, custo: 25, receita: 100, unidades: 1 }),
    ], ctx);
    const r = investimentoEmRisco(grupos);
    expect(r.find((x) => x.id === "qualidade")).toMatchObject({ anuncios: 1, custo: 75, fracao: 0.75 });
    expect(r.find((x) => x.id === "sem_venda")).toMatchObject({ anuncios: 1, custo: 75 });
  });

  it("painel soma campanhas ativas para o orçamento e calcula TACOS só no período atual", () => {
    const p = montarPainel({
      campanhas: [
        { campaign_id: 1, name: "A", status: "active", strategy: "profitability", budget: 50, daily_budget: null, roas_target: 8, acos_target: null },
        { campaign_id: 2, name: "B", status: "paused", strategy: "increase", budget: 80, daily_budget: null, roas_target: null, acos_target: 12 },
        { campaign_id: 3, name: "C", status: "ACTIVE", strategy: null, budget: null, daily_budget: 20, roas_target: null, acos_target: null },
      ],
      serie: [
        { campaign_id: 1, dia: "2026-10-20", cost: 100, total_amount: 800, clicks: 50, prints: 5000, units_quantity: 4 },
        { campaign_id: 1, dia: "2026-09-10", cost: 50, total_amount: 100, clicks: 20, prints: 2000, units_quantity: 1 },
      ],
      grupos: [],
      settings: null,
      faturamento: 10000,
    }, "2026-10-22", 30);
    expect(p.orcamentoAtivo).toBe(70);
    expect(p.conta.atual.roas).toBe(8);
    expect(p.conta.atual.tacos).toBe(0.01);
    expect(p.conta.anterior.roas).toBe(2);
    expect(p.conta.anterior.tacos).toBeNull();
    expect(p.porCampanha.get(2)!.somas.dias).toBe(0);
  });
});
