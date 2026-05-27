# Plano: Modo Consultor Junior

Camada didática sobre o dashboard existente, sem refazer o que já funciona. Entrega em 4 fases.

## Investigação prévia (rápida, antes de codar)

Ler arquivos-chave para descobrir:
- Onde estão definidas as abas do seller hoje (provavelmente dentro do `Index.tsx` ou de um componente Tabs em `src/pages/Index.tsx` / dashboard wrapper).
- Onde fica o "drawer do seller" para adicionar a aba Correlações.
- Como o `DashboardHeader` está montado (para inserir o toggle "Modo Didático").
- Quais labels exatos existem hoje nos painéis listados na seção 4.2.

## Fase A — Base: AlgoTooltip + conteúdos + toggle global

1. Criar `src/components/ui/AlgoTooltip.tsx`
   - Wrappa `Tooltip` do shadcn, ícone `HelpCircle` (lucide), 4 seções: O que é, Como o algoritmo usa, Bom/Ruim, Correlação, Benchmark.
   - Usa tokens semânticos (`text-muted-foreground`, `text-emerald`, `text-destructive`, `bg-popover`); nada de cores hardcoded.
   - Respeita `juniorMode` via hook (não renderiza nada se `false`).
   - `role="tooltip"`, `aria-label` derivado de `oque`. Suporte mobile via `onClick` no trigger (Radix já cobre via focus, adicionar handler explícito).

2. Criar `src/lib/algoTooltips.ts` com o dicionário `TOOLTIPS` exatamente como especificado no prompt (adicionar entrada `cpa` simples). Tipar via `as const`.

3. Criar `src/hooks/useJuniorMode.tsx`
   - Hook + contexto leve. `localStorage` chave `peregrinus_junior_mode`. Default `true`.
   - Expor `{ enabled, toggle }`.

4. Wrappar `App.tsx` com `JuniorModeProvider`.

5. Adicionar toggle no `DashboardHeader` ao lado do botão Refresh: Switch + label "🎓 Modo Didático" / "Modo Avançado".

## Fase B — Reordenação das abas do seller

1. Localizar o array/JSX das tabs do seller (provável: `Index.tsx`).
2. Reordenar para: Resumo → Faturamento → Logística → Qualidade → Clips → Preço → Oportunidades → Reputação → Grants.
3. Adicionar comentário no topo justificando a ordem (1–3 "como vai", 4–6 "por quê", 7–9 "o que fazer").
4. Criar `src/config/sellerTabs.ts` com metadados (`id`, `label`, `icon`, `juniorTip`, `order`) para reuso no banner e no tooltip da própria tab.
5. Ao passar mouse sobre cada `TabsTrigger`, mostrar o `juniorTip` (apenas em juniorMode) via Tooltip simples.

## Fase C — JuniorActionBanner por aba

1. Criar `src/components/ui/JuniorActionBanner.tsx`
   - Props: `abaId`, `dados` (objeto plano com os indicadores relevantes).
   - Renderiza no máximo 3 ações ativas (filtra `condicao(dados) === true`, ordena por `prioridade`).
   - Colapsável com persistência em `localStorage` chave `peregrinus_banner_<abaId>` (aberto na primeira visita, fechado depois — primeira visita = chave inexistente).
   - Esconde se `!juniorMode` ou se nenhuma ação ativa.
   - Cabeçalho: 🎓 Guia do Consultor.

2. Criar `src/lib/juniorActions.ts` com os arrays `ACOES_RESUMO`, `ACOES_FATURAMENTO`, `ACOES_LOGISTICA`, `ACOES_QUALIDADE`, `ACOES_PRECO`, `ACOES_OPORTUNIDADES`, `ACOES_REPUTACAO` (e mapa por `abaId`).

3. Inserir `<JuniorActionBanner>` no topo de cada painel correspondente, passando os dados já calculados internamente.

## Fase D — Aplicação dos AlgoTooltips + Painel Correlações

1. Aplicar `<AlgoTooltip ... />` nos labels listados na seção 4.2:
   - `EfficiencyPanel`, `ExecutivePanel`, `LogisticsPanel`, `QualityKpiCards`, `ClipsAudiencePanel`, `CompetitivenessPanel`, `OpportunitiesPanel`, `ReputationPanel`, `GrantsPanel`.
   - Trocar uso atual de `TooltipInfo` apenas onde o KPI tem entrada no dicionário; manter `TooltipInfo` para os demais (não quebra nada).

2. Criar `src/components/seller/CorrelacaoPanel.tsx`
   - Diagrama Mermaid via CDN (carregar script uma vez, `mermaid.run()` após mount).
   - Tabela de correlações Pearson calculadas a partir dos dados diários do seller (já disponíveis em `useSellerDailyData`): pares Full↔GMV, CDP↔GMV, IPI↔ROAS, %NaoCompetitivo↔Conv, Atrasos↔Conv.
   - Função utilitária `pearson(xs, ys)` em `src/lib/correlacao.ts`.
   - Insight automático: pega `argmax |r|` e gera o texto.
   - Semáforo: |r|<0.3 cinza, 0.3–0.6 amarelo, >0.6 verde/vermelho conforme sinal.

3. Adicionar aba "🔗 Correlações" no drawer do seller (último item; só visível em juniorMode? — manter sempre visível, é útil em ambos modos).

## Critérios de aceite (resumo)

Ver seção 8 do prompt. Implementação respeita design tokens, evita cores hardcoded, todos os textos em PT-BR conforme dicionário, nenhuma alteração em ingestão ou business logic existente.

## Notas técnicas

- Mermaid: usar `import mermaid from "mermaid"` (instalar `mermaid` via bun add) em vez de CDN — mais confiável dentro do Vite.
- Pearson: implementação simples O(n), guard contra `stdev=0` retornando 0.
- Toggle global: contexto + `useSyncExternalStore` para evitar hidratação; localStorage write em `toggle()`.
- Banners e tooltips: zero impacto fora do juniorMode (early return).
- Não tocar em: parsers, edge functions, hooks de dados, schemas.

## Escopo NÃO incluído

- Recalcular KPIs já existentes.
- Alterar layout/estética dos painéis além de adicionar o ícone de tooltip e o banner no topo.
- Mudanças em rotas, autenticação ou dados.