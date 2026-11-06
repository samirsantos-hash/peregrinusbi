# Loading visuals

- Authenticated dashboard entry uses a short, dismissible local iframe for the original laser scene; no user data enters the frame, reduced motion skips it and teardown releases WebGL without affecting dashboard state.

- Page entrances use CSS-only title/content transitions without remounting route state, mutating text or transforming fixed-overlay ancestors; the small global query-loading indicator never blocks clicks and respects reduced motion.