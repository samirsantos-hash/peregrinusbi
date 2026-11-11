# Publicidade: seletor de período e campos em branco

## O que muda para você
1. **Botão de período** no topo da Publicidade, ao lado de "Atualizar": 7, 15, 30 ou 45 dias. Todos os números, gráficos e a comparação com o período anterior passam a seguir o período escolhido. A escolha fica no endereço da página, para links continuarem funcionando.
2. **TACOS preenchido nas campanhas e nos anúncios.** Hoje ele só existe no total da conta; nas linhas aparece "—". Passa a ser: investimento da campanha (ou do anúncio) dividido pelo faturamento total da loja nas mesmas datas.
3. **Revisão dos outros campos "—"**: cada um passa a mostrar o valor, ou um texto curto dizendo o motivo ("sem vendas no período", "sem cliques", etc.), em vez do traço solto.

## Limites honestos
- O faturamento diário da loja guardado hoje cobre só os últimos 31 dias. Com 45 dias, o TACOS mostra "Sem dados para o período inteiro" até o histórico crescer (passaremos a guardar 90 dias).
- Os períodos vão até 45 dias porque é o máximo de métricas por anúncio guardadas para comparar com o período anterior.

## Detalhes técnicos
- `src/pages/Publicidade.tsx`: trocar `const DIAS = 30` por estado vindo de `?periodo=` (7|15|30|45, padrão 30); incluir na `queryKey`; passar para `ml_ads_painel_grupos`, `faturamentoAlinhado` e `montarPainel`; seletor com shadcn `ToggleGroup`/`Select` no `PageHeader`.
- `src/lib/adsAnalise.ts` (`montarPainel`): passar o faturamento alinhado também a `indicadores()` de cada campanha e de cada grupo (atual e anterior, com o faturamento do período anterior quando houver cobertura; senão null).
- Função de sincronização de vendas: ampliar a série guardada de 31 para 90 dias (sem mudar o formato).
- Teste em `src/lib/adsAnalise.test.ts`: TACOS da campanha = custo/faturamento das mesmas datas; null quando falta um dia.
- Atualizar `docs/ml-gestao.md`.
