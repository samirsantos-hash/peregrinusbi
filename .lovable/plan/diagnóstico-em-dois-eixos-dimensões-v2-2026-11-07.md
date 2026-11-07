# Diagnóstico em dois eixos — dimensões v2

Aplicar o documento "Dimensões do diagnóstico — v2" na aba Anúncios → Diagnóstico em dois eixos.

## O que muda para o usuário
- "Tipo de anúncio" deixa de ser nota separada. Entra **Exposição comercial** (peso 100), que junta envio e tipo: Clássico com Full = 87, Premium com Full = 100, Premium com Flex = 78, Clássico em agência = 30.
- Novas notas por anúncio: **Fotos** (pelo tamanho original), **Ficha técnica** (obrigatórios da categoria), **Visitas relativas**, **Conversão** (mínimo de 50 visitas) e **Experiência de compra** (mínimo de 20 vendas).
- Cada dimensão mostra evidência e ação. Exemplos: "Migrar para o Full ganha 57 pontos" e "reenviar 2 fotos (a menor está em 800x600)".
- A regra de preço × tipo vira apenas um aviso de margem e não reduz a nota.
- Quando falta um dado, a dimensão aparece como "sem medição" e nunca conta como zero.

## Etapas (uma por vez)
1. **Cálculo:** notas v2 e testes do documento. Os pesos passam a 415 em Construção e 245 em Resposta. A tela continua com os dados que já existem.
2. **Leitura dos anúncios:** fotos, ficha, envio, tipo e preço, em lotes de 20, com os atributos da categoria guardados em cache. Somente leitura.
3. **Visitas e conversão:** visitas de 30 dias por anúncio e pedidos pagos na mesma janela.
4. **Experiência de compra:** busca um anúncio por vez, com limite de ritmo, só para a curva A. Os demais anúncios ficam como "sem medição".
5. Exportar Excel/TXT na lista lateral dos lotes, como estava pendente.

## Pontos que continuam em aberto (do próprio documento)
- As notas de Flex, coleta e agência (0,75 / 0,50 / 0,35) são estimativas.
- O limiar de preço do aviso de tipo será de R$ 79, como nos testes do documento.
- Fundo branco das fotos e preço de referência ficam fora por enquanto.
- Os cortes 60 / 50 continuam provisórios.

## Detalhes técnicos
- Novo `src/lib/anuncio/dimensoes.ts` com as funções do documento e `dimensoes.test.ts`. `diagnostico.ts` passa a usar `PESOS_QUALIDADE` e remove `tipoAnuncio`.
- Etapas 2–4: novo modo somente leitura em `ml-analise-loja`, com token da própria loja, paginação completa ou erro, sem dados de comprador. Contrato documentado em `docs/ml-gestao.md`.
- Atualizar a regra em `src/lib/anuncio/AGENTS.md`. Rodar k6 público antes de cada entrega. Sem publicar.
