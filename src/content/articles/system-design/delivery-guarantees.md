> A **delivery guarantee** says how many times a message's effect will happen: **at most once**, **at least once** or **exactly once**. True exactly once delivery isn't something a network can promise, so "exactly once processing" in practice means at least once delivery combined with a handler that can safely see a message twice.

[Message Queues and Pub/Sub](/system-design/message-queues) ended on a warning: a message can arrive twice. This topic shows why, how to choose which mistake to allow, and what "exactly once" really means when a vendor says it.

The running example is the receipt for a purchase in the textbook app: the buyer's credit goes down, the seller's goes up, and an email goes out.

## Two Steps, Two Orders

A consumer does two things for each message: the work itself, and recording that the message is done, which is an acknowledgement for a queue and an offset for a log. A worker can crash between the two, and the order of the two steps decides what a crash does. Both orders are possible:

<figure class="diagram">
<p class="rowname">Record First</p>
<div class="flow">
<div class="node">Receive</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Record Done</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Crash</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Work Never Done</div>
</div>
<p class="rowname">Work First</p>
<div class="flow">
<div class="node">Receive</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Do the Work</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Crash</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Done Again Later</div>
</div>
<figcaption>A crash between the two steps loses the message in one order and repeats it in the other</figcaption>
</figure>

Recording first gives at most once: a crash loses the message, and nothing is repeated. Working first gives at least once: a crash means the message comes back, and the work happens a second time. We simulated both, with 100,000 messages and a 1 percent chance that a worker crashes in the gap:

| Consumer Design | Messages Lost | Messages Done Twice |
| --- | --- | --- |
| Record, then work | 1,005 | 0 |
| Work, then record | 0 | 956 |
| Work, then record, with a handler that skips repeats | 0 | 0 |
| Work and record together, as one step | 0 | 0 |

The first row loses about 1 percent of the receipts, and the second sends about 1 percent of them twice. Neither is acceptable for money. The last two rows show the two ways out, which the rest of the topic explains.

## The Producer Side

The same problem exists on the way in. A producer can send a message and get a network error: it can't know whether the error came before or after the message was stored, much like inserting into a table with an automatically generated key.

Retrying avoids losing the message, and it risks storing the message twice. Kafka's answer, since version 0.11, is an idempotent producer: the broker gives each producer an id, and the producer numbers its messages, so the broker can throw away a repeat.

The producer also chooses how sure it wants to be before moving on.

Waiting until all in-sync replicas have the message takes on the order of 10 ms, waiting for the leader alone is quicker, and sending without waiting is quickest and can lose messages. That is the same tradeoff as the synchronous commit in [Write-Ahead Logs](/system-design/write-ahead-logs).

## Exactly Once Is Effectively Once

Many systems claim exactly once delivery, and the fine print is often misleading: the claim may not hold when consumers or producers fail, when several consumers are involved, or when data on disk is lost.

What is achievable is **effectively once**: the effect happens once, even if the message was delivered twice. There are three ways to get there.

**Make the handler idempotent.** Record each message's id with the effect, in one database transaction as in [Transactions and ACID](/system-design/transactions-acid), so a repeat is recognized:

```sql
BEGIN;
INSERT INTO processed_messages (message_id) VALUES ('m-8812');
UPDATE users SET credit_cents = credit_cents + 4500 WHERE id = 3;
COMMIT;
```

The `INSERT` fails if the id is already there, because `message_id` is the table's primary key, so the whole transaction is rolled back and the credit is added only once. This is the pattern behind [Idempotency and Safe Retries](/system-design/idempotency), applied to a message instead of an API call.

**Pick operations that are safe to repeat.** Some work is naturally idempotent, and some isn't:

| Operation | Safe to Repeat? |
| --- | --- |
| Set the price to 4,000 | Yes |
| Mark the listing as sold | Yes |
| Add 4,500 to the seller's credit | No, needs an id check |
| Send the receipt email | No, needs a key at the email provider, or a rare duplicate is accepted |
| Add one to a view counter | No, though an occasional extra is harmless |

The same holds when messages have a primary key: updates are idempotent, since receiving the same message twice just overwrites a record with another copy of itself.

**Commit the position with the result.** If the consumer's progress and its output are stored in the same atomic step, a crash leaves neither or both, and the message is simply handled again from scratch. Kafka does this for pipelines that read from Kafka and write back to Kafka.

Its consumer position is itself stored as a message in an internal topic, so a transaction can write the output and the new offset together, and consumers that read in `read_committed` mode don't see the output of an aborted transaction. Kafka Streams uses this for exactly once processing.

For a destination outside Kafka, Kafka's documentation says this takes cooperation from the destination.

Its suggestion is not a two phase commit, which many outputs don't support, but to store the offset in the same place as the output, the way a connector that writes to HDFS stores the offsets with the data, so that both change together or not at all.

## Where Exactly Once Stops

The guarantee reaches only as far as the transaction does. Once the handler calls something outside the system, such as an email service or a payment provider, the problem returns: the call can succeed and its reply can be lost.

The usual answer is to pass an idempotency key to the provider, as in the payment example of [Idempotency and Safe Retries](/system-design/idempotency), so that a repeat is recognized on their side.

There are also cases where losing a message is the right choice. A presence ping that says a student is online, or a metric sampled every ten seconds, is replaced by the next one anyway, and repeating or retrying only wastes work.

At most once is the cheapest guarantee, and for that kind of data it is enough.

## Choosing

| Guarantee | How | Right For |
| --- | --- | --- |
| At Most Once | Record first, no retries | Telemetry and signals that the next message replaces |
| At Least Once | Work first, then record | The default for business work, with idempotent handlers |
| Effectively Once | At least once plus ids, or one atomic step | Money, inventory and anything that mustn't happen twice |

Kafka's own default is at least once, with at most once available by turning off retries and committing the offset before processing, and exactly once when the work stays inside Kafka transactions.

What redelivery does to the order of messages is covered next in [Partitions, Ordering and Consumer Groups](/system-design/ordering), and messages that fail on every attempt are the subject of [Dead Letter Queues](/system-design/redelivery-dlq).

## Key Points

- A consumer's two steps, doing the work and recording it, can be split by a crash: record first loses messages, work first repeats them
- Producers have the same problem in reverse, and an id plus a sequence number lets the broker drop a repeat
- <u>Exactly once means effectively once</u>: at least once delivery with a handler that ignores repeats, or with the position and the result stored in one atomic step
- The guarantee stops at the edge of the transaction, so calls to outside services need their own idempotency keys
- Choose by cost of a mistake: at most once for data that is replaced anyway, effectively once for money
