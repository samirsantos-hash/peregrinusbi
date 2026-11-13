# Ajustes de conformidade com os termos do Mercado Livre

Base: as regras de trabalho e as diretrizes que você enviou nos documentos "Dados e gestão via API do Mercado Livre" e "Estrutura de gestão no Mercado". Elas pedem só os canais da documentação oficial, nenhuma coleta de páginas, e toda escrita com prévia "antes → depois", confirmação sem duplicar e registro.

As etapas seguem a ordem combinada. Faço uma por vez e paro ao fim de cada uma até você responder "OK, próxima etapa". Nada será publicado.

## Etapa 1 — Proteger dados pessoais nas perguntas enviadas à IA
- Antes de pedir a sugestão, apagar da pergunta do comprador telefone, e-mail, CPF/CNPJ, CEP, links e @usuário. Cada um vira um marcador, como "[telefone removido]".
- Conferir também a sugestão devolvida pela IA. Se ela tiver contato ou link, bloquear e avisar quem está respondendo.
- O pedido à IA continua sem guardar o conteúdo, e a pergunta original não é gravada junto com a sugestão.
- Testes com exemplos reais de formato: "(43) 99999-0000", "fulano@gmail.com", "123.456.789-00", "wa.me/...".

## Etapa 2 — Resposta da tela "Ao vivo" com prévia e confirmação
- Hoje essa tela descumpre a sua regra 5: envia a resposta sem prévia, sem proteção contra clique duplo e sem registro.
- A tela "Ao vivo" passa a usar o mesmo fluxo da tela Perguntas: pré-visualizar, confirmar e enviar.
- Fica com a mesma proteção contra envio em dobro e o mesmo registro de quem respondeu e quando.
- A função antiga continua só para sugerir o rascunho com IA. A parte que enviava a resposta direto é removida.
- Conferir na loja de teste sem enviar resposta real (somente a prévia).

## Etapa 3 — Conferir se concorrentes e estudo de mercado seguem a documentação
- Os documentos preveem o estudo de mercado pelos canais oficiais (mais vendidos, tendências, concorrência em catálogo). Por isso, o risco aqui fica baixo.
- Listar cada consulta feita a esse respeito e confirmar que todas estão nos links oficiais que você enviou. Nenhuma pode ler páginas do site.
- Qualquer consulta fora dessa lista será removida ou substituída, e eu aviso antes.
- Conferir se dados de outras lojas são gravados. Se forem, guardar só o necessário para a comparação, como a faixa de preço, sem copiar textos ou fotos.

## Etapa 4 — Prazo de guarda e desconexão
- Ao desconectar uma loja: apagar o acesso dela e os resumos e cópias ligados a ela.
- Definir um prazo de guarda para os históricos (sugestão: 24 meses), com limpeza automática.
- Registrar a regra na documentação do projeto.

## Etapa 5 — Agentes externos
- Deixar a conexão de agentes externos desligada por padrão. A liberação fica só com a conta master, pela checklist de liberações.
- Registrar cada consulta feita por agente: quem fez, qual ferramenta, qual loja e quando, sem guardar o conteúdo devolvido.

## O que depende de você
- Conferir no portal de desenvolvedores do Mercado Livre se as permissões de leitura e escrita do aplicativo cobrem perguntas, promoções, publicidade e preço.
- Confirmar o prazo de guarda (24 meses ou outro).
- Validação jurídica, se desejar. Este plano é técnico.

## Detalhes técnicos
- Etapa 1: nova função pura `_shared/limparDadosPessoais.ts` com testes em Deno, aplicada em `ml-responder-pergunta` (ação "sugerir") e também nos textos enviados por `recomendar-seller` e `ml-listing-improve`, se recebem texto livre.
- Etapa 2: `ResponderPergunta` em `MlAoVivo.tsx` chama `ml-questions-answer` (etapas `previa`/`confirmar` com `idempotency_key`). A ação "responder" de `ml-responder-pergunta` é removida e passa a devolver 410. Atualizar `docs/ml-gestao.md`.
- Etapa 3: auditar gravações em `ml-busca-concorrentes` e `ml-market-study`.
- Etapa 4: limpeza no fluxo de desconexão e uma tarefa agendada de retenção.
- Etapa 5: permissão nova no catálogo central de liberações e uma tabela de registro com acesso só para master/desenvolvedor.
- Antes de cada etapa, rodar `scripts/k6-publico.js`. Sem publicar.
