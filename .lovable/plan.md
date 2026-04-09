

# Plano: Gráfico de Vendas Diarizadas no CPP

## Situação Atual

O dashboard CPP ja possui dados diarios brutos (rawRows) com granularidade por dia (`TIM_DAY`/`DATA`). A funcao `getDailyGmv()` em `cppAggregation.ts` ja extrai a serie temporal diaria de GMV por seller. Porem, nenhum grafico de linha dia-a-dia e renderizado -- o `CppSellerDetail` mostra apenas:
- KPI cards consolidados
- Heatmap por dia da semana (DOW)
- Tabela de categorias

Falta o grafico principal que um analista espera: **evolucao diaria de vendas (GMV), unidades (TSI), investimento (Ads) e ROAS**.

## O Que Sera Feito

### 1. Expandir `getDailyGmv` para serie completa multi-metrica

Renomear/expandir a funcao existente `getDailyGmv` em `cppAggregation.ts` para retornar tambem TSI, INV_PADS, TGMV_PADS, VISITAS por dia, alem de calcular ROAS diario e MM7 (media movel 7 dias) para GMV e ROAS.

**Arquivo:** `src/utils/cppAggregation.ts`

### 2. Criar componente `CppDailyChart`

Novo componente com AreaChart (Recharts) mostrando:
- Eixo X: datas dia-a-dia (DD/MM)
- Serie primaria: GMV diario (area com gradiente)
- Serie secundaria: Investimento Ads (linha)
- Linha tracejada: MM7 do GMV
- Tooltip com todas as metricas do dia (GMV, TSI, Visitas, ROAS, Ads)
- Toggle para alternar entre GMV, TSI e ROAS como metrica principal

**Arquivo novo:** `src/components/dashboard/CppDailyChart.tsx`

### 3. Inserir o grafico no `CppSellerDetail`

Posicionar o grafico diario entre os KPI cards e o heatmap DOW, que e a posicao natural para analise de tendencia antes do agrupamento por dia da semana.

**Arquivo:** `src/components/dashboard/CppSellerDetail.tsx`

### 4. Adicionar serie diaria no dashboard principal (portfolio)

No nivel de portfolio (visao geral sem seller selecionado), plotar a evolucao diaria agregada de todos os sellers filtrados, usando o mesmo componente `CppDailyChart`.

**Arquivo:** `src/pages/CppDashboard.tsx`

## Detalhes Tecnicos

```text
cppAggregation.ts
  └─ getDailySeries(rows, sellerId|null, start, end)
       → [{ date, gmv, tsi, invPads, tgmvPads, visitas, roas, gmvMM7, roasMM7 }]

CppDailyChart.tsx (novo)
  └─ Props: { data: DailySeriesPoint[], metrica: "gmv"|"tsi"|"roas" }
  └─ AreaChart + Line (MM7) + Tooltip multi-metrica

CppSellerDetail.tsx
  └─ KPI Cards → [CppDailyChart] → DOW Heatmap → middleContent

CppDashboard.tsx
  └─ Portfolio view: [CppDailyChart] abaixo dos KPI cards gerais
```

## Estimativa

- 1 arquivo novo, 3 arquivos modificados
- Sem alteracoes de banco de dados
- Sem novas dependencias

