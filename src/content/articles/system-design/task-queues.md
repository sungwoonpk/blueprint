> A **task queue** is a job system built on top of a message queue. You add a named task with its arguments, and separate worker processes run it, while the library handles retries, delays, time limits and results for you.

In [Message Queues and Pub/Sub](/system-design/message-queues) we wrote the consumer loop by hand. Real applications rarely do. They use a task queue library, such as Celery for Python, Sidekiq for Ruby or BullMQ for Node.js, which wraps a broker and gives the code a simple call: "run this function later, somewhere else".

The textbook app's photo resizer is the example, and the interesting questions are what the library does and what it leaves to you.

## A Task Is a Name and Arguments

A client publishes a message, a broker such as RabbitMQ, Redis or Amazon SQS delivers it, and a worker runs it.

The message carries the task's name and its arguments, and not the code. The worker looks the name up in its own list of tasks, so the workers must be running a version of the code that has that task:

<figure class="diagram">
<div class="flow">
<div class="node">Web Process<small>handles the request</small></div>
<div class="arrow" data-label="name, args" aria-hidden="true"></div>
<div class="node">Broker<small>holds the jobs</small></div>
<div class="arrow" data-label="job" aria-hidden="true"></div>
<div class="node">Worker Process<small>runs the task</small></div>
</div>
<figcaption>The web process enqueues a task name and arguments, and a worker runs the matching function</figcaption>
</figure>

```python
@app.task
def resize_photos(listing_id):
    listing = db.get_listing(listing_id)    # look the data up now
    ...

resize_photos.delay(17)    # returns at once; a worker does the work
```

Note what is passed: the listing's id, and not the listing. Task libraries advise this. Sidekiq stores its arguments as JSON in Redis, so pass simple values like numbers and strings and look objects up inside the job.

The reason: an object passed in may be stale by the time the worker runs, and passing it invites races. The worker reads the current version itself.

The twelve factor app guidelines add the picture of how this is deployed. The application is split by process type, web processes for requests and worker processes for background jobs, and you scale by running more processes of the type that is behind. Workers are started and restarted by the platform, as in [Containers and Orchestration](/system-design/containers).

## Retries and Backoff

Photos fail to resize for different reasons. A call to the storage service might time out, which will probably work on a second try, or a file might be corrupt, which won't.

The libraries let you say which exceptions to retry and how long to wait, and the distinction is the one from [Dead Letter Queues](/system-design/redelivery-dlq). In Celery:

```python
@app.task(autoretry_for=(RequestException,), retry_backoff=True, max_retries=5)
def send_receipt(order_id):
    ...
```

With `retry_backoff=True` the waits are 1, 2, 4 seconds and so on, capped by `retry_backoff_max`, 600 seconds by default, and `retry_jitter` is on by default so that retries don't all land together. `max_retries` is 3 unless changed.

BullMQ takes `attempts` and a `backoff` object with a type of `fixed` or `exponential` and a delay in milliseconds. Its exponential delay is the base delay times 2 to the power of the attempt number minus 1. With a base delay of 1 second, the schedule is:

| Attempt | Wait Before the Next Try |
| --- | --- |
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5 | 16 s |

Without a backoff setting, BullMQ retries at once, and a failing downstream service then receives the retries at the worst moment. Jitter spreads them out, as in [Backpressure](/system-design/backpressure). When the retries run out, the job goes to a failed state or a dead letter queue.

## When Is a Task Acknowledged?

The same two orders from [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees) appear as a setting. Celery by default acknowledges the message just before the task runs, so a task that started doesn't run twice, and one whose worker died halfway is lost.

With `acks_late=True` it acknowledges after the task returns, so a crash means the task runs again, and the task has to be idempotent.

Sidekiq's best practices say plainly that a job runs at least once, never exactly once, and can even run again after finishing, since Redis can fail before the acknowledgement. Its advice is to make jobs idempotent and transactional: wrap the work in a database transaction so partial work rolls back, or write code that tolerates a repeat.

Deploys are another time when workers stop. The twelve factor guidelines say a worker that gets a shutdown signal should return its current job to the queue, as with a negative acknowledgement in RabbitMQ, and that jobs should be written so that doing one twice is safe, usually by a transaction or by making the operation idempotent.

For sudden death, the guidelines rely on a queue that returns jobs when a worker disconnects or times out.

## Time Limits and Rate Limits

A job that never finishes can hold a worker for a very long time. Celery has two limits: a `soft_time_limit` raises an exception inside the task, which the code can catch and clean up after, and a `time_limit` kills the worker's child process.

A warning: limits only catch code lacking its own timeouts, so network calls should still have their own, as in the retry advice of [Backpressure](/system-design/backpressure).

Celery's `rate_limit` caps how often a task starts, for example `"100/m"`. Two details catch teams out. The limit applies to each worker instance, and isn't global, so ten workers run ten times the rate. And a rate limited task still occupies a prefetch slot, so such tasks belong on dedicated workers.

## Delays and Schedules

A task can also be set to run later. In BullMQ you add a job with a `delay` in milliseconds, and it waits in a delayed set until the time passes and then moves to the waiting queue.

The timing isn't exact and depends on how busy the workers are. For "send the seller a reminder in an hour", that is fine. Tasks that repeat on a schedule, such as a nightly cleanup, have their own topic in [Job Schedulers](/system-design/job-schedulers).

## A Queue in the Database

At the scale of the textbook app, a separate broker may be more than needed. PostgreSQL can act as a queue.

`FOR UPDATE SKIP LOCKED` is meant for tables that behave like queues: rows that another worker has locked are skipped, which avoids contention, at the price of an inconsistent view that makes it unsuitable for general use. A worker claims one job like this:

```sql
BEGIN;
SELECT id, payload FROM jobs
WHERE status = 'queued' AND run_at <= now()
ORDER BY id LIMIT 1
FOR UPDATE SKIP LOCKED;
-- do the work, then:
UPDATE jobs SET status = 'done' WHERE id = 1234;
COMMIT;
```

The row stays locked until the transaction ends, so if the worker crashes, the transaction rolls back and the job becomes available to the others.

The big advantage is that a job can be added in the same transaction as the change that needs it, so the two can't disagree, a problem that [The Transactional Outbox](/system-design/transactional-outbox) is about.

The costs are polling and extra load on the database, and a transaction held open for as long as the job runs. BullMQ offers PostgreSQL as an alternative to Redis for its storage as well.

## States and Results

Libraries track where each job is. BullMQ's states include waiting, active, delayed, completed and failed, plus a few for priorities and parent jobs, and Celery's are pending, started, success, failure, retry and revoked.

Results are optional and cost storage: Celery can keep return values in a result backend, and `ignore_result=True` skips them when nobody needs them. When the caller does need to learn the outcome, the answer is the status address of [When to Go Asynchronous](/system-design/when-async).

## Key Points

- A task queue sends a task name and arguments to workers through a broker, so workers must run matching code, and arguments should be ids, not objects
- Retry only transient failures, with exponential backoff and jitter, and send what still fails to a dead letter queue
- <u>Choose when to acknowledge</u>: early risks losing the task on a crash, and late risks running it twice, so make tasks idempotent
- Set time limits, rate limits, and a graceful shutdown that returns the current job to the queue
- A database table with `SKIP LOCKED` can serve as a small queue, and lets a job be added in the same transaction as the change that needs it
