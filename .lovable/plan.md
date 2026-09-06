# Precisão de métricas — 7 correções de estimador

Objetivo: trocar estimadores frágeis por estimadores robustos, sem reescrever a lógica de dados existente. Cada item entra como uma camada nova de cálculo (biblioteca + uso pontual nos painéis), com testes.

## Ordem de execução (por prioridade)

### Etapa A — corrige leitura errada hoje

**A1. Alerta de churn por z-score modificado (MAD)**
- Nova lib `src/lib/stats/robust.ts`: `mediana`, `mad`, `zModificado` (constante 0,6745), com fallback quando MAD = 0 (usa desvio absoluto médio × 1,253).
- `src/lib/risk/churnRisk.ts`: trocar `meanSd`/z clássico por mediana+MAD, limiar `|mz| > 3,5` (alta) e `> 3,0` (média), mantendo a mesma interface `ChurnStat`/`ChurnSignal` e o churn absoluto como está.
- Constantes exportadas e comentadas para calibração futura por vertical.
- Atualizar `src/lib/risk/riskAggregator.test.ts` e adicionar testes do estimador robusto.

**A2. Encolhimento empírico de Bayes nos rankings**
- Nova lib `src/lib/stats/shrinkage.ts`: `encolherRazao({ numerador, denominador, n })[]` → prior intravertical (média global só como fallback quando a vertical tem menos de 20 lojas), fator `B = σ²/(σ²+τ²)`, retorno com `valorBruto`, `valorAjustado`, `B`, `n`.
- Aplicar no ranking de eficiência/ROAS (`EfficiencyPanel`, `RaioXTable`, `PortfolioDetail`) ordenando pelo valor ajustado e exibindo `n` ao lado do valor.

**A3. Mediana e escala log em faturamento**
- `src/lib/carteira/stats.ts` já tem `describe`/`quantile`: expor helper `resumoCarteira` (soma, mediana, p25–p75) e usá-lo onde hoje se exibe média de GMV.
- Eixos de faturamento/investimento nos gráficos de distribuição da carteira passam a `scale="log"` com rótulo indicando escala logarítmica.
- Faixas de benchmark por percentil (p25/p50/p75/p90) em vez de múltiplos da média.

**A4. Estado tri-valorado (ativo / sem_participacao / sem_dado)**
- Nova lib `src/lib/stats/estadoMetrica.ts`: `classificarEstado(valor, contexto)` e `apenasAtivos(...)` para excluir ausentes de médias/percentis.
- Aplicar em `inv_pads` / `tgmv_lc_pads` nos painéis de publicidade e nos KPIs de carteira; exibir "sem participação" e "sem dado" com tratamento visual próprio (badge neutro), nunca como zero.
- Nos painéis diários de publicidade, mostrar aviso explícito de base indisponível quando a série diária vier 100% nula.

### Etapa B — eleva o rigor do que já funciona

**B1. Controle de FDR (Benjamini-Hochberg) na matriz de correlação**
- `src/lib/correlacao.ts`: adicionar `pValorPearson(r, n)` (t de Student) e `benjaminiHochberg(pvals, Q)` retornando q-valores e flag de significância.
- `CorrelacaoPanel`, `PairplotMatrix` e `SynergyAnalysisPanel` passam a exibir `r`, `n` e `q`, esmaecendo células que não passam o FDR.

**B2. Decomposição STL nas séries diárias**
- Nova lib `src/lib/stats/stl.ts`: STL simplificado (Loess) com período 7, retornando `tendencia`, `sazonal`, `residuo`.
- `Daily7DPanel`: tendência como linha principal, série crua ao fundo, e detector de anomalia aplicando o critério MAD sobre o resíduo. Média móvel de 7 dias permanece disponível como opção.

**B3. Seleção de indicadores por componente nos radares**
- Documentar os pares redundantes (SCORE_FINAL_FULL × PONTUACAO_SOW; PONTUACAO_HI × SOW) e manter um representante por eixo nos gráficos de radar, movendo os demais para o detalhamento.

### Permanente
- Todo agregado exibe `n` e a incerteza (faixa interquartil ou intervalo).
- Cada painel documenta em tooltip qual estimador usou.

## Notas
- Limiares (3,5 no MAD; Q = 0,05; n mínimo do prior) ficam em constantes nomeadas, para calibração contra casos de churn confirmados.
- Prior de encolhimento é intravertical, com fallback global.
- Nenhuma migração de banco; nenhuma alteração em parsers de importação.
