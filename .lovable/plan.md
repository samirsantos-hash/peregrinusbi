# Projeção de Crescimento e Tendência

Novo módulo no menu lateral (rota `/projecao-crescimento`, ícone `TrendingUp`) que responde 3 perguntas ao GM: para onde a carteira vai, por quê, e se o crescimento é sustentável. Tudo baseado em `cpp_mensal` agregado por `mes_ref`, reaproveitando filtros, alertas, drawer e tokens visuais já existentes.

## Observação importante sobre os dados

A tabela `cpp_mensal` **não possui** as colunas `tgmv_orders` nem `mes_ref` confiável em todos os registros — vou usar:
- **Pedidos** = `tsi` (TSI já é Total Sold Items, proxy de pedidos no projeto)
- **AOV** = `tgmv_lc / tsi` (consistente com o resto do app)
- **Mês** = `mes_ref` quando existir, senão derivado de `tim_month_id` via `monthKeyFromTimMonthId()`

## Entregas (PRs pequenos)

### 1. Views SQL (migration)
- `vw_crescimento_mensal`: agrega `cpp_mensal` por mês com receita, tsi, visitas, inv_pads, CR%, AOV, sellers ativos.
- `vw_crescimento_seller_mensal`: mesma coisa por seller (drill-down).
- Filtra `tgmv_lc not null` e exclui meses parciais usando o guard já existente.

### 2. Engine de forecast (`src/lib/forecast.ts`)
- `regressaoLinearPonderada` (pesos exponenciais nos meses recentes)
- `cagrProjecao` (taxa composta mensal)
- `ewma` (α configurável, default 0.4)
- `holtWinters` aditivo (level + trend + sazonalidade m=12; só ativa com 24+ meses)
- `forecastHibrido`: backtest MAPE nos últimos 3 meses → pesos = 1/MAPE normalizado → soma ponderada + IC95 (±1.96·σ resíduos) + diagnóstico em pt-BR
- Estado vazio: < 4 meses → "Precisamos de 4+ meses"
- Dependência: `simple-statistics` (adicionar via bun)
- Testes vitest cobrindo: pesos somam 1, forecast 3 pontos, IC95 monotônico, fallback < 4m

### 3. Decomposição log-aditiva (`src/lib/decomposicao.ts`)
- `decompor(atual, anterior)` retorna contribuição % de visitas, CR, AOV e interação
- Soma ≈ Δlog(Receita) total (erro < 1pp)

### 4. Sustentabilidade (`src/lib/sustentabilidade.ts`)
- `classificarCrescimento(serie, decomp)` com 7 rótulos: Saudável, Eficiência operacional, Dependente de tráfego, Conversão em queda, Artificial/ads-driven, Risco de retração, Escalabilidade positiva
- Usado no banner colorido do topo + frase explicativa

### 5. Insights pt-BR (`src/lib/insightsCrescimento.ts`)
- `insightCrescimento`, `insightConversao`, `insightSazonalidade`, `insightSustentabilidade` — texto factual, sem extrapolar

### 6. UI — `src/pages/ProjecaoCrescimento.tsx`
Banner de sustentabilidade no topo + 5 KpiCards reaproveitando `<KpiCard>`:
1. Receita Projetada (3m)
2. Crescimento Projetado (MoM, CAGR 12m, YoY com tooltip se < 24m)
3. Taxa de Conversão (CR atual + Δ pp + chip de tendência)
4. Ticket Médio (AOV + variações + contribuição)
5. Tendência de Crescimento (rótulo classificado pela inclinação log-linear 6m)

5 gráficos Recharts (eixo X via `monthKey`):
- Linha temporal real + forecast pontilhado + banda IC95
- CR (linha) vs visitas (barras) com eixo Y duplo + reta regressão 6m
- Heatmap sazonalidade (mês × ano, z-score) — fallback < 24m
- Scatter visitas×receita (log/log), bolha=CR, cor=sustentabilidade, click→drawer
- Decomposição empilhada mensal (visitas/CR/AOV/interação) + linha de crescimento %

### 7. Filtros adicionais
Reusa `FiltroContext`. Adiciona local:
- Horizonte (1/3/6m, default 3m)
- Suavização α (slider 0.1–0.7)
- Toggle IC95
- Comparar com (mês anterior / 3m atrás / média 12m)

### 8. Alertas integrados (`src/lib/alerts.ts`)
Novos tipos chegando à Central de Alertas existente:
- `CR_QUEDA_3M` (média)
- `CRESCIMENTO_DESACELERANDO` (atenção)
- `CAC_ACIMA_RECEITA` (alta)
- `TICKET_MEDIO_CAINDO` (atenção)
- `CRESCIMENTO_INSUSTENTAVEL` (alta)
- `SAZONAL_NEGATIVA_PROXIMA` (informativa)

### 9. Componente `<NewBadge>` + onboarding
- `src/components/ui/NewBadge.tsx` reaproveitável: pill azul `#3B82F6`, h-4 px-1.5 text-[10px], `animate-pulse` 2s respeitando `prefers-reduced-motion`, tooltip, some no primeiro click via `localStorage` chave `feature_seen_<key>`
- Badge "NEW" no item de menu da nova rota
- Popover onboarding 3 passos no primeiro acesso, persiste em `feature_onboarded_projecao_v1`

### 10. Integração ao menu/rotas
- Rota `/projecao-crescimento` em `src/App.tsx` (protegida)
- Item no menu lateral logo após "Gestão de Carteira GM" com `<NewBadge featureKey="projecao_v1" />`

## Acabamento

- Tokens semânticos do design system (sem cores hardcoded em componentes)
- Inter, cards `rounded-2xl shadow-sm p-6`
- Count-up framer-motion nos KPIs, skeletons durante forecast
- Mobile: gráficos com scroll horizontal, cards empilhados
- Sempre `monthKey()` — proibido `getMonth()`/`getFullYear()` em arquivos novos
- Forecast < 500ms para 12 pontos

## Ordem de execução
1. Migration das views + checar se `tgmv_orders` existe (caso sim, usar; senão TSI)
2. `bun add simple-statistics` + engine forecast + testes
3. Decomposição + sustentabilidade + insights
4. Página + KPI cards + filtros locais
5. 5 gráficos
6. Alertas na Central existente
7. `NewBadge` + onboarding + entrada no menu/rotas

Confirma para eu começar pelas views SQL?
