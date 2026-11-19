# Writing articles

How a topic article reads. The first one, [What is System Design?](../src/content/articles/system-design/what-is-system-design.md), is the model.

## Reader

Computer science seniors and engineers in their first year on the job. They have taken data structures, operating systems, networking and databases, so processes, memory, TCP/IP, SQL, indexes and hashing need no explanation. What they don't have is system knowledge: how a real system runs on many machines, with load balancers, cache tiers, replicas and queues. Assume none of it. Explain every system idea from the start, briefly, the first time it appears, and never assume they've seen it at work. Use examples from their life: course registration and campus apps for students, a first team's services, on call and design reviews for new engineers, and interviews for both.

## Voice

- Show, don't narrate. A small diagram of how something works, a chart of numbers with a shape, a table of a comparison: each explains faster than paragraphs. Use one wherever it truly helps: a table, diagram, chart or list where it makes the point clearer, with a line or two of prose between them. Never add one just to have it, and never repeat what a diagram already shows.
- Cut every word that isn't doing work.
- The goal is to make the idea click in an enjoyable way, never to overwhelm. One visual per idea: if a diagram already shows it, don't add a table or code for the same thing. A page with five tables and three diagrams is too much; drop whichever adds least.
- Emphasis stays rare. **Bold** a term where it is defined or a label that starts a list item. <u>Underline</u> at most one or two lines a page. One callout (`>`) for the definition the page hangs on. Tables already name their rows, so no bold inside them.
- Remind, don't assume. When a topic uses an idea from an earlier one (the textbook app, a replica, a load balancer, a port), restate it in one short clause and link to it. Readers skip around and forget; a few words cost little.
- Be careful with absolutes. "Never", "always", "every", "nothing" and "only" are rarely exactly true in system design, and readers (and interviewers) distrust them. Say "usually", "often" or "can", or name the condition. Keep a strong word only when it is really true, and check each fact once more.
- Plain words over impressive ones. No "crucial", "robust", "seamless", "leverage", "delve", "in today's world".
- No em dashes, and no hyphens used as dashes. Hyphens only inside real terms and names (key-value, write-ahead, B-tree, `Cache-Control`), not in plain compound adjectives: write "keeps data in memory", "for each user", "complete", not "in-memory", "per-user", "self-contained". Too many hyphens read as machine written.
- Speak to the reader as "you" and to the team as "we".
- Every list item starts with a capital letter and ends without a period. A bold term inside a sentence shows in the term color (strong blue), so bold only words being introduced there.

## Shape

1. Open with a callout that says what the thing is in one line, then a short hook the reader recognizes.
2. Then the sections the topic needs, in an order where each answers the question the last one raised. Headings, table headers and diagram labels are in Title Case, with no "vs" ("Code Level and System Level"). Short words such as "is", "and", "to" and "of" stay lowercase ("What is System Design?").
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

Do all of these after the last edit, every time:

- **Visuals**: reread each section and ask whether a diagram, chart, table or example would explain it faster. Decide on purpose, and add one where it truly helps. If nothing helps, leave it
- **Facts**: check each claim, number and example against the sources once more, and fix anything wrong or misleading
- **Grammar and wording**: read the whole page aloud in your head for broken or awkward sentences, and for absolutes
- **Fit**: check every diagram, table and code block at phone width and at the widths in between

- Does each section follow from the one before? Does the running example carry through?
- Is the definition complete, including what the thing is for?
- Are the standard terms a reader will hear named, not only explained (for example high level and low level design)?
- Is every key point backed by the body?
- Any overstated or vague line? Any word doing no work? Any dash?
- Any table, chart or emphasis that is there just to be there?
- Is every claim true? Check each fact, number and example against the sources once more, and fix anything that is wrong or misleading.

## Sources and our own voice

The words in blueprint are ours. We learn from the sources, understand them, and then explain the idea as if we had worked it out, with our own example, our own numbers and our own simulation. Rules:

- **Where to learn**: Official documentation, papers, standards (RFCs), and the engineering articles of the company or institution that built the thing. Never Wikipedia, Reddit, Stack Overflow, Medium or any page that anyone can edit. Famous system design sites and books are for background and cross checking only, never for the structure or the words of a page.
- **Read, don't relay**: Read the source yourself, then close it and write what you understood. If a fact can't be traced to a primary source, compute it ourselves or leave it out.
- **No "site X says"**: Don't write "the Amazon S3 documentation describes", "according to Wikipedia", "the paper states" as a way of passing on a claim. State the idea in our voice. A source gets a few words only when it can't be avoided: a result that carries a name (the FLP result, the Dynamo paper's design), a quoted figure that no one else can produce (a company's own incident numbers), or a history that belongs to one paper. Keep it to a clause, never a paragraph of attributions.
- **Our numbers first**: Prefer a number we measured or derived. When an outside figure is needed, give it plainly with the system or incident it belongs to.
- **Reports list what was read**: When reporting a finished page, list the primary sources read, in the chat and not in the page.

## Reads like a story

A page is one story told in order, not a stack of facts. The reader should feel carried: each paragraph ends by raising the question the next one answers, and each section's first lines pick up exactly where the last one stopped. The running example (the textbook app) is the thread: a problem shows up in it, we try the obvious thing, it breaks in a way the reader can picture, and the next idea arrives as the fix. Lists, tables and diagrams serve the story at the point where it needs them, and they are introduced by a sentence and followed by a sentence about what they showed. Cut any section that is a catalog and not a step in the story.

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

Arrows can carry a word (`<div class="arrow" data-label="reads" aria-hidden="true"></div>`). A label of about ten characters or more needs the `wide` class (`class="arrow wide"`) so it doesn't touch the boxes, and the node text may need shortening if the row then overflows. One diagram can hold several flows, each under a small name (`<p class="rowname">Read</p>` before its `flow`), for example a write path and a read path.

Horizontal bars, for a few labeled values (see 1.6): a `chart` figure holding `hbars`, each row `<div class="hbar"><span>Label</span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">60 ms</span></div>`, with `peak` on the bar to notice.

Packets in rows, for showing what happens to a lost message (see 1.6): `<div class="flow packets">` holding `<div class="node">1</div>`, with `node lost` for a lost one and `node wait` for one held up behind it.

A waterfall, for where time goes (see 1.9): a `chart` figure holding `waterfall`, each row `<div class="wf"><span>DNS lookup</span><span class="track"><span class="bar" style="--s: 0%; --w: 13%"></span></span><span class="value">40 ms</span></div>`, where `--s` is where the bar starts and `--w` how long it lasts on a shared axis, and `peak` marks the row to look at.

A dial between two ends (see 1.3): a `scale` holding a `line`, `dot` points placed with `style="--x: 40%"` whose label is a `span`, and an `ends` row with the two end labels.

An array as cells, for algorithms (see Algorithms 1.1): a `diagram` figure holding `<div class="cells">` with one `<div class="cell">3<small>0</small></div>` per element, the small text being the index. Mark cells with `hl` (in play), `done` (settled), `bad` (wrong) or `dim` (ignored). Give a cell `data-ptr="i"` to label it with a pointer, and the row the class `ptrs` so the label has room. Cells shrink to fit a phone, so keep a row to about ten cells.

A node can also carry `hl` to be outlined in the term color, and `hot` to be red. A tree drawn level by level uses one `<div class="flow packets tree">` for each level, with at most four small nodes in a row (see Algorithms 1.5). A call stack or a list of frames, newest on top, is `<div class="frames">` holding `node` items (see Algorithms 1.6). A line chart can carry dashed `bound` lines and a dotted `mark` line.

Keep the HTML free of blank lines, or Markdown will break it apart. Styles live in `src/styles/article.css`.
