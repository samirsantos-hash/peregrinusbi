---
name: Eligibility discount units
description: discount_* columns in seller_eligibility are stored in tenths of a percentage point (×10), NOT basis points
type: feature
---
`seller_eligibility.discount_seller_percentage`, `discount_total` e `discount_best` são gravados em **décimos de ponto percentual (×10)**: 30 = 3,0%, 50 = 5,0%, 274 = 27,4%. Evidência: 58k linhas com total=30 e 19k com total=50 (pisos de campanha 3% e 5%), p99=559 (55,9%). **Não são basis points** — dividir por 100 subestima o desconto em 10x. Sempre dividir por 10 antes de exibir % ou comparar com thresholds humanos. `useEligibility` retorna o valor cru — divisão feita no consumidor.