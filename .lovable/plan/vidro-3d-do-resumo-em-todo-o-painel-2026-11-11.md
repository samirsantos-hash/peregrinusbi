# Vidro 3D do Resumo em todo o painel

## O que muda
- Os cartões de todas as áreas do painel (Resumo, Publicidade, Promoções, Preço, Logística, Reputação, Multilojas, Carteira, Admin e demais abas) passam a usar o mesmo vidro 3D colorido aprovado no Resumo: preenchimento translúcido, bordas com luz no topo, sombra de profundidade e indicadores com verde/vermelho/neutro.
- Preservados sem alteração: Home, tela de login (cordas), barra lateral, árvore de análises, filtros, menus e seletor de lojas (não inclinam nem se movem), números e cálculos.
- Temas claro e escuro, celular e movimento reduzido mantêm as mesmas regras já usadas no Resumo.

## Detalhes técnicos
- Generalizar o seletor `.resumo-apple-glass` para uma classe de escopo do painel (ex.: `.painel-apple-glass`) aplicada no contêiner das abas em `src/pages/Index.tsx` e nas páginas do painel (Publicidade, Multilojas, Admin), mantendo o alias antigo.
- Cobrir as superfícies compartilhadas (`glass-card`, `kpi-vidro`, `ds-kpi`, `carteira-kpi`, cards do shadcn dentro do escopo); excluir janelas, folhas laterais, menus, tabelas densas e gráficos internos para limitar custo de desfoque.
- Rodar o teste público de carga antes da mudança, executar `temaVidro.test.ts`, e conferir visualmente claro/escuro, celular e foco por teclado; informar o que não puder ser conferido.
- Sem publicação.
