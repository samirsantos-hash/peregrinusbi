# Correção dos 35 itens da auditoria (06/11/2026)

Tudo em teste, sem publicar. Cada correção ganha um teste com o caso numérico da auditoria. Ausência continua aparecendo como "Sem dado", nunca como zero. Nenhum texto exibido cita a origem dos dados.

## Etapa 1 — Urgentes
- 01: na troca de usuário, cancelar e limpar as consultas em memória antes de restaurar dados salvos. As chaves passam a ser separadas por usuário.
- 02: reproduzir a disputa de bloqueio da sessão e tratar o cancelamento esperado. Itens sem reprodução ficam abertos e são informados.
- 03–06 (Qualidade): taxas fracionárias passam para percentual (0,06 → 6%). Desconhecido não recebe nota e não aparece "Todos os critérios OK" sem evidência. Sai o Score CDP fixo em 36, e a escala segue o contrato. No McKinsey, zeros medidos entram na média ([100,0,0,0] → 25) e há uma cobertura mínima para classificar.
- 07–08 (Clips): comparar pedidos com pedidos nas mesmas datas, sem conclusão de causa. Separar vídeo confirmado, performance registrada e situação desconhecida.
- 25 (Reposição): confirmar a unidade do consumo. Se não for possível confirmar, a recomendação de envio fica suspensa.

## Etapa 2 — Medição, datas e denominadores
- 09–10 Resumo: variação só com cobertura equivalente nos dois períodos. A receita por visita usa só as datas que têm visitas medidas.
- 11–14 Publicidade: erros não viram zero. O TACOS só é calculado quando o faturamento é das mesmas datas do investimento. "Investidos sem venda" exige zero vendas medido. Ranking com rótulo correto e leitura completa.
- 30 Metas, 31 Riscos, 27–28 Deep Dive e vertical: mês sem registro fica indisponível, sem 0% nem churn falso.
- 33–35 Multilojas e Gestão: cancelamentos contados por pedido, sem dupla contagem. Usar a última posição por loja e fazer leitura completa, com aviso de cobertura.

## Etapa 3 — Posições, leituras completas, referências e textos
- 15–16 Correlações: corrigir o vínculo de Full. Exigir no mínimo 7 pares com variação. Trocar "maior impacto" por "associação".
- 17–19 Preço: novos rótulos para a composição das faixas, as variações observadas (sem elasticidade causal) e o limiar interno de 30%. Comparar janelas equivalentes.
- 20–22 Oportunidades: manter a última posição integral, com o máximo histórico separado. Cofinanciadas usam o desconto mais recente. Elegibilidade e qualidade com leitura paginada.
- 23–24 Logística: os cards seguem o período selecionado ou mostram a data da medição. O cenário de 10 p.p. é calculado sobre o total, é rotulado como hipotético e sai o ganho de conversão assumido.
- 26 Taxa de Venda: só pares do mesmo subcluster e sem a própria loja. Abaixo do mínimo, a referência fica indisponível.
- 29 Mecanismos de desconto: mostrar o erro, distinguir vazio de falha e não usar leitura alternativa com zeros.
- 32 Perguntas: histórico paginado de 90 dias, mediana correta ([0,5h; 3h] → 1,75h) e dias sem cobertura indisponíveis.

## Verificação
- Testes novos e a suíte existente.
- Teste de acesso público antes das mudanças.
- Conferência com sessão real em AUTOPECASLONDRINA, no desktop e em 390px.
- Atualizar o documento da auditoria com o status de cada item: corrigido, ou pendente e por quê.

## Detalhes técnicos
- Os localizadores de arquivo estão na seção final de `docs/auditoria-calculos-2026-11-06.md`.
- A função `ml-sync-loja` (item 32) vai ao ar no teste do backend, que é compartilhado. Ela não muda dados já gravados, só a forma de calcular nas próximas sincronizações.
- Atualizar AGENTS.md e docs/ml-gestao.md nos pontos de contrato que mudarem.
