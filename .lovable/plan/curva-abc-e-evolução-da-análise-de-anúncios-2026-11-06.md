# Curva ABC e evolução da análise de anúncios

## Objetivo
Organizar as melhorias do documento em etapas, aproveitando o que já existe e sem prometer dados ou resultados que ainda não podem ser comprovados. Este plano não publica alterações nem autoriza alterações automáticas no Mercado Livre.

## Situação encontrada
| Tema | Situação no painel | Próximo passo |
|---|---|---|
| Curva ABC | Ainda não implementada | Criar por faturamento e unidades, com cruzamento |
| Visitas e conversão por anúncio | Já existem na análise individual de 30 dias | Consolidar período, cobertura e comparação |
| Preço por margem | Calculadora com custos informados e confirmação | Reutilizar sem assumir custo cadastrado |
| Margem de promoções | Não há simulação completa antes da adesão | Separar estimativa de resultado realizado |
| Título, melhorias e SWOT | Já existem | Integrar ao raio-X, sem duplicar telas |
| Concorrentes e referência da vertical | Já existem em escopos diferentes | Comparar preços verificáveis sem inferir vendas de terceiros |
| Histórico de alterações | Auditoria de ações, sem versões completas | Criar histórico prospectivo, sem inventar passado |
| Exportações | Existem em outras análises | Acrescentar conjunto específico de anúncios |
| Palavras-chave e hotwords | Fonte adequada não confirmada | Validar acesso e cobertura antes de construir |
| Teste A/B | Não encontrado | Depende de versões e desenho de medição |

As afirmações de “superioridade”, pesos do algoritmo e competitividade oficial por anúncio do documento não estão comprovadas. O painel deve apresentar diagnóstico próprio, não ranking oficial ou reprodução do algoritmo.

## Etapa 1 — Base confiável e Curva ABC
1. Coletar pedidos pagos de toda a loja no período escolhido e agregar faturamento efetivamente vendido, unidades e pedidos por anúncio. Não usar preço atual nem quantidade acumulada vendida para representar o período.
2. Confirmar catálogo completo: a lista sincronizada atual é uma amostra e não permite declarar que todos os itens sem vendas foram encontrados. Incluir anúncios com vendas mesmo se atualmente pausados ou encerrados, identificando o estado atual.
3. Exibir seletor obrigatório **Faturamento / Unidades**, gráfico de contribuição acumulada, resumo A/B/C e tabela com participação, acumulado e posição. Mostrar dez itens inicialmente e permitir expansão.
4. Acrescentar cruzamento das duas bases e matriz de perfis: carro-chefe, alto valor, alto giro, intermediário e cauda longa. As leituras descrevem contribuição e giro; não afirmam margem sem custos.
5. Separar **sem movimento confirmado** de **sem dados**. Se a cobertura de pedidos estiver incompleta, não emitir classificação definitiva nem totais como se fossem completos.

### Regra ABC proposta
- Cortes iniciais de 80% e 95%, apresentados como convenção ajustável, não regra do Mercado Livre.
- Classificar pelo acumulado anterior à inclusão: o item que cruza 80% permanece em A; o que cruza 95% permanece em B. Assim um item dominante não cai sozinho em C.
- Empates de contribuição ficam na mesma classe, com indicação de que a participação pode ultrapassar o corte; ordem secundária estável por anúncio.
- Esta proposta corrige uma ambiguidade do código enviado e será implementada apenas após aprovação do plano.

## Etapa 2 — Raio-X e comparação por anúncio
- Integrar desempenho, título, conteúdo, qualidade e SWOT existentes em **Anúncios → Correlações**, com detalhe compacto e sem nova página longa.
- Comparar períodos equivalentes com pedidos pagos, unidades, faturamento, visitas, conversão (pedidos/visitas), receita por visita e cobertura.
- Manter visitas desconhecidas e conversão sem denominador como indisponíveis. Não comparar unidades/visita com pedidos/visita.
- Reutilizar a comparação de catálogo em **Preço** para um produto por vez, com referência e atualização visíveis. Não converter uma razão de preços em índice de competitividade de 0 a 1 sem fórmula validada.
- Priorizar itens A com diferença de preço comprovada; limiares internos de 50%/70% só entram se a escala correspondente for definida e justificada, não por substituição automática.

## Etapa 3 — Custos e simulação de promoções
- Reutilizar a calculadora existente com entradas explícitas de custo, tarifas, frete e encargos. Definir consentimento e acesso antes de persistir custos privados; a calculadora atual não os guarda.
- Em **Oportunidades → Promoções**, abrir lateral compacta para comparar preço atual e oferta, contribuição unitária e contribuição estimada, com desconto e coparticipação comprovados.
- Suspender margem negativa quando faltarem custos; distinguir contribuição estimada de lucro líquido. Mostrar perda observada **no período**, nunca chamar automaticamente de impacto mensal.
- Resultados realizados de promoções continuam condicionados à campanha identificada na venda e custos conhecidos. Sem atribuição, não gerar ROAS/ROI nem usar participação atual como prova.
- Qualquer adesão ou alteração continua passando por prévia, confirmação e permissões existentes.

## Etapa 4 — Histórico e exportação
- Registrar versões prospectivas de título, descrição, preço e atributos disponíveis, com data, origem da alteração quando conhecida e resultado confirmado.
- Reutilizar auditoria já existente; não afirmar histórico integral de mudanças externas ou anterior ao acompanhamento.
- Exportar ABC, cruzamento e raio-X para Excel; reaproveitar PDF/DOCX quando fizer sentido. Incluir período, base, cortes, cobertura e ausências.
- Aplicar a verificação de permissão atual imediatamente antes de gerar qualquer arquivo.

## Etapa 5 — Dependências novas e medição experimental
- **Palavras-chave/hotwords:** verificar uma fonte autorizada com categoria, período e definição do indicador. Tendência ou visitas não serão apresentadas como volume de busca. Não contratar serviço nem raspar páginas automaticamente.
- **A/B:** primeiro organizar versões e janelas comparáveis. Se não houver divisão aleatória de exposição suportada, apresentar comparação antes/depois como observacional, não teste A/B causal. Registrar alterações de preço, estoque, promoções e publicidade que possam influenciar o resultado.
- **Referência por anúncio:** só ampliar se houver comparabilidade e acesso verificados. Mediana da carteira não substitui desempenho de concorrentes individuais.

## Fora do escopo
Publicação de anúncios com IA, mineração de produtos, editor de fotos, descoberta de catálogo e aplicativo nativo. Preservar as tendências existentes; não removê-las. Manter visual, permissões, árvore de análises e o cartão “Percentual por categoria” removido.

## Detalhes técnicos
- Reutilizar a semântica de pedidos pagos de `_shared/mlItemStats.ts`, a validação de cobertura de `ml-analise-loja` e a análise individual de `ml-buscar-produtos`. A coleta da ABC deve percorrer pedidos da loja uma vez, não consultar cada anúncio repetidamente.
- Cálculos puros em `src/lib/anuncio/curvaAbc.ts`, valores monetários em centavos inteiros e quantidades validadas; deduplicar pedidos e consolidar linhas por MLB antes de classificar.
- Validar contratos, limites e paginação antes de ampliar períodos. Limite atingido, página com falha ou total inconsistente geram cobertura incompleta, não zero.
- Reutilizar cache por usuário de 24h sem armazenar permissões; consultas sob demanda e sem trazer dados de compradores ao navegador.
- Mudanças de funções ou contratos exigem atualização de `docs/ml-gestao.md`; novos dados persistidos exigem controle de acesso e isolamento por loja/usuário.

## Validação e sequência de entrega
- Testar cortes 80/95, dominante acima de 80%, empates, zeros medidos, ausência, centavos, pedidos duplicados/cancelados, margem sem custo e cobertura incompleta.
- Conferir anúncio real, loja com integração e estados sem dados em sessão autorizada, nos dois temas, celular e desktop; comparação e exportação precisam ler de volta os valores exibidos.
- Executar verificações públicas obrigatórias sem confundi-las com capacidade de uso autenticado; rodar regressões das regras afetadas.
- Implementar uma etapa por vez e parar para revisão antes da próxima. Aprovação do plano permite iniciar a Etapa 1; dependências externas, persistência de custos, ações no Mercado Livre e publicação não ficam automaticamente autorizadas.