> A **language model agent** is a system in which the model chooses its own next action in a loop: it calls a tool, reads the result, and decides what to do next, until the task is done or a limit stops it. A **tool** is a function that the model can ask the application to run, such as a search, a lookup or a message.

The helper on the listing pages is asked for something bigger than an answer: "Find the cheapest used copy of the edition my course requires, under 30,000 won, near campus, and message the seller." That takes a chain of steps.

Look up the course, find the required edition, search listings, compare the candidates, write a message, and send it. Nobody can write the order of those steps ahead of time, since each result decides the next.

That freedom is what makes agents useful, and what makes them costly, slow and risky. This topic covers when to use one, how the loop works, what it costs in tokens, time and reliability, and how to give it tools without giving it the keys to the whole system.

## A Workflow or an Agent

Anthropic's article on building effective agents draws the line. In a **workflow**, language models and tools are orchestrated through predefined code paths. In an **agent**, the model dynamically directs its own process and tool use.

The advice is to find the simplest solution possible, and to increase complexity just when needed. Agentic systems often trade latency and cost for better results on a task, and optimizing a single call with retrieval and examples is often enough.

Between a single call and a free agent sit patterns called workflows:

| Pattern | The Idea | In the Textbook App |
| --- | --- | --- |
| Prompt Chaining | Each call processes the previous output | Extract the listing facts, then write the summary |
| Routing | Classify the input, then use a specialized path | A policy question and a listing question take different paths |
| Parallelization | Run independent parts at once, or the same task several times | Check three listings together |
| Orchestrator Workers | A model splits the task as it goes and delegates | Compare many books across sellers |
| Evaluator Optimizer | One call generates, another critiques, in a loop | Draft a seller message and check it against the rules |

Routing here is the idea of [Caching and Model Routing](/system-design/llm-cost-latency), and the first pattern needs no loop. Prefer these when the steps are known. An agent is for the cases where they aren't, and it needs sandboxed testing and guardrails, with a stopping condition such as a maximum number of iterations.

## The Loop

Tool use works like this. You give the model tool definitions, each with a name, a description and an input schema. When the model wants a tool, its response ends with a stop reason of `tool_use` and one or more tool call blocks.

For tools that run in your application, your code runs the call and sends the output back in a result block inside the next user message. The model then continues. When it answers in plain text, the loop is over. Some tools, such as web search, run on the provider's servers and need no code from you.

<figure class="diagram">
<p class="rowname">Ask</p>
<div class="flow">
<div class="node hot">Model</div>
<div class="arrow" data-label="tool_use" aria-hidden="true"></div>
<div class="node">Your Code</div>
<div class="arrow" data-label="runs" aria-hidden="true"></div>
<div class="node">Tool</div>
</div>
<p class="rowname">Return</p>
<div class="flow">
<div class="node">Tool</div>
<div class="arrow" data-label="output" aria-hidden="true"></div>
<div class="node">Your Code</div>
<div class="arrow wide" data-label="tool_result" aria-hidden="true"></div>
<div class="node hot">Model</div>
</div>
<figcaption>The agent loop: the model asks for a tool, your code runs it, and the result goes back until the model answers in text</figcaption>
</figure>

The pattern comes from research. The ReAct paper of 2022 had a model alternate reasoning steps and actions, so each helps the other.

It reported fewer hallucinations and less error propagation than reasoning alone on a question answering task and a fact verification task, and on two interactive tasks it beat imitation and reinforcement learning methods by 34 and 10 percentage points of absolute success with one or two examples in the prompt.

Toolformer, from 2023, showed that a model can teach itself to use tools through simple interfaces, learning which to call, when and with what arguments.

Models are trained to emit tool calls today, so the application's job is the loop around them: run the call, return the result or the error, enforce a limit, and keep the record.

## What the Loop Costs

Each step resends the history. With a 3,000 token prefix and 900 tokens added by each call and result, the input grows with each step, and the total grows with the square of the steps.

We computed it with the round prices of earlier topics, 100 output tokens a step, a decode speed of 7.26 ms a token from [How LLM Inference Works](/system-design/llm-inference), and 0.3 seconds for each tool call. The cached column uses the multipliers of 1.25 and 0.1:

| Steps | Input Tokens, Total | Input Cost, No Cache | Input Cost, Cached | Time |
| --- | --- | --- | --- | --- |
| 1 | 3,000 | $0.006 | $0.007 | 1.1 s |
| 5 | 24,000 | $0.048 | $0.012 | 5.5 s |
| 10 | 70,500 | $0.141 | $0.021 | 11.1 s |
| 20 | 231,000 | $0.462 | $0.053 | 22.2 s |
| 40 | 822,000 | $1.644 | $0.171 | 44.4 s |

Without a cache, doubling the steps from 20 to 40 multiplied the cost by 3.6. With one, the cost grew nearly in step with the number of steps, since the old history is read at a tenth of the price.

The time grows in a straight line, about 1.1 seconds a step, and a user watching a 40 step task waits 44 seconds. Keep the start of the prompt stable for the cache, and use the trimming of [Managing Context Windows and Memory](/system-design/context-memory) for long runs, since old tool results are most of the tokens.

Independent calls should run together. The model may call several tools in one response, independent calls that read data suit parallel execution, and each call needs its own result in the next message.

For comparing three books, three lookups in sequence took 3.3 seconds in our arithmetic and a single round of three took 1.3 seconds. A setting in the tool choice turns parallel calls off when ordering matters.

## Reliability Compounds

A task of many steps succeeds when each step does. If a step succeeds with probability p, a task of n steps succeeds with p to the power n, assuming the steps are independent, which real ones are not:

| Success of Each Step | 5 Steps | 10 Steps | 20 Steps |
| --- | --- | --- | --- |
| 99% | 95.1% | 90.4% | 81.8% |
| 95% | 77.4% | 59.9% | 35.8% |
| 90% | 59.0% | 34.9% | 12.2% |
| 95%, With 2 Retries | 97.8% | 95.6% | 91.4% |

The last row assumes that a failed step gets two retries, each succeeding 70 percent of the time, which is our assumption. That lifts the step to 99.55 percent.

Return a tool error with `is_error` set and write instructive error messages, and the model retries two or three times with corrections before giving up. A message such as "Rate limit exceeded. Retry after 60 seconds" teaches the model what to do, and a bare "failed" teaches it little.

The tau-bench benchmark measures this. It simulates a conversation between a user, played by a language model, and an agent with tools and policy rules, and checks the final state of a database against the intended one. Its metric, pass^k, asks whether the agent succeeds on the same task in each of k trials.

The abstract reports that function calling agents of 2024 succeeded on fewer than half of the tasks, and that pass^8 was under 25 percent in the retail domain.

With a success rate of 60 percent and independent trials, our arithmetic gives 36 percent for two trials and 1.7 percent for eight. An agent that is right on average can still be unreliable for a given customer, so test each task many times, as in [Evaluation](/system-design/ai-evaluation).

## Designing Tools

Anthropic's article spends most of its appendix on tools, and says its team spent more time on them than on the prompt. Its example is a coding agent that kept making mistakes with relative file paths, which stopped when the tool was changed to require absolute paths.

The idea is to design the interface so mistakes are hard to make, which it calls poka-yoke, from the Japanese term for mistake proofing.

Some specifics help:

- **Describe each tool at length**: the description is by far the most important factor in tool performance, so write at least three or four sentences covering what the tool does, when to use it and not, what each parameter means, and caveats
- **Fewer, broader tools**: combine related actions into one tool with an action parameter, and prefix names with the service
- **Return signal**: send back the fields that matter, with stable identifiers, and not the whole record
- **Validate the input**: a strict setting makes the model's calls conform to the schema
- **Control the choice**: automatic choice is the default, and options exist to require some tool, require a particular one, or forbid tools

Writing the same tool definitions for each application gets repetitive. The Model Context Protocol, an open standard for connecting AI applications to external systems, which its introduction compares to a USB-C port, defines tools once so that many clients can use them.

A shared tool is also a shared attack surface, so the points below apply to it as well.

## Limiting What an Agent Can Do

An agent acts on outputs it can't fully control. OWASP calls this risk excessive agency: damaging actions taken in response to unexpected, ambiguous or manipulated model output, whether from a hallucination or from a prompt injection.

It traces the risk to excessive functionality, such as a tool that can delete when the task needs a read, excessive permissions, such as a database identity with write rights, and excessive autonomy, such as deleting without asking the user.

The mitigations are the familiar ones of access control:

- **Minimize tools and what they can do**: avoid open ended tools such as a general shell
- **Minimal permissions**: an identity with read rights for a tool that reads
- **The user's own context**: run tools with the user's identity and the least scope, as in [Authentication and Authorization](/system-design/authn-authz)
- **Approval for high impact actions**: a person confirms before the action
- **Authorize downstream**: the system behind the tool checks the permission, not the model
- **Sanitize inputs and outputs**: treat tool results as untrusted text, so keep them inside result blocks and out of system prompts

Logging and rate limiting limit the damage and don't prevent it. [Guardrails](/system-design/guardrails) goes further.

For the helper, the tools sort by what they can change:

| Tool | Effect | Control |
| --- | --- | --- |
| Search Listings | Read | Rate limits |
| Get Listing | Read | The user's own visibility rules |
| Get Course Policy | Read | No extra control |
| Draft Message | Writes a draft | No extra control |
| Send Message | Sends to a seller | The student confirms the text |
| Make Offer | Commits money | The student confirms, and the server checks the limit |

A tool with a side effect can be called twice when a step is retried, so it needs an idempotency key, as in [Idempotency and Safe Retries](/system-design/idempotency), and a multi step action that can fail halfway needs the undo steps of [Sagas](/system-design/sagas).

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Shape | A workflow for known tasks, an agent just for open requests like the one above |
| Loop Limit | At most 12 steps and 60 seconds, then a summary of progress and a question to the student |
| Tools | Six, with long descriptions, strict schemas and namespaced names |
| Parallel Calls | On for the read tools, off for send and offer |
| Errors | Instructive messages, so the model can correct a call |
| Side Effects | Confirmed by the student, with idempotency keys |
| Cost | A stable prefix for the cache, with old tool results cleared past 30,000 tokens |
| Tests | 50 tasks, each run 5 times, scored on the final state and the number of steps |
| Monitoring | Steps for each task, tool error rate, and the cost for each completed task |

## Pitfalls

- **An agent for a fixed process**: a workflow is cheaper, faster and easier to test
- **No limit on the loop**: cost and time grow with the number of steps
- **Judging one run**: reliability shows in repeated runs of the same task
- **Vague tool descriptions**: the model guesses the arguments
- **Error messages with no advice**: the retry repeats the mistake
- **Broad permissions for convenience**: a manipulated output reaches the data
- **Side effects with no confirmation or key**: a retry sends two messages

## Key Points

- An agent lets the model choose its next action in a loop, and it fits open tasks, while a workflow fits known steps and costs less
- Loops cost more than they look: in our arithmetic, a 40 step task took 822,000 input tokens and 44 seconds, and a cache cut the input cost from $1.644 to $0.171
- <u>Reliability multiplies down</u>: 95 percent for each step gave 59.9 percent over 10 steps, and two retries with instructive errors raised it to 95.6 percent
- Design tools like an interface for a careful new colleague: long descriptions, strict inputs, instructive errors, and parallel calls where they are independent
- Limit what the agent can do: minimal tools and permissions, confirmation for actions that matter, authorization downstream, and idempotency for side effects
