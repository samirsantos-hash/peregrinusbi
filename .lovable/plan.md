# Correções estatísticas — plano de execução das ordens de serviço

Ordem definida nas OS: **OS-1 → OS-4 → OS-2 → OS-5 → OS-3 → OS-6 → OS-7**. Uma OS por entrega, para isolar qualquer regressão. Nenhuma lógica de dados existente é reescrita: cada OS adiciona uma camada nova e troca apenas o ponto de chamada indicado.

## Base comum (entra junto com a OS-1)

- `src/lib/stats/robust.ts` (novo): `mediana`, `mad`, `computeRobustZScore(values)`. Falha alto conforme a OS-1: `MAD=0: dispersão nula, use Qn ou IQR`, `amostra insuficiente para z robusto: n=<n>`, filtra `null`/`NaN` registrando quantos foram descartados, e devolve `sem_dado` quando tudo é nulo.
- `src/lib/stats/config.ts` (novo): limiares ajustáveis sem deploy (3,5 do MAD; 0,05 do FDR; 10 lojas mínimas por vertical) lidos da tabela `config_estimativa` já existente, com constantes de fallback.
- Flags de reversão em `src/lib/stats/flags.ts`: `ALERTS_USE_ROBUST_Z`, `RANKINGS_USE_SHRINKAGE`.
- Testes em `src/lib/stats/*.test.ts` cobrindo cada caso de borda que precisa estourar erro.

## OS-1 — Churn por z-score modificado (MAD)
- `src/lib/risk/churnRisk.ts`: o detector passa a chamar `computeRobustZScore`; o z clássico (`meanSd`) fica intacto e marcado `@deprecated para alertas`.
- Limiar `|mz| > 3,5`; a interface `ChurnStat`/`ChurnSignal` e o churn absoluto não mudam.
- Aceite: nenhuma outra tela muda; testes de outlier extremo, de 10 valores idênticos (erro) e de amostra < 8 (erro).

## OS-4 — Encolhimento empírico de Bayes nos rankings
- `src/lib/stats/shrinkage.ts` (novo): `shrinkEstimate(values, counts, priorScope)` com prior **intravertical** (mediana do grupo), fallback para carteira quando a vertical tem < 10 lojas — sinalizado na UI.
- Erros explícitos: `n ausente para loja <id>: encolhimento impossível`, prior indefinido; `τ² = 0` gera log de aviso.
- Aplicado em: ranking de carteira, troféus (`TrophyCards`), cluster de desempenho (`PerformanceClusterChart`), ROAS/ACOS por loja (`EfficiencyPanel`, `RaioXTable`).
- `n` visível ao lado de todo valor encolhido; valor bruto permanece no detalhamento.

## OS-2 — Mediana, IQR e escala logarítmica
- `src/lib/carteira/stats.ts`: expor mediana e IQR no agregador de carteira; `mean` permanece, exibida ao lado da mediana.
- Eixos de GMV e investimento em escala log, com contador visível de lojas omitidas por valor ≤ 0 e estado vazio explícito quando a série inteira é não-positiva.
- Faixas de benchmark por percentil (p25/p50/p75/p90). Com n < 5, exibir valores individuais em vez de faixa.

## OS-5 — Estado tri-valorado
- `src/lib/stats/estadoMetrica.ts` (novo): `ativo | sem_participacao | sem_dado` derivado na leitura de `inv_pads`, `bpc`, `cdp_tgmv_lc` (sem migração de banco nesta etapa; o estado é calculado no acesso).
- Agregadores excluem `sem_participacao` e `sem_dado` de média, mediana e percentil; média que receber `sem_dado` lança erro.
- UI: cinza para "não participa", hachura para "sem dado".
- Auditoria vinculada: confirmar que `INV_PADS`/`TGMV_LC_PADS` estão vazios no feed diarizado e, sendo o caso, o painel diário de publicidade exibe estado vazio explícito, nunca gráfico zerado.

## OS-3 — FDR na matriz de correlação
- `src/lib/correlacao.ts`: acrescentar `pValorPearson(r, n)` e `benjaminiHochberg(pvals, Q)`. Pearson atual permanece.
- Par com n < 30 vira estado "n insuficiente"; variância nula lança `variância nula em <coluna>: correlação indefinida`; contagem de pares divergente lança erro.
- `CorrelacaoPanel`, `PairplotMatrix` e `SynergyAnalysisPanel` exibem `r`, `n` e `q` e esmaecem as células reprovadas. Aviso de correlação ≠ causa mantido.

## OS-6 — STL nas séries diárias
- `src/lib/stats/stl.ts` (novo): decomposição com período 7 devolvendo tendência, sazonal e resíduo; MSTL fica fora deste escopo.
- `Daily7DPanel`: tendência como linha principal, série crua ao fundo; média móvel de 7 dias vira opção. Anomalia passa a ser detectada no resíduo pelo MAD da OS-1.
- Lacuna de data não é interpolada em silêncio; menos de 2 períodos completos exibe aviso; dia parcial usa a guarda de período parcial já existente; calendário de exceções para datas comerciais.

## OS-7 — Indicadores por componente nos radares
- Escolher um representante do bloco `SCORE_FINAL_FULL` / `PONTUACAO_SOW` / `PONTUACAO_HI` (r ≥ 0,847), documentando no código o r que justifica.
- Radar só com eixos de blocos distintos e padronizados; menos de 3 eixos válidos vira gráfico de barras.

## Fora de escopo
- Migrações de banco e alteração de parsers de importação.
- Recalibração dos limiares contra casos reais de churn (fica registrada como pendência antes de produção).
