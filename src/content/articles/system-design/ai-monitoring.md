> **Monitoring an AI system** means watching, in production, the signals that show whether it is healthy and still answering well. That includes the ordinary signals of any service, plus the cost of each answer, the inputs the system sees, and the quality of what it says, because a language model can fail with a perfectly normal response code.

Two weeks after the last change, the support team starts forwarding complaints: the helper quotes a return policy that was replaced last semester. The dashboard is green. Latency is steady, the error rate is near zero, and each request returns 200. A standard service dashboard doesn't notice a fluent answer that is wrong.

An AI system needs the signals of [Logs, Metrics and Traces](/system-design/observability) and three more families. This topic covers what to add, how to tell a real shift from noise, and how to catch quality problems that no error code reports. [Evaluation](/system-design/ai-evaluation) built the test before launch, and monitoring is the same test, applied to live traffic.

## The Usual Signals First

Four golden signals apply here, with some additions: latency, traffic, errors and saturation. The old warnings carry over as well. Errors include the implicit kind, wrong content returned with a 200, and the kind defined by policy, such as a response over a time limit.

Averages hide the tail: its example is a service averaging 100 ms at 1,000 requests a second where 1 percent of the requests still take about 5 seconds. In our simulation of [How LLM Inference Works](/system-design/llm-inference), the continuous batching server had a mean latency of 2.1 seconds and a 95th percentile of 6.3.

| Signal | What to Track | Why |
| --- | --- | --- |
| Latency | Time to first token, time between tokens, the 95th percentile | A user feels the pause and the speed separately |
| Traffic | Requests and tokens by feature | Tokens, not requests, set the load |
| Errors | API errors, refusals, truncated answers, failed tools, schema failures | Most failures return 200 |
| Saturation | Queue wait, cache use, rate limit headroom | The early warning before delays |
| Cost | Tokens and dollars for each answer, cache hit ratio | The bill grows with usage |
| Quality | Sampled grades, user feedback, handoffs to staff | No other signal sees a wrong answer |
| Inputs | Topic mix and length of requests | Shows the world changing |
| Safety | Blocks, flags, and refused actions | Shows attacks and false blocks |

The model API gives some of this for free. The response reports the tokens read, written and cached. It also reports why generation stopped, with values for a natural end, hitting the token limit, a tool call, a refusal and an overflowing context window.

Counting the stop reasons gives three cheap error signals: the share of answers cut off by the token limit, the share of refusals, and the share that overflowed the window. A rise in any of them says something changed.

For self hosted models, the server reports its own signals. vLLM exposes the time to first token, the delay between tokens, the queue wait, the requests waiting and running, the use of the cache and a count of preemptions, as in [Model Serving](/system-design/model-serving).

Names for these signals are being standardized in OpenTelemetry's conventions for generative AI.

## Trace What Happened

A single answer is the product of several steps: the prompt version, the model, the passages retrieved, the tool calls, the guardrail decisions and the output. When a student reports a wrong answer, you need the whole record. Record for each request:

- **Versions**: The prompt template, the model and its version, and the index version
- **Retrieval**: The ids and scores of the passages, as in [Retrieval-Augmented Generation (RAG)](/system-design/rag)
- **Tool calls**: Each call, its arguments, its latency and its result or error, as in [Agents and Tool Use](/system-design/agents)
- **Tokens and cost**: Input, output and cached tokens for each step
- **Guardrails**: Which checks ran, their scores and their decisions, as in [Guardrails](/system-design/guardrails)
- **The text**: Input and output, with personal data handled according to [Data Privacy and Compliance](/system-design/privacy), and retention set on purpose

With these records, a bad answer can be replayed, traced to the passage or the tool result that caused it, and added to the test set.

## Watch the Inputs Drift

The world the system sees changes, and the system may not. **Data drift** is a change in the distribution of the inputs a model receives in production.

It lists ways to measure it: summary statistics, statistical tests such as Kolmogorov-Smirnov for numbers and chi-square for categories, distance measures such as the Wasserstein distance, Jensen-Shannon divergence and the population stability index, and simple rules, such as an alert when a new category appears.

It notes that on large data sets tests become over sensitive, so distance measures are preferred. For text, it points to embeddings and descriptors, and a practical start is to sort each request into a topic and watch the mix.

Drift measures have a noise floor that depends on volume. We simulated 20 topics with a skewed baseline mix and computed the population stability index for each day's traffic against the baseline, with no real drift:

| Requests a Day | Noise Floor, 95th Percentile |
| --- | --- |
| 200 | 0.234 |
| 1,000 | 0.033 |
| 10,000 | 0.003 |
| 100,000 | 0.0003 |

Then we moved a share of the traffic from the most common topic to three rare ones, at 10,000 requests a day:

<figure class="chart">
<div class="hbars" role="img" aria-label="Index value for four sizes of shift">
<div class="hbar"><span>2% of Traffic</span><span class="track"><span class="fill" style="--w: 1.8%"></span></span><span class="value">0.011</span></div>
<div class="hbar"><span>5% of Traffic</span><span class="track"><span class="fill" style="--w: 8.2%"></span></span><span class="value">0.050</span></div>
<div class="hbar"><span>10% of Traffic</span><span class="track"><span class="fill" style="--w: 27.4%"></span></span><span class="value">0.165</span></div>
<div class="hbar peak"><span>20% of Traffic</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">0.601</span></div>
</div>
<figcaption>Population stability index at 10,000 requests a day when a share of traffic moves to rare topics, from our simulation</figcaption>
</figure>

A shift of 5 percent of the traffic scored 0.050, well above the floor of 0.003 for that volume, and 20 percent scored 0.60. At 200 requests a day the floor of 0.234 is above the score of a 10 percent shift, which at that size would hide in the noise.

A threshold copied from another system means little. Set it from the floor at your own volume, measured on a quiet stretch, and judge a shift by how far it clears the floor.

A shift isn't a problem by itself. Registration day brings a wave of questions about deadlines, and a new semester changes the courses. Drift tells you to look, and the sampled grades below say whether the answers got worse.

## The Model Changes Under You

The system behind an API can change without a change in your code. Chen, Zaharia and Zou compared the same hosted models in March and June 2023 and found that the behavior of the same service can change substantially in a short time.

On one test of telling prime from composite numbers, GPT-4 went from 84 percent in March to 51 percent in June. It became less willing to answer sensitive questions, did better on multi step questions, and made more formatting mistakes in generated code, and the authors call for continuous monitoring.

Three habits follow. Pin the version: call a dated model, not an alias that moves, and record it in the trace. Plan for retirement: providers publish end of life dates for model versions, so a model switch belongs on a calendar.

And test before switching. Run the evaluation set against a new version, then send a share of traffic to it as a canary, with the practices of [Canary Releases and Other Deployment Strategies](/system-design/deployments) and [Feature Flags](/system-design/feature-flags).

Watch the formatting failures in particular. A change that moves a model from valid JSON to almost valid JSON breaks the code behind it with no sign in the quality metrics.

## Measure Quality on Live Traffic

Quality needs its own measurement, since no error code reports a wrong answer. Several signals help.

Sampled grading is the backbone: take a random sample of real conversations each day and grade them with a model judge and, for a smaller subset, with a person, using the graders of [Evaluation](/system-design/ai-evaluation). User feedback adds thumbs, reports and edits, which are sparse and biased toward the unhappy.

Behavior speaks too: rephrasing the same question, abandoning the chat, or asking for a person. And checks on grounding give the share of answers whose claims the retrieved text supports.

Turn it into an objective, as in [SLIs, SLOs and Error Budgets](/system-design/slo): the share of sampled answers graded good stays at or above 90 percent over 7 days, and alerts follow the rules of [Alerting and Dashboards](/system-design/alerting).

## Close the Loop

A monitor that nobody acts on is a cost, so wire it to the work. A bad answer found in production is added to the evaluation set the same day.

A sudden rise in tokens for each request can be a prompt that grew, an agent in a loop, or an attack, so alert on tokens for each request and dollars an hour, and set budgets for each user, as in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice).

A bad answer that reaches many students is an incident, with the process of [Incidents and Postmortems](/system-design/postmortems).

Give dashboards to different readers: operations looks at latency and saturation, the product team at quality and cost, and support at the traces. And have a person read a sample of conversations each week, since patterns appear that metrics miss.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Service Signals | Time to first token, time between tokens, queue wait and errors, with the 95th percentile |
| Stop Reasons | A graph of the share cut off, refused or overflowing, alerting on a doubling |
| Cost | Dollars and tokens for each answer, by feature, with an alert on a 50 percent rise in a day |
| Traces | Each request with versions, passage ids, tool calls and guardrail decisions, kept 30 days |
| Input Drift | Topic mix each day, compared with a floor measured on quiet weeks |
| Quality | 100 graded answers a day by a model judge, 20 of them by a person, alert at 3.1 standard errors |
| Model Changes | A pinned model version, a canary on 5 percent of traffic, and the evaluation set before each switch |
| Review | A weekly read of 50 conversations, with each failure added to the test set |

## Pitfalls

- **Trusting a green dashboard**: A wrong answer returns 200
- **Averages for latency**: The tail is what students notice
- **A drift threshold borrowed from elsewhere**: The noise floor depends on volume
- **Alerting on a daily check at a loose bar**: Chance crosses it about once a month
- **An alias that points to a moving model**: The behavior changes with no deploy
- **No record of versions**: A complaint can't be traced to the change
- **Monitoring with no path to the test set**: The same failure comes back

## Key Points

- Keep the golden signals and add cost, inputs, quality and safety, since a model can fail with a normal response code, and stop reasons give cheap error counts
- Trace each answer with the versions, the passages, the tool calls and the guardrail decisions, so a complaint can be replayed
- <u>Judge drift against the noise floor</u>: our population stability index floor was 0.234 at 200 requests a day and 0.003 at 10,000, and a 5 percent shift scored 0.050 at the larger volume
- Models change under you: one hosted model fell from 84 to 51 percent on a test between March and June 2023, so pin versions and test before switching
- Measure quality by sampling real answers: in our simulation, 100 graded answers a day caught a 5 point drop in 2 days at a bar that raised a false alarm in 2.8 percent of 20 day stretches
