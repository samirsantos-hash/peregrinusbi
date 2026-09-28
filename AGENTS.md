# Architecture Rules

- Mercado Livre OAuth callbacks consume one-time state only after token exchange and finish only authorization-critical work before redirecting; schedule historical backfills with `EdgeRuntime.waitUntil` to avoid gateway timeouts.- Lojistas sem login conectam o Mercado Livre por convite público de uso único (`/conectar/:token`, 7 dias), validado apenas no servidor; convites são acessíveis só pelas funções do servidor.
