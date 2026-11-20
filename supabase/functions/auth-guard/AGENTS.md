# Regras do auth-guard

- Login/reset go only through `auth-guard` (hashed attempts, neutral reply, brand-domain link); the client never calls signInWithPassword/resetPasswordForEmail directly, so limits apply.
- Successful logins in `auth-guard` record IP/device in `acessos_login` (90-day retention, master/dev read); a device unseen in 90 days with prior history alerts developers and emails the user via the `novo-acesso` template.
