# Architecture Rules

- Mercado Livre OAuth callbacks must finish only the authorization-critical work before redirecting; schedule historical backfills with `EdgeRuntime.waitUntil` to avoid gateway timeouts.