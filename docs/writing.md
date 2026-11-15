# Writing articles

How a topic article reads. The first one, [What Is System Design?](../src/content/articles/system-design/what-is-system-design.md), is the model.

## Reader

Computer science seniors and engineers in their first year on the job. They have taken data structures, operating systems, networking and databases, so processes, memory, TCP/IP, SQL, indexes and hashing need no explanation. What they don't have is system knowledge: how a real system runs on many machines, with load balancers, cache tiers, replicas and queues. Assume none of it. Explain every system idea from the start, briefly, the first time it appears, and never assume they've seen it at work. Use examples from their life: course registration and campus apps for students, a first team's services, on call and design reviews for new engineers, and interviews for both.

## Voice

- Show, don't narrate. A small diagram of how something works, a chart of numbers with a shape, a table of a comparison: each explains faster than paragraphs. Use one wherever it truly helps: a table, diagram, chart or list where it makes the point clearer, with a line or two of prose between them. Never add one just to have it, and never repeat what a diagram already shows.
- Cut every word that isn't doing work.
- Emphasis stays rare. **Bold** a term where it is defined or a label that starts a list item. <u>Underline</u> at most one or two lines a page. One callout (`>`) for the definition the page hangs on. Tables already name their rows, so no bold inside them.
- Plain words over impressive ones. No "crucial", "robust", "seamless", "leverage", "delve", "in today's world".
- No em dashes, and no hyphens used as dashes. Hyphens only inside real terms.
- Speak to the reader as "you" and to the team as "we".
- Every list item starts with a capital letter and ends without a period. A bold term inside a sentence shows in the term color (orange), so bold only words being introduced there.

## Shape

1. Open with a callout that says what the thing is in one line, then a short hook the reader recognizes.
2. Then the sections the topic needs, in an order where each answers the question the last one raised. Headings, table headers and diagram labels are in Title Case, with no "vs" ("Code Level and System Level").
3. End with **Key Points**: three to five lines. The heading and its list are shown together as a summary card automatically.

Carry one running example through the page, and define each new word in the sentence where it first appears instead of in a separate glossary.

Link to other topics by name where they go deeper, for example `[Thinking in Tradeoffs](/system-design/trade-offs)`, instead of covering their material again. The build puts the topic's current number in front ("1.3 Thinking in Tradeoffs") and fails on a link to a topic that does not exist, so never type the number yourself.

## Choosing a visual

Ask what shape the content has, then pick the type that fits. Use one only where it truly helps.

| Content | Visual |
| --- | --- |
| Sizes by category | bar; horizontal bar for long names; grouped or stacked bar for parts; radar for many metrics |
| Change over time or any continuous trend | line; area for accumulated amounts; sparkline inside a table |
| Share of a whole | donut for a few parts; treemap for a hierarchy; waterfall for step by step changes |
| Relationship or spread | scatter, bubble, histogram, box plot, heatmap |
| Options on the same criteria, key numbers | comparison table, data table, pivot, KPI tiles |
| Process, calls, system parts, schedules, concepts | flowchart, sequence diagram, architecture diagram, timeline, mind map, ER diagram, tree |

Bars, lines and box and arrow diagrams exist already (below). Build any other type the first time a topic needs it, and add it here.

## Review before calling it done

- Does each section follow from the one before? Does the running example carry through?
- Is the definition complete, including what the thing is for?
- Are the standard terms a reader will hear named, not only explained (for example high level and low level design)?
- Is every key point backed by the body?
- Any overstated or vague line? Any word doing no work? Any dash?
- Any table, chart or emphasis that is there just to be there?
- Is every claim true? Check each fact, number and example against the sources once more, and fix anything that is wrong or misleading.

## Sources

Read widely before writing, and keep only what most good sources agree is common and important. Never copy: no sentences taken as they are, and examples are changed or made up so they are our own.

## Building blocks

Markdown covers paragraphs, lists, tables and code. For a diagram of boxes and arrows, use the HTML below; it follows the theme and turns into a column on narrow screens.

```html
<figure class="diagram">
<div class="flow">
<div class="node">Browser</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Database<small>users</small></div>
<div class="node">File storage<small>photos</small></div>
</div>
</div>
<figcaption>What the diagram shows</figcaption>
</figure>
```

A line chart for a trend: an inline SVG with `viewBox="0 0 100 40"` and `preserveAspectRatio="none"`, holding an optional `grid` line, an `area` path and a `stroke` path (y grows downward, so 40 is the bottom). See 1.2 for an example.

A bar chart: set each bar's height inline, and mark the bars to notice with `peak`. Give the bars an `aria-label` that says what the chart shows.

```html
<figure class="chart">
<div class="bars" role="img" aria-label="What the chart shows, in words">
<div class="bar peak" style="--h: 100%"></div>
<div class="bar" style="--h: 40%"></div>
</div>
<div class="axis"><span>Start</span><span>End</span></div>
<figcaption>What is measured (example numbers)</figcaption>
</figure>
```

Arrows can carry a word (`<div class="arrow" data-label="reads" aria-hidden="true"></div>`), and one diagram can hold several flows, each under a small name (`<p class="rowname">Read</p>` before its `flow`), for example a write path and a read path.

Keep the HTML free of blank lines, or Markdown will break it apart. Styles live in `src/styles/article.css`.
