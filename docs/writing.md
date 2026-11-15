# Writing articles

How a topic article reads. The first one, [What Is System Design?](../src/content/articles/system-design/what-is-system-design.md), is the model.

## Reader

College students and people in their first engineering job. They know how to code, not how big systems work. Use examples from their life (course registration, a campus app) and explain each new word once, briefly.

## Voice

- Show, don't narrate (a chart wherever numbers have a shape worth seeing, such as a sudden jump): a table, diagram, chart or list where it makes the point clearer, with a line or two of prose between them. Never add one just to have it, and never repeat what a diagram already shows.
- Cut every word that isn't doing work.
- Emphasis stays rare. **Bold** a term where it is defined or a label that starts a list item. <u>Underline</u> at most one or two lines a page. One callout (`>`) for the definition the page hangs on. Tables already name their rows, so no bold inside them.
- Plain words over impressive ones. No "crucial", "robust", "seamless", "leverage", "delve", "in today's world".
- No em dashes, and no hyphens used as dashes. Hyphens only inside real terms.
- Speak to the reader as "you" and to the team as "we".

## Shape

1. Open with a callout that says what the thing is in one line, then a short hook the reader recognizes.
2. Then the sections the topic needs, in an order where each answers the question the last one raised. Headings, table headers and diagram labels are in Title Case, with no "vs" ("Code Level and System Level").
3. End with **Key Points**: three to five lines. The heading and its list are shown together as a summary card automatically.

Carry one running example through the page, and define each new word in the sentence where it first appears instead of in a separate glossary.

Link to other topics by name where they go deeper, for example `[Thinking in Tradeoffs](/system-design/trade-offs)`, instead of covering their material again. The build puts the topic's current number in front ("1.3 Thinking in Tradeoffs") and fails on a link to a topic that does not exist, so never type the number yourself.

## Review before calling it done

- Does each section follow from the one before? Does the running example carry through?
- Is the definition complete, including what the thing is for?
- Are the standard terms a reader will hear named, not only explained (for example high level and low level design)?
- Is every key point backed by the body?
- Any overstated or vague line? Any word doing no work? Any dash?
- Any table, chart or emphasis that is there just to be there?

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

Keep the HTML free of blank lines, or Markdown will break it apart. Styles live in `src/styles/article.css`.
