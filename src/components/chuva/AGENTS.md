# Loading visuals

- Authenticated dashboard entry uses a short, dismissible local iframe for the original laser scene; no user data enters the frame, reduced motion skips it and teardown releases WebGL without affecting dashboard state.

- Page entrances use CSS-only title/content transitions without remounting route state or mutating text; only observed queries without cached data block the mounted root until completion. Same-key cached revalidation shows a nonblocking status; speculative queries never block presentation.
- Loading progress counts finalized queries in the observed batch, with elapsed time but no fabricated ETA; percentages can decrease when new dependent queries start.
- Initial uncached loading renders a structural skeleton; explicit store/period selection emits a visual-only event to track observed reads with progress and elapsed time, without invalidating cache. Cached selection revalidation stays nonblocking.
- A shared presentation store signals loading/release to React-owned number counters; chart reveals use transform/opacity without remounting data or delaying controls, and reduced motion renders final values immediately.