# Conectar a API do Mercado Livre ao projeto Lovable

Este projeto já tem o fluxo OAuth pronto: o front chama a Edge Function `ml-oauth-start`, o Mercado Livre devolve o código para `ml-oauth-callback`, e os tokens ficam no banco (`ml_tokens`), só acessíveis pelas Edge Functions.

O que falta, na prática, é **cadastrar o app no Mercado Livre**, **guardar os segredos no backend** e **autorizar a conta da loja** na tela `/integracoes`.

## Como o fluxo funciona

```
Usuário (super_admin)  →  /integracoes  →  ml-oauth-start
        →  login no Mercado Livre (auth.mercadolivre.com.br)
        →  ml-oauth-callback (troca code por token)
        →  volta para /integracoes?status=ok
```

- Autorização: `https://auth.mercadolivre.com.br/authorization`
- Token e API: `https://api.mercadolibre.com` (domínio diferente — isso é esperado)
- Tokens **nunca** vão para o navegador. Só `ML_CLIENT_ID` / `ML_CLIENT_SECRET` nas Edge Functions.

---

## Passo 1 — Descubra as URLs do seu backend

No Lovable: **Cloud** (ou o painel do Supabase conectado) e anote:

| O quê | Onde achar | Exemplo |
| --- | --- | --- |
| URL do projeto | Settings / API do Supabase | `https://<ref>.supabase.co` |
| App publicado | Share → Publish, ou domínio custom | `https://seu-app.lovable.app` |

A **Redirect URI** que o Mercado Livre precisa é exatamente:

```
https://<ref>.supabase.co/functions/v1/ml-oauth-callback
```

Sem barra no final, sem query string. Tem que ser HTTPS e **igual** ao que o código usa (`ML_REDIRECT_URI` ou o valor padrão acima).

---

## Passo 2 — Crie o aplicativo no DevCenter do Mercado Livre

1. Entre em [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br) com a **conta principal da loja** (colaborador não autoriza).
2. Abra **DevCenter → Minhas aplicações → Criar nova aplicação**.
3. Preencha nome, descrição e site (pode ser a URL do app Lovable).
4. Em **URIs de redirect**, cole a URL do Passo 1 (`…/functions/v1/ml-oauth-callback`).
5. Escopos: pelo menos **Leitura**. Inclua **Escrita** só se no futuro for alterar anúncios pela API.
6. **PKCE: desligado.** O código deste repo troca o `code` só com `client_id` + `client_secret`. Com PKCE ligado, o callback falha (`token_400`).
7. Salve e copie:
   - **App ID** → vira `ML_CLIENT_ID`
   - **Secret Key** → vira `ML_CLIENT_SECRET`

Não cole esses valores no chat do Lovable, no GitHub nem em arquivo `VITE_*`.

Documentação oficial: [Obtenção do Access Token](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao/obtencao-do-access-token).

---

## Passo 3 — Grave os segredos no Lovable / Supabase

O front **não** chama a API do ML. Só as funções `ml-oauth-start`, `ml-oauth-callback`, `ml-token-refresh` e `ml-daily-sync`.

No Lovable: **Cloud → Secrets** (backend próprio) ou, se o projeto usa Supabase externo, **Supabase → Edge Functions → Secrets**.

Cadastre:

| Secret | Obrigatório | Valor |
| --- | --- | --- |
| `ML_CLIENT_ID` | sim | App ID do DevCenter |
| `ML_CLIENT_SECRET` | sim | Secret Key do DevCenter |
| `APP_URL` | sim | URL pública do app, **sem** barra no fim. Ex.: `https://peregrinus-com-br.lovable.app` |
| `ML_REDIRECT_URI` | só se não for o padrão | A mesma URI registrada no DevCenter |
| `REFRESH_TRIGGER_SECRET` | sim, para renovar token | Senha que **você gera** (não vem do Mercado Livre). Ver abaixo. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` o Lovable/Supabase já injeta. Não recrie com prefixo `VITE_` no lugar desses.

### Como criar o `REFRESH_TRIGGER_SECRET`

Não existe um painel do Mercado Livre nem do Lovable que entregue esse valor. É uma **senha sua**, só para o cron conseguir chamar `ml-token-refresh` / `ml-daily-sync` (essas funções não usam JWT; quem conhece o header `x-refresh-secret` pode dispará-las).

Gere uma vez. No **Windows PowerShell** (não precisa de OpenSSL):

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
```

No macOS/Linux, ou no Git Bash do Windows se o OpenSSL estiver instalado:

```sh
openssl rand -hex 32
```

O comando imprime 64 caracteres hexadecimais, por exemplo `a3f1…` (o seu será outro). Copie a linha inteira e guarde em um gerenciador de senhas. Não cole essa senha no chat.

Use **o mesmo valor** em dois lugares:

1. **Cloud → Secrets** do Lovable (ou Edge Functions → Secrets no Supabase), nome `REFRESH_TRIGGER_SECRET`.
2. No job/cron, header `x-refresh-secret` com esse valor. Se o cron for o `pg_cron` deste repo, grave também no Vault:

```sql
select public.ml_set_trigger_secret('cole_aqui_o_mesmo_valor');
```

Essa função SQL só roda com `service_role` (SQL Editor do Supabase como postgres, ou uma Edge Function). Não rode no app logado como usuário comum.

Não reuse o `ML_CLIENT_SECRET`. Se perder o valor, gere outro, atualize o secret da função **e** o Vault/cron no mesmo instante; senão o cron recebe `403`.

Depois de salvar, **publique de novo** as Edge Functions se o painel não recarregar os secrets sozinho.

---

## Passo 4 — Confirme que as funções estão no ar

No repositório já existem:

- `supabase/functions/ml-oauth-start`
- `supabase/functions/ml-oauth-callback`
- `supabase/functions/ml-token-refresh`
- `supabase/functions/ml-daily-sync`

No Lovable, um prompt do tipo “deploy as Edge Functions do Mercado Livre” ou o deploy automático do Cloud costuma bastar. No CLI:

```sh
npx supabase functions deploy ml-oauth-start
npx supabase functions deploy ml-oauth-callback
npx supabase functions deploy ml-token-refresh
npx supabase functions deploy ml-daily-sync
```

`ml-oauth-callback` precisa ser invocável **sem JWT** (o Mercado Livre redireciona o navegador para lá). A proteção é o `state` de uso único em `ml_oauth_states`.

`ml-oauth-start` exige usuário logado. Só **super_admin** consegue iniciar a conexão.

---

## Passo 5 — Autorize a conta na tela do app

1. Publique o app no Lovable (Share → Publish) para o `APP_URL` bater com o redirect de volta.
2. Entre no app com um usuário **super_admin**.
3. Abra `/integracoes`.
4. Clique em **Conectar conta Mercado Livre**.
5. Faça login no Mercado Livre com a conta da loja e aceite os acessos.
6. Você deve voltar para `/integracoes?status=ok` e ver a conta na lista (apelido + ID).

A tela dispara `supabase.functions.invoke("ml-oauth-start")` e redireciona a página inteira (não usa popup).

---

## Passo 6 — Mantenha o token vivo

O access token do ML dura cerca de **6 horas**. O refresh token é **de uso único**.

Agende um job (Lovable Cloud → Jobs, ou cron do Supabase) a cada 15–30 minutos:

- URL: `https://<ref>.supabase.co/functions/v1/ml-token-refresh`
- Header: `x-refresh-secret: <mesmo valor de REFRESH_TRIGGER_SECRET>`
- Método: POST

Se o refresh falhar com `invalid_grant`, a conta aparece como **Reautorizar** em `/integracoes`. Clique em **Reconectar**.

A sincronização de dados usa `ml-daily-sync` (mesmo header `x-refresh-secret`).

---

## O que **não** fazer no Lovable

- Não peça ao Lovable para chamar `api.mercadolibre.com` direto no React com o secret.
- Não use `VITE_ML_CLIENT_SECRET`.
- Não coloque o `code` OAuth na URL do app Lovable como redirect — o redirect tem que ser a Edge Function.
- Não ative PKCE no app do ML enquanto o código atual não enviar `code_verifier`.

---

## Problemas comuns

| Sintoma | Causa usual |
| --- | --- |
| `redirect_uri` inválido no ML | URI no DevCenter diferente da usada na função (barra extra, http, domínio errado) |
| `token_400` depois de autorizar | PKCE ligado, `ML_CLIENT_SECRET` errado, ou URI diferente na troca do token |
| `apenas super_admin pode conectar contas` | Usuário sem papel `super_admin` |
| Volta para `/integracoes?status=erro&msg=state_expirado` | Demorou mais de ~10 min para autorizar; clique de novo em Conectar |
| `state_ja_usado` | Recarregou a URL de callback; inicie o fluxo outra vez |
| Conectou mas some depois de algumas horas | Cron de `ml-token-refresh` ausente ou `REFRESH_TRIGGER_SECRET` errado |
| Tela não redireciona | Função `ml-oauth-start` não deployada ou secret `ML_CLIENT_ID` faltando |

Logs: Lovable **Cloud → Logs / Edge functions**, ou Supabase → Edge Functions → Logs. Nunca logue `code`, `access_token` ou `client_secret`.

---

## Checklist rápido

- [ ] App criado no DevCenter com redirect `…/functions/v1/ml-oauth-callback`
- [ ] PKCE desligado
- [ ] Secrets: `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `APP_URL`, `REFRESH_TRIGGER_SECRET` (gerado no PowerShell ou com OpenSSL)
- [ ] Funções ML publicadas
- [ ] App Lovable publicado na mesma origem de `APP_URL`
- [ ] Super admin conectou em `/integracoes`
- [ ] Cron de `ml-token-refresh` ativo
