> **Prompting**, **RAG** and **fine-tuning** are three ways to make a language model do better at a task. Prompting changes the instructions and examples in the request. RAG supplies knowledge the model lacks at the moment of the question. Fine-tuning trains the model on examples to change how it behaves. They fix different problems, so the choice starts with a diagnosis and not with a favorite tool.

The helper on the listing pages fails in three ways. It invents a return policy that doesn't exist. It answers in four wandering paragraphs when the app wants three short sentences and a link.

And it is slow and expensive because the prompt is long. These look alike to a user, who just sees a bad answer, and they have different cures.

A common mistake is to reach for the heaviest tool first. Teams fine-tune to teach facts that change monthly, or build retrieval to fix a formatting habit. This topic gives a way to tell the cases apart, with numbers for what each choice costs.

## Diagnose First

OpenAI's guide on optimizing accuracy lays the choices on two axes. One axis is context: what the model needs to know and doesn't, such as private, recent or missing information. The other is the model itself: how it should behave, such as format, tone and reasoning.

A failed test is one or the other. Missing knowledge is an in context problem, which retrieval or a fixed block of context fixes. A habit the model hasn't learned is a learned memory problem, which examples in the prompt or fine-tuning fix.

A step comes before any of them, with two prerequisites: a clear definition of the success criteria for the use case, and some way to test against those criteria empirically.

It adds that not each success criterion or failing test is best solved by prompt engineering, and that you can sometimes improve latency and cost more easily by choosing a different model.

| Symptom | What Is Missing | First Lever |
| --- | --- | --- |
| Invents a course policy | Knowledge | Retrieval or a block of context |
| Quotes last semester's rules | Fresh knowledge | Retrieval, with a re-index |
| Wrong format or tone | Behavior | Examples in the prompt, then fine-tuning |
| Ignores a long instruction | Behavior | A shorter prompt, then fine-tuning |
| Too slow or costly | Efficiency | A smaller model, caching, then fine-tuning |
| Fails at multi step reasoning | Capability | A larger model, or splitting the task |

<figure class="diagram">
<div class="flow">
<div class="node hot">Prompt and Test Set</div>
<div class="arrow" data-label="diagnose" aria-hidden="true"></div>
<div class="stack"><div class="node">Missing Facts<small>retrieval</small></div><div class="node">Wrong Behavior<small>examples, fine-tuning</small></div></div>
</div>
<figcaption>Evaluate the prompt first, find which kind of failure remains, then pick the lever that matches</figcaption>
</figure>

The evaluation set is what makes the table usable. A good prompt plus an evaluation set of questions and ground truth answers is the key output of the first stage, and about 20 or more pairs is a fair start.

Without it, each lever looks like it helps, and no lever can be shown to. [Evaluation](/system-design/ai-evaluation) covers building one.

## Start With the Prompt

Prompt changes cost minutes and no training. Prompt engineering is typically the best place to start, and it pays to squeeze as much accuracy out of the basic methods as you can before reaching for retrieval or fine-tuning. Some tasks, such as summarization, translation and code generation, may need no more.

The prompt has three parts to work on:

- **Instructions**: State the task, the audience, the length and the format, and say what to do when the answer isn't known
- **Examples**: Show two or five inputs with the output you want, which moves the model toward a format faster than a description does
- **The model**: A larger model follows a hard instruction more reliably, and a smaller one costs less, as in [Caching and Model Routing](/system-design/llm-cost-latency)

The limit is the token cost. Each instruction and example is paid for on each request, and a prompt that grows to thousands of tokens is the cue to look at caching and, later, at fine-tuning.

## Add Knowledge With Retrieval

When the model lacks facts, supply them. [Retrieval-Augmented Generation (RAG)](/system-design/rag) puts the right passages in the prompt for each question, so the answer follows the current text and can cite it. It suits information that is private, large or changing.

It is also the better way to add facts than training, and two studies point that way. Ovadia and colleagues compared knowledge injection in 2023.

They found that unsupervised fine-tuning gave some improvement, that retrieval consistently did better, both for knowledge the model had seen in training and for new knowledge, and that models struggle to learn new facts this way.

A 2024 case study on agriculture questions by Balaguer and colleagues reported that fine-tuning raised accuracy by over 6 percentage points and retrieval added about 5 more on top, so the two helped in different ways on their data.

Both are single domain studies with their own models, so use them as direction and not as a forecast.

## Change Behavior With Fine-Tuning

**Fine-tuning** continues training a model on examples of the input and the output you want. It is the lever for behavior: a style, a fixed format, a reliable reply to a hard instruction, or the same quality from a smaller model with a shorter prompt.

Start with at least 50 examples, favor quality over quantity, and make the examples look like production inputs, including the retrieved context if the system uses retrieval, and keeping a hold out set to test on.

Full fine-tuning updates each weight, which is expensive. **LoRA**, the low rank adaptation method from 2021, freezes the pretrained weights and adds small trainable matrices to each layer.

Its abstract reports that, compared with fine-tuning a 175 billion parameter model with Adam, it cut the trainable parameters by 10,000 times and the GPU memory by 3 times, with no additional inference latency.

We worked out the size for a model shaped like the 7B one of [How LLM Inference Works](/system-design/llm-inference): 32 layers and a hidden size of 4,096. Adapting the query and value matrices of each layer at rank 8 trains 4.2 million parameters, 0.06 percent of 7 billion.

The adapter file is about 8.4 MB, against 14 GB for the weights, so 100 adapters take under 1 GB. That is why a server can hold one base model and many adapters, a feature that serving engines call multi LoRA.

The costs are elsewhere. Someone has to produce and check the examples, and someone has to rerun the evaluation each time. We estimated it with round numbers of our own.

The helper's prompt has a 3,000 token prefix of instructions and examples, a 200 token question and a 100 token answer. A fine-tuned smaller model needs a 200 token prompt, and we assumed it is priced at a quarter of the mid tier, which is a guess:

| Option | Cost for Each Request | For 1,000 Requests |
| --- | --- | --- |
| Long Prompt | $0.0074 | $7.40 |
| Long Prompt With Cache | $0.0020 | $2.00 |
| Fine-Tuned Small Model | $0.00035 | $0.35 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Dollars per thousand requests for three options">
<div class="hbar peak"><span>Long Prompt</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$7.40</span></div>
<div class="hbar"><span>Long Prompt, Cached</span><span class="track"><span class="fill" style="--w: 27%"></span></span><span class="value">$2.00</span></div>
<div class="hbar"><span>Fine-Tuned Small Model</span><span class="track"><span class="fill" style="--w: 4.7%"></span></span><span class="value">$0.35</span></div>
</div>
<figcaption>Cost for 1,000 requests of the helper, from our round prices and the assumed price of a small tuned model</figcaption>
</figure>

Fine-tuning has a fixed cost. We assumed 1,000 labeled examples at 2 minutes each, which is 33 hours, at $30 an hour, and about $15 of training for 1.5 million tokens at $10 for each million. That is about $1,015. It repays against the uncached prompt after 144,000 requests, which is 1,600 a day over 90 days.

Against the cached prompt it saves $0.00165 for each request and needs 615,000 requests, or 6,800 a day. Caching moved the break-even by a factor of four, and the labeling work is most of the cost.

The calculation ignores quality, which can be the real reason to tune, and ignores that a new base model needs a new round of training.

Facts show the same pattern. If 10 facts change each week and each change meant retraining, the training alone at this size is about $150 a week, plus the evaluation and the delay, while a re-index costs very little and takes seconds. Keep changing facts out of the weights.

## Combine Them With Care

The two kinds of optimization add up and don't exclude each other, and RAG and fine-tuning are often combined: retrieval for what the model should know, tuning for how it should answer. The other side also holds.

In its case study, adding retrieval to a fine-tuned model lowered the score from 87 to 83 on a language task measured with BLEU, since the problem was behavioral and the extra context didn't address it. A lever helps when it matches the failure.

When you combine them, build the training examples in the shape the live prompt will have, with the retrieved passages in place, so the tuned model learns to use them.

## Choosing

| Situation | Start With |
| --- | --- |
| Not sure what is wrong | An evaluation set, then a prompt baseline |
| The model lacks private or recent facts | Retrieval |
| Facts change weekly | Retrieval, not training |
| Format or tone is wrong after better prompts and examples | Fine-tuning on corrected outputs |
| Prompt is long, volume is high | Caching first, fine-tuning past the break-even |
| Need a smaller, faster model for one task | Fine-tuning, checked against the larger model on the evaluation set |
| Knowledge and behavior are both lacking | Retrieval for the facts, tuning for the behavior |

## A Plan for the Textbook App

| Step | Move | Gate |
| --- | --- | --- |
| 1 | Write 100 questions with reference answers and a pass mark | The set exists before any change |
| 2 | Prompt baseline with instructions and three examples | Score on the set |
| 3 | Add retrieval for the course policies | Invented policies drop |
| 4 | Fix format failures with better examples | Failures under 5 percent |
| 5 | If format failures remain, collect 500 corrected outputs | A hold out set kept aside |
| 6 | Fine-tune a smaller model just past the break-even volume | Equal score on the set, lower cost |
| 7 | Rerun the set on each prompt, index or model change | No drop in score |

## Pitfalls

- **Starting with fine-tuning**: A prompt change could have fixed it in an hour
- **Training facts into the weights**: They go stale and are hard to correct
- **No evaluation set**: A change can't be shown to help
- **Retrieval for a behavior problem**: Added context can lower the score
- **Counting the training run alone**: Labeling and re-evaluation are most of the cost
- **Examples unlike production inputs**: The tuned model works on the sample and not on traffic
- **Ignoring caching in the break-even**: It shrinks the saving from a shorter prompt

## Key Points

- Diagnose the failure first: missing knowledge calls for retrieval, and a missing habit calls for examples or fine-tuning, with an evaluation set to tell which
- Start with the prompt, since it costs minutes, and move on once the evaluation shows what is still wrong
- Retrieval beats training for facts: in the 2023 comparison, retrieval consistently did better than unsupervised fine-tuning, for old and new knowledge alike
- <u>Fine-tuning pays for behavior at volume</u>: in our arithmetic it repaid its $1,015 after 144,000 requests against a long prompt and 615,000 against a cached one, mostly because of the labeling
- Combine the levers when both problems exist, build training examples in the live prompt format, and rerun the evaluation after each change
