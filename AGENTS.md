# Architecture Rules

- Mercado Livre OAuth callbacks consume one-time state only after token exchange and finish only authorization-critical work before redirecting; schedule historical backfills with `EdgeRuntime.waitUntil` to avoid gateway timeouts.