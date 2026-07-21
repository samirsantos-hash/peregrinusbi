
# Plano — Aba "Carteira" (Gestão de Carteira)

Mudança **aditiva e não-destrutiva**. Nada do pipeline atual (`sellers_kpi`, `sellers_kpi_daily`, `seller_listings_quality`, `seller_eligibility`, `live_listings`, `meli_campaigns`, Diagnóstico, Dashboard) é alterado. Não roda Publish. Aguardo aprovação antes de codar.

## 1. Navegação

- **Novo botão "Carteira"** no header do `Index.tsx`, ao lado de "Análise MLB" (grupo visual "Painel Análise / Gestão de Carteira"). Rota nova `/carteira`.
- Sem mexer no botão "Carteira GM" já existente em `ProjecaoCrescimento.tsx` nem em `/gestao-carteira`.
- Registrar rota em `src/App.tsx` protegida por `ProtectedRoute`.

## 2. Modelo de dados (novas tabelas, não colidem com as atuais)

Prefixo `cart_` para deixar claro que são exclusivas desta aba. RLS igual às demais tabelas (admin/gerente escrevem via edge; leitura autenticada).

| Tabela | Origem CSV | Grão | Campos-chave |
|---|---|---|---|
| `cart_cpp_diarizado` | SFTP_ECOMCONSULT_CPP_DIARIZADO | dia × seller | data, cust_id, nickname, gmv, f_gmv, tsi, f_tsi, visitas, total_livelistings, sub_cluster_seller, nivel_solucion, localidade |
| `cart_cpp_mensal` | SFTP_ECOMCONSULT_CPP_MENSAL | mês × seller | tim_month_id, cust_id, visitas, tsi, tgmv_lc, inv_pads, tgmv_lc_pads, tsi_pads, sellers_invest_pads, tgmv_lc_full/flex/fbm, rep_current_level, rep_claims_rate, rep_disputes_rate, score_final_full, score_final_bbf, bpc |
| `cart_cdp_diarizado` / `cart_cdp_mensal` | CDP_DIARIZADO/MENSAL | dia/mês × seller | cp_investments_lc, cp_investiments_seller_lc, total_rebates_lc, total_investiments_lc |
| `cart_livelistings` | CPP_LIVELISTINGS | mês × item | tim_month_id, cust_id, item_id, item_name, dom_domain_agg1/2/3, vertical, categoria, itens, cus_state, sub_cluster_seller |
| `cart_elegibilidade` | ELEGIBILIDADE | item × campanha | item_id, cust_id, campaign_id, campaign_type, discount_seller_percentage, discount_total, discount_best, flag_item_s_optin, flag_seller_s_optin, flag_best_promo, pedidos_7d, media_tsi_diario_7d, acao_recomendada, data_atualizacao |
| `cart_base_vendedores` | CPP_BASE_VENDEDORES | seller | cust_id, nickname, nivel_solucion, fecha_in, fecha_out, cus_state |

Todas com: `id uuid pk`, `uploaded_at`, `source_file`, `created_at`, `updated_at`. Índices em `cust_id`, `tim_month_id`/`data`, `item_id`.

Migration única com CREATE TABLE + GRANT (authenticated SELECT; service_role ALL) + ENABLE RLS + policy de leitura autenticada + policy de escrita `service_role`.

## 3. Ingestão (7 CSVs SFTP reais)

Nova Edge Function **`import-carteira`** (roteador único), consumida pelo `BatchUploadPanel` num modo "Carteira". A ingestão atual do Dashboard não muda.

Regras obrigatórias no parser:
- separador `;` fixo, com autodetecção fallback;
- strip BOM (`\uFEFF`) do primeiro header;
- `CUS_CUST_ID_SEL`: normaliza inteiro/`"...,0"`/`"...0"`/`.0` → bigint;
- booleanos `True/False` string → boolean;
- decimais `pt-BR` (vírgula) → float;
- datas: `YYYY-MM-DD`, `YYYYMMDD` (DATE_ID), `YYYYMM` (TIM_MONTH_ID), timestamp com microssegundos;
- vazio → NULL;
- headers case-insensitive;
- **roteamento por coluna `SUFIXO`** (CDP_DIARIZADO, CDP_MENSAL, CPP_DIARIZADO, CPP_MENSAL, CPP_LIVELISTINGS, ELEGIBILIDADE, CPP_BASE_VENDEDORES) — se o SUFIXO não bater com o slot escolhido, rejeita com mensagem clara;
- fatiamento em lotes ≤3000 linhas (mesma tática do elegibilidade) para arquivos grandes;
- registra em `upload_logs` (usa a tabela existente, tipo `carteira_<sufixo>`, linhas ok/rejeitadas + motivo).

Reaproveita helpers de `src/lib/csv.ts` e `BatchUploadPanel` já suporta ZIP/progresso — só adiciona a "família Carteira" com 7 slots.

## 4. Componentes de UI

Página nova `src/pages/Carteira.tsx` + subpasta `src/components/carteira/analises/` com um componente por seção:

```text
Carteira.tsx           → header, KPI cluster global, sticky tabs, footer metodológico
analises/
  01_Panorama.tsx
  02_RitmoDiario.tsx
  03_CurvaAEstado.tsx
  04_CategoriasRegiao.tsx
  05_TicketUF.tsx
  06_TracionadoresDetratores.tsx
  07_TrafegoConversao.tsx
  08_Pads.tsx
  09_AnaliseEstatistica.tsx
  10_Grant.tsx
  11_LojaALoja.tsx
```

Design system dedicado (escopo local via classes utilitárias — sem tocar em `index.css`/tokens globais):
- paleta navy `#16233F` / dourado `#C9A227` / aço `#5B7396` / verde `#2E7D5B` / vermelho `#B23A48`;
- fontes: Saira Condensed (títulos), Inter (corpo), IBM Plex Mono (números) via `<link>` em `index.html`;
- cards brancos com filete dourado 4px topo;
- KPI cluster navy com números em mono.

Hooks novos em `src/hooks/carteira/`:
- `useCarteiraFilters` (período, UF, curva, loja oficial desabilitado);
- `useCarteiraKpis`, `useCarteiraDaily`, `useCarteiraCurvaA`, `useCarteiraCategorias`, `useCarteiraTicketUF`, `useCarteiraDelta`, `useCarteiraTrafego`, `useCarteiraPads`, `useCarteiraStats`, `useCarteiraGrant`, `useCarteiraLojas`.

Utils: `src/lib/carteira/stats.ts` (mediana, Q1/Q3, IQR, σ, CV, skewness, ABC 80/95/100, regressão linear + R², MM3).

## 5. Regras estatísticas globais

- Tendência central = **mediana** (dourada tracejada); variação = **IQR Q1–Q3** (banda dourada).
- Bloco "Leitura estatística" navy no topo de cada aba: N, média, mediana, σ, CV, assimetria + frase.
- Bloco de "leitura de negócio" dourado abaixo de cada gráfico.

## 6. Conteúdo por aba (11 seções)

Implementado exatamente conforme spec do prompt (Panorama, Ritmo diário, Curva A por estado, Categorias por região, Ticket por UF, Tracionadores/Detratores, Tráfego & conversão, PADS, Análise estatística, Grant/Renovação, Loja a loja). Detalhes-chave:

- **PADS**: sempre nome "PADS", jamais expõe `CAMPAIGN_ID`/`CAMPAIGN_ID_BEST` (fica só no back). Colunas separadas Co-fin ML × Rebate total. **Sem ROI por campanha.**
- **Curva A**: ABC por GMV (80/95/100) sobre `cart_livelistings` × UF (`CUS_STATE`).
- **Grant**: derivado de `cart_base_vendedores.fecha_out - hoje`. Grupo A/B/C derivado por ABC de GMV (badge com nota "derivado"). Engajamento = ND.
- **Ticket**: GMV÷TSI (loja), nunca item.
- **Ficha loja** ao clicar em Loja a loja: painel navy inline com KPIs, Δ período, gráfico daily com mediana da própria loja e IQR, top 3 categorias, top 3 produtos.
- Filtro **Loja Oficial** (Chevrolet × ACDelco) implementado porém **oculto/desabilitado** (não há coluna). Buybox/psj/engajamento/ticket item = **ND**.

## 7. Confidencialidade & rodapé

- Nenhum `CAMPAIGN_ID*` em UI/tooltip/export.
- Rodapé fixo com nota metodológica (forecast, mediana/IQR, ABC, conversão, co-financiamento).

## 8. Entregas (ordem)

1. Migration `cart_*` + policies + índices.
2. Edge Function `import-carteira` + roteamento SUFIXO.
3. Extensão do `BatchUploadPanel` com modo "Carteira" (7 slots) — sem alterar o modo atual.
4. Página `/carteira` com header, tabs sticky, KPI cluster, footer.
5. 11 componentes de análise + hooks + utils estatísticos.
6. Botão "Carteira" no header do `Index.tsx`.

## 9. Fora do escopo (explícito)

- Não altero `sellers_kpi*`, `seller_*`, `live_listings`, `meli_campaigns`, `useSellerData`, Diagnóstico, CPP Dashboard, GestaoCarteira.tsx, AnaliseMLB.tsx.
- Não rodo `Publish`.
- Não invento colunas ausentes (official_store, buybox, psj, engajamento, ticket item, part_number ficam ND ou ocultos).

---

Aprova este plano para eu implementar (começando pela migration + edge function)?
