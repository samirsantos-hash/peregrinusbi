# Descritivo dos gráficos — base para melhorias de cor e contraste

Levantamento somente-leitura (10/09/2026). Nenhum valor de dado ou cálculo foi alterado.
Objetivo: servir de mapa para a próxima rodada de ajuste visual (cor, contraste, legibilidade).

---

## 1. Panorama

- 37 componentes usam Recharts, distribuídos em 9 tipos: área, barra, linha, composto, pizza, radar, dispersão, radial e sparkline SVG manual.
- A paleta de séries vive em `src/index.css` (`--chart-1..5`, `--brand-*`, `--crit/--warn/--ok`, `--price-*`) e é espelhada em `tailwind.config.ts`.
- Cores mais usadas nos gráficos: `--muted-foreground` (129 usos, eixos e legendas), `--border` (88, grades), `--brand-blue` (21), `--primary` (16), `--warning` (8).

## 2. Inventário por família

### 2.1 Performance diária e temporal
| Componente | Tipo | Cores | Observações de contraste |
|---|---|---|---|
| `CppDailyChart` | Área + linhas MM7/Ads | `--primary`, `--chart-3`, `--chart-5`, `--destructive` | Grade com `strokeOpacity 0.3`; ticks de 10px em `--muted-foreground`; linha MM7 com `opacity 0.6` cai abaixo do mínimo legível |
| `Daily7DPanel` | Composto + linha | tokens | Legenda de 10px, densa |
| `DailyPerformanceChart`, `QuarterlyPerformanceChart`, `GmvMesVsMes` | Composto | tokens | OK |
| `QualityIndexTrend` | Linha + meta | `--brand-blue`, `--muted-foreground` | Linha de meta tracejada quase invisível sobre grade tracejada |
| `GraficoReputacao`, `ProjecaoPanel`, `PockEvolucaoCard` | Linha/composto | tokens | OK |

### 2.2 Comparação e benchmark
`CategoryBenchmarkPanel` (barra + radar), `CppCategoryChart`, `CppVerticalAnalysis`, `CppVerticalTab`, `CppSellerDetail`, `CppCdpSellerBreakdown`, `CppRoasChart`, `GrowthPotentialPanel`, `CompetitivenessPanel`.
Duas séries (loja vs. vertical) normalmente em azul e cinza — a diferença some em impressão e para daltônicos deuteranopes. Radar usa preenchimento translúcido sobre card escuro, reduzindo o contorno.

### 2.3 Dispersão e matrizes
`MultidimensionalBubbleChart`, `ElasticityAdsChart`, `PairplotMatrix`, `PriceCompetitivenessChart`.
Bolhas com opacidade baixa sobre fundo escuro; escala divergente de preço (`--price-hot/neutral/cool`) é o único ponto onde vermelho/azul carregam significado — precisa de rótulo redundante.

### 2.4 Logística, qualidade e Pock
`LogisticsPanel` (área empilhada + pizza), `QualityRadarPanel`, `QualityIndexPanel`, `GaugeChart`, `PockGauge`, `PockAdesaoFull`, `PockMecanismosDesconto` (barras + sparkline SVG), `ClipsAudiencePanel` (rosca).
Pizzas/roscas com 5+ fatias esgotam a paleta de 5 séries e passam a repetir tons.

### 2.5 Publicidade e carteira
`PublicidadePanel`, `AcosTacosChart`, `AdsGranularidadePanel`, `KpiCard`, `KpiDetailPanel`, `Carteira`, `GestaoCarteira`, `Multilojas`.

## 3. Problema principal: cores fixas fora do sistema

Arquivos com hexadecimais cravados no código (não trocam de tema, não seguem a marca):

| Arquivo | Ocorrências |
|---|---|
| `pages/Carteira.tsx` | 23 |
| `pages/GestaoCarteira.tsx` | 21 |
| `components/seller/PublicidadePanel.tsx` | 17 |
| `components/dashboard/ReputationPanel.tsx` | 16 |
| `components/seller/AdsGranularidadePanel.tsx` | 9 |
| `components/carteira/KpiDetailPanel.tsx` | 8 |
| `components/dashboard/CppVerticalTab.tsx` | 6 |
| `components/carteira/KpiCard.tsx` | 4 |
| `CompetitivenessPanel`, `CppCategoryChart` | 2 cada |

Casos críticos: `PublicidadePanel` desenha grade, eixos e tooltip em `#1e293b`/`#94a3b8`/`#0f172a` — no tema claro o gráfico fica ilegível (texto cinza-claro sobre branco). `KpiDetailPanel` e `Carteira` misturam verde `#16A34A`, laranja `#F97316` e vermelhos `#7F1D1D`/`#DC2626` que não existem na paleta.

## 4. Contraste medido (WCAG, sobre o card)

Tema escuro (card `222 47% 8%`):

| Token | Razão | Situação |
|---|---|---|
| `--chart-4` (âmbar) | 10,2:1 | ótimo |
| `--warn-soft` | 9,8:1 | ótimo |
| `--chart-3` (verde) | 7,6:1 | ótimo |
| `--brand-blue` | 6,3:1 | bom |
| `--primary` | 5,4:1 | bom |
| `--muted-foreground` | 5,3:1 | bom (mas em 10px fica limítrofe) |
| `--chart-5` (vermelho) | 5,0:1 | bom |
| `--brand-navy` | 4,2:1 | **abaixo de 4,5** |
| `--border` (grade) | 1,3:1 | invisível quando somado a `strokeOpacity 0.3` |

Tema claro (card branco):

| Token | Razão | Situação |
|---|---|---|
| `--chart-2` | 14,6:1 | ótimo |
| `--chart-1` | 5,0:1 | bom |
| `--chart-5` | 4,9:1 | bom |
| `--ok` | 3,8:1 | **abaixo de 4,5** |
| `--chart-3` | 3,3:1 | **abaixo de 4,5** |
| `--warn-soft` | 3,2:1 | **abaixo de 4,5** |
| `--chart-4` | 3,2:1 | **abaixo de 4,5** |

Ou seja: a paleta foi calibrada para o escuro; no claro, verde, âmbar e o tom suave de alerta perdem legibilidade em texto e traços finos.

## 5. Outros pontos recorrentes

1. Tipografia de gráfico em 10px (ticks) e 10–11px (legendas) em quase todos os painéis — pequena para o contraste do tema escuro.
2. Grades sempre `strokeDasharray="3 3"` + `--border` + opacidade extra: somem no escuro e competem com linhas tracejadas de meta/MM7 no claro.
3. Séries secundárias usam `opacity 0.6` em vez de uma cor mais fraca do token — reduz contraste real de forma não controlada.
4. Estilo de tooltip é reescrito manualmente em cada arquivo (`contentStyle`), com variações de fundo, borda e tamanho.
5. Sem redundância não-cromática: séries só se distinguem por cor, sem tracejado, marcador ou rótulo direto.
6. Sequências com mais de 5 categorias reciclam a paleta de 5 séries.

## 6. Recomendações priorizadas

**P1 — Corrigir o que quebra**
- Substituir os ~108 hexadecimais por tokens, começando por `PublicidadePanel`, `ReputationPanel`, `Carteira` e `GestaoCarteira`.
- Elevar `--brand-navy` no escuro e `--chart-3`, `--chart-4`, `--ok`, `--warn-soft` no claro até ≥4,5:1.

**P2 — Padronizar**
- Um único componente de tooltip e um preset de eixos/grade compartilhados por todos os gráficos.
- Ticks para 11px; grade com token dedicado (`--chart-grid`) em vez de `--border` + opacidade.

**P3 — Legibilidade e acessibilidade**
- Ampliar a paleta de séries para 8 tons distinguíveis em daltonismo.
- Diferenciar séries também por traço (contínuo/tracejado) e marcador.
- Nas escalas de preço e semáforo, sempre acompanhar a cor de rótulo textual.

## 7. Como validar
- Comparar cada painel nos dois temas antes/depois.
- Conferir razão de contraste dos tokens alterados.
- Verificar que nenhum valor numérico ou regra de cálculo mudou nos painéis tocados.
