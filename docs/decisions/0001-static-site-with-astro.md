# 1. Static site with Astro

**Decision:** Build the site with Astro as a static site, with Markdown for articles later.

**Why:** The content is long-form text and images with little interactivity. Astro ships almost no JavaScript, builds fast and keeps writing in plain Markdown.

**Costs:** Anything interactive later (simulations, quizzes) needs islands or a separate approach.

**Alternatives:** Next.js (heavier than needed for text), plain HTML (no shared layout or data), a docs generator such as Docusaurus (faster start, less control over the design).

**Version note:** Astro 5. The newest Astro needs a newer Node than the one on this machine, so the upgrade is deferred.
