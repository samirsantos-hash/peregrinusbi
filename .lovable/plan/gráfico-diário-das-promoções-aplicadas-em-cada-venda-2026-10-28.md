# Gráfico diário das promoções aplicadas em cada venda

## Resultado
Adicionar em Oportunidades um gráfico de linhas por campanha promocional, com seleção de pedidos, unidades e faturamento diário. A campanha deve ser identificada na venda, conforme sua escolha — não pela participação atual do anúncio nem por médias da planilha.

## Validação obrigatória
A integração atual lê promoções e pedidos separadamente. Ainda não foi confirmado um contrato do Mercado Livre que vincule cada venda à promoção aplicada.

1. Verificar a disponibilidade do recurso de descontos de pedidos com o token da própria loja, exclusivamente no servidor, preservando as permissões atuais.
2. Conferir identificação da promoção, vínculo com o item vendido, quantidade e tratamento de descontos combinados.
3. Retornar apenas um diagnóstico agregado da cobertura; nunca expor compradores, pedidos brutos ou credenciais.
4. Se o vínculo não estiver disponível, mostrar a limitação e não criar uma série atribuída. Não substituir pela adesão atual dos anúncios.

## Implementação após confirmação
- Consultar 30 dias UTC completos, com paginação integral e limites explícitos de tempo e volume.
- Agregar por data e promoção apenas registros com vínculo inequívoco; separar vendas sem atribuição confirmada.
- Evitar duplicação quando houver mais de uma promoção na mesma venda; não distribuir faturamento arbitrariamente.
- Mostrar linhas por campanha, filtro de campanha, valores ao apontar e tabela diária acessível. Manter lacunas como ausência de dado, não zero.
- Preservar o histórico da planilha como fonte separada; Home e visual atual permanecem intactos.

## Detalhes técnicos
- Reutilizar autenticação e renovação de token das funções existentes; leitura apenas, sem alterações no Mercado Livre.
- Implementar cálculo puro com testes de atribuição, descontos combinados, deduplicação, datas e cobertura.
- Atualizar contratos em `docs/ml-gestao.md` e conferir o gráfico com uma loja real antes de declarar concluído.