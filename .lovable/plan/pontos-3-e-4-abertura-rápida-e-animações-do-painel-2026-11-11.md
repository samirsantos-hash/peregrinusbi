# Pontos 3 e 4: abertura rápida e animações do painel

O menu (Pontos 1 e 2) já está aplicado. Este plano cobre o restante do documento.

## O que já existe (não será refeito)

- **Dados guardados no aparelho:** os gráficos e resumos já abrem com a última leitura guardada (até 24 horas, separada por usuário e apagada ao sair) e se atualizam em segundo plano. É a estratégia "mostra o último e atualiza depois" que o documento pede.
- **Loja escolhida:** já fica salva ao recarregar.
- **Números que sobem do zero:** os cartões de números já contam do 0 até o valor real, desacelerando no final, e respeitam o modo de movimento reduzido.

## Ponto 3: o que muda

1. **Período salvo:** o período escolhido (7/30/90 dias, mês, personalizado) e a comparação com o período anterior passam a ficar salvos por usuário. Ao voltar, o painel abre no último período usado. Se o período salvo não tiver dados para a loja, volta ao padrão de hoje.
2. **Troca de loja/período sem tela vazia:** ao trocar, o gráfico principal continua mostrando os números anteriores, levemente apagados, com a barra de progresso que já existe, até os novos chegarem. Hoje ele pode piscar vazio.
3. **Antecipar ao passar o mouse:** ao passar o mouse numa loja do seletor, o painel começa a buscar o resumo dela, como já faz na Curva ABC.

## Ponto 4: coreografia

1. **Cartões em cascata:** os cartões de números sobem 12px com fade (260 ms, desaceleração suave), um após o outro com 50 ms de intervalo, no máximo 8 em sequência. Só na primeira abertura da seção e na troca de loja, não a cada atualização automática.
2. **Números:** a contagem começa quando o cartão termina de subir. Os cartões de vidro que ainda não usam a contagem passam a usar.
3. **Gráficos:** linhas e barras desenham depois dos cartões, começando em 300 ms e durando 800 ms com desaceleração. Nas atualizações automáticas, sem nova animação, para não "pular".
4. Movimento reduzido no aparelho desliga tudo isso. Só posição e transparência são animadas, como manda a regra de movimento do painel.

## Detalhes técnicos

- Período: `localStorage` com chave por usuário (`peregrinus:periodo:<uid>`), lido em `src/pages/Index.tsx`, validado contra a lista de períodos; apagado no logout, junto do cache.
- Gráfico principal: `placeholderData: keepPreviousData` nas consultas do resumo de vendas; prefetch via `anteciparConsulta` no hover do seletor.
- CSS em `src/index.css`: `.kpi-cascata > *` com `@keyframes kpi-subir` e `animation-delay: calc(var(--i) * 50ms)`; `prefers-reduced-motion` desliga.
- `useNumeroAnimado`: atraso opcional de início; aplicado no KpiVidro.
- Recharts: constantes compartilhadas `ANIMACAO_GRAFICO = { animationBegin: 300, animationDuration: 800, animationEasing: "ease-out" }` em `src/lib/animacaoGrafico.ts`, aplicadas aos gráficos do Resumo, Publicidade e Multilojas; `isAnimationActive` só na primeira renderização.
- Testes: período salvo é restaurado e o inválido cai no padrão; atraso da contagem. Rodar k6 público antes de concluir; nada publicado.
