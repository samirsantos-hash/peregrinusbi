## Confirmação do achado I1

Existem **3 formatos** para identificar um seller, cruzados sem cast explícito em vários pontos:

- **`bigint`** — `cus_cust_id_sel` em `cdp_mensal`, `cpp_mensal`, `gm_elegibilidade`, `gm_live_listings`; `cust_id` em `sellers_pm`.
- **`text`** — `sellers.cust_id` (mestre), `meli_campaigns.cust_id`, `seller_grants.cust_id`, `portfolios.cust_ids[]`, `portfolio_notifications.added_cust_ids[]`, `user_access_control.allowed_cust_ids[]`.
- **`uuid`** — `seller_id` em `sellers_kpi`, `sellers_kpi_daily`, `live_listings`, `seller_listings_quality`, `seller_eligibility`, `meli_campaigns`, `seller_grants` (FK lógica para `sellers.id`).

Os triggers `sync_cust_id_from_sellers` / `sync_cust_id_change` propagam renomeações de `sellers.cust_id` apenas para as tabelas em formato **text** (`portfolios`, `portfolio_notifications`, `user_access_control`, `sellers`). **Não** tocam em `cdp_mensal`, `cpp_mensal`, `gm_elegibilidade`, `gm_live_listings`, `sellers_pm`, nem em nenhuma tabela `uuid`. Resultado: se um `cust_id` mudar no ML, essas 5 tabelas ficam órfãs silenciosamente.

---

## (a) Plano de padronização usando `sellers` como ponte

**Princípio:** `sellers` continua sendo a única fonte de verdade (mapa `cust_id text ↔ id uuid`). Ninguém mais duplica esse mapeamento; todos os joins passam por ela.

1. **Padronizar o tipo lógico do `cust_id`.**  
   Definir `text` como formato canônico externo (é o que o ML entrega e o que os arrays de portfólio/acesso já usam). `bigint` fica sendo só storage interno das tabelas legadas.
2. **Criar uma view `public.v_seller_bridge`** com `seller_uuid`, `cust_id_text`, `cust_id_bigint`, `nickname`, para todo consumo passar por ela em vez de reimplementar o cast em cada query.
3. **Alinhar as 5 tabelas hoje fora do trigger** (`cdp_mensal`, `cpp_mensal`, `gm_elegibilidade`, `gm_live_listings`, `sellers_pm`):
   - Adicionar coluna gerada `cust_id_text` (`= cus_cust_id_sel::text`) + índice — não quebra ingestão atual e passa a permitir join direto com `sellers.cust_id`.
   - Adicionar coluna `seller_id uuid` populada por trigger (`BEFORE INSERT/UPDATE`) via lookup em `sellers` pelo `cust_id_text`. Fica opcional/null quando o seller ainda não existe em `sellers`.
   - Backfill único (script controlado, fora do trigger) para popular `seller_id` das linhas existentes.
4. **Estender os triggers de sincronização** para cobrir também essas 5 tabelas: quando `sellers.cust_id` muda, atualizar `cus_cust_id_sel` (bigint) e a `cust_id_text` gerada segue automática; `seller_id` uuid não muda (é a chave estável).
5. **Adicionar constraint leve** em `sellers.cust_id`: garantir que só aceita string numérica (`~ '^[0-9]+$'`), para que os casts `text ↔ bigint` sejam sempre seguros.
6. **Contrato de código:** a partir dessa migração, toda nova query joina por `sellers.id` (uuid) ou pela view `v_seller_bridge`. Nenhum código novo pode filtrar `cus_cust_id_sel` diretamente com um valor `text` sem cast.

Nada disso destrói dado — só acrescenta colunas, view, triggers e backfill.

---

## (b) Pontos hoje suspeitos de cross-format sem cast

Locais onde código passa valor em formato diferente do da coluna, ou joina em memória entre duas fontes com tipo distinto sem normalizar — candidatos a retornar linhas vazias/incompletas:

1. **`src/lib/queries/fullRecommendations.ts:64`** — `.eq("cus_cust_id_sel", String(custId))` contra coluna `bigint`. PostgREST não faz cast implícito; se o filtro passa, é por sorte do parser. Deve virar `Number(custId)` ou usar a view.
2. **`src/pages/GestaoCarteira.tsx:222-225`** — `pmMap` é criado com chave `sellers_pm.cust_id` (bigint) e consultado com `cpp.cus_cust_id_sel` (bigint). Tipos iguais aqui, mas o `Map` compara por identidade JS: se um lado vier como string do PostgREST (colunas bigint viram string em JS quando grandes), o `get` devolve `undefined` silenciosamente e o seller aparece com todos os campos `pm` zerados (`nmv_lc: 0`, `dias_expiracao: 999`, etc.). Precisa normalizar as chaves para `String(...)` nos dois lados.
3. **`src/pages/GestaoCarteira.tsx:350`** — `String(r.cus_cust_id_sel)` usado como chave para agregar `gm_elegibilidade` / `gm_live_listings`; mas em outros pontos do mesmo arquivo usa-se `s.cust_id` cru (número). Mistura silenciosa das duas representações no mesmo componente.
4. **`src/hooks/useCrescimentoMensal.ts:48`** — `.in("cus_cust_id_sel", custIds.map(Number).filter(isFinite))` está correto no cast, mas descarta silenciosamente qualquer `cust_id` não numérico da lista de acesso (any string com letra vira `NaN` e some). Vale registrar como um caso onde a fragmentação pode filtrar sellers válidos.
5. **`src/lib/queries/qualityIndex.ts:372` + `:385`/`:418`** — mesma query usa `cus_cust_id_sel` (bigint) e depois `seller_id` (uuid) sem confirmar que os dois apontam para o mesmo seller; se `sellers` estiver desatualizado, retorna dados parciais (um lado preenchido, outro vazio).
6. **`src/lib/queries/publicidade.ts:101` e `:114`** — filtro `.eq("cus_cust_id_sel", custIdNum)` depende do chamador passar `Number`. Se algum caller passar `String`, filtra vazio sem erro.
7. **`src/hooks/usePortfolios.ts:159-160`** — `.in("cust_id", custIds)` contra `sellers.cust_id text` com valores vindos do array `portfolios.cust_ids text[]`. Tipos batem, mas se algum portfólio antigo tiver bigint serializado ("123.0" vs "123"), o `in` perde a linha; encaixa no mesmo padrão de fragilidade.
8. **`src/lib/carteira-ingest.ts:56,72,145,162`** — ingestão normaliza `cus_cust_id_sel` para bigint no cliente, mas não popula nenhum vínculo com `sellers.id`; toda linha nova nasce órfã até a próxima consulta cross-tabela resolver a ponte por sorte.
9. **`src/components/carteira/KpiDetailPanel.tsx:112,338,342`** — mesmo padrão de `Map` chaveado por `cus_cust_id_sel` do item 2; se o tipo vier serializado como string, `has` e `get` divergem.

---

## Próximo passo

Nenhuma mudança será feita agora. Depois da sua aprovação eu executo em duas etapas separadas (com sua revisão entre elas):

1. Migração SQL de (a): colunas geradas, `seller_id` populado por trigger, view `v_seller_bridge`, extensão dos triggers de sync, backfill.
2. Refactor de código dos itens listados em (b) para consumir a view / normalizar chaves.
