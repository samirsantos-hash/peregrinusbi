# Teste de carga público — 04/11/2026

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