# Cartões de números mais translúcidos (vidro quase invisível)

## O que muda
- Os cartões de números do Resumo deixam de parecer caixas verdes sólidas e viram lâminas de vidro quase invisíveis (base 1,5% de branco, desfoque forte).
- Cor por resultado, bem sutil (4% de tintura + brilho colorido na borda de cima):
  - verde = melhorou (verde da marca #3BD394 em vez do verde da Apple)
  - vermelho = piorou (vermelho da marca #D62410)
  - neutro = sem comparação ou estável (só vidro branco)
- Somente no tema escuro; o tema claro continua igual.

## O que não será aplicado do arquivo
- Azul e âmbar: a paleta do painel proíbe laranja e não usa azul; o amarelo é só para datas. Os cartões já usam só verde, vermelho e neutro.
- Os cartões já não têm fundo sólido do componente, então não há limpeza a fazer nele.

## Técnico
- Bloco novo no fim de `src/index.css`, dentro de `.dark`, com o seletor do arquivo (`.resumo-apple-glass :is(.kpi-vidro, .noite-vidro, .liquid-card-3d)` e `[data-tema]`), cores como tokens (`--vidro-tinta-verde`, `--vidro-tinta-vermelho`), com `-webkit-backdrop-filter` e respeitando `--glass-intensity`.
- Verificação: rodar o teste público de carga e capturar a tela no tema escuro (o painel com login pode não abrir no navegador de teste; nesse caso aviso).
