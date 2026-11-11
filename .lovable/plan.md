# Menu lateral: nova organização e abertura de uma seção por vez (Pontos 1 e 2)

Os Pontos 3 (cache) e 4 (animações) ficam para depois da sua aprovação, como pede o documento.

## O que existe hoje

O menu tem 5 grupos e 15 seções:

```text
Visão geral ........ Resumo, Reputação & Funil
Anúncios ........... Anúncios, Qualidade, Clips
Desempenho comercial Oportunidades, Preço, Publicidade, Estudos de mercado
Operação ........... Logística, Perguntas
Planejamento ....... Full, Metas, Correlações, Multilojas
```

Duas observações:
- Mais de uma seção pode ficar aberta ao mesmo tempo. O menu só guarda uma lista do que já foi aberto e vai crescendo conforme você navega.
- "Correlações" fica em Planejamento, mas analisa anúncios e publicidade.

## Nova árvore sugerida (4 grupos)

```text
Comando Central
  ├ Resumo            (Análise geral, Resumo da conta, Indicadores e faturamento)
  └ Reputação & Funil (Resumo, Análise geral, Análise McKinsey)

Motor de Vendas
  ├ Preço             (competitividade, carteira, concorrentes...)
  ├ Publicidade
  ├ Oportunidades     (promoções e campanhas)
  └ Estudos de mercado

Anúncios & Conteúdo
  ├ Anúncios
  ├ Qualidade
  ├ Clips
  └ Correlações       (sai de Planejamento)

Operação
  ├ Logística         (envios, Full e estoque, Flex)
  ├ Atendimento       (novo nome de "Perguntas")
  └ Full              (sai de Planejamento: potencial e produtos para o Full)

Planejamento
  ├ Metas
  └ Multilojas
```

Com isso: a "Visão geral" passa a se chamar "Comando Central", as seções de vendas ficam juntas em "Motor de Vendas", e o Full fica ao lado da Logística. Nenhuma tela é apagada nem juntada por dentro: só muda o lugar e o nome do grupo. Os links que já existem continuam abrindo a mesma tela.

## Abertura de uma seção por vez

- O menu passa a guardar uma única seção aberta.
- Abrir "Motor de Vendas › Preço" fecha a seção que estava aberta, com uma transição suave de altura e opacidade (200–300 ms; sem animação quando o aparelho pede movimento reduzido).
- Clicar de novo na seção aberta fecha a seção.
- Ao trocar de tela por um link, abre só a seção da tela atual.
- O ramo em L verde da opção selecionada continua igual.
- Vale para o menu do computador e do celular. Permissões, níveis de cliente e quem vê cada item continuam iguais.

## Detalhes técnicos

- `src/config/arvoreAcessos.ts`: reescrever `GRUPOS_ACESSOS` com os novos títulos/ids e mudar o rótulo de `perguntas` para "Atendimento" (o id fica). `src/config/sellerTabs.ts` `GRUPOS` alinhado.
- `src/components/dashboard/PainelSidebar.tsx`: trocar `useState<string[]>` (`ramos`) por `useState<string | null>(ativa)`; o toggle vira `setAberta(a => a === id ? null : id)`; o `useEffect` em `ativa` faz `setAberta(ativa)`. Envolver o `<ul className="arvore-ramos">` em grid `grid-rows-[0fr]→[1fr]` com transição de opacidade, mantendo o desmontar após fechar.
- Atualizar `src/test/sellerNavigationTree.test.ts` (grupos novos) e adicionar teste: abrir uma seção fecha a outra.
- Rodar `scripts/k6-publico.js` antes de concluir; nada será publicado.

## Para você confirmar
- Os nomes dos grupos ("Comando Central", "Motor de Vendas", "Anúncios & Conteúdo", "Operação", "Planejamento").
- Renomear "Perguntas" para "Atendimento".
- Mover Full para Operação e Correlações para Anúncios & Conteúdo.
