# Publicidade sem repetições + matriz de sinergia didática

## O que está repetido hoje
Na Publicidade, o bloco "Sinergia e dependência de publicidade" (título, matriz de correlação, gráfico "Como os indicadores acompanham o faturamento" e o diagrama "Da observação à decisão") aparece em três seções:
- **Resumo da publicidade**: no meio da gestão de Product Ads, entre o resumo e a lista de campanhas.
- **Sinergia e dependência**: a seção própria dele.
- **Evolução e eficiência**: de novo, com o mesmo título, só sem a matriz.

Fora da Publicidade, uma versão resumida também aparece no Resumo da loja e na Análise geral. Lá ela fica, porque essas telas só a resumem.

## O que muda
1. **Resumo da publicidade**: sai o bloco de sinergia. No lugar entra uma linha curta com o número principal (Ads × faturamento) e o link "Ver sinergia completa", que abre a seção Sinergia e dependência.
2. **Evolução e eficiência**: sai o título e o bloco de sinergia repetidos. Ficam só os gráficos de evolução e os indicadores de eficiência (ROAS, ACOS, TACOS e os scores).
3. **Sinergia e dependência**: passa a ser o único lugar com a análise completa.
4. **Matriz didática** (do seu arquivo), nessa seção:
   - Cada célula ganha setas: duas para cima quando os indicadores crescem juntos, uma para cima e outra para baixo quando vão em direções opostas, e um traço quando não há relação. Embaixo, uma frase curta como "Crescem juntos".
   - No topo da matriz entra uma legenda rápida explicando como ler a cor, as setas e a força.
   - Continuam o verde e o vermelho do painel, sem âmbar, e os mesmos cortes de Forte (0,7) e Moderada (0,4), que já são os do seu arquivo.
5. **Títulos repetidos**: confiro na Publicidade se sobram títulos com o mesmo nome em seções diferentes e renomeio ou removo.

## O que não muda
- Nenhuma conta muda: a correlação, o mínimo de 7 observações e o aviso "associação não é causalidade" continuam iguais.
- Links antigos para as seções continuam funcionando.

## Detalhes técnicos
- `GestaoAds.tsx`: trocar `<SinergiaPublicidadeApi>` por um resumo compacto com link para `?pagina=sinergia`.
- `PublicidadePanel.tsx` (variante `evolucao`): não renderizar `SinergiaIndicadores`; manter só os gráficos de evolução.
- `SynergyAnalysisPanel.tsx`: setas e frase em cada célula, mais uma legenda acima da tabela. As cores continuam vindo dos tokens `ec-verde-txt` e `destructive`.
- Revisar o teste `sidebarAnalytics` e rodar os testes de sinergia.
