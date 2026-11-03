# Categorias de usuários e checklist de permissões

## Contas master confirmadas
- Ana Paula — anapaula@escolaecomconsult.com.br.
- Fabrício — fabriciodelboni@ecomconsult.com.br.
- Samir — samir.santos@ecomconsult.com.br.

Somente essas três contas serão master, com acesso a todos os clientes e autorização para liberar ou revogar funções. A outra conta de Samir deixará de ser master, sem perder seus demais acessos antes da revisão.

## Categorias e transição
- **Master:** controle completo, inclusive checklist de outros usuários.
- **Administrador, gerente e consultor/gestor de loja:** preservar suas categorias operacionais, subordinadas às permissões individuais e aos vínculos de lojas. Uma categoria não poderá substituir uma liberação negada.
- **Desenvolvedor:** manter como acesso adicional aos diagnósticos, sem conceder controle de usuários ou clientes automaticamente.
- **Usuários existentes:** manter acessos atuais com indicação “Aguardando revisão”. Após uma master salvar o checklist, somente os itens aprovados estarão liberados.
- **Novos usuários:** iniciar sem funções liberadas; a master define o checklist antes do uso.

## Checklist em Administração → Usuários
Adicionar filtros por categoria e situação da revisão, além de uma ação **Permissões** em cada usuário. Abrir uma lista organizada em linhas com colunas **Visualizar** e **Alterar**, usando o visual atual da Peregrinus.

Grupos de funções:
- **Resultados:** Visão geral, Reputação, Preço/Concorrentes, Publicidade, Oportunidades e Clips.
- **Operação:** Logística/Flex, Qualidade, Anúncios e Perguntas.
- **Planejamento:** Full, Metas, Correlações e Alertas & Riscos.
- **Gestão:** Integrações, Carteiras, Multilojas, usuários e importação/revisão de dados.

Separar ações específicas quando houver efeitos diferentes: alterar preço; criar/editar campanhas Ads; ativar/pausar/remover anúncios Ads; aplicar/remover promoções e cupons; responder perguntas; editar metas; conectar lojas/gerar convites; alterar carteiras; criar/pausar usuários; redefinir senhas; importar dados e exportar relatórios. Funções exclusivamente de leitura não terão checkbox de alteração.

Alterar exige visualizar a função correspondente; desmarcar visualização retira também a alteração. Permissões não ampliam acesso às lojas. Somente masters podem salvar liberações; nenhuma permissão delegada autoriza promover alguém a master ou conceder permissões.

Ao salvar, apresentar confirmação das liberações e restrições. Registrar quem aprovou, usuário afetado, permissões anteriores/novas e data, sem senhas ou informações de compradores.

## Segurança e implementação técnica
- Usar `user_roles` para a categoria master, aproveitando `super_admin`; não guardar papéis em perfil ou armazenamento do navegador. Atribuir às três identidades confirmadas e remover essa categoria das demais, preservando outros papéis.
- Criar catálogo central de capacidades, concessões individuais e estado de revisão com GRANTs e RLS. Ausência de concessão bloqueia usuários revisados e novos; o modo legado é explícito apenas para existentes ainda não revisados.
- Implementar consulta central de permissão e salvamento atômico exclusivo de master, com validação do catálogo e auditoria. Proteger também alterações diretas de papéis e acessos para impedir autopromoção e contorno do checklist.
- Integrar as permissões à navegação, rotas, seções do painel e controles de alteração/exportação. O navegador não será a autoridade de segurança.
- Aplicar verificações em leituras de tabelas, RPCs, funções e ações no Mercado Livre, inclusive prévia e confirmação. Revisar funções administrativas que hoje usam acesso privilegiado. Preservar rotinas automáticas legítimas, OAuth público e limites de conta sem liberar chamadas de usuário não autorizadas.
- Mapear dados compartilhados entre seções antes de restringi-los: esconder uma aba não protege uma consulta direta. Separar/projetar leituras quando necessário para não expor uma seção negada nem quebrar outra autorizada.
- Atualizar contratos e regras de arquitetura; manter aparência, cálculos e integrações fora do escopo inalterados.

## Validação antes de concluir
- Testar as três contas master, a remoção de master da outra conta de Samir, concessão exclusiva de master, novo usuário bloqueado, usuário antigo não revisado preservado, edição dependente de leitura e revogação.
- Testar chamadas diretas sem permissão e tentativas de autopromoção, além do limite de lojas.
- Conferir no painel autenticado a abertura do checklist, salvamento e releitura persistida; verificar um usuário restrito após aprovação e revogação, sem fazer alterações comerciais reais no Mercado Livre.

Esta mudança não concede a terceiros acesso a clientes fora de suas carteiras e não altera preços, anúncios ou campanhas por si só.