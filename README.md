# blueprint

A text-first study guide for system design: fundamentals, building blocks, distributed systems, patterns and the classic papers, in one ordered roadmap. It is for learning concepts, not for practicing design exercises. The name is always lowercase and lives in `src/config.ts`.

## Status

Skeleton only. The roadmap (9 phases, 171 numbered topics) is the front page: phases show their groups, groups expand to show topics, and a search field filters it as you type. Light by default, with a dark theme. No articles are written yet, so every topic page says "Coming soon."

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
| Change the name or author credit | Edit `SITE` in `src/config.ts`. |
| Add, rename or move a topic | Edit `src/data/roadmap.ts`. Numbers follow the order. |
| Change colors or fonts | Edit the tokens at the top of `src/styles/global.css`. |
| Check everything | `npm run check` (type check plus a full build). |

## Docs

| Doc | What is in it |
| --- | --- |
| [docs/design.md](docs/design.md) | Visual design, tokens, theming, search. |
| [docs/roadmap.md](docs/roadmap.md) | How the roadmap data works and how topics become articles. |
| [docs/decisions/](docs/decisions/) | Short records of the decisions that shape the project: static site, roadmap as data, nine phases, distributed data in one phase, our own patterns. |
