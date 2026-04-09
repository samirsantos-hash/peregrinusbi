

# Plano: Métricas Diarizadas e Ajuste Visual para Analista E-commerce

## Contexto

O dashboard atual possui duas fontes de dados (mensal `sellers_kpi` e diária `sellers_kpi_daily`), mas a maioria dos painéis ignora a granularidade e plota dados diários como se fossem mensais, sem adaptação visual. Além disso, vários painéis apresentam inconsistências visuais que não seguem a lógica esperada por um analista de e-commerce.

## Problemas Identificados

1. **Faturamento diário não plotado corretamente em todas as abas** -- O `DailyPerformanceChart` já funciona na aba Faturamento, mas os gráficos de Resumo (EfficiencyPanel), Reputação, Competitividade, Clips e Crescimento não adaptam sua visualização para dados diários.

2. **ROAS calculado como média simples no EfficiencyPanel** -- Na linha 131, `ROAS: Math.round((d.roas / d.count) * 100) / 100` usa média aritmética simples em vez de média ponderada (TGMV_PADS / INV_PADS).

3. **Gráficos de Ads no EfficiencyPanel** -- Plotam `Faturamento Bruto` vs `Investimento em Marketing` por data sem adaptação de eixo ou label para granularidade diária vs consolidada.

4. **LogisticsPanel** -- Usa apenas `latestByProduct` (último registro), ignorando a série temporal. Não mostra evolução do mix logístico ao longo do tempo.

5. **GranularityToggle desativado** -- O componente existe mas está comentado no Index.tsx ("desativado para v2.0"), tornando a seleção de granularidade dependente apenas do período.

6. **Formatação de datas nos eixos X** -- Alguns gráficos usam `formatChartDate` corretamente, mas outros formatam manualmente sem considerar a granularidade.

7. **TrendAnalysisPanel** -- Tem seu próprio `PeriodSelector` interno (7D/15D/30D/Tudo) que conflita com o seletor global do DashboardHeader.

## Plano de Implementação

### Etapa 1: Normalizar propagação de granularidade

- Garantir que `dataGranularity` seja passado para TODOS os painéis que recebem KPIs no `Index.tsx`
- Painéis afetados: `LogisticsPanel`, `CompetitivenessPanel` (já recebe), `ClipsAudiencePanel` (já recebe), `QualityIndexPanel`

### Etapa 2: Adaptar gráficos de Ads/ROAS no EfficiencyPanel

- Corrigir cálculo de ROAS por data para usar média ponderada: `sum(tgmvPads) / sum(invPads)` ao invés de média simples
- Adaptar labels dos eixos X usando `formatChartDate(date, dataGranularity)`
- Adicionar MM7 (média móvel 7 dias) para ROAS quando `dataGranularity === "daily"` e série > 14 pontos

### Etapa 3: Adicionar gráfico de evolução diária no LogisticsPanel

- Quando `dataGranularity === "daily"`, mostrar um `AreaChart` com a evolução temporal de `pctFull`, `pctFlex`, `pctPostagem`
- Manter o PieChart atual como visão resumo, adicionando a série temporal abaixo

### Etapa 4: Ajustar TrendAnalysisPanel

- Remover o `PeriodSelector` interno redundante -- o painel deve respeitar o filtro global
- Manter apenas o toggle `day`/`week` para agrupamento interno quando em modo diário

### Etapa 5: Adaptar CompetitivenessPanel para dados diários

- Gráficos de evolução de preço (`visits_expensive`, `visits_match`, `visits_cheaper`) devem usar `formatChartDate` com granularidade
- Filtrar pontos onde `visits === 0` para evitar quedas artificiais (consistente com regra de integridade existente)

### Etapa 6: Adaptar ClipsAudiencePanel

- Gráfico de evolução de métricas de Clips deve usar `formatChartDate` com granularidade
- Quando diário, adicionar MM7 para `visitas_clips` e `tgmv_lc_clips`

### Etapa 7: Adaptar ReputationPanel

- Gráfico de evolução de taxas (claims, delayed, cancellations) já usa `formatChartDate` com granularidade
- Verificar e garantir que o eixo Y tem escala adequada (0-100% para taxas percentuais)

### Etapa 8: Limpeza de inconsistências visuais

- Padronizar todos os tooltips para exibir data completa (DD/MM/YYYY) em modo diário
- Garantir que todos os gráficos usem `fmtBRL`/`fmtBRLCompact` do `utils/formatters.ts` (EfficiencyPanel e ClipsAudiencePanel têm formatadores locais duplicados)
- Remover formatadores `fmtBRL`/`fmtBRLCompact` duplicados locais no `ExecutivePanel` (linhas 74-86) e `ClipsAudiencePanel` (linhas 31-36)

## Detalhes Técnicos

```text
Index.tsx
  └─ displayKpis (daily ou monthly conforme período)
     ├─ ExecutivePanel ✅ (já adapta: DailyPerformanceChart vs QuarterlyPerformanceChart)
     ├─ EfficiencyPanel ⚠️ (gráficos não adaptam formato de data, ROAS simples)
     ├─ CompetitivenessPanel ⚠️ (formatChartDate parcial)
     ├─ LogisticsPanel ❌ (sem série temporal)
     ├─ QualityIndexPanel ⚠️ (verificar)
     ├─ ClipsAudiencePanel ⚠️ (formatadores duplicados)
     ├─ ReputationPanel ✅ (já usa formatChartDate + granularity)
     └─ TrendAnalysisPanel ⚠️ (PeriodSelector redundante)
```

## Estimativa

- 8 arquivos a serem modificados
- Nenhuma alteração de banco de dados necessária
- Nenhuma nova dependência

