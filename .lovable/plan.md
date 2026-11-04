# Cache, tela inicial da carteira, alerta de lentidão e teste de carga obrigatório

## 1. Cache das páginas mais acessadas
- Guardar no navegador (por até 24h, por usuário) os dados das abas mais usadas: Visão geral, Reputação, Preço, Publicidade e Logística. Ao reabrir, a tela aparece na hora com o último dado e se atualiza em segundo plano.
- O cache é apagado ao sair da conta ou quando uma permissão é revogada, para nunca mostrar dados de loja a quem perdeu acesso.
- Arquivos da página (visual, fontes) já são guardados pelo navegador; vamos confirmar e ajustar a validade.

## 2. Tela inicial = resumo da carteira
- Ao entrar, sem loja selecionada, o usuário vê o total da sua carteira: faturamento, pedidos, ticket, reputação, Ads e Full somados apenas das lojas que ele pode ver, com comparação ao período anterior.
- Masters veem todas as lojas; consultores, só as atribuídas.
- Ao escolher uma loja no seletor, todas as métricas passam a ser filtradas por ela (comportamento atual mantido). Um botão "Voltar à carteira" limpa a seleção.

## 3. Alerta de resposta acima de 1 segundo (só para você, desenvolvedor)
- O painel mede o tempo de cada consulta e função. Quando passar de 1s, registra um aviso em Administração → Avisos do desenvolvedor, com nome da tela/função, tempo e horário — sem dados de clientes.
- Avisos repetidos da mesma origem são agrupados (contador), mantidos por 30 dias.
- Aparece um selo no menu quando houver avisos novos.

## 4. Ambiente de produção e teste de carga obrigatório
- Produção = site publicado (ecomperegrinus.com.br). Mudanças grandes serão feitas antes em um rascunho separado, com banco de testes próprio, e só depois aceitas.
- Nova regra do projeto: toda tela nova ou ajuste roda o teste k6 antes de concluir (100 usuários por padrão; 1.000 em mudanças de página inicial). Resultado anotado no registro de testes. Falha acima de 1% ou 95% das respostas acima de 1s bloqueia a entrega.
- Limitação: o teste continua sem logar e sem acionar Mercado Livre, IA ou banco, então não mede a capacidade do painel logado.

## Detalhes técnicos
- Cache: `@tanstack/query-sync-storage-persister` + `persistQueryClient` em `App.tsx`, `buster` por user id, allowlist de queryKeys, limpeza em `signOut` e quando `minhas_permissoes` muda.
- Resumo: reaproveitar `CarteiraNaSecao` e RPCs de indicadores security-invoker em lote filtrando seller IDs (rejeitar leitura parcial).
- Lentidão: wrapper em `fetch` do cliente e `functions.invoke` medindo duração; envio para RPC de telemetria existente com código allowlisted `resposta_lenta` e origem allowlisted; deduplicação no servidor.
- Regra em `AGENTS.md` e `docs/teste-carga-k6.md`; teste vitest para o limite de 1000ms e para a limpeza do cache.
