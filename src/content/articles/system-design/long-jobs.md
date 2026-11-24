> A **long running job** is work that outlasts a request, a process, or a deployment: minutes to hours for an export, days for a review, months for a subscription. A **workflow** is a long job made of ordered steps, with waits, decisions and sometimes undo. The pattern is to keep the job's state outside any one process, report its progress, and make each step safe to run again.

A seller asks the textbook app to export their listings and messages as a zip file. A university asks for a verification of its students, which waits days for a human to approve.

At the end of each semester, the app archives hundreds of thousands of listings. These jobs don't fit in a web request, which a load balancer or a browser will give up on after seconds.

They share a harder property: they outlive the machine running them. A server restarts for a deploy, an instance is replaced, a dependency fails at step 70 of 100.

If the job's progress lives in a process's memory alone, each of those events loses it. The design question is where the job's state lives, and what happens when a worker dies.

## Telling the Caller

The interface comes first. The caller can't hold a connection for an hour, so the API accepts the work and answers later. The pattern is called asynchronous request reply, and it has a natural order.

The client sends the request, the API validates it, and it returns 202 Accepted with a `Location` header for a status resource, and optionally `Retry-After` to say when to look. A 202 means that the request was accepted for processing and the processing isn't complete.

The client then polls the status resource, which returns 200 with a body that shows the state while the work is pending. Useful fields are a status of pending, running, succeeded, failed or canceled, times of creation and last update, a percent complete, and an error in the problem details format.

When the work finishes, the status resource answers 303 See Other with the location of the result. Avoid 302, since some clients replay the original method on a redirect, which could repeat a POST.

The rest is housekeeping:

- A DELETE on the status resource cancels the work
- An `Idempotency-Key` header makes a repeated POST return the existing status resource, as in [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work)
- A retention policy removes old status resources, with an `Expires` header as a hint

<figure class="diagram">
<p class="rowname">Submit</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" data-label="POST" aria-hidden="true"></div>
<div class="node">API<small>returns 202</small></div>
<div class="arrow" data-label="queue" aria-hidden="true"></div>
<div class="node hot">Worker</div>
</div>
<p class="rowname">Poll</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow wide" data-label="GET status" aria-hidden="true"></div>
<div class="node">Status Resource<small>pending, running</small></div>
<div class="arrow" data-label="303" aria-hidden="true"></div>
<div class="node">Result</div>
</div>
<figcaption>The async request and reply shape: accept now, report progress, point to the result when done</figcaption>
</figure>

Task libraries use the same life cycle. A task is pending, started, then a success or a failure, with a retry state in between and a revoked state for a canceled task.

Two quirks are worth knowing. An unknown task id also reads as pending, and the started state isn't reported unless the tracking option is turned on.

An application can define its own state, such as progress with a current and total count. The result backend stores the states, and results must eventually be fetched or forgotten, or its resources aren't released.

## Surviving a Crash: Save Progress

The core technique is the **checkpoint**: save how far the job got, and resume from there. We simulated a job of 100 steps of one second each.

At each step the worker may crash with a probability p, a restart costs 5 seconds, and saving a checkpoint costs 0.1 seconds. The table gives the mean total time and the number of runs, which here means attempts:

| Progress Saved | p = 0.5% | p = 2% | p = 5% |
| --- | --- | --- | --- |
| Not Saved, Start Over | 135 s, 1.7 runs | 345 s, 7.2 runs | 3,870 s, 155 runs |
| At 50 Step Intervals | 118 s, 1.6 runs | 192 s, 4.5 runs | 610 s, 25 runs |
| At 10 Step Intervals | 107 s, 1.5 runs | 124 s, 3.2 runs | 170 s, 7.8 runs |
| After Each Step | 113 s, 1.5 runs | 122 s, 3.1 runs | 141 s, 6.2 runs |

The chance that a 100 step job finishes in a single attempt is 61 percent at p = 0.5, 13 percent at p = 2, and 0.6 percent at p = 5.

A job that restarts from the beginning on each crash becomes a lottery as it grows: at p = 5 percent, the mean was over an hour, for work that takes under two minutes without failures. Saving progress at 10 step intervals brought it to 170 seconds.

The trade is the cost of the save against the work lost. At p = 0.5 percent, the checkpoint after each step cost more than it saved, and 10 step intervals were best. A rule of thumb is to checkpoint so that the work between saves is cheap to repeat.

The practical form is a row in a database, or a field in the job record, that stores the cursor: the last processed id, the page, the batch number.

The steps that follow it must be safe to repeat, since a crash between finishing a step and saving its checkpoint repeats it. Backfills work this way, as in [Schema Migrations Without Downtime](/system-design/schema-migrations): keyed by range, resumable, and safe to rerun.

## Durable Execution Engines

Writing checkpoints by hand for each job gets repetitive and error prone, and **workflow engines** take it over. They store the state of each run durably and resume it after any failure.

Temporal is a good example of the design. A workflow is ordinary code, and the system records each command and event in an event history. After a crash the engine doesn't restore memory: it runs the workflow code again from the start, feeding it the recorded history, so the code reaches the same point.

That requires the workflow code to be deterministic, so anything that isn't, such as the current time, random numbers and network calls, goes through replay safe interfaces or through activities.

The activities do the work with side effects, and their results are recorded, so on a replay an activity that finished isn't run again. Timers are recorded events and don't wait again. A workflow can keep running for years.

The defaults show how the parts are meant to be used. Activity retries start at an interval of 1 second with a backoff coefficient of 2.0, a maximum interval of 100 times the initial one, and unlimited attempts, and a limit on the total retry time is better than a limit on attempts.

Each attempt should have a start to close timeout, and a heartbeat timeout tells the server that a long activity is alive. A heartbeat can also carry progress details that the next attempt reads, which is a checkpoint.

The history has a ceiling: 51,200 events or 50 MB for an execution, with warnings after 10,240 events or 10 MB. A long workflow periodically continues as a new execution, with its state passed on, to stay under the limit.

A managed form is a state machine service such as AWS Step Functions, in two kinds:

- **Standard**: runs for up to a year, with exactly once execution unless retries are specified, and is billed by state transitions
- **Express**: runs for up to five minutes, with at least once delivery for asynchronous runs, and is billed by requests and duration

A state can declare a retry with an error list, an interval defaulting to 1 second, a maximum of 3 attempts, and a backoff rate of 2.0, with a cap on the delay and a choice of full jitter. A catch clause routes an error to another state, and an unhandled error fails the whole execution.

Both embody ideas from earlier topics: [Timeouts, Retries and Backoff](/system-design/timeouts-retries) as configuration, idempotent steps, and a durable record of what happened.

## Several Services, One Task

When the workflow spans services, each with its own database, there is no transaction around the whole. [Sagas](/system-design/sagas) covered the answer: a sequence of local transactions with compensating actions for undo. Two styles exist for running one:

| Style | Strength | Weakness |
| --- | --- | --- |
| Choreography | No coordinator, simple for small flows | Hard to follow as steps are added, and cyclic dependencies |
| Orchestration | One place that holds the flow | The coordinator is a component to run and keep available |

A saga has named parts: compensable steps that can be undone, a pivot step that is the point of no return, and retryable steps after it, which have to be idempotent.

Compensation needs a caution. A compensation can fail too, so record progress, make each compensation an idempotent command, alert with details when a person is needed, and consider that offering an alternative may be better than undoing the whole task.

Building the recovery loop yourself has a known shape, with three roles:

- **A scheduler**: arranges the steps, records each step's state and a deadline by which it must complete in a durable store, and calls the agents, usually through queues
- **An agent**: wraps one call to one service, does its own retries within the deadline, and passes a stable identifier on each retry so the other side can deduplicate
- **A supervisor**: runs periodically, looks in the store for steps past their deadline, and asks for recovery, while counting retries for each step

The state store can't tell a step that timed out from one that failed. Recovery then either extends the deadline and retries, which needs idempotent steps, or undoes the whole task with compensations.

Two warnings come with the design. Retries multiply across layers, so one component should own the end to end retry budget. And the loop doesn't control admission, so a bounded queue or a cap on work in flight is needed. [Task Queues](/system-design/task-queues) covers the queue side.

## Operating Long Jobs

Long jobs need habits that short requests don't.

Make state visible: a job's status, last heartbeat and attempt count in a dashboard or a query, as in [Logs, Metrics and Traces](/system-design/observability), since a stuck job is invisible otherwise. Put a time limit on each step, and a deadline and an escalation on each wait for a human.

Give jobs a way to be canceled, one that checks between steps and releases what it held. Bound the number of running jobs and schedule fairly between tenants, so a bulk export doesn't starve small ones.

A job that fails repeatedly goes to a dead letter queue with its history for a person to read, and doesn't retry forever.

Two changes need care. Changing the workflow code while runs are in flight must stay compatible with the recorded histories, or the runs finish on the old version. And a deploy should let workers stop taking new work, finish or checkpoint what they hold, and exit, the draining behavior of [Canary Releases and Other Deployment Strategies](/system-design/deployments).

## Choosing a Tool

| Need | Tool |
| --- | --- |
| A Few Independent Background Tasks | A queue and workers with retries |
| A Long Loop Over Many Items | A job row with a cursor, resumable batches |
| A Few Steps With Waits and Retries | A managed state machine |
| Many Steps, Human Waits, Long Lives | A durable execution engine |
| A Flow Across Services With Undo | A saga, orchestrated, with idempotent compensations |

## A Plan for the Textbook App

| Job | Design |
| --- | --- |
| Export My Data | 202 and a status URL, a job row with a cursor, a zip written in parts to object storage, a link when done |
| University Verification | A workflow with a timer, a human approval step with a 5 day deadline and a reminder |
| Semester Archive | Batches of 10,000 listings, a checkpoint after each batch, a bound of 4 jobs in flight |
| Refund Flow | An orchestrated saga: refund the payment, release the copy, notify, with a compensation for each step |
| Visibility | A jobs dashboard with age of the oldest running job, and an alert past 2 hours |

## Pitfalls

- **Holding the request open**: the proxy or the client gives up first
- **State held in memory alone**: a restart loses the job
- **Starting over after each failure**: large jobs may not finish
- **Non idempotent steps**: a replay duplicates the effect
- **A retry at each layer**: the attempts multiply
- **No deadline on a human step**: the workflow waits forever
- **Changing workflow code under running jobs**: the replay diverges from the history

## Key Points

- Long jobs outlive processes, so keep their state outside memory, and give callers an accepted response with a status resource, a progress report and a result link
- Checkpoints decide whether big jobs finish: at a 5 percent crash chance per step, a 100 step job that started over took 3,870 seconds on average, and one saving at 10 step intervals took 170
- Workflow engines make this durable: Temporal replays deterministic code against a recorded history and records activity results, and Step Functions runs state machines with retries and catches
- <u>Make each step safe to run again</u>, give it a timeout and a retry limit, and give the whole job one owner of the retry budget
- Across services, use sagas with idempotent compensations, a durable record of state, a supervisor for stuck steps, and bounds on what runs at once
