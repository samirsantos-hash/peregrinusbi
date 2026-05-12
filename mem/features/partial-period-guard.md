---
name: Partial Period Guard
description: Detects and flags partial months (gmv < 30% of median) and source of historical Jan 2026 ghost rows fix
type: feature
---
- Importer (`import-csv`, `import-csv-daily`) **rejects rows with invalid/empty DATA** instead of dumping into 2026-01-01. Returns `rows_skipped_no_date` in response.
- BatchUploadPanel: slot `cpp_diarizada` → `import-csv-daily` (was incorrectly `import-csv`).
- `src/utils/partialPeriodGuard.ts` exposes `detectPartialMonths(rows, {gmvField,thresholdPct=0.3})` and tags monthly aggregates with `__partial` + `__partialShare`.
- `aggregateKpisByMonth` auto-tags months below 30% of median GMV.
- Cleanup migration removed sellers from 2026-01-01 whose GMV was <5% of dec/feb adjacent months (B1 heuristic).
