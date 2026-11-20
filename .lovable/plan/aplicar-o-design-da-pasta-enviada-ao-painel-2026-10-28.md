# Aplicar o design da pasta enviada ao painel

A pasta traz o catálogo visual "Asimov" (página de vitrine, catálogo de componentes, 17 temas de cor, fundos animados Aura/Chuva, fontes Inter/Voltaire/Instrument Serif). Vamos usar como referência de acabamento, adaptada à identidade Ecom Peregrinus, sem trocar dados, cálculos ou integrações.

## O que entra no painel
- Vidro igual ao catálogo: preenchimento bem transparente (deixa ver o fundo, em vez do verde quase sólido atual), borda fina clara, brilho suave no topo, sombra leve e cantos arredondados.
- Destaque de cor do catálogo ("accent" com versão clara, escura e brilho) mapeado para o verde Peregrinus (#14A86C / #0E7F51 / #3BD394).
- Cartões de indicador, botões, abas, campos, tabelas e janelas com os mesmos estados de passar o mouse e foco do catálogo.
- Fundo do painel: brilho verde difuso e estático inspirado no fundo "Aura" (sem cordas, sem animação pesada).
- Aplicado em todas as seções do painel, conferindo Visão geral, Publicidade, Preço, Correlações, Full e Admin nos dois temas.

## O que fica de fora (regras já combinadas)
- A tela de acesso (Home, e-mail e senha) não muda em nada.
- Fontes Inter, Voltaire e Instrument Serif: continua só DM Sans.
- Os 16 temas de outras cores (laranja, roxo, rosa, azul etc.): proibidos; fica só verde.
- Logo, textos, links e formulário da Asimov.
- Fundo animado de chuva/Unicorn Studio e cordas no painel (cordas seguem só no login).

## Detalhes técnicos
- Alterar só `src/index.css` (tokens `--panel-*`/`--access-glass-*` e regras do `.peregrinus-panel`), reduzindo o fill verde de 68–92% para a faixa de transparência do catálogo, e ajustes pontuais de classe em componentes de `src/components/ds` se necessário.
- Sem novas dependências; sem `transition-all`; movimento só transform/opacity; respeitar movimento reduzido.
- Verificação via navegador: comparar capturas do catálogo com Visão geral e demais seções em 1280px e 536px, sem transbordamento; build sem erros.
- Atualizar memória de estilo e roadmap.
