> A **workflow engine** runs a process made of several steps as one durable unit. It records its progress, so after a crash it carries on where it stopped, and it handles retries, timers and waiting for outside events as part of the process.

A purchase in the textbook app has four steps: reserve the listing, charge the buyer, credit the seller and send the receipt. Then the app adds a fifth: if the buyer doesn't confirm the pickup within three days, refund them.

The steps run in different services, any of them can fail, and one of them has to wait for three days. A task queue from [Task Queues](/system-design/task-queues) can run each step, but nothing in it knows that the four steps belong together.

## The Trouble With Chained Jobs

The first attempt is to chain jobs: the reserve job puts the charge job on the queue when it finishes, the charge job queues the next, and so on. It works until something goes wrong:

- **No picture of the order**: Where is order 8812 now? The answer is spread over several queues and logs
- **Retries in many places**: Each job has its own retry rules, and none of them knows when to give up on the whole purchase
- **Lost links**: If a job finishes its work and dies before queuing the next one, the order is stranded halfway, with the buyer charged and the seller unpaid
- **Waiting**: "Three days later, check the pickup" needs a separate scheduled job and a place to remember which orders to check

A workflow engine turns that scattered logic into one description of the process that the engine runs and remembers.

## Durable Execution: Replaying a History

Temporal, a widely used workflow engine, describes the idea. A workflow is code that lists the steps. The engine keeps an event history, an append-only log of everything that happened: an activity was scheduled, an activity finished with this result, a timer started.

If the process crashes, the engine doesn't restore memory from a snapshot. It runs the workflow code again from the beginning and feeds it the recorded events. Steps that already finished return their saved results instead of running again, and the code arrives at the same point as before.

The mechanism fits in a few lines. This is our own toy version in Python, with a history that lives outside the process:

```python
class Run:
    def __init__(self, history):
        self.history, self.pos = history, 0

    def call(self, step):
        if self.pos < len(self.history):        # replay: reuse the saved result
            _, result = self.history[self.pos]
            self.pos += 1
            return result
        result = do(step)                        # a new step: do it, then record it
        self.history.append((step, result))
        self.pos += 1
        return result

def purchase(run):
    run.call("reserve_listing")
    run.call("charge_buyer")
    run.call("credit_seller")
    run.call("send_receipt")
```

We crashed it right after the charge and started it again with the saved history, and compared it with a plain function that is simply run again from the top:

| Step | Executions With a History | Executions When Rerun From the Top |
| --- | --- | --- |
| Reserve the listing | 1 | 2 |
| Charge the buyer | 1 | 2 |
| Credit the seller | 1 | 1 |
| Send the receipt | 1 | 1 |

Without a history, the buyer was charged twice. With one, each step ran once, and the restart only repeated the cheap part: reading the history.

This design has a rule. Since the workflow code is run again, it must make the same decisions given the same history, so it can't depend on things the history doesn't hold: the current time, a random number, or a network call made directly.

Those would return a different value on replay and disagree with the record. Anything that touches the outside world goes into an **activity**, a separate function whose result is recorded. Workflows read time from the engine, and use the engine's timers.

One gap remains, and it is the problem from [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees). If the process dies after the activity ran but before its result was recorded, the replay runs the activity again. So activities should be idempotent: the charge should carry an idempotency key, as in [Idempotency and Safe Retries](/system-design/idempotency).

## Activities, Retries and Timeouts

The engine takes over the retry logic of each step. Temporal retries an activity automatically with exponential backoff unless told otherwise. AWS Step Functions, a managed service where the process is a state machine described in JSON, makes the policy explicit in each step. The defaults the two documents state:

| Setting | Temporal Default | Step Functions Default |
| --- | --- | --- |
| First Wait | 1 second | 1 second |
| Backoff Factor | 2.0 | 2.0 |
| Longest Wait | 100 times the first | No cap unless set |
| Attempts | Unlimited | 3 |
| Jitter | Not stated | None, `FULL` on request |

Retries are not the only protection. Temporal's activity timeouts are separate: a start to close timeout limits a single attempt, and it should be set, since the server relies on it to notice a crashed worker and retry.

A schedule to close timeout limits all the attempts together, and a heartbeat timeout watches long activities that report progress. In Step Functions, a `Catch` field sends a failure to another state, which is where a compensation path goes: refund the buyer if the credit to the seller fails.

## Waiting, Branching and Compensating

The three day wait is where an engine pays off. Temporal records a timer as an event in the history, and a replay doesn't wait again, so a workflow can sleep for days at no cost beyond its stored history.

A process can also wait for a message from outside, such as the buyer's confirmation: Step Functions has a callback pattern with a task token, and Temporal has signals. Step Functions adds states for choosing a path, running branches in parallel and repeating a step for each item.

When a later step fails, the earlier ones have to be undone by compensation, as in [Sagas](/system-design/sagas): a refund cancels a charge, since a committed change can't be rolled back. There are two ways to coordinate a saga, and the engine is the orchestration one:

| Question | Orchestration | Choreography |
| --- | --- | --- |
| Who Decides What Is Next | A central coordinator | Each service, reacting to events |
| Seeing One Order | The coordinator holds its state | No single component has the full view |
| Coupling | Services depend on the coordinator | Services must agree on events in advance |
| Failure | The coordinator can be a single point of failure | No central point |
| Fits | Complex flows with many steps | Simple flows with few services |

Microsoft's guidance is to prefer choreography for simple workflows and few services, as in [Event-Driven Architecture](/system-design/event-driven), and an orchestrator for complex ones, where choreography becomes hard to follow and risks cycles between services.

## Limits and Costs

An engine isn't free. Temporal limits the history: a warning at 10,240 events, and termination of the execution beyond 51,200. For a process that runs for a long time, the answer is to start a fresh execution with a feature called Continue-As-New.

It also says long running workflows can run into versioning problems, because code that changes while an old execution is still replaying must stay compatible with its history.

Step Functions shows the pricing side. Its Standard workflows run up to a year, with each step executed exactly once and pricing per state transition.

Its Express workflows run up to 5 minutes, handle up to 100,000 executions a second, execute a step at least once, and are priced by number and duration. So a process with many small steps costs more as a standard workflow than a few large ones.

## Choosing

Use a workflow engine when a process has several steps that span services or time, when a half finished run costs money, or when it has to wait for a person or a timer. The purchase flow with its three day pickup check is one.

Resizing a photo is a single step, and a task queue is enough. A workflow engine also adds something to learn and run, with its own rules about determinism and versions, so it is not the first tool for a two step job.

## Key Points

- A workflow engine records each step's result in a history, so after a crash it replays the code and skips the steps that finished
- Workflow code must be deterministic, and anything that touches the outside world goes in an activity that is safe to repeat
- The engine owns retries with backoff, timeouts and compensation paths, and a timer can wait for days at no cost
- <u>Orchestration puts the process in one place</u> and choreography spreads it over events, and each suits a different size of problem
- Expect limits on history and cost per step, and use a plain task queue for single step jobs
