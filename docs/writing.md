# Writing articles

How a topic article reads. The first one, [What Is System Design?](../src/content/articles/system-design/what-is-system-design.md), is the model.

## Voice

- Short paragraphs, one to three sentences. Short sentences.
- Say the important things plainly and stop. No warm up, no filler, no summary of what is coming.
- Show an example wherever one makes the idea click: a small running example, numbers, a table, a diagram.
- Plain words over impressive ones. No "crucial", "robust", "seamless", "leverage", "delve", "in today's world".
- No em dashes, and no hyphens used as dashes. Hyphens only inside real terms.
- Speak to the reader as "you" and to the team as "we".

## Shape

1. Open with what the thing is, in two or three sentences.
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

Keep the HTML free of blank lines, or Markdown will break it apart. Styles live in `src/styles/article.css`.
