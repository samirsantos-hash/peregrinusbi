# Reflexo de espelho localizado ao mover o mouse

## O que muda
Hoje, ao passar o mouse sobre um quadro, aparece uma faixa diagonal larga de brilho. Ela será trocada por um reflexo de espelho pequeno e nítido, que fica no ponto do cursor:
- Um ponto de luz pequeno e bem definido sob o cursor, como uma luz batendo em vidro.
- Um brilho leve na borda do quadro, só no lado mais perto do mouse.
- Uma leve mudança de ângulo da faixa de reflexo conforme o cursor anda pelo quadro, para dar a sensação de espelho.
- O reflexo entra e sai em cerca de 150 ms e fica atrás dos textos e números, que continuam legíveis.
- Não muda nada no celular nem para quem ativou a opção de reduzir movimento.
- A tela de login não muda.

## Detalhes técnicos
- `GlassPointer.tsx`: além de `--glass-x/--glass-y`, passar a enviar `--glass-px/--glass-py` (posição de 0 a 1) e `--glass-angle` (ângulo do reflexo conforme a posição horizontal), ainda limitado a uma atualização por quadro de animação.
- `src/index.css` (regra `[data-glass-active]`, por volta da linha 1195): trocar o gradiente largo por três camadas:
  1. Ponto de luz com `radial-gradient` de cerca de 90px, branco a 35%, no lugar do cursor.
  2. Faixa especular estreita com `linear-gradient(var(--glass-angle))` em baixa opacidade.
  3. Brilho de borda com `mask` só no anel de 1px, mais forte no lado do cursor.
- Modo claro com intensidade menor. A transição usa só `opacity`, nunca `transition: all`.
- Conferir com Playwright nos dois temas com o mouse sobre um quadro de KPI.
