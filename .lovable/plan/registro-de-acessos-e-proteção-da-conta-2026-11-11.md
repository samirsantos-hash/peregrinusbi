# Registro de acessos e proteção da conta

Hoje o painel registra cada login com o aparelho/navegador, mas o IP nunca é gravado: são 4.014 registros, e nenhum tem IP.

## 1. Registrar IP e aparelho em cada login
- Todo login bem-sucedido grava data, IP e aparelho (navegador e sistema, por exemplo "Chrome · Windows").
- O registro é feito pelo servidor, que vê o IP real, e não pelo navegador, que pode ser alterado.

## 2. Aviso de acesso novo
- Um login vindo de um aparelho que a conta não usou nos últimos 90 dias é considerado "acesso novo".
- **Para o desenvolvedor:** aparece um alerta em Avisos do desenvolvedor, com o e-mail mascarado, o aparelho e a cidade aproximada, se disponível.
- **Para o usuário:** recebe um e-mail com a marca Peregrinus, "Novo acesso à sua conta", com data, aparelho e IP. O e-mail diz: "Se não foi você, troque sua senha".
- O primeiro login de cada pessoa depois da mudança não gera aviso, para não disparar e-mails para todo mundo no primeiro dia.

## 3. Encerrar os outros acessos ao trocar a senha
- Ao trocar a senha, seja logado ou pelo link do e-mail, todos os outros aparelhos saem na hora. Só o aparelho atual continua conectado.

## 4. Privacidade (LGPD)
- Os registros de IP ficam guardados por 90 dias e depois são apagados automaticamente.
- Só o master e o desenvolvedor veem o IP. O usuário comum não vê o IP de ninguém.

## Fora deste plano
- Não haverá bloqueio por IP, porque cortaria consultores e lojistas legítimos.
- A tela "Meus acessos" fica para uma etapa seguinte, se você quiser.

## Detalhes técnicos
- Nova tabela `acessos_login` (user_id, ip, aparelho, aparelho_chave em hash, criado_em) com RLS de leitura só para `is_super_admin()` ou `sou_desenvolvedor()`. A escrita é feita só pelo service_role.
- `auth-guard` (ação login): depois de um login bem-sucedido, grava o registro, compara `aparelho_chave` com os últimos 90 dias e, se for novo e já houver histórico, insere em `developer_alerts` (categoria seguranca) e envia o e-mail.
- O e-mail transacional usa o envio gerenciado do domínio notify.ecomperegrinus.com.br, com o modelo "novo-acesso" em português e as cores da marca.
- A limpeza de 90 dias é oportunista, dentro do próprio `auth-guard`.
- `ChangePassword.tsx` e `ResetPassword.tsx`: depois de `updateUser` com sucesso, chamar `supabase.auth.signOut({ scope: 'others' })`.
- Testes: aparelho novo vs. conhecido, primeiro login sem aviso, e regra de retenção.
- Depois: teste de carga público; sem publicação.
