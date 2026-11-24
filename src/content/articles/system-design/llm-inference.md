> **LLM inference** is the work of running a trained language model to produce text. It has two phases: **prefill**, which reads the whole prompt at once, and **decode**, which writes the answer one token at a time, with each step reading the model's weights and a growing cache of earlier work. Serving it well is mostly a question of memory and batching, not arithmetic.

The textbook app adds a helper on each listing page. A student asks, "Is this the same edition as the new one?" and the helper answers in a few sentences, using the listing and the course page. Registration day brings a burst of these questions.

A request to a language model looks like any other call, and it doesn't behave like one. It takes seconds, not milliseconds. Its cost depends on how long the prompt and the answer are.

Two users who send the same number of requests can load the system very differently. To plan capacity for it, you have to know what the machine does with one prompt.

## What Happens to a Prompt

A model reads and writes **tokens**, pieces of text that are often a word or part of a word. A prompt is turned into tokens, and the model returns a probability for each possible next token.

One token is chosen, appended to the text, and the process repeats until the model emits a stop token or hits a limit. Prices, limits and speeds are stated in tokens for this reason.

The model behind this is the Transformer. It dropped recurrence and relied on attention alone, which made training easier to spread over many processors. For serving, attention has a consequence: to write the next token, the model looks back at each earlier token.

<figure class="diagram">
<div class="flow">
<div class="node">Prompt Tokens</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Prefill<small>in parallel</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Decode<small>one token a step</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Answer</div>
</div>
<figcaption>The two phases of one request: read the prompt once, then write one token for each step</figcaption>
</figure>

The two phases behave differently. In prefill, the model processes the input tokens to produce the keys and values that the first new token needs. It is a matrix by matrix operation, highly parallel, and it uses the GPU fully.

In decode, tokens come out one at a time, each step needs the keys and values of the earlier tokens, and it is a matrix by vector operation that leaves the GPU's compute underused.

An application sees this through streaming: with streaming on, the response arrives as server sent events, a start event, a series of small text deltas, and a stop event. The first words can reach the student while later ones are still being computed, which fits how decode works.

## Two Phases, Two Bottlenecks

Why does the second phase matter more? The reason is that decode is memory bound: the speed of moving weights, keys and values from memory, and not the arithmetic, sets the latency. Each step reads the whole model to produce one token.

We put numbers on it with a roofline estimate. A step takes as long as the larger of two times: the time to read the bytes from memory, and the time to do the arithmetic.

We assumed round numbers that are ours and not a product's: a model with 7 billion parameters in 16 bit form, which is 14 GB of weights, on an accelerator with 80 GB of memory, 2 TB a second of memory bandwidth, and 300 trillion operations a second at its peak, of which we credit half.

For one user with 1,000 tokens of context, reading the weights and the cache takes 7.26 ms, and the arithmetic takes 0.09 ms. The step is limited by memory by a factor of about 80. The accelerator spends most of its time waiting for data.

That points to the remedy, which is to share the weight reads. The weights are read once per step whatever the number of users in the batch, so more users per step means more tokens for each read:

| Batch Size | Step Time | Tokens a Second, Total | Tokens a Second, Per User |
| --- | --- | --- | --- |
| 1 | 7.3 ms | 138 | 138 |
| 4 | 8.1 ms | 497 | 124 |
| 16 | 11.2 ms | 1,429 | 89 |
| 32 | 15.4 ms | 2,079 | 65 |
| 64 | 23.8 ms | 2,692 | 42 |

A batch of 64 gave 19.5 times the throughput of a batch of 1. Each user paid for it: their speed fell from 138 tokens a second to 42, since each step also reads each user's cache.

Batching trades the speed of one answer for the output of the machine, which is the same trade as [Scaling Writes](/system-design/scaling-writes) described for commits.

Prefill has the opposite character. We estimated it at 14 billion operations for each prompt token, run at half of the peak:

| Prompt Length | Prefill Time | Decode Time for 200 Tokens |
| --- | --- | --- |
| 100 Tokens | 9 ms | 1.41 s |
| 1,000 Tokens | 93 ms | 1.45 s |
| 8,000 Tokens | 747 ms | 1.82 s |

For a short prompt, decode is nearly the whole wait. A long prompt moves the balance: at 8,000 tokens prefill is about 29 percent of the time, and it is the part the student waits through before the first word appears. The two phases need different metrics, which a later section returns to.

## The Cache That Makes Decode Possible

Without a memory of earlier work, each new token would redo the attention over the whole text. The **KV cache** keeps the keys and values already computed for each token, so a decode step adds one entry and reads the rest.

It stores these calculations so they can be reused without recomputing them.

The cache is large. Its size for one token is 2, for the key and the value, times the number of layers, times the hidden size, times the bytes for each number.

For a model like Llama 2 7B in 16 bit form at 4,096 tokens, one sequence takes about 2 GB, against about 14 GB for the weights. That is 512 KiB for each token by our arithmetic from the same formula.

A 13 billion parameter model makes the same point at a larger size: 800 KB for one token, and as much as 1.6 GB for a request of 2,048 tokens. On a 40 GB GPU, about 65 percent of memory goes to the weights and close to 30 percent to the cache.

The cache has three consequences:

- **It grows with each request**: each token adds to it, and it stays until the answer ends
- **It limits the batch**: the throughput of serving is memory bound, and just a few tens of requests fit when the cache is large
- **It makes long contexts costly**: memory and the read time at each step grow with the length of the prompt

Several techniques shrink the pieces:

- **Fewer key and value heads**: multi query attention shares one set of keys and values among the heads, and grouped query attention shares among groups. Llama 2 70B uses the second. In one measured model, multi query attention cut the cache from 15 GB to under 400 MB at 16,000 tokens
- **Smaller numbers**: a rule of thumb is about 2 GB of memory for each billion parameters in 16 bit form. For a 15.5 billion parameter model, peak memory was about 29 GB at 16 bits, 15.2 GB at 8 bits and 9.54 GB at 4 bits. Inference time is often not reduced, and may rise
- **Attention that moves less data**: FlashAttention computes exact attention in tiles, so less data moves between the GPU's main memory and its fast on chip memory. It ran about 3 times faster for GPT-2 at 1,000 tokens

## Memory Decides the Batch

The cache fills the memory left after the weights, and how it is allocated decides how many requests fit. Older serving systems reserved a block of the maximum length for each request, since the answer length isn't known in advance.

Profiles of such systems found that just 20.4 to 38.2 percent of the cache memory held real token states. The rest was reserved space, internal fragmentation and external fragmentation.

We simulated the same question with our assumed machine. After 14 GB of weights, 66 GB is free, room for about 125,900 tokens of cache. Request lengths, prompt plus answer, followed a skewed distribution with a median of 597 tokens and a mean of 812, capped at 4,096:

| Allocation | Requests That Fit | Memory Holding Real Tokens |
| --- | --- | --- |
| Reserve 4,096 Tokens for Each | 30 | 19.8% |
| Blocks of 16 Tokens, as Needed | 153 | 99.0% |

The reserved design used a fifth of its memory on tokens, in the range measured for earlier serving systems. The second design fits five times as many requests. That is a bound from memory alone, and the step time at that batch size would be longer, as the batch table showed.

The second design is **PagedAttention**. It borrows from the paging of an operating system: the cache of a request is split into fixed size blocks, a table maps the request's logical blocks to physical ones, and the blocks need not sit next to each other.

A new block is handed out when the last one fills, so the waste of a request is at most part of one block.

vLLM is built on it. It gets near zero waste and shares cache blocks within and across requests, and it improves throughput by 2 to 4 times over FasterTransformer and Orca at the same level of latency, with the gain larger for longer sequences and more complex decoding. It reports memory savings of up to 55 percent from sharing in more complex decoding methods.

<figure class="diagram">
<div class="flow">
<div class="node">Logical Blocks<small>1, 2, 3</small></div>
<div class="arrow" data-label="table" aria-hidden="true"></div>
<div class="node hot">Block Table</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Physical Blocks<small>scattered</small></div>
</div>
<figcaption>Paged cache: a request sees one run of blocks, and the server stores them wherever there is room</figcaption>
</figure>

## Batching Without Waiting

The batch has to be formed from requests that arrive at random times and finish at different times. A simple method has two problems: early requests wait for later ones, or new requests wait for the current batch to end, and padding to equalize lengths wastes computation.

The fix, first shown in the Orca system, is called iteration level scheduling: the scheduler decides the batch again after each step, so a finished request leaves at once and a waiting one joins after one iteration.

The result is called continuous batching, or in flight batching. Orca reached 36.9 times the throughput of FasterTransformer on a 175 billion parameter model at the same level of latency.

We simulated the difference. A server has 16 slots and a 10 ms step. Answer lengths are skewed, with a mean of 212 tokens and a cap of 1,000. Requests arrive at random, and the static policy takes up to 16 waiting requests, runs them until the longest one finishes, and returns the whole batch together:

| Arrivals a Second | Policy | Tokens a Second | Mean Latency |
| --- | --- | --- | --- |
| 2 | Static | 422 | 12.5 s |
| 2 | Continuous | 424 | 2.1 s |
| 4 | Static | 485 | 559 s |
| 4 | Continuous | 845 | 2.1 s |
| 6 | Static | 486 | 801 s |
| 6 | Continuous | 1,264 | 2.3 s |

At 2 arrivals a second the load is light, throughput is equal, and static batching already makes an answer wait six times longer, since a short answer is held for the longest one in its batch.

Past 4 a second the static server is saturated at about 485 tokens a second, 30 percent of the 1,600 its slots could produce, and its queue grew for the whole run, which is where the minutes of latency come from.

The continuous server kept refilling slots, so latency stayed near the time of one answer, and throughput rose with the load.

The same ideas keep appearing in serving engines:

- **Chunked prefill**: handles a long prompt in pieces
- **Prefix caching**: reuses the cache of a repeated prompt start
- **Separate machines for prefill and decode**: acknowledges that the two phases have different needs

## Fewer Steps Per Answer

Decode takes one step for each token, so another route is to take fewer steps of the large model. **Speculative decoding** has a small, fast model draft several tokens and the large model check them in a single pass, keeping the ones that agree.

The authors report 2 to 3 times faster output on T5-XXL with identical results, no retraining, and no change to the model's output distribution.

<figure class="diagram">
<div class="flow">
<div class="node">Draft Model<small>small, fast</small></div>
<div class="arrow" data-label="guesses" aria-hidden="true"></div>
<div class="node">Several Tokens</div>
<div class="arrow wide" data-label="checked by" aria-hidden="true"></div>
<div class="node hot">Large Model<small>one pass</small></div>
</div>
<figcaption>Speculative decoding: the small model guesses, and the large model checks the guesses in one pass</figcaption>
</figure>

The levers differ in what they cut and what they cost:

| Technique | What It Cuts | The Price |
| --- | --- | --- |
| Batching | Weight reads for each token | Speed for each user, and cache memory |
| Smaller Numbers | Bytes moved and weight memory | Some quality risk, and maybe no speedup |
| Fewer Key and Value Heads | Cache size | A model built or trained for it |
| Paged Cache | Wasted cache memory | A more complex server |
| Speculative Decoding | Steps of the large model | A second model to run |
| Prefix Caching | Prefill of repeated prompts | Memory for the saved cache |

[Caching and Model Routing](/system-design/llm-cost-latency) covers the application side of the last row and of choosing smaller models for easy questions, and [Model Serving](/system-design/model-serving) covers running these servers.

## What to Measure

The two phases give two latencies, plus the wait before either starts:

- **Time to first token**: the queue wait plus prefill, which grows with prompt length and with load, and is what a student feels as the pause before text appears
- **Time per output token**: the decode step as seen by one user, which grows with batch size and context length, and sets how fast the text streams
- **Throughput**: tokens a second summed over the users, which sets how many students one machine serves
- **Queue length and slot use**: the early sign of saturation, as in [Load Shedding and Graceful Degradation](/system-design/load-shedding)

Set targets for the first two in the way of [SLIs, SLOs and Error Budgets](/system-design/slo), and size the fleet from the third with the arithmetic of [Capacity Planning](/system-design/capacity-planning).

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Interface | Streaming responses, so the first words appear while the rest is computed |
| Prompt | The listing summary and the course page, not the whole history, to keep prefill short |
| Answer Limit | A cap of 300 tokens, since each token is a decode step and a share of the cache |
| Server | Continuous batching with a paged cache, in an existing serving library |
| Admission | A bound on requests in flight, with a clear message when it is reached |
| Metrics | Time to first token, time per output token, tokens a second and queue length |
| Registration Day | A load test with long prompts and a spike, and spare slots scheduled ahead |

## Pitfalls

- **Counting requests, not tokens**: capacity depends on prompt and answer lengths
- **Ignoring the cache in sizing**: weights fit and the cache decides the batch
- **Reserving the maximum length for each request**: most of the memory holds no tokens
- **Static batches for mixed answer lengths**: short answers wait for long ones
- **Judging speed by one user**: a busy server streams more slowly for each user
- **Assuming smaller numbers speed things up**: in some measured cases inference got slower, so measure the speed too
- **No limit on the answer length**: one long answer holds a slot and cache for a long time

## Key Points

- A model writes text one token at a time: prefill reads the prompt in parallel, and decode takes one step for each new token, reading the weights and the cache
- Decode is limited by memory, not arithmetic: in our estimate, 7.26 ms of memory time against 0.09 ms of compute for one user, so batching raised throughput 19.5 times at a cost to each user's speed
- The KV cache sets the batch: 512 KiB for each token in a 7B model, and reserving the maximum length wasted four fifths of memory in our simulation, in line with the 20.4 to 38.2 percent use measured in earlier serving systems
- <u>Refill the batch at each step</u>: in our simulation, continuous batching kept latency near 2 seconds where a static batch took minutes under the same load
- Measure time to first token, time per output token and throughput, and stream the answer so the first words arrive early
