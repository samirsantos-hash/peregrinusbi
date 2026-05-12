## Diagnóstico

**Problema 1 — Gap em 01/01/2026 (`sellers_kpi`)**
Causa raiz: em `supabase/functions/import-csv/index.ts` linhas 216 e 300:
```ts
data: cols[iData]?.trim() || "2026-01-01"
```
Qualquer linha do CSV sem `DATA` válido cai como **01/01/2026**, criando uma "pilha" parasita. Hoje há 459 sellers em 2026-01-01 com GMV total de apenas R$ 22M (vs ~R$ 250M dos meses normais) — são linhas órfãs de outros meses + linhas inválidas.

**Problema 2 — `sellers_kpi_daily` continua com 1 linha**
Em `BatchUploadPanel.tsx` (linhas 33 e 42) os slots **CPP Mensal** e **CPP Diarizada** apontam ambos para `functionName: "import-csv"`. O slot diarizada nunca chama `import-csv-daily` → tabela diária nunca é populada e a função fica órfã.

**Problema 3 — Sem slot dedicado para `seller_listings_quality`**
Quality é populada como subproduto do `import-csv` mensal, mas não há rota independente.

---

## Escopo

### A) Backend / Imports
1. **Corrigir `import-csv/index.ts`**: remover fallback para `"2026-01-01"`. Linhas sem `DATA` válida (formato `YYYY-MM-DD` ou `DD/MM/YYYY`) são **descartadas** e contadas em `rows_skipped`. Aplicar nas duas pilhas (kpiRows e listingRows).
2. **Validar `import-csv-daily/index.ts`**: garantir mesma proteção contra DATA inválida; confirmar que grava em `sellers_kpi_daily` com upsert `seller_id,data`.
3. **Roteamento correto no `BatchUploadPanel`**: slot `cpp_diarizada` → `import-csv-daily`. Adicionar feedback no toast quando rows forem descartadas.

### B) Limpeza dos dados parasitas existentes
Migration que **deleta** as linhas de `sellers_kpi` em `data = '2026-01-01'` cujo seller não tinha atividade real em janeiro (heurística: sellers cujo `gmv_lc < 1% do gmv_lc do mesmo seller em dez/2025 OU fev/2026`). Isso remove os ~250 fantasmas e mantém o que realmente teve operação no início de janeiro.

Alternativa mais segura se preferir: **deletar tudo de 2026-01-01** e reimportar o CSV de janeiro com a função corrigida.

### C) Defesa em profundidade (frontend)
Criar `src/utils/partialPeriodGuard.ts`:
- `isPartialMonth(date, allRows)` → marca um mês como parcial se `gmvTotal < 30% da mediana dos últimos 6 meses`.
- Aplicar em `aggregateByMonth.ts` e nas séries do `ExecutivePanel`/`Faturamento`: meses parciais ficam com badge "Parcial" e podem ser opcionalmente excluídos da linha de tendência via toggle.

---

## Arquivos afetados

```text
supabase/functions/import-csv/index.ts            (corrigir fallback DATA)
supabase/functions/import-csv-daily/index.ts      (validar/proteger)
supabase/migrations/<novo>.sql                    (limpar 2026-01-01 fantasma)
src/components/dashboard/BatchUploadPanel.tsx     (rotear diarizada → import-csv-daily)
src/utils/partialPeriodGuard.ts                   (novo — detector de mês parcial)
src/utils/aggregateByMonth.ts                     (usar guard, propagar __partial)
src/components/dashboard/ExecutivePanel.tsx       (badge "Parcial" + toggle)
```

## Decisão necessária antes de executar

Para o passo **B (limpeza)**, prefere:
- **(B1)** Heurística automática (remove só sellers com GMV < 1% vs meses adjacentes) — preserva sellers que realmente operaram em jan/26.
- **(B2)** Deletar tudo de 2026-01-01 e te dar um botão para reimportar o CSV de janeiro corrigido.
- **(B3)** Não mexer no banco ainda; só corrigir o código e mascarar visualmente via guard parcial.