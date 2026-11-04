# Teste de carga público — 04/11/2026

## Ampliação para 1.000 usuários — 16:37 UTC

- Uma execução k6 2.0.0 no mesmo alvo público: subida até 1.000 usuários em 60 segundos, platô de 60 segundos e descida de 30 segundos. Pico confirmado de 1.000 usuários virtuais; duração efetiva de 153,38 segundos.
- 26.189 navegações e 28.189 requisições HTTP; média na execução inteira de 183,79 requisições/s.
- Uma falha HTTP/documento: **0,00355% das requisições**. O resumo agregado não registra o status ou a causa dessa resposta; não é possível atribuí-la a sobrecarga.
- Páginas: média 82,31 ms; mediana 69,69 ms; p95 **158,04 ms**; p99 292,62 ms; máximo **6.585,35 ms**. O máximo evidencia uma resposta lenta apesar do p95 baixo.
- 55.376 verificações aprovadas e duas reprovadas (a mesma resposta pode reprovar mais de uma verificação); taxa de aprovação 99,9964%. Todos os limites configurados passaram, sem interrupção automática.
- Tráfego recebido: aproximadamente **3,81 GB**; enviado: 25,06 MB. A hospedagem pode cobrar por esse tráfego; o teste não aciona IA, ML ou consultas autenticadas.
- k6 avisou que `gracefulRampDown` não é aceito como opção global; essa opção foi ignorada na execução e removida do script. Não compromete o pico ou as métricas medidas; aplica-se o padrão de conclusão de iterações do executor. A configuração corrigida foi validada sem repetir a carga em produção.

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