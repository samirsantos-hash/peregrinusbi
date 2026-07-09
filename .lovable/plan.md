## F2 — Guard de mês parcial via pro-rata (3 arquivos)

Escopo: apenas `Daily7DPanel.tsx`, `TrendAnalysisPanel.tsx` e `Index.tsx`. Nenhum outro card, hook ou tabela. Sem publicar.

Regra comum: quando o período/ponto termina no mês corrente e o mês está incompleto, projeta métricas **aditivas** (GMV, Ads, Visitas, TSI, TGMV_PADS) via:

```
valor_projetado = valor_acumulado * ( daysInMonth(fim) / dias_com_dados )
```

`dias_com_dados` = nº de datas distintas com registro em `sellers_kpi_daily` dentro daquele mês (não “dias corridos até hoje”).
ROAS é recalculado a partir dos totais projetados (`pads_proj / ads_proj`), nunca escalado direto.
Meses completos (`fator = 1`) passam intocados.

---

### 1) `src/components/dashboard/Daily7DPanel.tsx`

- Novo helper local `proRataFactor(fimISO, diasComDadosNoMes)`:
  - Se `fim` NÃO pertence ao mês corrente → `1` (histórico não é projetado).
  - Se `diasComDados >= getDaysInMonth(fim)` → `1`.
  - Caso contrário → `getDaysInMonth(fim) / diasComDados`.
- `dias_com_dados` = contagem de entradas em `sorted` cuja `date` cai no mesmo `yyyy-MM` do `fim` do período.
- Para cada período computado, calcular `totaisProjetados` a partir de `totais`:
  - `gmv, ads, visits, tsi, tgmvPads` multiplicados pelo fator.
  - `roas = tgmvPads_proj > 0 && ads_proj > 0 ? tgmvPads_proj / ads_proj : 0`.
- MoM (`deltaPct`) e valores exibidos nos KPI cards passam a usar `totaisProjetados`.
- Chart (`chartData` diário) **não muda** — segue mostrando o dia real.
- Novo badge `proj.` (pequeno, `text-[9px] text-muted-foreground/80`) ao lado do valor principal do KPI card quando `factor > 1`; tooltip do card mostra `"Projeção pro-rata: X d de Y d"`.

### 2) `src/components/dashboard/TrendAnalysisPanel.tsx`

- Nova prop opcional `allKpisDaily?: Array<{ date: string }>` (não obrigatória → fallback = comportamento atual).
- Import de `getDaysInMonth`, `parseISO` de `date-fns` e `detectPartialMonths` de `@/utils/partialPeriodGuard`.
- Só age quando `dataGranularity === "consolidated"` e há pelo menos 2 pontos em `filteredData`. Em modo diário, nada muda.
- Detecta último ponto parcial via `detectPartialMonths(filteredData, { gmvField: "gmv" })`; se `info.get(lastMonthKey)?.isPartial === true`, calcula:
  - `diasNoMes = getDaysInMonth(parseISO(lastPoint.date))`
  - `diasComDados` = distinct dates em `allKpisDaily` no mesmo `yyyy-MM` (fallback `1` se `allKpisDaily` não vier).
  - `factor = diasComDados > 0 && diasComDados < diasNoMes ? diasNoMes / diasComDados : 1`.
- Cria `filteredDataAdjusted` = cópia de `filteredData` com o **último ponto** tendo `gmv/ads/tgmvAds` multiplicados por `factor` (ROAS recomputado como `tgmvAds_proj/ads_proj`, com `count` preservado).
- `insights` (`totalGmv`, `totalAds`, `avgRoas`, `gmvDelta`, `adsDelta`, `efficiency`, `correlation`) passam a usar `filteredDataAdjusted`.
- `chartData` continua vindo do `filteredData` original — barras/linhas não mudam visualmente.
- Adicionar badge sutil `"Último mês projetado (pro-rata)"` no header do card de Insights quando `factor > 1`.

### 3) `src/pages/Index.tsx`

- Um único ponto de mudança: linha 468.

```diff
- <TrendAnalysisPanel kpis={displayKpis} dataGranularity={granularity} />
+ <TrendAnalysisPanel
+   kpis={displayKpis}
+   dataGranularity={granularity}
+   allKpisDaily={allKpisDaily}
+ />
```

Nenhuma outra alteração em `Index.tsx`. `allKpisDaily` já existe (linha 209) e já é sempre carregado (`useSellerDailyKpis(..., true)` na 177).

---

### Impacto esperado (jun R$280,7M em 30d, jul R$42,2M em ~6d de dados)

- `daysInMonth(jul) = 31`, `dias_com_dados = 6` → `factor ≈ 5,17`.
- GMV projetado jul ≈ `42,2 * 5,17 ≈ 218,0M` (ainda abaixo de jun cheio, mas consistente com o dataset diário).
- MoM em `Daily7DPanel` e em `TrendAnalysisPanel.gmvDelta`: passa de ~−85% para algo na faixa de −20% a −25% dependendo do seller, alinhado com o `useCrescimentoMensal`.
- Nenhuma alteração em `ExecutivePanel`, `QuarterlyPerformanceChart`, `useCrescimentoMensal` ou hooks.

### O que não faço nesta rodada

- Não escalo ROAS diretamente (recalculo a partir de pads/ads projetados).
- Não altero `chartData` (visual) — só `insights`/KPI cards e delta MoM.
- Não mexo em nenhum card fora dos 2 painéis + o wire-up no `Index`.
- Não publico; devolvo controle para review antes de aplicar o patch.
