# system-design

A text-first study guide for system design: fundamentals, trade-offs, building blocks, patterns and case studies, in one ordered roadmap. The site name is not final; it lives in one constant (`src/config.ts`).

## Status

Skeleton only. The roadmap (8 phases, 172 numbered topics), the design, light and dark themes and the page structure are in place. No articles are written yet, so every topic page shows a "Planned" placeholder.

## Why this shape

| Choice | Why |
| --- | --- |
| Few phases, many numbered topics | Easy to see where you are (`4.12`), and topics can grow without reshaping the roadmap. |
| One topic, one article | Small focused reads, simple progress, simple links between topics. |
| Static site (Astro) | Fast, no server, writing is plain Markdown later. |
| Roadmap as a data file | The site structure comes from one place, so reordering is a one-line change. |

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
```

## Common tasks

| To do this | Do this |
| --- | --- |
| Rename the site | Edit `SITE` in `src/config.ts`. |
| Add, rename or move a topic | Edit `src/data/roadmap.ts`. Numbers follow the order. |
| Change colors or fonts | Edit the tokens at the top of `src/styles/global.css`. |
| Check everything | `npm run check` (type check plus a full build). |

## Docs

| Doc | What is in it |
| --- | --- |
| [docs/design.md](docs/design.md) | Visual design, tokens, theming. |
| [docs/roadmap.md](docs/roadmap.md) | How the roadmap data works and how topics become articles. |
| [docs/decisions/](docs/decisions/) | Short records of the decisions that shape the project. |
