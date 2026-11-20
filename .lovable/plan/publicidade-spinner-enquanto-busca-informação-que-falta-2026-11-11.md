# Publicidade: spinner enquanto busca informação que falta

## O que muda para você
- Ao abrir a Publicidade de uma loja, o painel confere se faltam dias recentes nas campanhas (ex.: dados só até 04/11).
- Se faltar, ele **busca sozinho** no Mercado Livre, sem precisar clicar em "Atualizar".
- Durante essa busca, as células que estariam em branco (TACOS, CTR, CPC, receita, etc.) e o detalhe da campanha mostram um **spinner pequeno**, e o topo mostra "Completando dados…".
- Ao terminar, os números aparecem. Se mesmo assim o Mercado Livre não tiver o dado, o spinner some e fica "Sem dado" (nunca fica girando para sempre, nem vira zero).
- Isso também cobre o carregamento normal: enquanto os dados ainda estão chegando, aparece o spinner em vez do traço.

## Detalhes técnicos
- `src/pages/Publicidade.tsx`: após `dados` carregar, se o maior `dia` de `ml_ads_metrics_daily` (nível campanha) for anterior a ontem, disparar uma vez por conta/sessão `ml-ads-sync` em segundo plano (mesma função do botão, já respeita `ml_pode_gerir_conta`); estado `completando` repassado aos componentes; timeout de 90 s.
- Novo `src/components/ds/CelulaCarregando.tsx`: renderiza `Loader2` animado quando `carregando`, senão o valor formatado ou "Sem dado".
- `CampanhasAds.tsx`, `AnunciosAds.tsx`, `VisaoGeralAds.tsx`: trocar "—" das métricas por `CelulaCarregando` usando `completando || serie.isLoading || resumo.isLoading`.
- Teste: função pura `precisaCompletar(ultimoDia, hoje)` com casos de dado em dia, atrasado e sem dado.
