> A **dead letter queue**, or DLQ, is a separate queue where a broker puts messages that could not be processed after the allowed number of attempts. It keeps one bad message from blocking everything behind it, and keeps the message so that someone can find out what went wrong.

[Partitions, Ordering and Consumer Groups](/system-design/ordering) ended with a warning: a message that keeps failing blocks everything behind it. Take a "price changed" event whose price arrived as `"45,00"` because of a bug in the mobile app.

The consumer can't read it, throws an error, and the broker offers the message again. The next attempt fails the same way. This kind of message is called a **poison message**, and this topic is about what to do with it.

## A Message That Never Succeeds

Not every failure is the same kind. Microsoft's guidance on transient faults separates the two. A transient fault is short lived and clears by itself, such as a brief loss of connection, a busy service or a timeout, and trying again after a delay may work.

A permanent failure, such as a business rule that rejects the data or a message that can't be parsed, will fail on every attempt, and retrying it wastes time and resources.

For HTTP calls, the same page treats 429 and the 5xx errors as worth retrying, and most other 4xx errors, such as 400 or 404, as not.

A broker can't tell the two apart from outside. It only sees "not confirmed" and offers the message again, and a message put back after failures can cycle forever.

We simulated the damage. 100,000 messages arrive, 100 of them are poison, and a failed message goes back to the head of the queue, where the next attempt picks it up:

| Retry Policy | Good Messages Done | In the DLQ | Wasted Attempts |
| --- | --- | --- | --- |
| No limit | About 700 of 99,900, then stuck | 0 | Without end |
| Moved after 5 attempts | 99,900 | 100 | 500, or 0.5% of the work |
| Moved after 10 attempts | 99,900 | 100 | 1,000, or 1.0% of the work |

Without a limit, the first poison message to reach the front kept the consumers busy forever, and the median run got through only about 700 good messages before it was stuck.

With a limit, the poison messages were put aside after a few attempts, everything else was processed, and the cost was one percent of the work or less. The limit and the dead letter queue are what turn a poison message from an outage into a small pile to look at later.

## Moving Messages Aside

The three brokers from [Message Queues and Pub/Sub](/system-design/message-queues) all have the idea, with different names:

| System | Moves a Message After | What It Keeps |
| --- | --- | --- |
| Amazon SQS | `maxReceiveCount` receives without a delete | The original message |
| RabbitMQ | A rejection, an expiry, a length limit, or a delivery limit | An `x-death` header with the queue, reason, count and time |
| Azure Service Bus | 10 deliveries by default, or when the application asks | A reason and a description |

In SQS the source queue has a redrive policy that names the DLQ and the count. The DLQ must be in the same account and region. One caveat catches people: in a standard queue, a message's expiry is counted from when it was first sent, and moving it doesn't reset that.

If the source keeps messages for 1 day and the DLQ for 4, the message disappears from the DLQ after 3 more days. AWS's advice is to make the DLQ's retention longer than the source's.

RabbitMQ sends dead letters to an exchange, as described in the routing section of [Message Queues and Pub/Sub](/system-design/message-queues), and the `x-death` header records each reason and a count. If the dead letter exchange doesn't exist, the messages are silently dropped.

In classic queues, dead lettering happens without confirms, so a message can be lost if its destination is down, and quorum queues do it with at least once delivery.

Service Bus gives each queue a built in queue inside the queue, `$deadletterqueue`, and the application can also move a message there on its own, with a reason and description. Put the exception type in the reason and the details in the description. Nothing is deleted from it automatically.

The last point suggests a better design for permanent failures. If the consumer knows that a failure is permanent, it should dead letter the message at once and not wait for the limit:

```python
def handle(msg):
    try:
        process(msg)
    except TransientError:
        raise                        # leave it unconfirmed, the broker redelivers
    except Exception as err:         # permanent: another attempt can't help
        dead_letter(msg, reason=type(err).__name__, detail=str(err))
```

## Choosing the Count and the Delay

There is no universal number. Set the limit high enough that a short hiccup, such as a database failover, doesn't send good messages to the DLQ. In SQS the setting is `maxReceiveCount`. And set it low enough that a bad message doesn't spend long in the loop.

Retries should wait. Use exponential backoff with jitter for background work, with delays like 2, 4 and 8 seconds, capped by a maximum number of tries, and a pause of at least the `Retry-After` value when a service gives one. Without a delay, a struggling dependency gets the retries at its worst moment.

Retries also multiply across layers. The AWS Builders' Library gives an example of five layers of calls, each retrying three times: when the database at the bottom fails, it receives 3 to the power of 5, or 243 times the normal load.

Retry in one place, and cap the total with a budget, such as a limit on retries per minute.

## What to Do With Dead Letters

A DLQ is only useful if someone looks at it. A usable routine has four steps:

- **Alarm on it**: A message arriving in the DLQ is a bug report, so an alert on the queue's depth turns it into one. A DLQ with no alarm is a place where messages go to be forgotten
- **Find the cause**: Read the reason and the message. The usual causes are a bug in the consumer, bad data from a producer, or a dependency that was down for too long
- **Fix the cause first**: Examine a message and its cause before resubmitting it
- **Then send it back**: Redrive the messages to the source queue, or fix and resend them one by one, as Service Bus Explorer allows. Redelivery means duplicates, so the handlers have to be idempotent, as in [Idempotency and Safe Retries](/system-design/idempotency)

Watch the retention too. If the DLQ deletes its messages before anyone has investigated, the evidence is gone.

## Dead Letters and Order

A dead letter queue breaks strict order. Moving a message out lets the ones behind it go on, which is the point, and it means the order of the stream no longer holds for that message.

Be careful with a DLQ on a FIFO queue if the exact order matters, for example the edit list of a video. In Service Bus a message returned from its DLQ gets a new sequence number and loses its original place.

So for ordered streams, decide in advance what a failure should do. Options are to stop the stream and page someone, which keeps order and stops all the work behind it, or to set the message aside and carry on, which keeps the work going and accepts a gap.

For listing events keyed by listing id, a failure only blocks the events of the partition it sits in, and setting the message aside is usually the better choice.

Two jobs are easy to confuse. Dead lettering is for messages that can't be processed at all. A temporary failure is better served by a delayed retry, which is built into RabbitMQ's quorum queues, than by the older loop of dead lettering with an expiry time.

## Key Points

- A poison message fails on every attempt, and without a limit it can hold up everything behind it
- Move a message to a dead letter queue after a limit on attempts: in our simulation, 5 attempts cost 0.5 percent of the work and saved the queue
- A consumer that recognizes a permanent failure should dead letter the message at once, with the reason
- <u>Alarm on the DLQ, find the cause, fix it, and only then redrive</u>, with idempotent handlers and a DLQ retention longer than the source's
- Retry with backoff in one place, since retries at each layer multiply, and decide how a dead letter affects ordered streams
