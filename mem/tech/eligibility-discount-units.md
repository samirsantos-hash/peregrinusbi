---
name: Eligibility discount units
description: discount_* columns in seller_eligibility are stored as basis points (×100), not percent
type: feature
---
`seller_eligibility.discount_seller_percentage`, `discount_total` and `discount_best` are stored in basis points (×100). p50=100 (=1%), p90=277 (=2,77%), max=759 (=7,59%). Sempre dividir por 100 antes de exibir % ou comparar com thresholds humanos. `useEligibility` retorna o valor cru — divisão deve ser feita no consumidor.