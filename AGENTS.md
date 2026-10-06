# Architecture Rules

- Mercado Livre OAuth callbacks consume one-time state only after token exchange and finish only authorization-critical work before redirecting; schedule historical backfills with `EdgeRuntime.waitUntil` to avoid gateway timeouts.- Lojistas sem login conectam o Mercado Livre por convite público de uso único (`/conectar/:token`, 7 dias), validado apenas no servidor; convites são acessíveis só pelas funções do servidor.

- Listas completas de lojas no frontend usam `fetchAllRows` (src/lib/fetchAllRows.ts) com ordem estável; o servidor corta em 1000 linhas e lojas além disso sumiam das buscas.
- A revisão de planilhas com IA (Admin → Revisão IA) detecta inconsistências com regras determinísticas no navegador (src/lib/revisaoPlanilha.ts) e envia só os alertas à função `revisar-planilha` (só admin) para o modelo resumir; o modelo nunca inventa achados nem grava dados.
- A leitura de carteira (modelo Deep Dive) não tem tela própria: `CarteiraNaSecao` entra nas seções existentes do painel quando nenhuma loja está selecionada; cálculo em funções puras em src/lib/carteiraDeepDive/calculo.ts (mesma janela de dias) e limites só em src/config/limiaresCarteira.ts.
- index.html declara `lang="pt-BR"` e bloqueia tradução automática (`translate="no"`, meta google notranslate): o tradutor do navegador altera o DOM e derruba o React com erro de insertBefore.
