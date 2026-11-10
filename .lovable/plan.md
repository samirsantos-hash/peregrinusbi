# Ajustes de conformidade com os termos do Mercado Livre

As etapas seguem a ordem combinada. Cada uma é entregue e conferida separadamente, sem publicar.

## Etapa 1 — Proteger dados pessoais nas perguntas enviadas à IA
- Antes de pedir a sugestão, apagar da pergunta do comprador telefone, e-mail, CPF/CNPJ, CEP, links e @usuário. Cada um vira um marcador, como "[telefone removido]".
- Conferir também a sugestão devolvida pela IA. Se ela tiver contato ou link, bloquear e avisar quem está respondendo.
- O pedido à IA continua sem guardar o conteúdo, e a pergunta original não é gravada junto com a sugestão.
- Testes com exemplos reais de formato: "(43) 99999-0000", "fulano@gmail.com", "123.456.789-00", "wa.me/...".

## Etapa 2 — Resposta da tela "Ao vivo" com prévia e confirmação
- A tela "Ao vivo" passa a usar o mesmo fluxo da tela Perguntas: pré-visualizar, confirmar e enviar.
- Fica com a mesma proteção contra envio em dobro e o mesmo registro de quem respondeu e quando.
- A função antiga continua só para sugerir o rascunho com IA. A parte que enviava a resposta direto é removida.
- Conferir na loja de teste sem enviar resposta real (somente a prévia).

## Etapa 3 — Concorrentes sem guardar dados de terceiros
- Conferir quais telas de concorrentes e de estudo de mercado gravam dados de outras lojas.
- Fazer as comparações apenas no momento da consulta, sem histórico de lojas concorrentes.
- Mostrar o aviso "comparação no momento da consulta".
- Antes de liberar de novo qualquer histórico, você confere no portal de desenvolvedores do Mercado Livre se o aplicativo tem essa permissão.

## Etapa 4 — Prazo de guarda e desconexão
- Ao desconectar uma loja: apagar o acesso dela e os resumos e cópias ligados a ela.
- Definir um prazo de guarda para os históricos (sugestão: 24 meses), com limpeza automática.
- Registrar a regra na documentação do projeto.

## Etapa 5 — Agentes externos
- Deixar a conexão de agentes externos desligada por padrão. A liberação fica só com a conta master, pela checklist de liberações.
- Registrar cada consulta feita por agente: quem fez, qual ferramenta, qual loja e quando, sem guardar o conteúdo devolvido.

## O que depende de você
- Conferir no portal de desenvolvedores do Mercado Livre as permissões aprovadas para o aplicativo.
- Confirmar o prazo de guarda (24 meses ou outro).
- Validação jurídica, se desejar. Este plano é técnico.

## Detalhes técnicos
- Etapa 1: nova função pura `_shared/limparDadosPessoais.ts` com testes em Deno, aplicada em `ml-responder-pergunta` (ação "sugerir") e também nos textos enviados por `recomendar-seller` e `ml-listing-improve`, se recebem texto livre.
- Etapa 2: `ResponderPergunta` em `MlAoVivo.tsx` chama `ml-questions-answer` (etapas `previa`/`confirmar` com `idempotency_key`). A ação "responder" de `ml-responder-pergunta` é removida e passa a devolver 410. Atualizar `docs/ml-gestao.md`.
- Etapa 3: auditar gravações em `ml-busca-concorrentes` e `ml-market-study`.
- Etapa 4: limpeza no fluxo de desconexão e uma tarefa agendada de retenção.
- Etapa 5: permissão nova no catálogo central de liberações e uma tabela de registro com acesso só para master/desenvolvedor.
- Antes de cada etapa, rodar `scripts/k6-publico.js`. Sem publicar.
