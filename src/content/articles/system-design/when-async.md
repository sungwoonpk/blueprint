> **Asynchronous processing** means accepting a piece of work now and doing it later, usually somewhere else, while the caller gets an answer right away that says "received", not "finished". The opposite is a **synchronous** call, where the caller waits for the result.

Posting a listing in the textbook app looks like one action. Behind it, the server saves the listing, makes three smaller copies of each photo, updates the search index and emails the seller. In the first version, the server does all of that before replying, so the student stares at a spinner.

Most of that work doesn't need to be finished for the student to see "your listing is up". This topic is about how to tell which work can wait, and what it costs when it does.

## What the Caller Has to Wait For

A useful question for each step is: what must be true before we reply? For the post, the answers differ:

| Step | Needed Before the Reply? | Why |
| --- | --- | --- |
| Check the fields | Yes | A bad request should be refused now |
| Save the listing | Yes | Otherwise a "success" could be lost |
| Resize three photos | No | About 400 ms each, and a placeholder can show meanwhile |
| Update the search index | No | A few seconds of delay in search is fine |
| Email the seller | No | Nobody is watching the clock |

The first version does everything in a row. The second does two steps, writes a note about the rest, and replies:

<figure class="diagram">
<p class="rowname">Synchronous</p>
<div class="flow">
<div class="node">Check<small>fields</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Save</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Resize<small>1,200 ms</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Index</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Email</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Reply</div>
</div>
<p class="rowname">Asynchronous</p>
<div class="flow">
<div class="node">Check<small>fields</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Save</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Queue<small>a note of the rest</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Reply</div>
</div>
<figcaption>The same post, with the slow steps moved out of the wait</figcaption>
</figure>

The slow steps still happen. A separate group of workers reads the notes from a **queue**, a list of waiting jobs kept outside the web servers, and does them.

The student sees the reply after the first two steps instead of after all five, and the details of the queue are the subject of [Message Queues and Pub/Sub](/system-design/message-queues).

## Reasons to Go Asynchronous

There are four reasons:

- **Slow work**: Some jobs take seconds or minutes, too long to hold an HTTP request open. Azure's asynchronous request-reply pattern is built for that case
- **Spikes**: A queue between the callers and a shared service lets the service take work at its own pace. This is called queue based load leveling, and the service can be sized for the average load instead of the peak
- **Independent failure and scaling**: An asynchronous call suits a request that doesn't need an immediate response, where an acknowledgment that the request was registered is enough, and a durable layer in between lets each side scale and change on its own
- **Retries**: A queue keeps a job through an outage or a crash and offers it again. The AWS Builders' Library says this raises durability and availability, at the price of occasional extra latency from retries

The next section shows the second reason in numbers.

## Absorbing a Spike

On registration day, suppose 3,000 jobs a second arrive for a minute: photo resizes, emails and index updates. The workers can do 1,200 a second, and afterward the load falls back to 500 a second.

Without a queue, the extra 1,800 requests a second would be refused or time out for the whole minute, about 108,000 failures. With a queue they wait. The backlog grows for 60 seconds, then shrinks at 700 jobs a second, since the workers now outpace arrivals by that much:

<figure class="chart">
<svg viewBox="0 0 320 170" role="img" aria-label="Queue length over time. It rises in a straight line to 108,000 jobs at 60 seconds, then falls in a straight line to zero at about 214 seconds." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<line x1="34" y1="132" x2="306" y2="132" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="34" y1="18" x2="34" y2="132" style="stroke:var(--border)" stroke-width="1.5"/>
<polygon points="34.0,132.0 34.0,132.0 110.2,18.0 306.0,132.0 306.0,132.0" style="fill:var(--accent)" opacity="0.18"/>
<polyline points="34.0,132.0 110.2,18.0 306.0,132.0" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="110.2" cy="18.0" r="4" style="fill:var(--accent)"/>
<g font-size="11" style="fill:var(--muted)">
<text x="118.2" y="22.0">108,000 jobs at 60 s</text>
<text x="34" y="148">0 s</text>
<text x="110.2" y="148" text-anchor="middle">60 s</text>
<text x="306.0" y="148" text-anchor="end">about 214 s</text>
<text x="30" y="22" text-anchor="end">108k</text>
<text x="30" y="136" text-anchor="end">0</text>
</g>
</svg>
<figcaption>Jobs waiting in the queue after a one minute spike (arithmetic from the example above)</figcaption>
</figure>

The queue peaks at 108,000 jobs and empties after about 214 seconds. The last job to arrive during the spike waits about 90 seconds, which is the backlog divided by the workers' speed.

For a thumbnail or an email, that is fine. For a button the student is waiting on, it isn't, and that decides what may be queued.

The same arithmetic shows the danger. If jobs keep arriving faster than the workers finish them, the queue doesn't drain, and the wait keeps growing.

Azure's pattern page makes the point: when the average rate of producers exceeds the consumers' rate, the queue grows and latency rises, so watch the depth of the queue and add consumers or shed work.

Here is why this is worse than it looks.

A queue system has a fast mode with no backlog and a slow mode with one, and once in the slow mode it recovers slowly: by the time the backlog is worked off, much of the work may be too late to matter.

The article's advice is to measure the age of a message when it is picked up, and not only the depth.

## What You Give Up

Moving work out of the request has costs, and each has a topic of its own later:

- **No immediate result**: The caller must learn the outcome another way. The usual pattern is the response `202 Accepted`, which means accepted for processing but not completed, and possibly never completed. HTTP can't send the final result later, so the client polls a status address or is told by another channel
- **Duplicates**: Queues usually deliver at least once, so a job may run twice. Handlers must be safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency)
- **Ordering**: With several workers taking jobs in parallel, jobs can finish out of order, so a design that depends on order needs more care, as in [Partitions, Ordering and Consumer Groups](/system-design/ordering)
- **Bad jobs**: One job that always fails can be retried forever. A dead letter queue catches it, as in [Dead Letter Queues](/system-design/redelivery-dlq)
- **Harder debugging**: A request's work is now spread over time and over machines, which is why the request id in [Logs, Metrics and Traces](/system-design/observability) matters

Here is how the post could answer, with the address a client polls for progress:

```http
HTTP/1.1 202 Accepted
Location: /listings/17/status
Retry-After: 5

{"status": "processing", "photos_done": 0}
```

The `Location` header and the polling interval follow a standard pattern. When the work finishes, the status address can send the client to the finished result.

## Choosing

Go asynchronous when the caller doesn't need the result to continue, when the work is slow or arrives in bursts, when a downstream service is fragile, or when each part should fail and be retried on its own.

Stay synchronous when the next step depends on the answer. The other side of the same rule: don't use a queue where the caller needs a low latency reply, or where the volume is low and steady, since the queue then adds machinery without a benefit.

A purchase shows both in one flow. Reserving the book has to be synchronous, because the buyer needs to know it is theirs. The receipt email, the update to the search index and the seller's notification can wait.

## Key Points

- Ask what must be true before the reply, do that part synchronously, and queue the rest
- Queues absorb spikes, let each side scale and fail on its own, and keep jobs through crashes by retrying them
- <u>A queue only helps while the workers keep up</u>: if jobs arrive faster than they finish, the backlog and the wait keep growing
- The cost is no immediate result, duplicates, looser ordering, bad jobs and harder debugging
- Return `202 Accepted` with a status address for work that takes a while, and keep the steps a user is waiting on synchronous
