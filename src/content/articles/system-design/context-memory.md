> The **context window** is the most tokens a model can consider in one request: the instructions, the conversation so far, tool results, documents, and the model's own output. **Memory** is what persists beyond a single window, such as summaries, notes and stored facts. Managing them means deciding what stays in the window at each turn, what is cut, and what is saved elsewhere to be fetched later.

The helper on the listing pages stops answering one question at a time. A student asks it to compare three calculus books, then checks a seller, then returns to the first question, over forty turns.

Each turn the helper looks up listing details with a tool. By turn 40 the prompt holds a long record of old lookups, and the student's budget, stated in the second message, sits far behind.

A larger window postpones the problem and costs money while it does. This topic covers what fills a window, four ways to trim it, and how to keep facts alive after they leave it.

## What Fills the Window

Anthropic's documentation lists what counts: the system prompt, each message including tool results, images and documents, the tool definitions, and the model's output, including its thinking. Newer models listed there have windows of 1 million tokens and the older ones 200,000.

A request whose input alone exceeds the window gets an error, and one whose output runs out of room stops with a reason that says so. A token counting call lets you measure before sending, and the usage fields report what each response consumed, including cached tokens.

A bigger window doesn't mean the model uses it evenly. The documentation names **context rot**: accuracy and recall degrade as the token count grows. Two papers measured pieces of this:

- **Lost in the Middle**: Performance is often highest when the relevant information is at the beginning or end of the input, and degrades when it is in the middle, even for models built for long contexts
- **RULER**: Models that score near perfectly on the simple needle in a haystack test show large drops as the length grows on harder tasks. Of 17 models claiming 32,000 tokens or more, about half kept satisfactory performance at 32,000

Both are from 2023 and 2024 models, so newer ones may do better, and the lesson is to test your own task at your own lengths. The usable context is often shorter than the advertised one.

For the helper we assumed what each turn adds: 60 tokens from the student, 50 for the tool call, 800 for the listing details the tool returns, and 200 for the answer. That is 1,110 tokens a turn, on top of a 3,000 token prefix of instructions and tool definitions.

<figure class="diagram">
<div class="flow">
<div class="node hot">Instructions and Tools<small>3,000, cached</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">History<small>1,110 more each turn</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">New Question</div>
</div>
<figcaption>What fills the window: a fixed start, a history that grows by 1,110 tokens each turn, and the new question</figcaption>
</figure>

After 60 turns the history is 66,600 tokens, and the prompt 69,600. Using our earlier estimate of 14 billion operations a token on a machine delivering 150 trillion a second, prefill of that prompt takes about 6.5 seconds when no cache applies. Most of the tokens are old tool results the student no longer cares about.

## Four Ways to Trim

We simulated four policies for the 60 turn conversation. Costs use our round price of 2 dollars for each million input tokens. The cache columns use the multipliers of [Caching and Model Routing](/system-design/llm-cost-latency), 1.25 for a write and 0.1 for a read, with each turn arriving within the cache lifetime:

| Policy | Prompt at Turn 60 | Input Cost, No Cache | Input Cost, Cached |
| --- | --- | --- | --- |
| Keep the Whole History | 68,550 | $4.30 | $0.59 |
| Last 10 Turns | 14,160 | $1.58 | $1.45 |
| Clear Old Tool Results | 25,430 | $1.84 | $0.66 |
| Compact at 20,000 Tokens | 17,880 | $1.61 | $0.36 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Dollars for four trimming policies with a cache">
<div class="hbar peak"><span>Last 10 Turns</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$1.45</span></div>
<div class="hbar"><span>Clear Old Tool Results</span><span class="track"><span class="fill" style="--w: 45.5%"></span></span><span class="value">$0.66</span></div>
<div class="hbar"><span>Keep the Whole History</span><span class="track"><span class="fill" style="--w: 40.7%"></span></span><span class="value">$0.59</span></div>
<div class="hbar"><span>Compact at 20,000</span><span class="track"><span class="fill" style="--w: 24.8%"></span></span><span class="value">$0.36</span></div>
</div>
<figcaption>Input cost of a 60 turn conversation with a prompt cache, by policy, from our simulation</figcaption>
</figure>

The compaction row includes three summarizing calls, with their output. Four findings follow:

- **Keeping the whole history is cheap with a cache** and expensive without one, and its prompt grows to 68,550 tokens, with the delay and the context rot above
- **A sliding window barely benefits from caching**: dropping the oldest turn changes the start of the history each time, so each request misses, and the cached cost of $1.45 is close to the uncached $1.58
- **Clearing old tool results** kept the dialogue and removed most of the bytes, at a price close to keeping the whole history, since each clearing changes the prefix
- **Compaction was the cheapest with a cache**, since a summary is rare and a shorter prompt is cheap, and it is also the policy that loses the most detail

### Drop the oldest turns

A window of recent turns is the simplest: keep the last N and drop the rest. It is predictable, and it forgets.

The student's budget from turn 2 is gone at turn 12, and the model will suggest a book that costs too much. It also moves the start of the history on each turn, which defeats the prompt cache as the table showed.

### Clear old tool results

Tool results are bulky and age quickly. Anthropic's context editing, a beta feature at the time of writing, clears the oldest tool results on the server once the input passes a trigger, replaces each with a placeholder, and keeps the most recent few. The client keeps the full history, and an option clears the tool inputs too.

The documentation warns that clearing invalidates cached prefixes, and recommends a setting for the least amount to clear so that the saving is worth the cache write. For the helper this is the natural first step, since the 800 token listing lookups are most of the history and the answers that used them stay.

### Summarize and compact

A **summary** replaces older turns with a short text, written by the model. Anthropic's compaction runs in three ways: on demand from your code, by a threshold on the server, or with a summarizer you write.

For the threshold form, the documentation gives a default trigger of 150,000 input tokens with a minimum of 50,000, and a default summary prompt that asks for the state, the next steps and the learnings.

A custom prompt replaces that default, so it can ask for what matters to your task, such as the student's budget and the books being compared.

Summaries have costs. The model that summarizes is the one you pay for, the documentation describes images and documents in the summarized range as lost, and a system message inside that range is summarized too, so check that the instructions you need stay in the prompt after compaction. A summary also drops detail you didn't think to ask for.

### Start a new window with notes

At a task boundary, such as the student finishing a comparison, the cleanest move may be to save the result and start fresh. That needs somewhere to keep notes.

## Memory Beyond the Window

LangGraph's documentation separates two scopes. Short term memory belongs to one thread and is saved as the state of the conversation so it can resume.

Long term memory is shared across threads and kept as documents in a store, with names and keys, searchable by meaning and by content. It also names three kinds of long term memory:

- **Semantic**: Facts, such as the student's course and budget
- **Episodic**: Past experiences, often used as examples in a prompt
- **Procedural**: Instructions, which for an agent mean its system prompt and sometimes a version it has refined

Semantic memory can be one profile that is updated over time, which gives unified context, or a collection of small documents, which tends to give better recall. The collection is the case for [Semantic Search with Embeddings](/system-design/embeddings) and [Vector Databases](/system-design/vector-databases), since the store looks facts up the way a RAG system does.

MemGPT, a 2023 paper, described the same idea as an operating system would: virtual context management, which moves information between tiers of memory, like the memory hierarchy of an operating system, so that a limited window gives the appearance of more.

Anthropic's memory tool is a concrete form. It is client side and file based: the model asks to view, create, replace, insert, delete or rename files under a `/memories` directory, and your code carries out each request against storage you control.

When the tool is present the API adds an instruction to look in the directory first, and warns the model that its context might be reset at any moment, which is the right mindset for a long task. The documentation lists what the developer owns:

- **Path safety**: Check that each path stays inside the memory directory, and reject traversal tricks
- **Size limits**: Cap file sizes and the text returned from a view
- **Housekeeping**: Delete stale files
- **Sensitive data**: Strip it yourself, since the model usually refuses to store it and that isn't a control

LangGraph describes two times to write a memory. In the hot path, the agent writes before it replies, which makes the memory available at once and visible to the user, at a cost of latency and divided attention.

In the background, an asynchronous job writes memories, which adds no delay and separates the concern, but timing and frequency need design, such as a delay that restarts on new events, a schedule, or a manual trigger.

A memory about a person is personal data. It needs the access rules, retention and deletion that [Data Privacy and Compliance](/system-design/privacy) describes, and it needs to be separated by user and tenant, as in [Isolating Tenants in a Shared System](/system-design/multi-tenancy).

## Put the Stable Part First

Whatever policy you choose, order the window by how often parts change. The instructions and tool definitions come first and stay identical, so the prompt cache holds them. Stable memory such as a profile comes next.

The conversation follows, and the newest question comes last. This also places the most important facts near the start and end, where the Lost in the Middle results say models attend best.

Each trim changes the prefix, so trim in larger steps and less often: clear a batch of old results when the prompt passes a threshold, and not one result on each turn, which is the point of the thresholds in the documentation.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Stable Prefix | Instructions and tool definitions first, cached |
| Tool Results | Clear each result except the last 3 once the prompt passes 30,000 tokens |
| Compaction | A summary at 60,000 tokens, with a custom prompt that keeps the budget, the course and the books compared |
| Profile | The course, budget and preferred condition, saved as a note after the student states them |
| Writes | In the background, after the conversation goes quiet for 5 minutes |
| Retrieval | Old listings looked up again when needed, and not kept in the window |
| Privacy | Notes per student, deletable on request, and not shared across students |
| Tests | A 60 turn script that asks at turn 55 about a fact from turn 2 |

## Pitfalls

- **Trusting the advertised window**: Quality can drop well before the limit
- **A sliding window with a cache**: Each turn misses, and the facts from early turns are lost
- **Keeping bulky tool results forever**: They are most of the tokens and little of the value
- **A summary with no guidance**: It keeps what the model thinks matters, not what you need
- **Trimming a little on each turn**: Each change invalidates the cache
- **Memory without access rules**: One user's notes reach another
- **Letting the model write any path**: A traversal bug exposes files

## Key Points

- A window holds the instructions, the history, tool results and the output, and quality can fall before it is full, so measure at your own lengths
- Tool results dominate: in our 60 turn example, 800 of each 1,110 tokens were lookups, and the prompt reached 68,550 tokens if no trimming happened
- Trimming interacts with caching: a sliding window cost $1.45 with a cache against $0.59 for keeping the whole history, while compaction cost $0.36
- <u>Save facts outside the window</u>: notes in a store or a memory directory, written in the background and read back by meaning, survive any trim
- Keep the stable part first, trim in steps, summarize with a custom prompt, and test with a long script that asks about an early fact
