# Loading visuals

- Authenticated dashboard entry uses a short, dismissible local iframe for the original laser scene; no user data enters the frame, reduced motion skips it and teardown releases WebGL without affecting dashboard state.

- Page entrances use CSS-only title/content transitions without remounting route state, mutating text or transforming fixed-overlay ancestors; the viewport-centered query-loading portal never blocks clicks and respects reduced motion.
- Loading progress counts finalized queries in the observed batch, with elapsed time but no fabricated ETA; percentages can decrease when new dependent queries start.