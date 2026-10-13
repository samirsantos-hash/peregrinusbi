# Roadmap

## Correções estatísticas (ordens de serviço, set/2026)
- [x] OS-1 — Alerta de churn por z-score modificado (MAD), flag `ALERTS_USE_ROBUST_Z`
- [x] OS-4 — Encolhimento empírico de Bayes nos rankings, flag `RANKINGS_USE_SHRINKAGE`
- [x] OS-2 — Mediana + IQR e escala logarítmica em faturamento
- [ ] OS-5 — Estado tri-valorado (ativo / sem_participacao / sem_dado)
- [ ] OS-3 — Controle de FDR (Benjamini-Hochberg) na matriz de correlação
- [ ] OS-6 — Decomposição STL nas séries diárias
- [ ] OS-7 — Seleção de indicadores por componente nos radares

## Blindagem (v2) — pendente
- [ ] Bloco 7 — signup fechado, MFA para admin, expiração de sessão
- [ ] Bloco 8 — verificação final (revisão de segurança, teste de vazamento, varredura do bundle)

## Painel admin
- [x] Alerta de dados desatualizados (somente admin geral) no painel inicial

## Sistema de Design Peregrinus (13/10)
- [x] Tokens claros padrão, aliases legados, tipografia, format.ts, componentes ds/, medidores → barras de faixa
- [ ] Reorganizar cada tela com um número focal (KpiCard ds) e remover diagnóstico repetido por aba
- [ ] Gráficos: período parcial hachurado, ordenação por valor, pizzas >4 fatias → tabela, connectNulls=false
- [ ] Revisar ~440 toFixed restantes fora de "%"/"x" para format.ts
