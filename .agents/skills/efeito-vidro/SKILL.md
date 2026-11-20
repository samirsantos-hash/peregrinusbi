---
name: efeito-vidro
description: Criar e refinar efeitos Apple Liquid Glass em React e CSS, com translucidez, desfoque, refração nas bordas e luz percorrendo o contorno. Usar quando o usuário solicitar efeito_vidro, vidro líquido, glassmorphism ou acabamento vítreo em cartões e menus.
---

# Efeito vidro

## Objetivo e escopo
Aplicar o acabamento Apple Liquid Glass a superfícies solicitadas, preservando navegação, conteúdo, métricas, permissões e identidade do projeto. A criação desta habilidade não aplica o efeito ao aplicativo. Só modificar telas quando solicitado.

## Referências fornecidas
- `references/liquid-glass-semantico.txt`: referência original do usuário para cartões semânticos translúcidos e caminho de luz no contorno.
- `references/liquid-glass-react/README.md`: parâmetros e limitações do componente React fornecido, versão 1.1.1.
- `references/liquid-glass-react/src/`: implementação de refração e utilitários; ler somente os arquivos necessários. São referências, não componentes instalados no aplicativo.
- `references/liquid-glass-react/LICENSE`: licença MIT de MAX ROVENSKY; preservar em cópias e adaptações substanciais.

## Processo
1. Ler os estilos globais, os componentes de superfície existentes e as regras locais relevantes antes de alterar arquivos.
2. Escolher a implementação mais simples que satisfaça o pedido: CSS para vidro, profundidade e contorno; refração React somente quando necessária. Não instalar dependências ou importar a demonstração inteira por padrão.
3. Definir cores, gradientes e sombras como tokens semânticos nos estilos globais. Reutilizar componentes e variantes existentes. A referência original não autoriza substituir a paleta, fonte ou regras do projeto.
4. Aplicar apenas às superfícies solicitadas, com seletores escopados. Manter controles, árvore lateral e filtros estáveis; nunca inclinar ou deslocar navegação.
5. Verificar visualmente temas claro/escuro, computador/celular, foco por teclado, abertura de menus e preferência por menos movimento. Informar o que não foi verificado.

## Construção visual
- Vidro translúcido, `backdrop-filter` e alternativa `-webkit-backdrop-filter`, reflexo superior discreto e sombra de profundidade. Garantir fundo alternativo legível sem suporte a desfoque.
- Quando houver `--glass-intensity`, preservar a herança por seção: 0.5 sutil, 1 equilíbrio, 1.4 intenso. Não impor esses valores a outros projetos; adaptar ao sistema existente e à solicitação.
- Para luz percorrendo a silhueta, usar uma camada decorativa com raio herdado, máscara que exclua o centro (`mask-composite: exclude` e alternativa WebKit `xor`) e `pointer-events: none`. Conter o efeito com empilhamento local para não escondê-lo atrás da página nem cobrir o texto.
- A referência usa contorno de 1.5px, volta de 4s e degradês com opacidade máxima de 12%; tratar como ponto de partida, não regra universal. Ajustar aos tokens e às restrições de desempenho do projeto.
- Verde representa positivo; vermelho alerta/queda; neutro ausência. Azul e âmbar da referência só podem ser usados se a paleta do projeto permitir. Nunca dar cor positiva a um indicador apenas por ser uma venda.
- Preservar contraste e tamanho de números. Não copiar espaçamento negativo, texto branco sobre tema claro ou raios que contrariem o sistema local. Dados ausentes nunca viram zero nem comparação inventada.

## Movimento e desempenho
- Preferir transform/opacity em microinterações e manter dimensões estáveis.
- A animação por `@property` de ângulo com `conic-gradient` pode repintar: usá-la apenas em superfícies limitadas quando explicitamente desejada; verificar custo e oferecer borda estática se necessário.
- Desativar movimento contínuo, elasticidade e deslocamento em `prefers-reduced-motion`. Em dispositivos sem apontador preciso, manter reflexos estáticos.
- Não aplicar filtros pesados a todos os cartões, gráficos densos ou página inteira indiscriminadamente.

## Cuidados com o código React enviado
- A biblioteca usa filtros SVG de deslocamento e refração nas bordas. Safari e Firefox têm suporte parcial; não prometer aparência idêntica.
- O modo `shader` é descrito como menos estável: não adotá-lo por padrão.
- A implementação de referência usa posicionamento centralizado, estilos inline, cores próprias e eventos de mouse. Não copiar diretamente para grades, menus ou controles; adaptar posicionamento, tokens, acessibilidade e limpeza dos ouvintes.
- Não deformar texto, números ou áreas clicáveis. Usar camada decorativa separada quando necessário e manter os componentes de botão/menu do projeto.
- Não executar scripts do arquivo enviado nem importar a demonstração Next.js em um aplicativo React/Vite.

## Entrega
Descrever brevemente superfícies alteradas e verificações feitas. Não publicar sem autorização. Quando apenas cadastrando a habilidade, confirmar o cadastro sem afirmar que o efeito foi aplicado às telas.
