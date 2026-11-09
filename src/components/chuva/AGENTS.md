# Loading visuals

- Authenticated dashboard entry uses a short, dismissible local iframe for the original laser scene; no user data enters the frame, reduced motion skips it and teardown releases WebGL without affecting dashboard state.

- Page entrances use CSS-only transitions without remounting route state; observed uncached queries block until completion except interactive searches and dependent reads marked `carregamentoNaoBloqueante`. Explicit store/period selection overrides this metadata; cached revalidation and speculative queries never block presentation.
- Loading progress counts finalized queries in the observed batch, with elapsed time but no fabricated ETA; percentages can decrease when new dependent queries start.
- Uncached loading delays the structural skeleton using the tracked batch elapsed time; explicit store/period selection keeps progress and elapsed time alongside it, without invalidating cache. Cached selection revalidation stays visible and nonblocking.
- A shared presentation store signals loading/release to React-owned number counters; chart reveals use transform/opacity without remounting data or delaying controls, and reduced motion renders final values immediately.