> **Retrieval-augmented generation**, or **RAG**, is a pattern in which the system first retrieves passages from an outside collection that are relevant to a question, then puts them into the model's prompt, so the model answers from text it was given and not just from what it learned in training. It turns a closed model into one that can use your documents, as of today's version of them.

A student asks the helper, "Can I return a book after my exam?" The model hasn't seen the textbook app's rules.

Each course page has its own policy, the pages change each semester, and a plausible but invented answer is worse than no answer. The fix is to look up the policy and show it to the model.

This topic follows a question through that pipeline and tests the parts we can. It builds on [Semantic Search with Embeddings](/system-design/embeddings) and [Vector Databases](/system-design/vector-databases), which supply the retrieval, and on [Caching and Model Routing](/system-design/llm-cost-latency) for the cost of what goes into the prompt.

## Why Retrieve

The term comes from a 2020 research paper. It combined a pretrained text generator, the parametric memory, with a dense vector index of a large text collection that a retriever searches, the non parametric memory.

Its abstract names two open problems for language models alone, providing provenance for their decisions and updating their knowledge, and presents the retrieval side as a route to both.

The reasons carry over to an application:

- **Fresh data**: updating a document updates the answers, with no retraining
- **Provenance**: the answer can point to the passage it used, so a student or a reviewer can check it
- **Permissions**: retrieval can return just what the asking user may see
- **A bounded prompt**: the prompt holds a few passages and not the whole collection, which keeps its size in check

The costs are as real. Retrieval can miss the right passage, and then the model answers without it. The model can ignore a passage it was given. And each passage is tokens that you pay for and wait for.

## Do You Need Retrieval

One point is easy to skip: if the knowledge base is smaller than about 200,000 tokens, roughly 500 pages, the whole thing fits in the prompt, which is sometimes the simplest solution.

That figure is a rough guide from 2024, so check the limits of today's models.

We worked it out for the textbook app. 200 course pages of 12 sentences at about 18 tokens each make about 43,200 tokens. With the round prices and the prefill estimate from earlier topics, 2 dollars for each million input tokens and 150 trillion operations a second at 14 billion operations a token:

| Approach | Prompt Tokens | Input Cost | Prefill |
| --- | --- | --- | --- |
| Whole Set, No Cache | 43,200 | $0.086 | 4.0 s |
| Whole Set, Cached Read | 43,200 | $0.0086 | Not estimated |
| RAG, 5 Small Chunks | 100 | $0.0002 | 9 ms |
| RAG, 5 Whole Pages | 1,080 | $0.0022 | 100 ms |

Stuffing the pages is simple, and a prompt cache from [Caching and Model Routing](/system-design/llm-cost-latency) cuts the price tenfold. Uncached it costs 39 to 430 times as much as retrieval for each question, and with the cache 4 to 43 times as much, and the cost grows with the collection. There is also a quality issue.

Tests on multi document question answering found that performance is often highest when the relevant information is at the beginning or end of the input, and degrades when it is in the middle, even for models built for long inputs.

The tests were on models from 2023, and newer ones may do better, so measure yours.

For a collection that is small and rarely changes, start by stuffing. Move to retrieval when the collection grows past what fits, when the price or delay matters, or when different users may see different parts.

## The Pipeline

RAG has an offline part, which prepares the collection, and an online part, which answers a question. It has these phases: chunking, enrichment, embedding, retrieval, and an end to end evaluation.

<figure class="diagram">
<p class="rowname">Offline</p>
<div class="flow">
<div class="node">Documents</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Chunks</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Vectors and Text</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Index</div>
</div>
<p class="rowname">Online</p>
<div class="flow">
<div class="node">Question</div>
<div class="arrow" data-label="retrieve" aria-hidden="true"></div>
<div class="node hot">Passages</div>
<div class="arrow" data-label="prompt" aria-hidden="true"></div>
<div class="node">Model</div>
</div>
<figcaption>RAG in two parts: prepare the collection ahead of time, and look up passages when a question arrives</figcaption>
</figure>

The offline stages prepare the collection. Chunking splits each document into pieces, each ideally holding a single idea. Enrichment cleans the chunks and attaches metadata such as the title, the course, the semester and the access scope. Then embedding and indexing store the vectors and the text, in the index of [Vector Databases](/system-design/vector-databases).

The online stages are retrieval, which for most text should be a hybrid of keywords and vectors with a re-ranker, as in the last two topics, then packing the best chunks into the prompt with the question, and generating the answer.

Standard RAG works well for queries that map to a single search against a single index, and query rewriting and decomposition help with the harder ones.

## Chunks Lose Their Context

Chunking causes the most common failure. A chunk is cut from a page, and the sentence that says what it is about may sit in another chunk.

Take a chunk that says revenue grew by 3 percent over the previous quarter and names neither the company nor the period. Searching for that company's revenue can't find it.

Anthropic's remedy is contextual retrieval: before indexing, generate a short note of 50 to 100 tokens for each chunk saying where it comes from, and put it in front of the chunk for both the embeddings and the keyword index.

A published measurement gives the share of failed retrievals, one minus the recall at 20, averaged across their test domains:

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of failed retrievals for four setups">
<div class="hbar peak"><span>Plain Embeddings</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">5.7%</span></div>
<div class="hbar"><span>Contextual Embeddings</span><span class="track"><span class="fill" style="--w: 64.9%"></span></span><span class="value">3.7%</span></div>
<div class="hbar"><span>Plus Contextual BM25</span><span class="track"><span class="fill" style="--w: 50.9%"></span></span><span class="value">2.9%</span></div>
<div class="hbar"><span>Plus Re-ranking</span><span class="track"><span class="fill" style="--w: 33.3%"></span></span><span class="value">1.9%</span></div>
</div>
<figcaption>Failed retrievals, as one minus recall at 20, reported by Anthropic in 2024 for its test sets</figcaption>
</figure>

Contextual embeddings cut the failures by 35 percent, adding contextual keywords brought it to 49 percent, and re-ranking the top 150 down to 20 brought it to 67 percent. These are the vendor's numbers on its own test sets.

They show that the effect is large and which direction the pieces push, and your data decides the rest. In the same tests 20 chunks worked better than 5 or 10, though more text can distract, so the count is a tuning choice.

We rebuilt the failure in miniature. The corpus has 200 course pages of 12 sentences. The first sentence names the course, and a later sentence says, for example, "the required edition is" a value, with no course name in it, the way real pages continue under a heading.

A question names the course and the attribute. We split the pages into chunks of different sizes, ranked them with BM25, and counted how often the chunk holding the answer was in the top 5, with the page title added to each chunk or not:

| Sentences per Chunk | Plain | With Title Added | Tokens in Top 5 |
| --- | --- | --- | --- |
| 1 | 2% | 100% | 90 |
| 2 | 10% | 100% | 180 |
| 4 | 28% | 100% | 360 |
| 6 | 46% | 100% | 540 |
| 12, the Whole Page | 100% | 100% | 1,080 |

Small plain chunks rarely found the answer, since each looked like the same sentence from the other 199 pages. A whole page worked each time, and cost 12 times the tokens of the smallest chunks.

Adding the title let the smallest chunks match, with 100 tokens in the prompt and not 1,080. The corpus is built to have this problem, so the numbers are an extreme case, and the direction matches the reports from Anthropic.

The practical rules follow. Chunk by structure, such as a section or a policy, so that a chunk holds one idea. Carry the title and headings into the text that is indexed. And after a hit, a neighbor or the whole section can be added to the prompt, a step called chunk expansion.

## Packing the Prompt

The prompt has to carry the instructions, the passages and the question, and a few practices make it work:

- **Order matters**: because of the position effect, put the best passages at the start or end of the context and not the middle, and keep the number modest
- **Mark the sources**: give each passage an id and a title, and ask the model to answer from the passages and to say when they don't contain the answer
- **Prefer fewer, better passages**: tune the count on your own questions, and let a re-ranker choose, since each passage costs tokens and can distract
- **Ask for citations**: the ids of the passages used, so the answer can be checked

Some model APIs have a citations feature for the last. Each document block can enable citations, and the API returns the answer in pieces, each with pointers to the cited text.

Where a model API has a citations feature, put each RAG chunk into a plain text document. The cited text isn't counted toward output tokens, and the pointers are guaranteed to refer to the documents provided. There is no promise of a citation for each claim, and the feature can't be combined with structured outputs.

## Permissions and Freshness

Retrieval is also where access control belongs. A model can't keep a secret that is in its prompt, so a passage the user may not see must not be retrieved.

Apply the user's permissions as a filter in the search, as in [Vector Databases](/system-design/vector-databases), and keep tenants apart as in [Isolating Tenants in a Shared System](/system-design/multi-tenancy). Enforce strict access controls during both retrieval and generation, so private text stays with the readers who may see it.

Two more points on the data. A changed page has to reach the index, and a deleted one has to leave it, through the change log of [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync).

And a retrieved page is untrusted text: it is input from outside, and a page can contain instructions aimed at the model. Test adversarially and sanitize documents against indirect prompt injection, and [Guardrails](/system-design/guardrails) goes further.

## Evaluate Each Stage

A wrong answer can come from the search or from the writing, and the repair differs. Measures exist for each side:

- **Context recall**: how many of the reference claims are found in the retrieved text, which needs a reference answer
- **Context precision**: whether the relevant chunks are ranked above the irrelevant ones, which depends on the order
- **Faithfulness**: the share of the answer's claims that the retrieved context supports, so 1 supported claim out of 2 scores 0.5
- **Response relevancy**: how closely the answer addresses the question, with no check on whether it is true
- **Groundedness**: similar to faithfulness, and it joins completeness, utilization, relevance and correctness. A groundedness of 0.9 with a correctness of 0.4 means an answer that follows its sources and is still wrong, which points at the sources

Since model output varies, a target range is better than a single value. [Evaluation](/system-design/ai-evaluation) covers building the test set.

| Symptom | Likely Stage | First Fix |
| --- | --- | --- |
| The right chunk isn't in the top results | Retrieval | Better chunks, hybrid search, a re-ranker |
| The right chunk is there and the answer ignores it | Prompt | Fewer chunks, better order, clearer instructions |
| The answer has claims that aren't in the chunks | Generation | Citations, a check on the claims |
| The answer is right for last semester | Freshness | Re-index, filter on the semester |
| A user sees another course's policy | Permissions | Filter at retrieval |

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Start | The 200 pages in the prompt with a prompt cache, while they total under about 100,000 tokens |
| Move to Retrieval | When the pages outgrow that, or the cost for each answer passes a threshold |
| Chunks | One policy for each chunk, with the course and section title added to the indexed text |
| Search | Hybrid, with filters on the semester and the course, and a re-ranker on the top 50 |
| Prompt | Five chunks, best first, each with an id, and an instruction to say when the answer isn't there |
| Citations | Each answer lists the policy ids it used |
| Evaluation | 100 real questions with reference answers, scored for recall, faithfulness and correctness |
| Freshness | A page edit re-indexes within a minute, and a removed page leaves the index |

## Pitfalls

- **Retrieval for a small collection**: stuffing is simpler while it fits
- **Chunks that don't name their subject**: they match the wrong pages, or no page
- **Judging just the final answer**: the failing stage stays unknown
- **Too many chunks**: cost and distraction rise, and the middle gets ignored
- **Retrieving past the user's permissions**: the model repeats what it was shown
- **Trusting retrieved text as instructions**: a document can attack the model
- **A stale index**: the answer is right for a page that no longer exists

## Key Points

- RAG retrieves passages and puts them in the prompt, so the model answers from current, checkable text, and the quality of the answer depends first on the retrieval
- For a small collection, skip it: in our arithmetic, 43,200 tokens of pages cost $0.086 for each question uncached, against $0.0002 for five small chunks
- <u>Chunks have to name their subject</u>: in our experiment, one sentence chunks found the answer 2 percent of the time plain and 100 percent with the page title, and published tests report 35 to 67 percent fewer failed retrievals from adding context and re-ranking
- Pack a few good passages with ids, mind their order, and cite the sources, and apply permissions in the search, not in the prompt
- Evaluate retrieval and generation separately, with recall, precision, faithfulness and correctness, since the fix depends on the stage that failed
