# Auditoria visual — Peregrinus

Data: 2026-09-09  
Escopo principal: `src/components/dashboard`, `src/components/seller`, `src/pages`  
Escopo auxiliar: hooks e utilitários que transformam dados para os gráficos  
Método: inspeção estática, somente leitura; este relatório é a única criação de arquivo autorizada.

## Resumo executivo

- Nenhum uso de `scale="log"` foi localizado em `src`. Os gráficos entre lojas, regiões ou categorias usam escala linear, com uma exceção manual em `Multilojas.tsx`: o código transforma GMV com `Math.log10(Math.max(1, gmv))`, mas não informa quantos valores não positivos foram omitidos ou comprimidos.
- Os dois radares não contêm `SCORE_FINAL_FULL`, `PONTUACAO_SOW` ou `PONTUACAO_HI` como eixos. O radar de qualidade usa nove atributos de anúncio/Clips; o radar de benchmark usa ROAS, inverso de ACOS, inverso de TACOS e investimento.
- O radar de benchmark contém redundância conceitual certa: ROAS e ACOS são inversos quando usam os mesmos totais. Não foi possível calcular `r` par a par sem a base observacional usada na tela.
- `MultidimensionalBubbleChart.tsx` envia o valor bruto ao `ZAxis`, com `range={[50, 400]}`. O código da aplicação não aplica raiz quadrada. A semântica final de raio versus área fica delegada ao Recharts e não é demonstrável apenas por este arquivo.
- Foram localizados vários eixos Y duplos. Quase todos usam domínio automático; as exceções explícitas são os eixos percentuais de Pareto (`[0, 1]` ou `[0, 100]`) e os domínios calculados de `DailyPerformanceChart`.
- Há cálculo de ROAS/ACOS/TACOS fora de `ratioStats.ts`. Algumas implementações usam corretamente razão dos totais; outras convertem ausência em zero ou calculam medianas/médias locais, podendo divergir entre telas.
- `partialPeriodGuard.ts` é importado diretamente por apenas três componentes/hooks de visualização. Muitos gráficos temporais não o usam.
- O estado “sem dado” é preservado em alguns componentes, mas é destruído na transformação central de KPI para `inv_pads` e `cdp_tgmv_lc`, que converte `null` em `0`.
- `PairplotMatrix.tsx` está importado, mas não é renderizado por seu único consumidor atual. Portanto, hoje exibe zero pares. Se voltar a ser usado, calcula uma matriz `n × n`, sem `n`, p-valor ou FDR, e contém um erro de pareamento na correlação.

---

## 1. Radares

### 1.1 `QualityRadarPanel.tsx`

Eixos exatos atuais: **Fotos, Título, Descrição, Preço, Frete Grátis, Promoções, Clips Publicados, Vendas via Clip e Pedidos Clips**.

Prova — `src/components/dashboard/QualityRadarPanel.tsx:81-95`:

```tsx
const DIMENSIONS = [
  { key: "pictures", label: "Fotos", group: "tecnico" },
  { key: "title", label: "Título", group: "tecnico" },
  { key: "description", label: "Descrição", group: "tecnico" },
  { key: "price", label: "Preço", group: "comercial" },
  { key: "freeShipping", label: "Frete Grátis", group: "comercial" },
  { key: "promotions", label: "Promoções", group: "comercial" },
  { key: "clipsPubli", label: "Clips Publicados", group: "engajamento" },
  { key: "clipsSI", label: "Vendas via Clip", group: "engajamento" },
  { key: "clipsOrders", label: "Pedidos Clips", group: "engajamento" },
] as const;
```

`SCORE_FINAL_FULL`, `PONTUACAO_SOW` e `PONTUACAO_HI`: **não localizados como eixos neste radar**. `scoreFull` existe na interface, mas não entra em `DIMENSIONS` nem em `scores`.

O componente também transforma ausência em zero antes de desenhar o radar.

Prova — `src/components/dashboard/QualityRadarPanel.tsx:51-65`:

```tsx
function safe(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
const num = Number(value) || 0;
```

Prova — `src/components/dashboard/QualityRadarPanel.tsx:165-178`:

```tsx
const val = scores[d.key] || 0;
// ...
const allVals = data.map((d) => d._value);
const avg = Math.round(allVals.reduce((s, vl) => s + vl, 0) / allVals.length);
```

Impacto: “sem dado” reduz a área e o score médio como se fosse desempenho zero.

Correlação par a par: **não calculável por inspeção estática**. Não há amostra de observações carregada neste passe. Fotos/título/descrição e métricas de Clips podem ser correlacionadas, mas afirmar `r > 0,7` sem dados seria especulação.

### 1.2 `CategoryBenchmarkPanel.tsx`

Eixos exatos atuais: **ROAS, Eficiência (1/ACOS), Saúde (1/TACOS) e Investimento**.

Prova — `src/components/dashboard/CategoryBenchmarkPanel.tsx:90-114`:

```tsx
return [
  { metric: "ROAS", Seller: (sellerMetrics.avgRoas / maxRoas) * 100 },
  {
    metric: "Eficiência (1/ACOS)",
    Seller: maxAcos > 0 ? ((maxAcos - sellerMetrics.avgAcos) / maxAcos) * 100 : 0,
  },
  {
    metric: "Saúde (1/TACOS)",
    Seller: maxTacos > 0 ? ((maxTacos - sellerMetrics.avgTacos) / maxTacos) * 100 : 0,
  },
  { metric: "Investimento", Seller: (sellerMetrics.totalAds / maxInv) * 100 },
];
```

`SCORE_FINAL_FULL`, `PONTUACAO_SOW` e `PONTUACAO_HI`: **não localizados neste radar**.

Redundância comprovável pelo domínio: ROAS e ACOS são transformações inversas da mesma relação quando derivados dos mesmos totais:

- `ROAS = TGMV_LC_PADS / INV_PADS`
- `ACOS = INV_PADS / TGMV_LC_PADS × 100`

Assim, os eixos “ROAS” e “Eficiência (1/ACOS)” repetem essencialmente a mesma dimensão de eficiência. O valor exato de Pearson depende da distribuição e da normalização; **não foi calculado neste passe**.

Há ainda normalização relativa ao maior valor entre seller, vertical e carteira. A geometria muda conforme o grupo comparado.

Prova — `src/components/dashboard/CategoryBenchmarkPanel.tsx:84-88`:

```tsx
const maxRoas = Math.max(sellerMetrics.avgRoas, myVertical.avgRoas, cartRoas, 1);
const maxAcos = Math.max(sellerMetrics.avgAcos, myVertical.avgAcos, cartAcos, 1);
const maxTacos = Math.max(sellerMetrics.avgTacos, myVertical.avgTacos, cartTacos, 1);
const maxInv = Math.max(sellerMetrics.totalAds, myVertical.avgInv, stats?.invMediana ?? 0, 1);
```

Conclusão do item: o problema FULL/SOW/HI descrito no contexto **não está presente nos radares atuais**; há outra redundância no radar de benchmark, entre ROAS e ACOS.

---

## 2. Escalas de GMV e investimento

### 2.1 Resultado global

`scale="log"` ou `scale={'log'}`: **não localizado em `src`**.

Os eixos do Recharts abaixo omitem `scale`, portanto usam escala linear.

### 2.2 Séries temporais de uma loja ou agregado temporal

Nestes casos a escala linear é compatível com a ressalva do contexto, mas valores ausentes frequentemente viram zero:

- `Daily7DPanel.tsx`: eixo linear; domínio monetário `[0, "auto"]`.

  Prova — `src/components/dashboard/Daily7DPanel.tsx:438-444`:

  ```tsx
  <YAxis
    tickFormatter={yFmt}
    domain={cfg.format === "currency" ? [0, "auto"] : ["auto", "auto"]}
  />
  ```

- `QuarterlyPerformanceChart.tsx`: eixo linear, domínio calculado desde zero.

  Prova — `src/components/dashboard/QuarterlyPerformanceChart.tsx:133-142` e `:226-234`:

  ```tsx
  return [0, Math.ceil(maxVal * 1.15) || 100];
  // ...
  <YAxis domain={yDomain} tickFormatter={(v) => fmtNumCompact(v)} />
  ```

- `GmvMesVsMes.tsx`: eixo linear; não declara `scale`.

  Prova — `src/components/charts/GmvMesVsMes.tsx:168-172`:

  ```tsx
  <YAxis
    tickFormatter={modo === "variacao" ? (v: number) => fPct(v) : fShort}
    domain={dominioVariacao}
  />
  ```

- `CppDailyChart.tsx`: eixo linear automático.

  Prova — `src/components/dashboard/CppDailyChart.tsx:104-108`:

  ```tsx
  <YAxis
    tickFormatter={(v) => metric === "gmv" ? fmtCompact(v) : metric === "roas" ? `${v.toFixed(0)}x` : fmtNum(v)}
  />
  ```

- `DailyPerformanceChart.tsx`: faturamento e Ads em eixos lineares independentes, ambos começando em zero.

  Prova — `src/components/dashboard/DailyPerformanceChart.tsx:130-147`:

  ```tsx
  return [0, Math.ceil(maxVal * 1.15) || 100];
  // usado tanto em yDomain quanto em yDomainAds
  ```

### 2.3 Comparações entre portes

Aqui a assimetria de GMV afeta diretamente a leitura:

- `Carteira.tsx`, “Sem grant — lojas a ativar”: GMV agregado por região em barra linear.

  Prova — `src/pages/Carteira.tsx:1008-1017`:

  ```tsx
  <BarChart data={semGrantRegiao}>
    <YAxis tickFormatter={fmtBRLShort} />
    <Bar dataKey="gmv" name="GMV sem grant" fill={GOLD} />
  </BarChart>
  ```

- `Multilojas.tsx`, “População × GMV” e “Consolidação por macrorregião”: GMV linear.

  Prova — `src/pages/Multilojas.tsx:1135-1155`:

  ```tsx
  <YAxis type="number" dataKey="gmv" name="GMV" tickFormatter={(v) => fShort(v)} />
  <Scatter data={ufs} fill={COLORS[0]} />
  // ...
  <YAxis tickFormatter={(v) => fShort(v)} />
  <Bar dataKey="gmv" name="GMV" fill={COLORS[1]} />
  ```

- `Multilojas.tsx`, “Participação por loja”: usa área de pizza para GMV, sem eixo e sem transformação log.

  Prova — `src/pages/Multilojas.tsx:508-513`:

  ```tsx
  <Pie data={porLoja} dataKey="gmv" nameKey="loja" innerRadius={55} outerRadius={90}>
  ```

- `Multilojas.tsx`, “Escala × rentabilidade”: já transforma o eixo X manualmente para log10.

  Prova — `src/pages/Multilojas.tsx:692-701`:

  ```tsx
  <XAxis type="number" dataKey="x" name="log10 GMV" />
  <Scatter data={lojas.map((l) => ({
    x: Math.log10(Math.max(1, l.gmv)),
    y: l.margem,
    z: l.pedidos,
  }))} />
  ```

  Tratamento de não positivos: `Math.max(1, l.gmv)` comprime zero e negativo para `log10(1) = 0`. **Não foi localizado contador visível** de lojas afetadas.

### 2.4 Zero, negativo e contador de omitidos

- Contador visível do tipo “n lojas sem faturamento omitidas”: **não localizado** nos gráficos examinados.
- Exclusão explícita de `<= 0` antes de eixo log: **não localizada**, pois não há `scale="log"`.
- Em vários pipelines, `null` vira zero antes do gráfico; detalhes no item 7.

---

## 3. Tamanho das bolhas

### `MultidimensionalBubbleChart.tsx`

O valor bruto de tamanho vira `z`, limitado inferiormente a 1:

Prova — `src/components/dashboard/MultidimensionalBubbleChart.tsx:130-138`:

```tsx
sizeVal: Number(d[sizeVar.key]) || 0,
z: Math.max(Number(d[sizeVar.key]) || 1, 1),
```

O `ZAxis` usa faixa `[50, 400]`:

Prova — `src/components/dashboard/MultidimensionalBubbleChart.tsx:180`:

```tsx
<ZAxis type="number" dataKey="z" range={[50, 400]} name={sizeVar.label} />
```

Conclusão estrita: o código da aplicação **não calcula `sqrt(valor)`** nem limita explicitamente um raio. Ele delega a conversão de `range` em símbolo ao Recharts.

Raio versus área: **não localizei prova dentro do código do projeto**. Seria necessário auditar a implementação da versão instalada do Recharts ou sua documentação. Portanto, não afirmo a semântica perceptual como fato apenas a partir deste componente.

Uso atual: **não foi localizada nenhuma instância JSX de `<MultidimensionalBubbleChart />` em `src`**. Há apenas a definição e o import não utilizado em `CompetitivenessPanel.tsx:12`. Assim, `xVar`, `yVar`, `colorVar` e `sizeVar` efetivos em runtime também não foram localizados.

Prova — `src/components/dashboard/CompetitivenessPanel.tsx:11-13`:

```tsx
import PairplotMatrix from "./PairplotMatrix";
import MultidimensionalBubbleChart from "./MultidimensionalBubbleChart";
import McKinseyActionPlans from "./McKinseyActionPlans";
```

Outro gráfico de bolhas repete a faixa ampla:

Prova — `src/components/dashboard/ElasticityAdsChart.tsx:220`:

```tsx
<ZAxis type="number" dataKey="salesVolume" range={[100, 600]} />
```

---

## 4. Gráficos com dois eixos Y

### Domínio explícito ou calculado

- `DailyPerformanceChart.tsx:205-222`: faturamento/TSI à esquerda e Ads à direita; domínios `yDomain` e `yDomainAds` calculados em `:130-147`, ambos `[0, máximo × 1,15]`.
- `Carteira.tsx:281-288`: anúncios à esquerda; percentual acumulado à direita com domínio fixo `[0, 100]`.
- `Multilojas.tsx:1033-1037`: GMV à esquerda automático; acumulado à direita fixo `[0, 1]`.

Prova — `src/pages/Multilojas.tsx:1033-1037`:

```tsx
<YAxis yAxisId="l" tickFormatter={(v) => fShort(v)} />
<YAxis yAxisId="r" orientation="right" domain={[0, 1]} />
<Bar yAxisId="l" dataKey="gmv" name="GMV" />
<Line yAxisId="r" dataKey="acum" name="Acumulado" />
```

### Domínio automático

- `EfficiencyPanel.tsx:509-524`: faturamento e investimento; ambos automáticos.
- `TrendAnalysisPanel.tsx:316-363`: GMV/ROAS no eixo esquerdo e Ads no direito; ambos automáticos. O próprio ROAS é ligado ao eixo monetário esquerdo.
- `AdsGranularidadePanel.tsx:169-209`: investimento/GMV Ads à esquerda e ROAS/ACOS/TACOS à direita; ambos automáticos.
- `PockEvolucaoCard.tsx:200-250`: valor à esquerda e variações YOY/MOM à direita; ambos automáticos.
- `CppVerticalTab.tsx:574-619`: seller à esquerda e média da vertical à direita quando a razão de máximos passa de 10×; ambos automáticos.
- `KpiDetailPanel.tsx:323-328`: ativos à esquerda e ticket médio à direita; automáticos.
- `KpiDetailPanel.tsx:553-559`: delta em reais à esquerda e delta percentual à direita; automáticos.
- `ClipsAudiencePanel.tsx:785-790`: visitas à esquerda e faturamento à direita; automáticos.
- `CppCategoryChart.tsx:277-309`: seller e mediana de categoria; segundo eixo condicional, automático.
- `Multilojas.tsx:1362-1368`: ticket/frete à esquerda e devolução à direita; automáticos.

Prova representativa — `src/components/dashboard/EfficiencyPanel.tsx:509-524`:

```tsx
<YAxis yAxisId="gmv" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
<YAxis yAxisId="ads" orientation="right" tickFormatter={...} />
<Area yAxisId="gmv" dataKey="Faturamento Bruto" />
<Area yAxisId="ads" dataKey="Investimento em Marketing" />
```

Prova representativa — `src/components/seller/AdsGranularidadePanel.tsx:169-176`:

```tsx
<YAxis yAxisId="brl" tickFormatter={(v) => fmtBRLCompact(Number(v))} />
<YAxis yAxisId="sec" orientation="right" tickFormatter={...} />
```

### Arquivos citados no contexto

- `CppRoasChart.tsx`: **não usa eixo duplo**. Tem um único `YAxis` (`:55-58`) e plota ROAS real + benchmark.
- `AcosTacosChart.tsx`: **não usa eixo duplo**. Tem um único `YAxis` com domínio explícito `[0, teto]` (`:231-235`).
- `ElasticityAdsChart.tsx`: **não usa eixo duplo**. É dispersão com X = elasticidade, Y = volume de vendas e Z = volume (`:203-220`).

Portanto, a hipótese “eixo duplo em ROAS × GMV” não se confirma nesses três arquivos atuais.

---

## 5. ROAS, ACOS e TACOS calculados fora de `ratioStats.ts`

### 5.1 Transformação central mascara ausência como zero

Prova — `src/hooks/useSellerData.ts:87-100`:

```tsx
const invPads = Number(row.inv_pads) || 0;
const tgmvPads = Number(row.tgmv_lc_pads) || 0;
const roas = invPads > 0 ? tgmvPads / invPads : 0;
const acos = tgmvPads > 0 ? (invPads / tgmvPads) * 100 : 0;
const tacos = tgmv > 0 ? (invPads / tgmv) * 100 : 0;
```

O mesmo padrão aparece em `src/hooks/useSellerDailyData.ts:5-19`.

Risco de divergência: `ratioStats.ts` usa `null` para razão indefinida e exclui sellers sem investimento; estes hooks produzem `0`, permitindo que telas interpretem ausência como pior desempenho real.

### 5.2 Agregação mensal faz média de razões

Prova — `src/utils/aggregateByMonth.ts:28-34`:

```tsx
// Ratio / score fields (averaged)
const avgFields = [
  "roas", "acos", "tacos", "cpa",
  // ...
];
```

Isso diverge da regra canônica de razão dos totais quando há mais de um registro no bucket.

### 5.3 Média de ROAS em série temporal

`TrendAnalysisPanel.tsx` soma os valores de ROAS já calculados por linha e depois divide pela quantidade de registros, em vez de recomputar `Σ TGMV_LC_PADS / Σ INV_PADS`.

Prova — `src/components/dashboard/TrendAnalysisPanel.tsx:100-109`:

```tsx
map[k.date].gmv += k.gmv;
map[k.date].ads += k.adsInvestment;
map[k.date].tgmvAds += k.tgmv;
map[k.date].roas += k.roas;
map[k.date].count++;
```

Prova — `src/components/dashboard/TrendAnalysisPanel.tsx:154-163`:

```tsx
return {
  label: formatChartDate(d.date, dataGranularity),
  gmv: Math.round(d.gmv),
  ads: Math.round(d.ads),
  tgmvAds: Math.round(d.tgmvAds),
  roas: d.count > 0 ? Math.round(d.roas / d.count * 100) / 100 : 0,
};
```

Impacto: quando uma data reúne várias lojas ou linhas com investimentos diferentes, o ROAS desenhado é média simples de razões e pode divergir visivelmente do valor canônico.

### 5.4 Cálculos locais corretos na fórmula, mas com fallback zero

`EfficiencyPanel.tsx` agrega numeradores e denominadores por data e calcula razão dos totais, o que é correto; porém retorna zero quando a razão é indefinida.

Prova — `src/components/dashboard/EfficiencyPanel.tsx:156-173`:

```tsx
ROAS: d.adsInvestment > 0 ? d.tgmvPads / d.adsInvestment : 0,
ACOS: d.tgmvPads > 0 ? (d.adsInvestment / d.tgmvPads) * 100 : 0,
TACOS: d.gmv > 0 ? (d.adsInvestment / d.gmv) * 100 : 0,
// ...
const avgRoas = totalAds > 0 ? totalTgmvPadsForMetrics / totalAds : 0;
```

### 5.5 Mediana local de razões

Prova — `src/components/dashboard/CppVerticalTab.tsx:183-190`:

```tsx
if (sellerMetrics.size < 3) return null;
const roass = arr.filter(a => a.invPads > 0).map(a => a.tgmvPads / a.invPads);
```

Esse cálculo pode ser legítimo como “seller típico”, mas não é o mesmo estimador que ROAS agregado. A interface precisa declarar mediana versus razão dos totais.

### 5.6 Cálculo em páginas

Prova — `src/pages/Index.tsx:325`:

```tsx
const tacos = totalGmv > 0 ? (totalAds / totalGmv) * 100 : 0;
```

Prova — `src/pages/CppDashboard.tsx:212`:

```tsx
const roas = inv > 0 ? tgmvPads / inv : null;
```

`CppDashboard.tsx` preserva `null`; `Index.tsx` devolve zero. Logo, o mesmo estado sem base pode aparecer como “—” numa tela e `0%` em outra.

### 5.7 Derivação em componente seller

Prova — `src/components/seller/AcosTacosChart.tsx:60-68`:

```tsx
const acos = semDado || !Number.isFinite(p.acos) || p.acos <= 0 ? null : p.acos;
const tacos = semDado || !Number.isFinite(p.tacos) || p.tacos <= 0 ? null : p.tacos;
const share = acos && tacos ? (tacos / acos) * 100 : null;
const roas = acos ? 100 / acos : null;
```

Aqui o componente preserva ausência e explicita que ROAS é o inverso do ACOS. Não foi localizada divergência de fórmula neste trecho.

---

## 6. Uso de `partialPeriodGuard.ts`

### Usos localizados

1. `src/components/dashboard/QuarterlyPerformanceChart.tsx:11,101-129`
2. `src/components/dashboard/TrendAnalysisPanel.tsx:13` e uso posterior de `detectPartialMonths`
3. `src/hooks/useCrescimentoMensal.ts:5` e uso posterior de `detectPartialMonths`
4. `src/utils/aggregateByMonth.ts:5` e uso posterior de `detectPartialMonths`

Prova — `src/components/dashboard/QuarterlyPerformanceChart.tsx:101-110`:

```tsx
const partialInfo = useMemo(
  () => detectPartialMonths(aggregated, { gmvField: "gmv", thresholdPct: 0.3 }),
  [aggregated],
);
return { ...r, partial: info?.isPartial ?? false, share: info?.gmvShare ?? 1 };
```

Prova de controle visível — `src/components/dashboard/QuarterlyPerformanceChart.tsx:180-197`:

```tsx
{partialCount > 0 && (
  <button onClick={() => setHidePartial((v) => !v)}>
    {hidePartial ? `Ocultando parciais ...` : `Incluindo parciais ...`}
  </button>
)}
```

### Gráficos temporais sem import direto do guard

Não foi localizado uso de `partialPeriodGuard` em:

- `Daily7DPanel.tsx`
- `DailyPerformanceChart.tsx`
- `GmvMesVsMes.tsx`
- `CppDailyChart.tsx`
- `CppRoasChart.tsx`
- `AcosTacosChart.tsx`
- `AdsGranularidadePanel.tsx`
- `PublicidadePanel.tsx`
- `EfficiencyPanel.tsx`
- `ClipsAudiencePanel.tsx`
- `PockEvolucaoCard.tsx`
- `ProjecaoPanel.tsx`
- `Carteira.tsx`
- `Multilojas.tsx`
- `GestaoCarteira.tsx`

Ressalva: ausência de import direto não prova ausência de toda proteção upstream. `GmvMesVsMes.tsx`, por exemplo, possui diagnóstico próprio de janela e hachura para dias ainda não ocorridos.

Prova — `src/components/charts/GmvMesVsMes.tsx:160-165`:

```tsx
<pattern id="gmvNaoOcorrido" ...>
  <rect ... />
  <line ... />
</pattern>
```

`PriceCompetitivenessChart.tsx` também implementa regra e hachura próprias, sem importar `partialPeriodGuard`.

Conclusão: o tratamento de período parcial não é transversal nem uniforme.

---

## 7. “Sem dado” versus zero

### 7.1 Perda do estado antes da renderização

`inv_pads` e `cdp_tgmv_lc` são convertidos para zero no hook central.

Prova — `src/hooks/useSellerData.ts:87-90,166`:

```tsx
const invPads = Number(row.inv_pads) || 0;
// ...
cdpTgmv: Number(row.cdp_tgmv_lc) || 0,
```

Prova equivalente na base diária — `src/hooks/useSellerDailyData.ts:7-9,80`:

```tsx
const invPads = Number(row.inv_pads) || 0;
const tgmvPads = Number(row.tgmv_lc_pads) || 0;
// ...
cdpTgmv: Number(row.cdp_tgmv_lc) || 0,
```

Depois dessa transformação, o componente não consegue distinguir:

- investimento real igual a zero;
- seller que não participa;
- campo ausente no feed.

### 7.2 BPC preserva `null` no mensal, mas não no diário

Prova — `src/hooks/useSellerData.ts:172`:

```tsx
bpc: row.bpc != null ? Number(row.bpc) : null,
```

Prova — `src/hooks/useSellerDailyData.ts:86`:

```tsx
bpc: null, // BPC only available in monthly data
```

`CompetitivenessPanel` filtra `null`, calcula contagem/cobertura e pode mostrar ausência de concorrentes.

Prova — `src/components/dashboard/CompetitivenessPanel.tsx:132-140`:

```tsx
const bpcValues = src
  .filter(k => k.bpc != null && k.bpc !== undefined)
  .map(k => k.bpc as number);
if (bpcValues.length === 0) return null;
return { median, avg, count: bpcValues.length, total: src.length };
```

Prova visual — `src/components/dashboard/CompetitivenessPanel.tsx:451-468`:

```tsx
{bpcData && semConcorrentes && (
  // ...
  Nenhum concorrente direto identificado...
)}
```

Limitação: quando `bpcData` é `null`, esse bloco não aparece; não foi localizado um estado visual hachurado específico para ausência total de BPC.

### 7.3 Componentes que distinguem ausência

`PockRateBar` apresenta ícone, texto “Sem dado”, traço e cor neutra.

Prova — `src/components/pock/PockRateBar.tsx:17-23,35-48`:

```tsx
const semDado = valor === null || valor === undefined || Number.isNaN(valor);
const cor = semDado ? "hsl(var(--border))" : dentro ? "hsl(var(--ok))" : "hsl(var(--crit))";
// ...
{semDado ? "Sem dado" : dentro ? "Dentro do limite" : "Acima do limite"}
{semDado ? "—" : fmtPct(valor!)}
```

`QualityKpiCards` distingue score Full zero como “sem fulfillment ativo”, mas não distingue ausência de zero real.

Prova — `src/components/dashboard/QualityKpiCards.tsx:102-120`:

```tsx
const hasFullActive = scoreFull > 0;
// ...
noFullMessage: !hasFullActive ? "Seller sem itens no fulfillment ativo" : null,
```

### 7.4 Resultado transversal

Tratamento visual com três estados distintos — valor, “não participa” e “sem dado” hachurado — **não localizado de forma consistente** para `inv_pads`, BPC e `cdp_tgmv_lc`.

---

## 8. `PairplotMatrix.tsx`

### 8.1 Quantos pares são exibidos hoje?

**Zero.** O componente é importado em `CompetitivenessPanel.tsx`, mas não é instanciado no JSX.

Prova — `src/components/dashboard/CompetitivenessPanel.tsx:11`:

```tsx
import PairplotMatrix from "./PairplotMatrix";
```

Da linha `100` ao retorno em `:570`, não há `<PairplotMatrix ... />`. A busca no repositório localizou apenas o import, a definição e o export.

Portanto, a hipótese “13 indicadores geram 78 pares na tela atual” **não se confirma no código atual**.

### 8.2 Comportamento se for reativado

O número de variáveis é dinâmico:

Prova — `src/components/dashboard/PairplotMatrix.tsx:107-110`:

```tsx
const allVars = useMemo(() => [...variables, resultVar], [variables, resultVar]);
const n = allVars.length;
```

O componente monta uma matriz completa `n × n`: diagonal com histogramas, triângulo inferior com dispersões e superior com correlações.

Prova — `src/components/dashboard/PairplotMatrix.tsx:121-149`:

```tsx
for (let row = 0; row < n; row++) {
  for (let col = 0; col < n; col++) {
    if (row === col) { /* histogram */ }
    else if (row > col) { /* scatter */ }
    else { /* correlation */ }
  }
}
```

Com 13 variáveis totais, seriam 78 relações únicas, 78 células duplicadas visualmente como scatter/correlação e 13 histogramas.

### 8.3 Inferência estatística

- `r`: sim, Pearson.
- `n` por célula: não exibido.
- p-valor: **não localizado**.
- q-valor/FDR: **não localizado**.

Prova — `src/components/dashboard/PairplotMatrix.tsx:226-233`:

```tsx
{(cell.corr || 0).toFixed(2)}
<span>Pearson</span>
```

### 8.4 Erro no pareamento de ausentes

Na correlação, X e Y são filtrados separadamente e depois truncados pelo menor comprimento. Isso pode combinar observações de linhas diferentes quando há `null` em posições distintas.

Prova — `src/components/dashboard/PairplotMatrix.tsx:144-149`:

```tsx
const xs = data.map(d => d[allVars[col].key]).filter(v => v != null && isFinite(v));
const ys = data.map(d => d[allVars[row].key]).filter(v => v != null && isFinite(v));
const minLen = Math.min(xs.length, ys.length);
const corr = pearson(xs.slice(0, minLen), ys.slice(0, minLen));
```

O triângulo inferior faz o pareamento corretamente por linha (`:130-133`), então a correlação exibida no triângulo superior pode não corresponder à nuvem de pontos inferior.

### 8.5 Falhas mascaradas em bases vazias ou desalinhadas

Quando não há pares válidos no triângulo inferior, `Math.min(...xs)` e `Math.max(...xs)` recebem arrays vazios e produzem infinitos.

Prova — `src/components/dashboard/PairplotMatrix.tsx:136-141`:

```tsx
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const regLine = [
  { x: minX, y: slope * minX + intercept },
  { x: maxX, y: slope * maxX + intercept },
];
```

Na exibição, `NaN` é convertido visualmente para correlação zero pelo operador `||`.

Prova — `src/components/dashboard/PairplotMatrix.tsx:226-233`:

```tsx
style={{ color: corrColor(cell.corr || 0) }}
>
  {(cell.corr || 0).toFixed(2)}
```

Impacto potencial se o componente for reativado: falha estatística pode aparecer como `0.00`, um valor plausível, em vez de “sem dado”.

---

## Divergências confirmadas em relação ao contexto fornecido

1. **Radares FULL/SOW/HI:** não encontrados nos radares atuais.
2. **Redundância de radar:** encontrada, mas é ROAS versus inverso de ACOS no `CategoryBenchmarkPanel`.
3. **Escala log:** inexistente via propriedade Recharts; há uma transformação manual `log10` em um gráfico de `Multilojas`.
4. **Eixo duplo nos três arquivos citados:** não encontrado em `CppRoasChart`, `AcosTacosChart` ou `ElasticityAdsChart`.
5. **Pairplot de 78 pares:** não está renderizado hoje; o componente permanece no código e teria esse crescimento quadrático se chamado com 13 variáveis.
6. **Estado sem dado:** há componentes que o preservam, porém o pipeline central destrói a distinção para Ads/CDP.
7. **Período parcial:** proteção existente, mas aplicada de forma fragmentada.
8. **Média de ROAS:** `TrendAnalysisPanel.tsx` calcula média simples de razões e pode divergir da razão dos totais.

## Itens que exigem dado externo ou inspeção adicional

- Correlação empírica par a par dos eixos dos radares por vertical: **não calculada**, pois este passe não consultou a base SFTP/Supabase.
- Semântica interna de `ZAxis.range` como raio ou área na versão instalada do Recharts: **não comprovada pelo código da aplicação**.
- Cobertura em runtime de caminhos condicionais: **não testada**; auditoria estática.

