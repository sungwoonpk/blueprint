# Writing articles

How a topic article reads. The first one, [What Is System Design?](../src/content/articles/system-design/what-is-system-design.md), is the model.

## Reader

College students and people in their first engineering job. They know how to code, not how big systems work. Use examples from their life (course registration, a campus app) and explain each new word once, briefly.

## Voice

- Show, don't narrate. Most of a page is tables, diagrams, charts and bullets; prose is one or two lines between them.
- Cut every word that isn't doing work.
- **Bold** key terms and numbers. <u>Underline</u> the one line to remember in a section. Use a quote block (`>`) as a callout for the definition the page hangs on.
- Plain words over impressive ones. No "crucial", "robust", "seamless", "leverage", "delve", "in today's world".
- No em dashes, and no hyphens used as dashes. Hyphens only inside real terms.
- Speak to the reader as "you" and to the team as "we".

## Shape

1. Open with a callout that says what the thing is in one line, then a short hook the reader recognizes.
2. Then the sections the topic needs, each with a short heading.
3. End with **Key points**: three to five lines.

Link to other topics by name where they go deeper, for example `[Thinking in Tradeoffs](/system-design/trade-offs)`, instead of covering their material again.

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
