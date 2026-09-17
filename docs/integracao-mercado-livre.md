# Integração Mercado Livre — runbook de instalação

Escopo: fluxo OAuth e sincronização de operações financeiras do Mercado Livre (ML).
Público: quem publica no Lovable/Supabase e conecta a conta como `super_admin`.

Este documento amarra o passo a passo operacional ao que já existe no repositório. A
parte de código (rotas, painel e `verify_jwt` das functions) já está no repo; o que
resta é configuração no console (secrets, deploy, redirect URI e cron).

---

## 1. Visão geral do fluxo

```
Painel (/integracoes)                 Edge Functions (Supabase)                 Mercado Livre
─────────────────────                 ─────────────────────────                 ─────────────
[Conectar conta] ──invoke──▶ ml-oauth-start ──gera state──▶ ml_oauth_states
       │                          │
       │                          └── devolve URL de autorização
       ▼
redirect de página inteira ─────────────────────────────────────────────▶ auth.mercadolivre.com.br
                                                                                   │
                                                                    usuário autoriza (login ML)
                                                                                   │
callback público  ◀── redirect com ?code&state ────────────────────────────────────┘
ml-oauth-callback ──troca code por token (api.mercadolibre.com)──▶ ml_accounts + ml_tokens
       │
       └── redirect 302 para  {APP_URL}/integracoes?status=ok
```

Componentes no repo:

- Frontend: `src/pages/Integracoes.tsx` e `src/components/multilojas/MercadoLivrePanel.tsx`
  (botão "Conectar conta Mercado Livre" → `supabase.functions.invoke("ml-oauth-start")`).
  Acesso à página pelo header do painel (`src/pages/Index.tsx`, botão "Integrações",
  visível para `isAdmin`).
- Functions: `supabase/functions/ml-oauth-start`, `ml-oauth-callback`, `ml-token-refresh`,
  `ml-daily-sync`.
- Banco: tabelas `ml_oauth_states`, `ml_accounts`, `ml_tokens`, `sync_jobs`,
  `stg_ml_daily_raw`, `fin_operations`, `fin_costs`; RPCs `has_role`,
  `ml_token_rotacionar`, `ml_agendar_backfill`, `ml_claim_refresh`, `ml_store_token`,
  `ml_release_refresh`, `ml_contas_status`. Já presentes em `supabase/migrations`.

> Atenção a domínios do ML: **autorização** usa `auth.mercadolivre.com.br`; **token** e
> API usam `api.mercadolibre.com`. Já está assim no código; não trocar.

---

## 2. Pré-requisitos no DevCenter do Mercado Livre

- App criado no DevCenter, com **PKCE desligado** (o código usa `client_secret`, não PKCE).
- Anote o **App ID** (`ML_CLIENT_ID`) e a **Secret Key** (`ML_CLIENT_SECRET`).
- Cadastre a **Redirect URI** (passo 4).

---

## 3. Secrets das Edge Functions

Cloud → Secrets (ou Supabase → Edge Functions → Secrets):

| Secret | Valor | Usada por |
|---|---|---|
| `ML_CLIENT_ID` | App ID do DevCenter | start, callback, token-refresh |
| `ML_CLIENT_SECRET` | Secret Key do DevCenter | callback, token-refresh |
| `APP_URL` | URL pública do app, **sem `/` no fim** | callback (redirect de volta) |
| `REFRESH_TRIGGER_SECRET` | string longa aleatória | token-refresh, daily-sync (header `x-refresh-secret`) |
| `ML_REDIRECT_URI` *(opcional)* | só se diferente do padrão `…/functions/v1/ml-oauth-callback` | start, callback |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetados
automaticamente pelo runtime — não precisa cadastrar. Cada function usa `requireEnv`
(`supabase/functions/_shared/env.ts`) e **falha alto** se um secret obrigatório faltar.

---

## 4. Redirect URI

No app do DevCenter, a Redirect URI precisa ser **idêntica** à usada pela função:

```
https://<project-ref>.supabase.co/functions/v1/ml-oauth-callback
```

Se você definir `ML_REDIRECT_URI`, ela precisa bater exatamente com a do DevCenter
(qualquer diferença de barra/protocolo derruba o fluxo — ver Troubleshooting).

---

## 5. Publicar as Edge Functions

As quatro já existem no repo. Publique pelo Cloud do Lovable ou pela CLI:

```sh
npx supabase functions deploy ml-oauth-start
npx supabase functions deploy ml-oauth-callback
npx supabase functions deploy ml-token-refresh
npx supabase functions deploy ml-daily-sync
```

O `verify_jwt` de cada uma já está fixado em `supabase/config.toml` e é aplicado no
deploy:

| Function | `verify_jwt` | Por quê |
|---|---|---|
| `ml-oauth-start` | `true` | Chamada pelo frontend com o JWT do usuário; revalida `super_admin` no servidor. |
| `ml-oauth-callback` | `false` | O navegador chega redirecionado pelo ML, **sem `Authorization`**. Proteção = `state` de uso único. |
| `ml-token-refresh` | `false` | Cron/backoffice; protegida pelo header `x-refresh-secret`. |
| `ml-daily-sync` | `false` | Cron/backoffice; protegida pelo header `x-refresh-secret`. |

---

## 6. Conectar a conta no app

1. Publish no Lovable.
2. Login como **`super_admin`**.
3. Abra **/integracoes** → **Conectar conta Mercado Livre**.
4. Autorize no ML. Você volta para `/integracoes?status=ok`.

Só `super_admin` inicia o fluxo (checado em `ml-oauth-start` via RPC `has_role`).
Conta de colaborador do ML não consegue autorizar — use a conta principal da loja.

Ao conectar, o callback grava a conta (`ml_accounts`), rotaciona o token
(`ml_token_rotacionar`) e agenda o backfill de 12 meses (`ml_agendar_backfill`).

---

## 7. Renovar o token (cron)

O access token dura ~6 h. `ml-token-refresh` renova proativamente os tokens que
expiram em menos de 45 min (refresh token do ML é de **uso único**; há lock por conta
para evitar corrida).

Agende um `POST` a cada **15–30 min**:

```
POST https://<project-ref>.supabase.co/functions/v1/ml-token-refresh
Header: x-refresh-secret: <REFRESH_TRIGGER_SECRET>
```

Se a situação da conta virar **Reautorizar** (refresh token morto → `invalid_grant`,
status `reauth_required`), clique em **Reconectar** no painel.

---

## 8. Sincronização diária (opcional)

`ml-daily-sync` extrai operações faturáveis e grava em `stg_ml_daily_raw`,
`fin_operations` e `fin_costs`, registrando cada execução em `sync_jobs`.

```
POST https://<project-ref>.supabase.co/functions/v1/ml-daily-sync
Header: x-refresh-secret: <REFRESH_TRIGGER_SECRET>
Body:   { "site_id": "MLB", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }
```

Endpoint padrão do ML: `/billing/integration/periods/operations` (sobrescrevível no body).

---

## 9. Segurança

- **Nunca** chame a API do ML pelo React com o `client_secret`. O front só chama
  `ml-oauth-start`; os tokens ficam em `ml_tokens`, acessíveis apenas pelas Edge
  Functions (via `service_role`).
- O callback é público por natureza; a prova de que o fluxo começou aqui é o `state`
  de uso único em `ml_oauth_states`.
- As functions nunca logam `code`, `access_token`, `refresh_token` ou `client_secret`.

---

## 10. Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Erro de `redirect_uri` | A URI no DevCenter não está **idêntica** à da função (ou ao `ML_REDIRECT_URI`). |
| `token_400` na troca do code | Quase sempre **PKCE ligado** no app do ML, ou `ML_CLIENT_SECRET` errado. |
| Callback retorna 401 | `ml-oauth-callback` publicada sem `verify_jwt = false` (confira `config.toml` e republi­que). |
| `state_expirado` / `state_ja_usado` | O `state` vale ~10 min e é de uso único; reinicie pelo botão Conectar. |
| Conta em **Reautorizar** | Refresh token expirou/foi invalidado; use **Reconectar**. |
| `403 forbidden` no refresh/sync | Header `x-refresh-secret` ausente ou diferente de `REFRESH_TRIGGER_SECRET`. |
