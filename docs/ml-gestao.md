# Gestão do Mercado Livre — contratos

Contratos das Edge Functions de gestão (Perguntas, Anúncios, Preço, Promoções, Melhorias, Mercado, Tendências e Publicidade) e das tabelas e RPCs que as telas leem. Projeto Supabase `uepfrcrlxaasvijxyqrg`; base das funções `https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/`.

## Convenções

**Quem chama.** Toda função de gestão aceita `POST` com o JWT do usuário (`Authorization: Bearer <access_token>`) e confere `ml_pode_gerir_conta(account_id)` no servidor: consultor (`super_admin`, `admin`, `gerente` ou carteira atribuída) e conta dentro de `allowed_cust_ids`. As funções de leitura periódica também aceitam o cabeçalho `x-refresh-secret` (cron), sem JWT; nesse caso `account_id` é opcional e vale para todas as contas ativas.

**CORS.** `OPTIONS` responde 200 sem corpo, com `Access-Control-Allow-Origin: *` e os cabeçalhos `authorization, x-client-info, apikey, content-type, x-refresh-secret`.

**Erros.** O corpo de erro é sempre `{ "error": "mensagem em português" }`, exceto onde indicado. Códigos comuns:

| Código | Quando |
|---|---|
| 400 | Corpo inválido ou dado fora da regra |
| 401 | Sem login, login vencido ou segredo diferente |
| 403 | A pessoa não gerencia a conta, ou o anúncio/pergunta é de outra conta |
| 405 | Método diferente do aceito |
| 409 | Conta sem autorização do ML (token vencido), chave de envio já usada, envio em andamento, prévia ausente ou estado mudou |
| 422 | O ML recusou a escrita (mensagem traduzida e `codigo_ml` original) |
| 502 | O ML não respondeu ou respondeu erro na leitura |

**Chamadas ao ML.** Leitura com timeout de 8 s e até 3 tentativas em 429 e 5xx. Escrita repete só em 429; em 5xx ou timeout a função relê o estado no ML antes de dizer se foi feito.

### Ações em lote (prévia → confirmação)

`ml-price-action`, `ml-promotions-action` e `ml-ads-action` seguem o contrato de `supabase/functions/_shared/mlAcaoLote.ts`.

Prévia:

```json
{ "account_id": "uuid", "etapa": "previa", "idempotency_key": "8 a 100 caracteres", "...": "dados da ação" }
```

```json
{
  "etapa": "previa",
  "idempotency_key": "…",
  "linhas": [
    { "chave": "MLB123", "item_id": "MLB123", "titulo": "…", "antes": "R$ 89,90", "depois": "R$ 79,90", "aviso": "texto ou null", "bloqueio": "texto ou null" }
  ]
}
```

Confirmação (só a chave; o servidor usa o que gravou na prévia):

```json
{ "account_id": "uuid", "etapa": "confirmar", "idempotency_key": "a mesma da prévia" }
```

```json
{
  "etapa": "confirmar",
  "status": "concluido",
  "resultados": [
    { "chave": "MLB123", "item_id": "MLB123", "status": "feito", "mensagem": null, "codigo_ml": null }
  ]
}
```

- `status` da confirmação: `concluido`, ou `ja_feito` quando a mesma chave já foi confirmada (devolve os resultados guardados, sem enviar de novo).
- `status` de cada item: `feito`, `ja_feito`, `conflito` (mudou no ML desde a prévia; não enviou), `recusado` (o ML recusou ou não confirmou), `bloqueado` (bloqueio da prévia) e `nao_enviado` (acabou o tempo de 110 s antes do item).
- `aviso` não impede o envio; `bloqueio` impede só aquela linha.
- Cada item enviado grava uma linha em `ml_audit_log`; o pedido inteiro fica em `ml_action_requests`.
- Erros: 400 chave ou etapa inválida, "Nada para revisar"; 409 chave já usada em outra ação, prévia já existente para a chave, prévia ausente, envio em andamento, conta sem autorização.

## Funções

### Resumo limpo e Full — `ml-analise-loja`

- Entrada: POST autenticado `{ cust_id: "ID numérico", modo: "resumo" | "full" }`. Acesso pela visibilidade existente de `ml_sync_tema`, sem privilégio adicional do desenvolvedor.
- Somente leitura do ML com token da própria conta e renovação compartilhada. Sem gravação de dados de negócio; retorna apenas agregados, nunca compradores ou pedidos brutos.
- Período: 30 dias UTC completos. Resumo consulta também os 30 dias anteriores. Receita = soma de quantidade × preço em pedidos pagos, unidades separadas de pedidos; cancelamento = cancelados ÷ (pagos + cancelados). Outros status não entram.
- Resumo: `{ periodo, anteriorPeriodo, atual, anterior, consultadoEm }`; totais incluem faturamento, pedidos, unidades, cancelados, ticket, visitas, conversao, taxaCancelamento e serie diária. Visitas/conversão ficam null se faltar qualquer dia da janela.
- Full: `{ periodo, candidatos, universoVendido, limite: 20, consultadoEm, elegibilidadeFull: null }`. Até 20 anúncios vendidos fora de fulfillment, com MLB, título, SKU, estoque/status atuais, receita/unidades pagas, série diária completa, saúde, pendências ML e dimensões originais das fotos. Universo limitado explicitamente; pesos não são envio nem elegibilidade.
- Frontend usa quadprog para minimizar risco de oscilação da receita diária combinado à média, com pesos long-only que somam 100% e limite de 40% por anúncio (50% com dois). Só calcula com ao menos dois anúncios ativos com estoque e 30 datas alinhadas; alertas não inventam resolução ou lucro.
- Erros: 400 entrada inválida; 401 sem sessão; 403 sem loja visível; 404 desconectada; 409 autorização indisponível; 422 mais de 1.000 pedidos (suspende totais, não exibe parcial); 502 cobertura/API/tempo não confirmados.

### Notificações

#### `ml-webhook`

URL a cadastrar no DevCenter. Pública (`verify_jwt = false`).

- Entrada: `POST` no formato oficial do ML: `{ resource, user_id, topic, application_id, attempts, sent, _id? }`.
- Saída: `200 "ok"` em menos de 500 ms, inclusive para avisos ignorados de propósito. `400 "invalid"` sem tópico, recurso, `application_id` ou `user_id`. `405` para outros métodos.
- Grava o aviso em `ml_webhook_events` e processa depois da resposta: tópicos `questions`, `items`, `public_offers`, `public_candidates` e `price_suggestion`. Pergunta vai para `ml_questions`, anúncio para `ml_listings`, e o aviso interno vai para `notifications` de quem tem a conta em `allowed_cust_ids` (exceto `items` e `price_suggestion`).
- Erros do ML ao buscar o recurso ficam em `ml_webhook_events` (`status = erro`, `erro`, `codigo_ml`), nunca no HTTP de volta.

#### `ml-webhook-reconcile`

- Entrada: `POST` com `x-refresh-secret`; corpo opcional `{ account_id? }`.
- Saída: `200 { contas: [{ account_id, ml_user_id, novas, duplicadas, erros }] }`.
- Erros: 401 segredo ausente ou diferente; 405.
- Lê `GET /missed_feeds?app_id=…` (histórico de 2 dias). Cron a cada 30 min.

### Perguntas

#### `ml-questions-sync`

- Entrada: `{ account_id }` com JWT, ou `x-refresh-secret` sem corpo.
- Saída: `200 { contas: [{ account_id, sem_resposta, recentes, revistas, erro }] }`.
- Erros: 401, 403, 405.
- Lê `/questions/search?seller_id=…&api_version=4` (todas as sem resposta até 1.000 e as 50 mais recentes) e relê em `/questions/{id}` as que estavam sem resposta e sumiram da lista. Cron a cada 6 h.

#### `ml-questions-answer`

Contrato próprio (uma pergunta por vez), com a mesma idempotência das ações em lote.

- Entrada: `{ account_id, question_id, texto (1–2000), idempotency_key, etapa: "previa" | "confirmar" }`. Na confirmação o texto precisa ser igual ao da prévia.
- Prévia: `200 { etapa: "previa", idempotency_key, antes: { status, resposta, pergunta, item_id }, depois: { status, resposta } }`.
- Confirmação: `200 { etapa: "confirmar", status: "respondida" | "ja_feito", pergunta }`.
- Erros: 400; 401; 403; 409 já respondida, pergunta mudou no ML, texto mudou, envio em andamento ou prévia ausente; 422 o ML recusou (`{ error, codigo_ml }`); 502.
- Relê `/questions/{id}` antes de enviar `POST /answers`; grava `ml_audit_log` e atualiza `ml_questions`.

### Anúncios

#### `ml-listings-sync`

- Entrada: `{ account_id }` com JWT, ou `x-refresh-secret`.
- Saída: `200 { contas: [{ account_id, total_ml, lidos, pendentes, removidos, erro }] }`. `pendentes > 0`: acabou o tempo; a próxima execução continua.
- Erros: 401, 403, 405.
- Lê `/users/{id}/items/search?search_type=scan` (ativos e pausados) e `/items?ids=` em lotes de 20; grava `ml_listings` (inclui `family_id` e `catalog_product_id`). Cron de hora em hora.

#### `ml-price-action` (lote)

- Prévia: `itens: [{ item_id, preco_novo }]` ou `item_ids: string[]` com `regra: { tipo: "valor" | "percentual" | "soma", valor }`. Até 50 anúncios.
- Bloqueia: automação de preços ativa, anúncio de outra conta, anúncio fora de ativo/pausado, preço igual. Avisa: queda de 20% ou mais.
- Confirmação: relê o item; anúncio com variações recebe o mesmo preço em todas (o ML apaga as variações omitidas).

### Promoções

#### `ml-promotions-sync`

- Entrada: `{ account_id, promotion_id? }` com JWT, ou `x-refresh-secret`. Com `promotion_id`, relê só os anúncios daquela promoção.
- Saída: `200 { contas: [{ account_id, promocoes, itens, pendentes, erro }] }`.
- Erros: 401, 403, 405.
- Lê `/seller-promotions/users/{id}` e `/seller-promotions/promotions/{id}/items` (status `active` e `paused`). Cron a cada 3 h.

#### `ml-promotions-item`

- Entrada: `{ account_id, item_id }` com JWT.
- Saída: `200 { item: { item_id, titulo, preco, status }, promocoes: [{ promotion_id, tipo, status, preco, preco_original, offer_id, min, max, sugerido, nome, inicio, fim, meli_pct, vendedor_pct, estoque_min, estoque_max, nome_tipo, preco_por, pode: { aderir, alterar, sair }, motivo_sair }] }`.
- Erros: 400, 401, 403, 502.

#### `ml-promotions-action` (lote)

- Prévia com `acao`:
  - `aderir`, `alterar`, `sair`: `itens: [{ item_id, promotion_type, promotion_id?, offer_id?, deal_price?, top_deal_price?, stock?, start_date?, finish_date? }]`, até 50, datas `YYYY-MM-DD`.
  - `cupom_criar`: `cupom: { name, sub_type: "FIXED_PERCENTAGE" | "FIXED_AMOUNT", fixed_percentage | fixed_amount, min_purchase_amount, max_purchase_amount?, start_date, finish_date, budget, partial_coupon_code? }`.
  - `cupom_excluir`: `promotion_id`.
- Regras por tipo em `_shared/mlPromocoes.ts`: quem define o preço, campos obrigatórios, se dá para alterar (`PUT` ou sair e entrar de novo) e se dá para sair depois de começar (oferta do dia e relâmpago não saem).

### Melhorias, mercado e tendências

#### `ml-listing-improve`

- Entrada com JWT: `{ account_id, item_id, forcar?: boolean }`. Saída: `200 { status: "gerado" | "sem_mudanca", melhoria }` (`melhoria` é a linha de `ml_listing_improvements`). Sem `forcar`, devolve a análise guardada se o anúncio não mudou.
- Entrada com `x-refresh-secret`: `{ account_id? }`. Saída: `200 { contas: [{ account_id, analisados, com_ia, pendentes, erro }] }`. Cron de hora em hora, até os 10 ativos mais vendidos de cada conta por dia.
- Erros: 400, 401, 403, 502.
- Só sugere; não escreve no ML.

#### `ml-market-study`

- Entrada com JWT: `{ account_id, item_id, custo?: number, frete?: number }`.
- Saída: `200 { estudo }` (linha de `ml_market_studies`, com `resultado` contendo concorrência, quartis de preço, sinais, tarifa, margem e o parecer da IA em `ia`).
- Erros: 400, 401, 403, 404 anúncio não encontrado, 409, 502.
- Também grava os termos em alta lidos em `ml_trends_weekly`.

#### `ml-trends-sync`

- Entrada: `{ account_id }` com JWT, ou `x-refresh-secret` com `{ account_id? }`.
- Saída: `200 { semana, coletados, ja_coletados, pendentes, erros: string[] }`.
- Erros: 401, 403, 409.
- Coleta o Brasil e as 10 categorias mais vendidas da conta, só o que ainda falta na semana (segunda a domingo, São Paulo). Cron diário às 10h20 (UTC).

### Publicidade (Product Ads)

#### `ml-ads-sync`

- Entrada: `{ account_id }` com JWT, ou `x-refresh-secret` com `{ account_id? }`.
- Saída: `200 { janela, contas: [{ account_id, ml_user_id, status, anunciantes, campanhas, anuncios, dias_lidos, dias_pendentes, erros }] }`. `status`: `ativo`, `sem_product_ads`, `sem_token`, `erro`, `adiado`.
- Erros: 400 sem `account_id` com JWT, 401, 403, 405.
- Campanhas e anúncios a cada chamada; métrica diária por campanha 1 vez a cada 20 h; métrica por anúncio dia a dia, retomando por `ml_ads_dias_sync`. Janela de 90 dias. Cron de hora em hora.
- Erros e leituras parciais também gravam avisos controlados em `developer_alerts`, sem corpos de resposta ou tokens. Só o perfil `desenvolvedor` lê os diagnósticos; demais usuários recebem apenas estado genérico de atualização incompleta.

#### `ml-ads-action` (lote)

Prévia com `tipo`:

| `tipo` | Corpo | O que faz no ML |
|---|---|---|
| `campanha_criar` | `campanha: { name, budget, strategy, status, roas_target }` (todos) | `POST …/advertisers/{adv}/product_ads/campaigns` |
| `campanha_editar` | `campaign_id`, `campanha: { name?, budget?, strategy?, status?, roas_target? }` | `PUT …/product_ads/campaigns/{id}` só com o que muda |
| `grupos_incluir` | `campaign_id`, `ad_group_ids: number[]` | `PUT …/product_ads/ad_groups/{id}` com `{ status: "active", campaign_id }` (inclui ou move) |
| `grupos_status` | `ad_group_ids`, `status: "active" \| "paused"` | `PUT …/product_ads/ad_groups/{id}` mantendo a campanha |
| `grupos_remover` | `ad_group_ids` | `DELETE …/product_ads/campaigns/{cid}/ad_groups/{id}` |

- `budget` é o orçamento médio diário em reais; `strategy`: `profitability`, `increase` ou `visibility`; `roas_target` de 1 a 35; `status`: `active` ou `paused`.
- Até 50 anúncios, enviados um a um.
- Avisos (não bloqueiam): orçamento mensal projetado acima de `meta_investimento_ads` × `faturamento_30d`; ACOS, ROAS, CTR, CPC ou TACOS de 30 dias fora dos limites; anúncio sem estoque ou pausado no ML.
- Bloqueios: nome repetido na conta, nada a mudar, anúncio já no estado pedido, anúncio fora de campanha (para ativar, pausar ou remover), anúncio que não está em `ml_ads_ads` da conta.
- Erros da prévia: 400 dados inválidos; 404 campanha não encontrada na conta; 409 conta sem Product Ads; 502 o ML não respondeu ao ler a campanha.
- Caminho: tenta `/advertising/{site}/…` e, só em 404, `/marketplace/advertising/{site}/…`. Campanhas usam `api-version: 2`.
- Depois de cada escrita atualiza `ml_ads_campaigns` ou `ml_ads_ads`; `ml_audit_log.acao` usa `ads.campanha_criar`, `ads.campanha_editar`, `ads.anuncio_incluir`, `ads.anuncio_mover`, `ads.anuncio_ativar`, `ads.anuncio_pausar` e `ads.anuncio_remover`.

### Configuração da conta

#### `ml-settings`

Só `super_admin`, `admin` ou `gerente` com a conta em `allowed_cust_ids`. Não chama o ML.

- `GET /ml-settings?account_id=<uuid>` → `200 { account_id, meta_investimento_ads, acos_alvo, margem_minima, alerta_acos, alerta_roas, alerta_ctr, alerta_cpc, alerta_tacos, atualizado_em }`.
- `PATCH { account_id, ...campos }` → `200` com o objeto gravado. Frações entre 0 e 1 (3% = `0.03`); `acos_alvo` e `margem_minima` aceitam `null`.
- Erros: 400 `{ erros: string[] }`, 401, 403, 404 conta não encontrada, 405.

## Tabelas e RPCs

Todas com RLS ligada. Só as funções (service role) gravam; o usuário autenticado só lê, pelas políticas abaixo. "Consultor" = `ml_sou_consultor()`; "gerencia a conta" = `ml_pode_gerir_conta(account_id)`.

### Base e auditoria

| Tabela | Conteúdo | Leitura |
|---|---|---|
| `ml_settings` | Meta de investimento em Ads, ACOS alvo, margem mínima e limites de alerta, uma linha por conta (criada por gatilho) | gerencia a conta |
| `ml_action_requests` | Cada prévia e confirmação: ação, chave, status (`preview`, `processing`, `committed`, `failed`), linhas da prévia e resultados | gerencia a conta |
| `ml_audit_log` | Cada escrita enviada ao ML: ação, payload, resposta e código do ML | gerencia a conta |
| `ml_webhook_events` | Aviso bruto do webhook, recurso lido e status do processamento | ninguém (só funções) |
| `notifications` | Aviso interno por usuário (nova pergunta, convite de promoção…), com Realtime | o próprio usuário, se gerencia a conta |

### Perguntas e anúncios

| Tabela | Conteúdo | Leitura |
|---|---|---|
| `ml_questions` | Pergunta, anúncio, status, resposta e quem respondeu (Realtime) | gerencia a conta |
| `ml_listings` | Cópia dos anúncios ativos e pausados: título, SKUs, preço, estoque, vendidos, status, logística, frete grátis, catálogo, categoria, variações, `family_id`, `catalog_product_id` | gerencia a conta |
| `ml_listings_estado` | Última leitura completa: total no ML, lidos, pendentes | gerencia a conta |

### Promoções, melhorias e mercado

| Tabela | Conteúdo | Leitura |
|---|---|---|
| `ml_promotions` | Convites e campanhas da conta (tipo, status, datas, benefícios) | gerencia a conta |
| `ml_promotion_items` | Situação de cada anúncio em cada promoção (preço, oferta, limites, estoque) | gerencia a conta |
| `ml_listing_improvements` | Última análise de melhorias por anúncio: diagnóstico, texto da IA, nota de qualidade, achados | gerencia a conta |
| `ml_market_studies` | Cada estudo de mercado guardado, com resultado completo e contagem de sinais | gerencia a conta |
| `ml_trends_weekly` | Termos em alta por escopo (Brasil ou categoria) e semana | consultor |
| `ml_trends_coletas` | Uma linha por escopo e semana coletados | consultor |
| `ml_trend_categorias` | Categoria → escopo que tem termos em alta (até 2 níveis acima) | consultor |

### Publicidade

| Tabela | Conteúdo | Leitura |
|---|---|---|
| `ml_ads_estado` | Product Ads ativo ou não, última leitura | gerencia a conta |
| `ml_ads_advertisers` | Anunciante por site | gerencia a conta |
| `ml_ads_campaigns` | Campanhas: nome, status, estratégia, orçamento, ROAS alvo (e ACOS alvo antigo) | gerencia a conta |
| `ml_ads_ads` | Anúncios em Ads (Ad Groups): campanha, tipo (`ITEM`, `FAMILY`, `CATALOG`), id externo, status | gerencia a conta |
| `ml_ads_metrics_daily` | Métrica diária por campanha (`nivel = campanha`, `ad_group_id = 0`) e por anúncio, como a API mandou (ausência = null) | gerencia a conta |
| `ml_ads_dias_sync` | Dias de métrica por anúncio já lidos | ninguém (só funções) |

### Fonte externa usada pelas telas

| Tabela | Conteúdo | Leitura |
|---|---|---|
| `ml_sync_tema` | Resumo por tema da `ml-sync-loja`; `tema = vendas` traz `dados.faturamento_30d`, usado no TACOS e na meta de investimento | carteira (`allowed_cust_ids`) |

### RPCs

| RPC | Tipo | Retorno |
|---|---|---|
| `ml_sou_consultor()` | definer | `boolean`: a pessoa é consultor |
| `ml_pode_gerir_conta(p_account_id)` | definer | `boolean`: consultor e conta em `allowed_cust_ids` |
| `ml_contas_gerenciaveis()` | definer | `(id, ml_user_id, nickname, site_id)` das contas ativas que a pessoa gerencia |
| `ml_notificacao_lida(p_id)` | definer | marca a notificação da própria pessoa como lida |
| `ml_buscar_anuncios(p_account_id, p_termo, p_limite = 50)` | invoker | linhas de `ml_listings` por MLB, SKU (anúncio ou variação) ou palavras do título sem acento; até 200 |
| `ml_tendencias_escopos(p_account_id)` | invoker | `(escopo, nome, anuncios, vendidos)`: escopos de tendência ligados às categorias dos anúncios ativos |
| `ml_tendencias_cobertura(p_account_id, p_termos text[])` | invoker | `(termo, anuncios)`: anúncios ativos com todas as palavras (3+ letras) do termo no título |
| `ml_ads_painel_grupos(p_account_id, p_dias = 30)` | invoker | uma linha por anúncio em Ads: somas do período e do anterior (`custo`, `receita`, `cliques`, `impressoes`, `unidades`, `dias` e `*_ant`), anúncio representante (`item_id`, `thumbnail`, `link`, `preco`, `frete_gratis`, `logistica`), `anuncios`, `anuncios_ativos`, `estoque`, e a última análise (`qualidade_score`, `qualidade_nivel`, `fotos`, `fotos_abaixo_minimo`, `fotos_abaixo_recomendado`, `ficha_obrigatorios`, `achados_altos`, `analisado_em`). `p_dias` de 1 a 45 |

`ml_e_consultor(uuid)` e `ml_destinatarios_conta(uuid)` são só do service role.

## Teste de ponta a ponta

### Avisos operacionais privados

- `sou_desenvolvedor()` valida `user_roles` no servidor; o papel é adicional, sem novas permissões comerciais. A atribuição via cliente é bloqueada.
- `developer_alerts`: leitura só desenvolvedor; escrita direta só serviço. Retenção de 30 dias, consulta do painel até 200 registros, a cada 15 segundos.
- `registrar_aviso_painel(p_codigo, p_origem, p_duracao_ms?)`: usuário autenticado pode registrar apenas códigos/origens permitidos, sem texto livre; deduplicação de um minuto. Lentidão de chamadas de gestão medida a partir de 8 s.
- `reconhecer_aviso_desenvolvedor(p_id)`: só desenvolvedor marca ciente, sem alterar dados comerciais.
- `avisos_operacionais_existentes()`: só desenvolvedor; até 100 falhas de sincronização, webhook e rotinas dos últimos 7 dias, sem payloads brutos. Não classifica falhas como ataques; detecção de ataques não está conectada.

Roteiro e script: `scripts/ml-e2e.sh` (ver o cabeçalho do script). Cobre ler Ads, criar campanha pausada, editar, incluir, pausar e remover um anúncio, entrar e sair de uma promoção em um anúncio, receber uma pergunta pelo webhook e respondê-la.
