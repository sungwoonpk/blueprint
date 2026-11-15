# blueprint

A text-first study guide with one ordered roadmap per subject: **System Design** (fundamentals, building blocks, distributed systems, patterns and the classic papers) and **Algorithms** (the data structures, techniques and strategies behind coding problems). It is for learning concepts, not for practicing exercises. The name is always lowercase and lives in `src/config.ts`.

## Status

Writing has started: System Design 1.1 is the first article. System Design has 9 phases and 187 topics, Algorithms has 9 phases and 121 topics. Each subject's front page shows its phases and groups; groups expand to show topics, and a search field filters the page as you type. Home shows a slowly turning planet in the logo's colors, with one moon per subject circling it. The header has search across both subjects, a theme toggle and a menu for Home and the subjects. A topic without an article says "Coming soon."

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
| Add a subject | Add its data file in `src/data/`, list it in `src/data/subjects.ts`, and add `index.astro` and `[slug].astro` under `src/pages/<subject>/` (copy an existing subject's two files). |
| Write a topic's article | Add `src/content/articles/<subject>/<slug>.md` and follow [docs/writing.md](docs/writing.md). |
| Add, rename or move a topic | Edit `src/data/system-design.ts` or `src/data/algorithms.ts`. Numbers follow the order. |
| Change colors or fonts | Edit the tokens at the top of `src/styles/global.css`. |
| Check everything | `npm run check` (type check plus a full build). |

## Docs

| Doc | What is in it |
| --- | --- |
| [docs/design.md](docs/design.md) | Visual design, tokens, theming, search. |
| [docs/roadmap.md](docs/roadmap.md) | How the roadmap data works and how topics become articles. |
| [docs/writing.md](docs/writing.md) | How articles read: voice, shape, sources, diagrams. |
| [docs/decisions/](docs/decisions/) | Short records of the decisions that shape the project: static site, roadmap as data, nine phases, distributed data in one phase, our own patterns, subjects and the Algorithms roadmap. |
