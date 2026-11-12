# Paleta Alquimia no Resumo geral, com opção de desfazer

## O que muda
- Só na tela **Resumo geral** (Comando Central → Resumo), no tema escuro. As outras telas, o tema claro e o login ficam iguais.
- Fundo: degradê quase preto (#030504 a #0A1710).
- Cartões de vidro: luz branca na borda de cima à esquerda, um leve brilho azul (#0057B7) na diagonal e reflexo dourado (#FFD700) embaixo à direita. Ao passar o mouse, o dourado fica um pouco mais forte.
- Azul (#0057B7): links, ícones em foco e a linha principal dos gráficos do Resumo.
- Números que subiram e setas de alta: verde #30D158. O vermelho de queda continua igual.

## Opção de desfazer
- Botão "Paleta Alquimia" com a opção ligada ou desligada, no topo do Resumo geral.
- Desligado, o Resumo volta ao visual atual na hora.
- A escolha fica salva no navegador, separada para cada usuário.

## Exceção às regras atuais
Hoje o painel não usa azul e reserva o amarelo para datas. A exceção vale só dentro do Resumo, com a paleta ligada, e fica registrada na memória do projeto. As datas continuam em amarelo #FFE500.

## Detalhes técnicos
- Tokens novos `--alq-*` em src/index.css, aplicados pelo seletor `.dark .paleta-alquimia`. A classe entra no TabsContent do Resumo em Index.tsx.
- `src/lib/paletaAlquimia.ts` guarda a escolha em localStorage (chave por uid) e apaga junto com o período salvo ao sair.
- O brilho de cima usa `::after`, para não conflitar com o `::before` do vidro atual. Há alternativa para quando o navegador não aplica o desfoque.
- Teste: a escolha salva é lida de volta para o mesmo usuário e não vaza para outro.
- Rodar o k6 público antes de entregar. Não publicar.
