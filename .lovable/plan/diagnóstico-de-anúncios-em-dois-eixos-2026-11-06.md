# Diagnóstico de anúncios em dois eixos

Separa cada anúncio em **Construção** (o que o vendedor controla: promoções, preço, fotos, título, descrição, tipo) e **Resposta** (como o mercado reage: experiência de compra, conversão, visitas relativas, giro) e classifica pelo cruzamento em quatro quadrantes: Saudável, Potencial reprimido, Produto ou demanda, Falha dupla.

## Onde aparece
Anúncios → nova aba **Diagnóstico** (na árvore esquerda, abaixo de Curva ABC), com loja selecionada.

1. **Perfil do catálogo (topo)**: matriz 2×2 com nº de anúncios, % e faturamento em cada quadrante; quadrante dominante com a leitura do documento; gargalo recorrente (ex.: "Promoções trava 62% dos anúncios"); cobertura (quantos anúncios puderam ser diagnosticados e por quê os outros não).
2. **Lotes de correção**: anúncios agrupados pelo mesmo gargalo, com faturamento em jogo — clicar abre a lista lateral direita (mesmo padrão da Curva ABC, com Excel/TXT).
3. **Fila de ação**: até 50 anúncios de Potencial reprimido e Falha dupla, ordenados por lacuna × faturamento, com índice de cada eixo, gargalo, ação e confiança.
4. **Detalhe individual**: clicar no título/MLB abre a lateral já existente, acrescida das duas barras (Construção e Resposta), cobertura de cada eixo e a ação principal. Em "Produto ou demanda" a ação é revisar demanda/preço, nunca mexer no cadastro.

## Regras de honestidade
- Dimensão sem dado fica de fora (nota nula), nunca vira zero; sem um dos eixos o anúncio fica "Diagnóstico indisponível".
- Confiança alta/média/baixa pela cobertura dos pesos (≥80% / ≥50%).
- Visitas relativas e giro entram só quando houver dado por anúncio no período; caso contrário aparecem como não medidos.
- Preço sem referência fica não medido (reduz cobertura), sem preço inventado.
- Cortes 60 (Construção) e 50 (Resposta) exibidos como provisórios; aviso quando mais de 90% caem de um lado.
- Sem promessa de ganho; textos sem citar a origem dos dados.

## Detalhes técnicos
- Novo `src/lib/anuncio/qualidade.ts` (pesos do documento, notas 0–1 por dimensão a partir de `useListingsQuality`, elegibilidade/participação em promoções e dados de 30 dias já usados em `planoAcaoAnuncio`) e `src/lib/anuncio/diagnostico.ts` com `diagnosticar`, `perfilarCatalogo`, `filaDeAcao`, `lotesDeCorrecao` conforme o documento.
- Ajuste: `perfilarCatalogo` sem diagnósticos retorna estado vazio na tela (a função lança erro, a tela captura).
- Testes do documento em `diagnostico.test.ts` + testes de nota nula e de cortes; regra registrada em `src/lib/anuncio/AGENTS.md`.
- Componente `DiagnosticoDoisEixos.tsx` usando KpiCard/EmptyState do design system; rodar k6 público antes, sem publicar.
