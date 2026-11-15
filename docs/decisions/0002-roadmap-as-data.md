# 2. Roadmap as one data file

**Decision:** Keep the whole roadmap (phases, topics, groups) in `src/data/roadmap.ts` and generate every page from it. Numbers come from order, URLs from slugs.

**Why:** The roadmap will change as writing progresses. One file means one edit to reorder, rename or add, and the index, side navigation and previous/next links stay consistent.

**Costs:** A typo in a slug breaks a link; slugs must stay unique.

**Alternatives:** One Markdown file per topic with front matter (more scattered, harder to see the whole order), a CMS (overkill).
