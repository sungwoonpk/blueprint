> A **message queue** holds messages from producers until a consumer takes them, and each message goes to one consumer. **Publish and subscribe**, or pub/sub, sends each message to every subscriber instead. Both sit between the part of a system that has work to hand off and the part that does it.

[When to Go Asynchronous](/system-design/when-async) moved the slow steps of a listing post behind a queue. This topic opens the queue: who stores the messages, how a message is handed over and confirmed, how to add workers, and how one event can reach several different parts of the system.

## Producers, Queues and Consumers

A **producer** sends a message to a **broker**, the server that runs the queues. The broker stores the message. A **consumer** asks for one, does the work, and tells the broker it succeeded, and only then does the broker delete it:

<figure class="diagram">
<div class="flow">
<div class="node">Producer<small>web server</small></div>
<div class="arrow" data-label="send" aria-hidden="true"></div>
<div class="node">Broker<small>stores the queue</small></div>
<div class="arrow" data-label="receive" aria-hidden="true"></div>
<div class="node">Consumer<small>worker</small></div>
<div class="arrow" data-label="ack" aria-hidden="true"></div>
<div class="node">Deleted</div>
</div>
<figcaption>A message stays in the queue until its consumer confirms it</figcaption>
</figure>

The confirmation is the point. If the broker deleted a message as soon as it was handed out, a worker that crashed halfway would lose the job. RabbitMQ's documentation describes the two modes.

With automatic acknowledgement, the message counts as handled once it is written to the connection, which it calls unsafe: a message that was sent but not yet processed is lost if the connection closes.

With manual acknowledgement, the consumer sends an `ack` after the work, and an unacknowledged message is put back in the queue when the connection or channel closes.

Amazon SQS gets there by another route. When a consumer receives a message, SQS hides it for a **visibility timeout**, 30 seconds by default. If the consumer deletes the message in that time, it is gone.

If not, because of a crash or because the work took too long, the message becomes visible again and another consumer can take it. The consumer loop is short:

```python
while True:
    msg = queue.receive(wait_seconds=20)   # long polling
    if msg is None:
        continue
    resize_photos(msg.body)                # may take a while
    queue.delete(msg)                      # confirm only after success
```

The `wait_seconds` argument is long polling. SQS's documentation explains that a short poll returns at once, even with nothing to give, while a long poll of up to 20 seconds waits for a message, which means fewer empty replies and a lower bill.

Both brokers share a consequence. A job whose worker died after finishing the work but before confirming is delivered again, so a message may arrive more than once.

SQS's standard queues say this plainly: at least once delivery, best effort ordering, and consumers should be idempotent, as in [Idempotency and Safe Retries](/system-design/idempotency). The exact guarantees are the subject of [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees).

## Adding Workers: Competing Consumers

To handle more messages, run more consumers on the same queue. Azure's pattern page calls this **competing consumers**: each message goes to exactly one of them, so the pool shares the work and no coordination is needed.

How many workers are enough follows from Little's law, which says the number of busy workers is the arrival rate times the time each job takes. Each photo takes about 400 ms to resize, and a post has 3 photos:

| Posts per Second | Photos per Second | Workers Busy |
| --- | --- | --- |
| 5 | 15 | 6 |
| 50 | 150 | 60 |
| 200 | 600 | 240 |

The same relation shows a danger that the AWS Builders' Library describes with its own numbers: if jobs slow from 100 ms to 10 s, the workers needed for the same rate grow a hundred times. Workers can be added when the queue grows and removed when it empties, as in [Autoscaling](/system-design/autoscaling).

One RabbitMQ setting guards against uneven loads. The **prefetch** count limits how many unacknowledged messages a consumer holds at once. Without a limit, a slow consumer can be handed a huge pile and its fast neighbors sit idle.

RabbitMQ's documentation says values of roughly 100 to 300 usually perform well, and that 1 is the most conservative and costs throughput.

Competing consumers give up order. Two workers can finish two jobs in the opposite order from how they arrived, and RabbitMQ notes that a single consumer is what keeps strict order. [Partitions, Ordering and Consumer Groups](/system-design/ordering) shows how to keep order where it matters.

## Pub/Sub: Everyone Gets a Copy

A queue answers "who will do this job?". A different question is "who needs to know that this happened?".

When a listing is posted, the resizer, the search index and the email sender all need to hear about it, and each must get every post. Sending the event to one queue would give each post to only one of them.

In pub/sub, a publisher sends the message to a **topic**, and each subscriber has its own subscription, and so its own copy. AWS's SNS describes a topic as a logical access point that copies a message to many subscribers in parallel. A common setup is to give each subscriber its own queue:

<figure class="diagram">
<div class="flow">
<div class="node">Listing Posted<small>one event</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Topic</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Resize Queue</div>
<div class="node">Search Queue</div>
<div class="node">Email Queue</div>
</div>
</div>
<figcaption>One event, copied into a queue for each interested part of the system</figcaption>
</figure>

AWS describes this as SNS fanout to SQS: SNS pushes the message into each queue, where it is kept until that subscriber's workers get to it.

Each queue then has its own pool of competing consumers, so both ideas work together, and a slow email service doesn't hold up the search index. The two shapes differ in one thing:

| Shape | A Message Goes To | Used For |
| --- | --- | --- |
| Queue | One consumer | Sharing out jobs |
| Pub/Sub | Every subscriber | Telling several parts about an event |

## Routing

Some brokers add a step before the queue. In RabbitMQ the publisher sends to an **exchange**, and the exchange copies the message into the queues whose bindings match. Its documentation describes four kinds. For events named like `listing.posted.north`:

| Exchange | Routes By | Example |
| --- | --- | --- |
| Direct | An exact match of the routing key | `listing.posted.north` goes only to a queue bound with that key |
| Fanout | Nothing, it copies to every bound queue | Every event goes to the audit queue and the cache queue |
| Topic | A pattern on the key | A queue bound with `listing.posted.*` gets posts from any campus |
| Headers | Values in the message headers | A queue that wants only messages with `format` set to `pdf` |

This is a way to let consumers choose what they hear without the producer knowing them, which is the loose coupling from [Event-Driven Architecture](/system-design/event-driven).

## Durability and Limits

A broker that loses messages in a crash is little use. RabbitMQ's documentation says that surviving a restart takes both a durable queue and a persistent message: either alone isn't enough.

A publisher that wants to know a message is safe uses publisher confirms, which for a persistent message arrive only after it is written to disk. SQS stores each message redundantly across several Availability Zones before it replies, and keeps it for 4 days by default, up to 14 days.

Brokers also have limits. SQS caps the messages in flight to consumers at about 120,000 for standard queues, and large payloads are better kept elsewhere: the photo goes to object storage, as in [Choosing Between Block, Object and File Storage](/system-design/storage-types), and the message carries only its key.

A job that fails again and again must be moved aside, as in [Dead Letter Queues](/system-design/redelivery-dlq). When messages are piling up faster than workers take them, the answer is the subject of [Backpressure](/system-design/backpressure).

## Key Points

- A broker stores messages, a consumer receives one and confirms it after the work, and an unconfirmed message returns to the queue, which makes delivery at least once
- Run more consumers on one queue to share the work, and size the pool as arrival rate times job time
- <u>Pub/sub gives each subscriber its own copy</u> of every message, and giving each subscriber its own queue keeps them independent
- Exchanges and routing keys let consumers pick the messages they want
- Survive restarts with durable queues and persistent messages, and keep large payloads out of the messages
