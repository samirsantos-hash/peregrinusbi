# Blindagem v2 — plano antes de qualquer alteração

Regra combinada: nada é aplicado sem sua aprovação. Este documento é o "planeje antes" dos blocos 1 e 2, com o estado real do banco medido agora (somente leitura).

## Estado real medido (03/09/2026)

- 52 tabelas no schema público. **Todas com RLS ativa.** Nenhuma tabela sem RLS.
- 3 tabelas com RLS e zero policies (negar tudo, intencional — só Edge Function com service role): `ml_tokens`, `ml_oauth_states`, `ml_refresh_locks`.
- Nenhuma policy concede leitura ao papel anônimo. As 5 policies com papel `public` são todas travadas por `auth.uid()` ou `is_admin()`.
- Ponto real a corrigir: 49 tabelas ainda têm **GRANT de SELECT para o papel anônimo** herdado do padrão antigo. Hoje a RLS bloqueia, mas é uma segunda linha de defesa faltando — se alguém criar uma policy permissiva por engano, o dado vaza sem login.

Conclusão: o Bloco 1 está cumprido no essencial. O que falta é a limpeza de GRANTs.

## Bloco 1 — o que proponho aplicar

Uma migração única, sem tocar em nenhuma policy nem em lógica de dados:

- `REVOKE ALL ON <tabela> FROM anon` nas 49 tabelas que não têm nenhuma policy destinada ao papel anônimo.
- Manter intactos os GRANTs para `authenticated` e `service_role`.
- Trocar o papel `public` por `authenticated` nas 5 policies listadas acima (mesma regra, escopo mais estreito).

Nada de novo é criado, nenhuma tabela muda de estrutura.

### Como testar
1. Sem login, com a chave pública, consultar `sellers` e `cpp_mensal` → deve retornar erro de permissão (hoje retorna lista vazia).
2. Logado como consultor, abrir o painel `/` e `/carteira` → tudo carrega igual a hoje.
3. Se algo quebrar, o sintoma será erro de permissão explícito no console, nunca dado parcial — e o rollback é um `GRANT SELECT` de volta.

## Bloco 2 — recomendação: endurecer o que existe, não criar `user_scopes`

O isolamento por perfil já existe e está em produção com três camadas: `user_access_control.allowed_cust_ids`, `portfolios.assigned_to` e `user_roles` + `has_role()`. Criar `user_scopes` em paralelo significa duas fontes de verdade de permissão convivendo — que é exatamente o cenário em que vazamento acontece.

Proposta alternativa, na convenção do repo:

1. Auditar as 5 policies de cada tabela de dados de loja e confirmar que todas passam por `get_allowed_cust_ids()` ou `has_role()`.
2. Documentar o resultado tabela por tabela.
3. Corrigir apenas as que estiverem permissivas demais.
4. Teste de vazamento real: dois usuários de lojas diferentes, um tenta ler a loja do outro pela API → precisa vir vazio/negado. Registro com data.

Se ainda assim preferir a tabela `user_scopes`, ela vira um projeto de migração de dados (mover os vínculos atuais para lá e aposentar `user_access_control`), não um acréscimo — e eu escrevo esse plano separado.

## Blocos 3 a 8 — ordem e escopo

- **3. Segredos:** varredura do bundle publicado por `service_role`/`client_secret`; conferir que as 8 Edge Functions falham no boot com erro claro quando falta secret.
- **4. Criptografia:** hoje **não existe CPF nem dado pessoal cifrável** no banco — os identificadores são `cust_id`/`nickname` públicos do marketplace. O único candidato é o token OAuth do Mercado Livre em `ml_tokens`. Proponho aplicar pgcrypto só ali, uma coluna, com teste round-trip.
- **5. IDOR:** revisar as Edge Functions que recebem ID no corpo (`admin-users`, importadores) e exigir dono/papel derivado do JWT, com 403 explícito.
- **6. Sanitização:** camada por cima dos parsers existentes — validação de MIME/tamanho, neutralização de `= + - @` na exportação CSV.
- **7. Auth:** confirmar signup fechado, MFA TOTP para admin/super admin, expiração de sessão.
- **8. Verificação:** varredura de segurança + teste de vazamento + registro datado de cada teste.

## Decisão que preciso de você

1. Aprovar o Bloco 1 (revogar GRANTs anônimos + estreitar as 5 policies).
2. Escolher no Bloco 2: endurecer o modelo atual (recomendado) ou migrar para `user_scopes`.
