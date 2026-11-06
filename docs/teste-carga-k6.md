# Teste de carga público — 04/11/2026

## Ampliação para 1.000 usuários — 16:37 UTC

- Uma execução k6 2.0.0 no mesmo alvo público: subida até 1.000 usuários em 60 segundos, platô de 60 segundos e descida de 30 segundos. Pico confirmado de 1.000 usuários virtuais; duração efetiva de 153,38 segundos.
- 26.189 navegações e 28.189 requisições HTTP; média na execução inteira de 183,79 requisições/s.
- Uma falha HTTP/documento: **0,00355% das requisições**. O resumo agregado não registra o status ou a causa dessa resposta; não é possível atribuí-la a sobrecarga.
- Páginas: média 82,31 ms; mediana 69,69 ms; p95 **158,04 ms**; p99 292,62 ms; máximo **6.585,35 ms**. O máximo evidencia uma resposta lenta apesar do p95 baixo.
- 55.376 verificações aprovadas e duas reprovadas (a mesma resposta pode reprovar mais de uma verificação); taxa de aprovação 99,9964%. Todos os limites configurados passaram, sem interrupção automática.
- Tráfego recebido: aproximadamente **3,81 GB**; enviado: 25,06 MB. A hospedagem pode cobrar por esse tráfego; o teste não aciona IA, ML ou consultas autenticadas.
- k6 avisou que `gracefulRampDown` não é aceito como opção global; a inspeção final também sinalizou `gracefulStop`. Ambas foram removidas do script. Não compromete o pico ou as métricas medidas; aplica-se o padrão de conclusão de iterações do executor. A configuração corrigida foi validada sem repetir a carga em produção.

**Conclusão:** boa entrega pública nesta janela, com uma falha e uma resposta de 6,59 segundos. Não comprova 1.000 pessoas usando o painel logado, gráficos, banco ou integrações. Mantido o mesmo escopo restrito do teste anterior.

## Resultado medido

- Alvo: https://ecomperegrinus.com.br, páginas `/` e `/index`.
- k6 2.0.0, executado a partir de um único gerador no ambiente de desenvolvimento.
- Subida de 0 a 100 usuários virtuais em 20 segundos, 100 usuários por 60 segundos, descida em 20 segundos; duração efetiva com conclusão das iterações: 103,23 segundos.
- Cada usuário aguarda de 3 a 5 segundos entre navegações. JS/CSS da aplicação baixados uma vez por usuário; demais recursos, terceiros e arquivos lazy não são carregados.
- 2.009 navegações e 2.209 requisições HTTP; média de 21,40 requisições/s na execução inteira (não a taxa isolada do platô).
- Zero falhas HTTP e zero documentos inválidos; 4.318 verificações aprovadas.
- Tempo HTTP das páginas: média 88,33 ms; mediana 76,71 ms; p95 164,92 ms; p99 264,78 ms; máximo 1.322,56 ms.
- Todos os limites do script passaram: falhas <1%, verificações >99%, p95 das páginas <2 segundos. Interrupção automática configurada para falhas ≥5% após 10 segundos.

## Limites da conclusão

O resultado comprova somente a entrega pública das páginas e dos arquivos selecionados nesta janela. Não executa JavaScript nem mede renderização, gráficos, login, consultas autenticadas, banco, IA, sincronizações ou Mercado Livre. Não representa 100 contas distintas usando o painel e não certifica sua capacidade analítica. Nenhum dado foi alterado e nenhuma função paga foi acionada pelo script; houve tráfego de hospedagem (aproximadamente 378 MB recebidos, incluindo cabeçalhos), que pode ter custo de infraestrutura.

## Repetição

Com k6 instalado, a partir da raiz do projeto:

```sh
K6_SUMMARY_PATH=/tmp/k6-publico-summary.json k6 run scripts/k6-publico.js
```

O resumo bruto é gravado fora do repositório. O alvo é fixo e somente de leitura. Evitar execuções repetidas desnecessárias em produção. Um teste futuro autenticado precisa de cenário próprio com contas autorizadas e leituras limitadas; não deve chamar ML ou IA para simular simples navegação.
## Regra obrigatória (04/11/2026)
- 06/11: entrada suave e círculo de carregamento, k6 público prévio com 1.000 usuários, 28.430 requisições, zero falhas, p95 HTTP 79,62ms; somente entrega pública, não mede animação nem painel autenticado.
- 06/11: letras no carregamento, k6 público prévio com 1.000 usuários, 28.437 requisições, zero falhas, p95 HTTP 82,48ms; entrega pública somente, não mede animação ou painel autenticado.
- 06/11: comparação SWOT de anúncios, k6 público prévio com 1.000 usuários, 28.470 requisições, zero falhas, p95 HTTP 79,25ms; somente entrega pública, não mede comparação autenticada nem API ML.
- 06/11: analisador de título v2, k6 público prévio 1.000 usuários, 28.444 requisições, zero falhas, p95 HTTP 81,39ms; entrega pública somente, não mede análise autenticada ou API de categoria.
- 06/11: organização de Anúncios → Correlações, k6 público prévio 1.000 usuários, 28.444 requisições, zero falhas, p95 HTTP 82,57ms; somente entrega pública, não mede análises autenticadas ou Mercado Livre.
- 06/11: funil suave e impressões reais de Ads, k6 público prévio 1.000 usuários, 28.528 requisições, zero falhas, p95 60,74ms; não mede painel autenticado, impressões ou API ML.
- 06/11: cobertura de participação Ads/TACOS, k6 público prévio 1.000 usuários, 28.410 requisições, zero falhas, p95 65,07ms; não mede painel autenticado nem a API ML.
- 06/11: Promoções em Oportunidades, k6 público prévio 1.000 usuários, 28.419 requisições, zero falhas, p95 61,04ms; somente entrega pública, não mede resultados promocionais nem painel autenticado.
- 06/11: caixa de preço/margem, k6 público prévio 1.000 usuários, 28.454 requisições, zero falhas, p95 63,17ms; não mede painel autenticado ou escrita ML.
- 06/11: linhas do funil, k6 público prévio 1.000 usuários, 28.444 requisições, zero falhas, p95 62,96ms; não mede painel logado ou ML.
- 06/11: proporções do funil, k6 público prévio 1.000 usuários, 28.431 requisições, zero falhas, p95 68,27ms; somente entrega pública, não mede painel logado.
- 06/11: escrita da marca na Home/painel, k6 público prévio com 1.000 usuários, 28.439 requisições, zero falhas, p95 65,43ms; somente entrega pública, sem painel autenticado, IA ou ML.
- 05/11/2026: aplicação do estudo de Reputação, k6 público prévio com 1.000 usuários conforme script existente, 28.440 requisições, zero falhas, p95 71,32ms. Apenas entrega pública; não mede painel autenticado, IA ou Mercado Livre.
- 05/11/2026 às 22:45: modo claro e proporções tipográficas, teste prévio de 1.000 usuários, 28.492 requisições, zero falhas, p95 público 63,81ms. Sem login, IA ou Mercado Livre; não mede painel autenticado.
- 05/11/2026 às 22:32: vidro da Home e painel, k6 prévio com 1.000 usuários, 28.482 requisições, zero falhas, p95 público 58,91ms. Apenas entrega pública; não mede painel autenticado, IA ou Mercado Livre.
 - 05/11/2026: árvore de acessos e detalhes laterais, k6 prévio de 1.000 usuários, 28.388 requisições, zero falhas, p95 público 87,39 ms; entrega pública somente, não mede painel autenticado.
 - 05/11/2026: modal real dos pedidos, k6 prévio de 1.000 usuários, 28.357 requisições, zero falhas, p95 público 108,96 ms; somente páginas/arquivos públicos, sem capacidade autenticada ou ML.
 - 05/11/2026: busca de loja na Publicidade, k6 prévio de 100 usuários (20s/60s/20s), 2.200 requisições, zero falhas, p95 público 127,18 ms; não mede painel autenticado.
 - 05/11/2026: recomendações abertas, k6 prévio de 100 usuários (20s/60s/20s), 2.218 requisições, zero falhas, p95 público 124,22 ms; não mede painel autenticado ou ingestão dos eventos.
 - 05/11/2026: evento de troca de loja, k6 prévio de 1.000 usuários (60s/60s/30s), 28.310 requisições, zero falhas, p95 público 110,51 ms; sem login, IA ou ML, não comprova ingestão de eventos.
 - 05/11/2026: instrumentação de abertura de análises, k6 prévio de 100 usuários (20s/60s/20s), 2.202 requisições, zero falhas, p95 público 117,47 ms; não mede painel autenticado ou ingestão dos eventos.
 - 05/11/2026: Produtos e busca de loja, k6 prévio de 100 usuários, 2.231 requisições, zero falhas, p95 público 74,61 ms. Não mede painel autenticado ou ML.
 - 05/11/2026: revisão de qualidade e ranking de Clips, k6 prévio com 100 usuários, 2.223 requisições, zero falhas, p95 público 83,26 ms (também abaixo de 1s). Apenas entrega pública, sem painel autenticado, IA ou ML.
 - 05/11/2026: antes das três correções de monitoramento, 100 usuários (20s subida, 60s platô, 20s descida), 2.222 requisições, zero falhas, p95 público 90,62 ms. Não mede painel autenticado, sincronizações ou capacidade do banco.
 - 05/11/2026: remoção de matriz repetida em Publicidade; teste prévio com 100 usuários (20s subida, 60s platô, 20s descida), 2.238 requisições, zero falhas, p95 público 70,80 ms. Não mede painel autenticado.
Toda tela nova ou ajuste roda este teste antes da entrega: 100 usuários por padrão, 1.000 quando mexer na página inicial. Bloqueia se falhas >1% ou p95 >1s. Registrar o resultado abaixo.
- 04/11/2026: 100 usuários, 40s, 997 iterações, 1.197 requisições, 0 falhas, p95 158 ms (cache + resumo da carteira + alerta 1s).

## Painel logado — 04/11/2026

Script: `scripts/k6-painel-logado.js` (conta de teste só leitura com 3 lojas, login único no setup; consultas do resumo e da lista de lojas; subida 50 → 200 → 500 → 1000 com parada automática).

Resultado no site publicado: **o teste parou sozinho com cerca de 24 usuários simultâneos**. Resumo em ~8,7 s (p95 8,9 s) e 15% das consultas falharam; a lista de lojas não chegou a ser medida. Com 1 usuário, o resumo abriu em ~20 s no navegador.

Causas encontradas:
- A consulta da data mais recente dos indicadores mensais leva ~3,9 s mesmo sozinha: a regra de acesso por loja é avaliada linha a linha antes do `limit 1`.
- Ao abrir o painel, papel e acesso do usuário são consultados 27 vezes cada (deveria ser 1).

Conclusão: o painel logado ainda não suporta 1000 usuários; corrigir esses dois pontos antes de repetir o teste.

### Após correção — 04/11/2026

Correções: regras de acesso por loja calculadas uma vez por consulta (não mais linha a linha) e leitura do perfil do usuário compartilhada entre as telas (era repetida 27 vezes).

- 20 consultas simultâneas: de ~3,5 s para ~0,3 s cada (mediana).
- k6: chegou a **~300 usuários simultâneos** (antes parava em 24). Até aí, resumo com mediana 0,4 s e p90 0,58 s; lojas com mediana 0,2 s e p90 0,48 s.
- Acima de ~300 usuários as respostas passam a esgotar o tempo e o teste parou sozinho. 1000 usuários ainda não é suportado no tamanho atual do servidor.
- Conferido: master continua vendo as 1.093 lojas; a conta de teste vê só a sua loja.
- Acima de ~300 usuários o banco ficou indisponível por cerca de 1 minuto logo após o teste e depois voltou sozinho.

### Saída de emergência — 04/11/2026

Regra (`src/lib/saidaEmergencia.ts`): 3 respostas lentas (>3 s), recusadas (429/5xx) ou sem resposta em 30 s pausam as consultas por 60 s; nesse tempo o painel mostra a última cópia boa das leituras e um aviso; escritas sempre vão ao servidor.

k6 em degraus 500 → 600 → 700 → 800 → 900 → 1000 com a mesma regra em cada usuário simulado:
- Chegou a **819 usuários simultâneos** antes de parar (falhas acima de 15%); antes da saída, parava em ~300.
- 69% das aberturas foram atendidas pela cópia guardada, sem consultar o banco.
- Resumo: mediana 4,3 s; lojas: mediana 1,4 s (com fila no servidor).
- **O banco não caiu** (antes ficou ~1 min fora do ar).
