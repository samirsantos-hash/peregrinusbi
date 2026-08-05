# Navegação hierárquica de 6 níveis (Peregrinus)

Fase 0 já concluída (diagnóstico só leitura, reportado no chat). Decisões confirmadas: criar tabela de grupos, migrar telas atuais em fases, `admin`+`gerente` = perfil consultor, dados reais em L4/L5.

## Fase A — Modelo de grupos, rotas e guarda de perfil

**Banco (migration):**
- `grupos` (nome, descricao, dono_user_id, ativo) com RLS: admin/gerente veem tudo; dono do grupo vê o seu.
- `sellers.grupo_id` (FK opcional) + índice.
- Função `get_perfil()` → `consultor` | `dono_grupo` | `gestor_loja`, derivada de `user_roles` (admin/gerente → consultor) e vínculo.
- Tela admin para associar lojas a grupos (Fase A.2).

**Rotas (`src/App.tsx`):**

```text
/carteira                                             L0
/grupos/:grupoId                                      L1
/lojas/:lojaId                                        L2  (abas: visao|programas|anuncios|operacao)
/lojas/:lojaId/programas                              L3
/lojas/:lojaId/programas/:programaId/categorias/:categoriaId   L4
/lojas/:lojaId/anuncios/:mlb                          L5
```

- `PROFUNDIDADE` em `src/lib/navegacao/perfis.ts`; `<GuardaNivel nivel={n}>` redireciona à entrada do perfil (sem 403).
- Pós-login: redirect para `PROFUNDIDADE[perfil].entrada`, resolvendo `:grupoId`/`:lojaId` pelo vínculo; múltiplos vínculos → nível acima permitido ou seletor.
- Rotas legadas (`/`, `/cpp`, `/gestao-carteira`, `/analise-mlb`, `/projecao-crescimento`) permanecem nesta fase e passam a ser alcançadas por redirect nas fases seguintes.
- Modais `conteudo_navegavel` viram rota: `CppSellerDetail` → L2, drawer de seller de Gestão de Carteira → L2, drill-downs de Carteira → L1/L2, `KpiDetailPanel` → aba de L2.

## Fase B — `NivelLayout` (5 zonas)

`src/components/nivel/NivelLayout.tsx` com breadcrumb sticky, barra de contexto, herói + 3–4 KPIs, corpo e faixa de confiança sticky. Herói: L0 `text-6xl`, L1–L2 `text-5xl`, L3–L4 `text-4xl`, L5 ausente. Abas somente em L2 (Visão geral · Programas · Anúncios · Operação). Cabeçalhos próprios das telas migradas são removidos.

## Fase C — `BreadcrumbSeletor`

Segmento = texto (navega ao ancestral) + chevron (dropdown de irmãos com semáforo, mantendo nível e aba). Segmentos de níveis não permitidos não são renderizados. Mobile colapsa para `… / pai / atual`.

## Fase D — Continuidade de contexto

`ContextoNavegacaoProvider` sincronizado com query string (`periodo`, `programa`, `filtro`, `aba`) e helper único `navegarPreservando(destino)`. Substituição de todos os `navigate()`/`<Link to>` de transição entre níveis. Um único caminho para descer (clique na linha). Setas ←/→ e teclado para irmão anterior/próximo em L4 e L5.

## Fase E — `ListaFilhos`

Colunas fixas: nome · semáforo · número do nível · gap · sparkline · 1 ação (verbo imperativo). Ordenação por urgência (`critico → atencao → verde → sem_dado`). `ValorMetrica` para null/0. Status = cor + ícone + rótulo. 10 linhas + "ver todas (n)". Rodapé com reconciliação (`R$ 235K · 2 de 3 lojas com dado`).

## Fase F — Estados

Skeleton com forma das 5 zonas; vazio com texto por nível; erro isolado por zona; filho inacessível não renderizado; sem animação de página (só o corpo troca).

## Fontes de dados por nível

- L0: `portfolios` + `sellers` + `sellers_kpi` (risco reaproveitado de `src/lib/risk/`).
- L1: `grupos` + `sellers` do grupo.
- L2: `sellers_kpi` / `sellers_kpi_daily` (reaproveita `useSellerData`).
- L3: `cdp_mensal` / `cpp_mensal` (substitui o mock `participacoes.mock.ts`).
- L4: agregação por `dom_domain_agg1` em `live_listings` / `seller_eligibility`.
- L5: `seller_eligibility` + `seller_listings_quality` por `item_id` (MLB), reusando `MlbLink`.

## Ordem e reportes

A → reporte → B → C → D → reporte → E → F. Ao final de cada fase, lista de critérios de aceite que passam e que não passam, com motivo. Sem publicar.
