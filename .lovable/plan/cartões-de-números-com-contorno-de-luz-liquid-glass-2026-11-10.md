# Cartões de números com contorno de luz (Liquid Glass)

## O que muda
- Os cartões de números (KpiVidro) ganham o vidro líquido do arquivo: cantos de 20px, desfoque, sombra funda e um filete de luz girando pela borda (volta de 4s).
- Cor do vidro conforme o resultado comparado ao período anterior:
  - melhorou: verde do painel
  - piorou: vermelho do painel
  - estável, sem comparação ou indicador neutro: vidro neutro (branco suave)
- Números e rótulos continuam nítidos; a luz fica atrás do texto.

## Adaptações às regras do painel
- Azul e âmbar do arquivo não serão usados (fora da paleta; laranja é proibido). Indicador "neutro" fica no vidro neutro, não azul.
- Verde/vermelho do arquivo trocados por #3BD394 / #D62410 do painel.
- Texto branco só no tema escuro; no tema claro o vidro fica claro e os textos escuros.
- Menos movimento no aparelho: luz parada e sem elevação ao passar o mouse.
- Aplicado só aos cartões de números, não a gráficos, menus ou árvore lateral (desempenho).

## Detalhes técnicos
- `src/index.css`: tokens `--glow-*` semânticos, `.liquid-card`, `::before` com conic-gradient + `@property --glow-angle`, máscara exclude/xor, `isolation: isolate`, respeitando `--glass-intensity`.
- `KpiVidro.tsx`: calcula `data-tema` (verde/vermelho/neutro) a partir de `delta` e `melhorQuando`; mantém a estrutura e a animação de número existentes.
- Verificação: Playwright autenticado nos dois temas, desktop/celular; k6 público; sem publicar.
