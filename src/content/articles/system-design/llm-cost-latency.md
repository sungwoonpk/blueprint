> **Caching and model routing** are the two main ways to cut the cost and delay of calls to a language model. Caching reuses work already done: the shared start of a prompt, or a whole earlier answer. Routing sends each request to the cheapest model that can answer it well. Both save money by doing less, and each risks quality or freshness if it is done carelessly.

[Model Serving](/system-design/model-serving) was about keeping the helper on the listing pages running. This topic is about what each answer costs. Language model calls are billed by the token, and the bill grows with traffic in a way that a database query doesn't.

We use round prices of our own for the arithmetic: 2 dollars for each million input tokens and 10 dollars for each million output tokens. Providers publish their own tables, and those change, so read the current one before you plan a budget.

## Where the Money and Time Go

A request to the helper carries three things. A shared prefix of 3,000 tokens holds the instructions, the tool descriptions and the course rules, and it is the same for each request. The listing and the student's question add 850 tokens that differ. The answer is 200 tokens.

| Part | Tokens | Cost |
| --- | --- | --- |
| Shared Prefix | 3,000 | $0.0060 |
| Listing and Question | 850 | $0.0017 |
| Answer | 200 | $0.0020 |
| Total | 4,050 | $0.0097 |

Input is 79 percent of the cost, and the largest piece is text that stays the same. The same prefix also adds to the wait. With our estimate from [How LLM Inference Works](/system-design/llm-inference), prefill for 3,850 input tokens takes about 360 ms, and the prefix is most of it.

Two ideas follow. If the model provider can keep the work done for the prefix, the repeated part gets cheaper and faster. And if a request needs less capability than the model has, a cheaper model could answer it.

## Reuse the Prefix

**Prompt caching** keeps the processed form of the start of a prompt, so a later request that begins the same way skips the work. The major providers agree on the shape and differ in the details:

- **Anthropic**: The prefix is built in the order tools, then system, then messages, and a breakpoint marks the end of what to cache. A hit needs prompt segments that are identical, and caching has no effect on the output. The default lifetime is 5 minutes and each use refreshes it at no extra cost, with a 1 hour option. It prices a 5 minute write at 1.25 times the base input price, a 1 hour write at 2 times and a read at 0.1 times, with lower read prices on some models. A prompt shorter than the minimum, which is 512 tokens on the current models listed and larger on older ones, isn't cached and returns no error
- **OpenAI**: Caching is on by default for supported models, with a discount of up to 95 percent on cached input tokens, and the stored data is the model's internal key and value tensors, not the text. Minimums and retention depend on the model, with 1,024 tokens and a default of 30 minutes on the newest. The cache lives on individual machines, so heavy traffic can cause misses
- **Gemini**: Implicit caching is on by default for 2.5 and newer models, with minimums of 2,048 to 4,096 tokens depending on the model. Its advice is to put large common content first and to send requests with a similar start close together in time

The rules are the same everywhere. Put what is stable first and what changes last.

Anything that changes the text before the breakpoint breaks the match: Changes to tool definitions, added images, and an unstable order of keys in JSON are common causes. A timestamp at the top of the prompt turns each request into a miss.

<figure class="diagram">
<div class="flow">
<div class="node hot">Tools<small>cached</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Instructions<small>cached</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Listing<small>changes by listing</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Question<small>changes each time</small></div>
</div>
<figcaption>Order the prompt from stable to changing, so the longest possible start can be reused</figcaption>
</figure>

A write costs more than plain input, so caching can lose money. We worked out the expected cost for the helper with a 5 minute lifetime, requests arriving at random, 1.25 times for a write and 0.1 times for a read:

| Requests a Hour | Chance of a Hit | Cost Against No Cache |
| --- | --- | --- |
| 0.5 | 4.1% | 12.6% more |
| 6 | 39.3% | 12.5% less |
| 30 | 91.8% | 49.8% less |
| 600 | 100% | 55.7% less |

<figure class="chart">
<div class="hbars" role="img" aria-label="Cost per thousand requests for four request rates">
<div class="hbar peak"><span>Half a Request a Hour</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$10.92</span></div>
<div class="hbar"><span>No Cache</span><span class="track"><span class="fill" style="--w: 88.8%"></span></span><span class="value">$9.70</span></div>
<div class="hbar"><span>6 an Hour</span><span class="track"><span class="fill" style="--w: 77.7%"></span></span><span class="value">$8.49</span></div>
<div class="hbar"><span>30 an Hour</span><span class="track"><span class="fill" style="--w: 44.6%"></span></span><span class="value">$4.87</span></div>
<div class="hbar"><span>600 an Hour</span><span class="track"><span class="fill" style="--w: 39.4%"></span></span><span class="value">$4.30</span></div>
</div>
<figcaption>Cost for 1,000 helper requests at four traffic levels, against $9.70 with no cache, from our arithmetic</figcaption>
</figure>

At a hit chance of about 22 percent, which is about 3 requests an hour for this lifetime, caching breaks even. Below that, the writes cost more than the reads save.

At the helper's registration day rate of tens of requests a second, the prefix is read nearly each time, and the cost for each answer fell from $0.0097 to $0.0043.

If the saved work covers the prefix, the time for the first token fell too: our estimate went from about 360 ms to about 80 ms for the 850 tokens that remain.

Two practices help. An entry becomes available after the first response begins, so a burst of parallel first requests misses, and a warm up request with `max_tokens` set to zero can prepare the cache.

Read the usage fields that report tokens written and read, since the hit rate is a number to watch. A cache that is shared by a heavy tenant is a reason to look at [Isolating Tenants in a Shared System](/system-design/multi-tenancy).

## Reuse the Answer

A cache of whole answers skips the call. The simplest form is an exact match: the key is the normalized question plus the data the answer depends on, and the value is the answer.

GPTCache's README, an open source cache for model calls, says that at temperature 0 it searches the cache before calling the model, and a higher temperature skips it.

The key matters more than the lookup. A question about a listing depends on the listing's price and status, so the key has to include the version of the listing, or the entry has to expire quickly.

A reply that uses a student's own data must be cached for that student alone. The invalidation rules of [Cache Invalidation](/system-design/cache-invalidation) apply, and so do the choices of [Where to Put a Cache](/system-design/where-to-cache).

Exact matching misses paraphrases: "is this the 9th edition" and "which edition is this" are different strings. A **semantic cache** embeds the question, a topic of [Semantic Search with Embeddings](/system-design/embeddings), and looks for the nearest stored question. If the similarity passes a threshold, it returns the stored answer.

The tools we read describe the same design. GPTCache states that it uses a vector store for similarity search and warns that false positives on hits and false negatives on misses occur.

A semantic cache has a similarity threshold, the minimum score to count as a match, and a time to live, both editable. A response served from the cache costs no output tokens.

Vendor material, which comes without sources, suggests starting points: a threshold between 0.85 and 0.95 on cosine similarity, a start at 0.90 to 0.95 while watching false positives, and the remark that if false positives exceed 3 to 5 percent, tuning the threshold alone won't fix it.

Reasonable lifetimes are 5 to 15 minutes for prices and stock, 1 to 4 hours for product descriptions and 24 hours for stable text, and the vector search adds 5 to 20 ms. Add jitter to the lifetimes, so entries don't expire at once and cause a burst of calls.

The threshold is a trade between two errors, and we simulated it. The similarity scores are invented: paraphrases of one question score around 0.90 and different questions around 0.60, with the best of five near misses taken for each lookup. In the stream, 60 percent of the questions had an equivalent earlier one:

| Threshold | Correct Hits | Wrong Hits | Wrong Share of Hits |
| --- | --- | --- | --- |
| 0.95 | 9.5% | 0.81% | 7.8% |
| 0.90 | 29.6% | 2.54% | 7.9% |
| 0.85 | 49.0% | 5.92% | 10.8% |
| 0.80 | 55.8% | 11.66% | 17.3% |
| 0.75 | 56.9% | 20.18% | 26.2% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Wrong hits for five thresholds">
<div class="hbar"><span>Threshold 0.95</span><span class="track"><span class="fill" style="--w: 4%"></span></span><span class="value">0.81%</span></div>
<div class="hbar"><span>Threshold 0.90</span><span class="track"><span class="fill" style="--w: 12.6%"></span></span><span class="value">2.54%</span></div>
<div class="hbar"><span>Threshold 0.85</span><span class="track"><span class="fill" style="--w: 29.3%"></span></span><span class="value">5.92%</span></div>
<div class="hbar"><span>Threshold 0.80</span><span class="track"><span class="fill" style="--w: 57.8%"></span></span><span class="value">11.66%</span></div>
<div class="hbar peak"><span>Threshold 0.75</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">20.18%</span></div>
</div>
<figcaption>Wrong hits as a share of the requests, by similarity threshold, from our simulation</figcaption>
</figure>

Loosening from 0.90 to 0.80 gained 26 points of correct hits and multiplied the wrong hits by four. Below 0.80 the correct hits barely grew and the wrong ones kept climbing. A wrong hit is a confident answer to a different question, which for a price or an edition is a visible error.

The distributions are our assumptions, so the shape carries over and the numbers don't. Measure the false positive rate on a labeled sample from your own traffic, and keep a separate cache for each scope of access.

## Route to the Right Model

Models in one family differ in speed and price. The smallest tier is the fastest and suits high volume, latency sensitive work such as classification, extraction and routing.

The list prices it showed when we read it were 0.10 dollars for each million input tokens and 0.50 for output on the smallest tier, and 2 and 10 on the next, a ratio of 20 times. Prices move, so take the ratio as an illustration.

Research has studied how to use that gap. FrugalGPT names three strategies: adapt the prompt, approximate the model, and cascade through models.

Its abstract says fees differ by two orders of magnitude and claims up to 98 percent lower cost for the quality of the best single model, or 4 percent better accuracy at the same cost.

RouteLLM, from 2024, trains a router on preference data to choose between a stronger and a weaker model for each query, and reports a cost reduction of over 2 times in certain cases without losing quality.

Both are abstract level claims on their own benchmarks, so treat them as evidence that the idea works and not as a figure for your product.

There are two designs:

- **A router**: A classifier looks at the request and picks a model before any answer exists. It adds little delay and has to guess difficulty from the text
- **A cascade**: The small model answers first, a check judges the answer, and a doubtful one goes to the large model. It sees the answer before deciding, and the escalated requests pay for both calls

<figure class="diagram">
<p class="rowname">Router</p>
<div class="flow">
<div class="node">Request</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Router<small>guesses difficulty</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">Small Model</div><div class="node">Large Model</div></div>
</div>
<p class="rowname">Cascade</p>
<div class="flow">
<div class="node">Request</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Small Model</div>
<div class="arrow" data-label="check" aria-hidden="true"></div>
<div class="node hot">Large Model<small>if doubtful</small></div>
</div>
<figcaption>Two ways to pick a model: decide first with a router, or answer cheaply and escalate with a cascade</figcaption>
</figure>

We built a toy model. Each question has a difficulty between 0 and 1, skewed toward the easy side. The chance of a correct answer falls as the difficulty rises, and falls sooner for the small model.

The large model got 96.5 percent right, the small one 58.4 percent, at a cost ratio of 20 to 1. A router sees the difficulty plus noise, and a cascade sees a noisy confidence score for the small answer:

| Design | Quality, Share of Large | Cost, Share of Large |
| --- | --- | --- |
| Small Model Alone | 60.5% | 5.0% |
| Random Split at Matching Cost | 82% | 57% |
| Router, Noise 0.30 | 88.5% | 57.1% |
| Router, Noise 0.15 | 92.2% | 58.5% |
| Router, Noise 0.05 | 94.6% | 58.4% |
| Cascade, Cutoff 0.6 | 94.9% | 55.7% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of large model quality for four designs at similar cost">
<div class="hbar peak"><span>Random Split</span><span class="track"><span class="fill" style="--w: 82%"></span></span><span class="value">82%</span></div>
<div class="hbar"><span>Router, Noise 0.30</span><span class="track"><span class="fill" style="--w: 88.5%"></span></span><span class="value">88.5%</span></div>
<div class="hbar"><span>Router, Noise 0.05</span><span class="track"><span class="fill" style="--w: 94.6%"></span></span><span class="value">94.6%</span></div>
<div class="hbar"><span>Cascade, Cutoff 0.6</span><span class="track"><span class="fill" style="--w: 94.9%"></span></span><span class="value">94.9%</span></div>
</div>
<figcaption>Quality kept, as a share of the large model, at about 57 percent of its cost, from our toy model</figcaption>
</figure>

At a bit more than half the cost, a random split kept 82 percent of the quality, and routing on difficulty kept 88.5 to 94.6 percent depending on how well it sensed difficulty.

A cascade kept 94.9 percent at 55.7 percent of the cost. Moving the cutoff trades one against the other: the router at a cost share of 42 percent held 88.0 percent of the quality, and the cascade at 41.4 percent held 88.9.

The numbers come from curves we invented, so the pattern is the finding. A router is worth its cost when the request mix has many easy cases and the router can tell.

It also moves the problem to a new component that needs its own evaluation, and a model that is cheaper on the bill but wrong on 8 percent more answers has a cost of its own.

## Stack the Layers

The layers fit in an order, cheapest first:

| Layer | What It Saves | The Risk |
| --- | --- | --- |
| Exact Answer Cache | The whole call | Stale answers |
| Semantic Cache | The whole call for paraphrases | Wrong answers |
| Router or Cascade | The price of easy requests | Lower quality |
| Prompt Cache | Input cost and prefill time | A miss costs more than no cache |
| Batch Pricing | A discount for work that can wait | Delay |

A request first tries the answer caches, then goes to the model chosen by the router, and the prompt cache works inside that call. The providers also offer discounts for batch work.

Batch interfaces are often priced at about half, which fits the overnight jobs of [Model Serving](/system-design/model-serving). When capacity runs short, the same switch that routes by difficulty can route by load, the graceful degradation of [Load Shedding and Graceful Degradation](/system-design/load-shedding).

## What to Measure

Each layer needs its own number:

- **Hit ratio for each cache**: Prompt, exact answer and semantic, since a falling ratio means a changed prompt or a changed traffic mix
- **Cost for each answer**: Input, output and cached tokens priced separately, as the usage fields report them
- **False positives**: A sample of semantic hits reviewed by a person or a judge, against the 3 to 5 percent warning level
- **Quality by route**: The share of answers judged good for the small model, the large model and the cache, as in [Evaluation](/system-design/ai-evaluation)
- **Escalation rate**: The share of cascade requests that go to the large model, which drifts with the traffic

[Monitoring AI Systems in Production](/system-design/ai-monitoring) covers these signals in a dashboard.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Prompt Layout | Tools and course rules first, the listing next, the question last, with no timestamp in the prefix |
| Prompt Cache | On, with a warm up request before 9:00, and a check that the hit ratio stays above 90 percent |
| Exact Cache | Keyed on the question, the model, the prompt version and the listing version, with a 10 minute lifetime |
| Semantic Cache | A threshold of 0.92 to start, on questions without personal data, with a weekly review of false positives |
| Routing | A cascade: the small model answers, and a low confidence goes to the larger one |
| Batch Work | Overnight summaries at the batch price |
| Evaluation | A fixed question set run against each change to a prompt, a threshold or a route |

## Pitfalls

- **A changing value at the top of the prompt**: Each request misses the prompt cache
- **Caching with too few requests**: A write costs more than the reads save below about 3 requests an hour in our model
- **A key that leaves out the data**: The cache serves a stale price
- **A loose semantic threshold**: The hit rate rises along with the wrong answers
- **One cache for each tenant's questions combined**: One user's answer reaches another
- **Routing without an evaluation set**: Savings that hide a drop in quality
- **A cascade that ignores the escalated cost**: A doubtful request pays for two calls

## Key Points

- Input is most of the cost when a long prefix repeats: in our example 79 percent of $0.0097 for an answer, and a prompt cache cut it to $0.0043 at a full hit rate
- Prompt caching needs a stable start and enough traffic: it broke even at a hit chance of about 22 percent, and cost 12.6 percent more at half a request an hour
- A semantic cache trades correct hits for wrong ones: in our simulation, moving the threshold from 0.90 to 0.80 gained 26 points of hits and multiplied wrong answers by four
- <u>Route by difficulty and measure the quality</u>: in our toy model, routing kept 88.5 to 94.9 percent of the large model's quality at about 57 percent of the cost, against 82 percent for a random split
- Stack the layers from cheapest to most expensive, and give each one a hit ratio, a cost and a quality check
