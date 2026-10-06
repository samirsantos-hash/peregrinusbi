# Aba Carteira (modelo Deep Dive CPP) — plano para aprovação

Nova tela de carteira (nível L0), com a leitura do relatório mensal do Mercado Livre feita de forma contínua. Não muda a navegação atual, as telas de loja nem os cálculos que já foram validados.

Limites escolhidos (padrão sugerido): **Full ≥ 40%**, **Ads ≥ 5% do faturamento**, **Promoção ≥ 20%**, **Competitividade de preço ≥ 70%**, **Queda ≤ −20%** contra o mês anterior. % Flex, % Clips e % Afiliados não têm meta e aparecem sem julgamento.

## O que a tela mostra

1. **Cabeçalho:** "Carteira", consultoria e período. À direita, o mês de referência e o número de lojas.
2. **Faixa de KPIs** com a variação contra o mês anterior na mesma janela de dias (por exemplo, "1–4/out vs 1–4/set · 4 dias") e o mesmo mês do ano anterior.
   - **Volume:** Faturamento, Itens, Ticket médio, Pedidos e Visitas. Quando os itens caem e o ticket sobe, aparece o aviso "possível mudança de mix".
   - **Carteira:** Ativas, Com venda, Ociosas, Entrando e Saindo.
   - **Alavancas:** Full, Flex, Ads, Promoção, Competitividade, Clips e Afiliados. Cada uma traz o limite escrito ao lado.
3. **Plano de ação:** ordenado pela quantidade de alertas. Mostra 15 linhas e tem "ver todas". Cada etiqueta traz o valor que a disparou. O clique abre a loja (L2).
4. **Retenção:** três blocos (Queda + Ads, Queda + Promoção e Queda + Full), com até 10 lojas cada. Quem aparece em mais de um bloco fica marcado.
5. **Movimentação:**
   - Entrando: data de entrada e faturamento.
   - Saindo: data prevista de saída e faturamento em risco, com o total no topo. As lojas com faturamento zero ficam separadas.
6. **Curva A com oportunidade de preço:** contagens de urgência (< 50%) e de oportunidade (< 70%) e exportação em CSV protegida.
7. **Filtros:** vertical, faixa de faturamento, tipo de alerta e entrando/saindo. Valem para todos os blocos juntos, com a contagem de lojas filtradas visível.

## Fontes de cada número

| Indicador | Fonte | Situação |
|---|---|---|
| Faturamento, itens, visitas, Full, Flex, Ads, Clips | vendas diárias já carregadas | pronto |
| Promoção | parte do faturamento vinda de campanhas (CDP) | pronto |
| Competitividade | visitas com preço igual ou menor que o concorrente ÷ visitas | pronto |
| Pedidos | coluna de pedidos da planilha mensal | **passar a gravar** na importação |
| Entrando / Saindo | datas de entrada e saída do programa (planilha mensal e base de vendedores) | **passar a gravar e preencher** |
| Afiliados | nenhum arquivo atual traz | "sem dado" |
| Curva A item a item | precisa do arquivo de anúncios por MLB, que ainda não chega | "sem dado" até o arquivo chegar |

## Regras de dado

- As taxas são sempre total ÷ total.
- Denominador zero aparece como traço, nunca como 0%.
- "Sem dado" é diferente de zero.
- Mês incompleto aparece hachurado e só é comparado na janela equivalente, sempre com aviso.
- Lojas sem vertical ficam num grupo próprio.
- Divisão inválida gera erro explícito: nada de `catch` vazio nem valor padrão silencioso.

## Detalhes técnicos

**Banco (migração não destrutiva):**
- `sellers_kpi` ganha a coluna `tgmv_orders`.
- `sellers` ganha as colunas `fecha_in` e `fecha_out`. Elas são preenchidas a partir de `cpp_mensal` e `cart_base_vendedores` quando a importação rodar.

**Importadores:**
- `import-csv` passa a gravar TGMV_ORDERS, FECHA_IN e FECHA_OUT.
- Depois, reimportar as planilhas de 05/10 para preencher o histórico.

**Arquivos novos:**
- `src/lib/carteiraDeepDive/calculo.ts`: funções puras para janela equivalente, KPIs, alertas, cruzamentos, entrada/saída e aviso de mix.
- `src/lib/carteiraDeepDive/calculo.test.ts`: um teste por regra (limites, janela equivalente, denominador zero, ordenação por quantidade de alertas, soma do faturamento em risco e marcação nos três cruzamentos).
- `src/hooks/carteira/useCarteiraDeepDive.ts`: leitura paginada com `fetchAllRows` de `sellers`, `sellers_kpi_daily` (mês atual, mês anterior e mesmo mês do ano anterior) e `sellers_kpi`.
- `src/config/limiaresCarteira.ts`: os limites num lugar só.
- `src/pages/CarteiraDeepDive.tsx` e os componentes em `src/components/carteira/deepdive/`: `FaixaKpis`, `PlanoAcao`, `Retencao`, `Movimentacao`, `CurvaAPreco` e `FiltrosCarteira`.

**Alterações em arquivos existentes:**
- `src/App.tsx`: rota nova `/carteira/visao`, protegida.
- `src/pages/nivel/N0Carteira.tsx`: um botão "Visão Deep Dive", sem outras mudanças.

**Restrições:** sem gráfico de pizza ou medidor circular, sem nome de tabela ou coluna na tela, CSV com `csvSafe` e tokens existentes de `index.css`.

## Como testar

1. Abra `/carteira` e clique em **Visão Deep Dive**.
2. Confira se a janela de dias aparece escrita.
3. Troque a vertical e veja se todos os blocos mudam juntos.
4. Some a tabela "Saindo" e compare com o total de faturamento em risco.
5. Rode os testes de `calculo.test.ts`.
