> The **transactional outbox** is a pattern for changing the database and publishing an event without ever disagreeing about which of them happened. The service writes the event to an `outbox` table in the same database transaction as the change, and a separate process, the **relay**, publishes the rows afterwards.

[Event-Driven Architecture](/system-design/event-driven) told services to announce what happened. For the textbook app, a purchase updates the database and then publishes `OrderPlaced`, so that the email service and the search index hear about it. Two systems are involved, the database and the broker, and no single transaction covers both. That gap is the **dual write problem**.

## The Dual Write Problem

There are two orders in which the service can do its two writes, and each has a failure:

<figure class="diagram">
<p class="rowname">Commit, Then Publish</p>
<div class="flow">
<div class="node">Commit Order</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Crash</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Event Never Sent</div>
</div>
<p class="rowname">Publish, Then Commit</p>
<div class="flow">
<div class="node">Publish Event</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Commit Fails</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Event Describes Nothing</div>
</div>
<figcaption>Either order leaves the database and the broker disagreeing after one failure</figcaption>
</figure>

In the first, the order is saved and nobody hears about it: no receipt email, no entry in the index. In the second, the email says an order was placed, and the order isn't there.

The microservices.io pattern page makes the same point, and adds that publishing inside the transaction doesn't help, because the commit can still fail afterwards.

A two phase commit across both systems is the textbook answer, but it is often unsupported or unwanted, because it ties the service to both. We simulated 100,000 purchases with a 0.5 percent chance of a failure in the gap:

| Approach | Events Lost | Phantom Events | Duplicate Events |
| --- | --- | --- | --- |
| Commit, then publish | 494 | 0 | 0 |
| Publish, then commit | 0 | 509 | 0 |
| Transactional outbox | 0 | 0 | 514 |

Both direct approaches broke about 1 purchase in 200, in one direction or the other. The outbox trades both for one lesser problem, duplicates, which a consumer can handle.

## The Outbox

The idea is to use the one thing that can be atomic, the database transaction. Instead of publishing, the service inserts a row describing the event into an `outbox` table, in the same transaction as the business change:

```sql
BEGIN;
INSERT INTO orders (id, listing_id, buyer_id, price_cents)
VALUES (8812, 17, 8, 4500);
INSERT INTO outbox (id, aggregate_type, aggregate_id, type, payload)
VALUES (gen_random_uuid(), 'order', '8812', 'OrderPlaced',
        '{"order_id": 8812, "listing_id": 17, "price_cents": 4500}');
COMMIT;
```

Both rows commit or neither does. The event can no longer be lost or invented, since it exists exactly when the order exists.

Debezium uses a table of the same shape, with an id, the type of the aggregate, its id, the event type and a JSON payload. The table behaves like a queue: rows are inserted and not updated.

## The Relay

A second process reads the new rows and publishes them to the broker. microservices.io describes two ways to do it:

| Relay | How It Works | Watch Out For |
| --- | --- | --- |
| Polling Publisher | Query the table now and then, publish new rows, mark or delete them | Ordering is tricky, and polling adds a delay and a load |
| Log Tailing | Read the database's transaction log and publish each outbox insert | Needs database specific tooling |

Polling works with any SQL database. The AWS sample runs a scheduled job that reads a batch ordered by id, sends it to a queue in one call, and deletes the rows afterwards, with a configurable polling interval. Log tailing reads the same log as in [Write-Ahead Logs](/system-design/write-ahead-logs).

Debezium is a tool of this kind, and its outbox event router turns the inserts into messages, using the aggregate id as the message key so that events for one aggregate stay in one partition in order, as in [Partitions, Ordering and Consumer Groups](/system-design/ordering). The general technique is [Change Data Capture](/system-design/cdc), next in this phase.

PostgreSQL provides the building blocks for log tailing, called logical decoding: it turns the log into a stream of row changes through a named replication slot. There is a warning that matters for running it.

A slot keeps the log it hasn't delivered, even with nobody connected, and in extreme cases that can fill the disk, so a slot that is no longer needed must be dropped.

## At Least Once, Again

The relay can crash after publishing a row and before recording that it did. When it restarts, it publishes the row again. microservices.io says so directly, and that consumers must be idempotent, for instance by remembering the ids of messages they have handled. Our simulation shows the same, with about 500 duplicates per 100,000.

The row's id makes this possible: Debezium puts it in an `id` header that can be used to remove duplicates. The techniques are those of [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees), and some queues accept the row id as a deduplication id.

On the consumer side, The matching pattern is the **inbox**. The consumer stores the message's key and does its work in one transaction, so a repeat finds the key and is skipped:

```sql
BEGIN;
INSERT INTO processed_messages (consumer, message_id)
VALUES ('email-service', 'c0a8-77e1');       -- fails on a repeat
-- send the receipt, or record that it must be sent
COMMIT;
```

Its advice has details that catch people out. Use the id the producer assigned, which stays the same on each redelivery, and not an id the transport generates or a correlation id. Put the consumer's name in the key when several consumers share one table, or the first would hide each message from the rest.

Rely on a uniqueness constraint, since checking and then inserting in two steps lets two concurrent consumers both pass. And keep the records at least as long as the broker can redeliver the message, remembering that an operator can resubmit a dead letter long after the normal window.

The broker's own duplicate detection is not a substitute, since it only covers the sending side and a limited time.

Ordering needs care in the same places. The events must reach the broker in the order the service wrote them, even from several instances of the service, and the polling relay is where that is easy to get wrong.

Reading by an id that grows in time order helps, which is one reason to avoid random identifiers there, as in [Data Modeling](/system-design/data-modeling).

## Cleaning Up

The outbox grows with each event, so published rows must go. The AWS sample deletes them once the broker accepts the batch. With log tailing, deleting rows is also visible in the log, and Debezium's router ignores those deletions on purpose.

Whether to delete at once or keep rows for a few days is a choice: keeping them gives a record for debugging and a way to publish an event again, at the cost of space.

If the outbox rows expire with a time to live, set it to several days, such as 10, so that the relay and the broker have time to catch up after an outage. A shorter lifetime can drop events that were never published.

## Costs and Alternatives

The outbox is a standard answer, and it still costs something. Each event is an extra row written and later read, and the atomic write reaches only as far as the database's own transactions: in Cosmos DB, for example, the business document and its event must live in the same partition and container to be written together.

The relay is one more piece to run and monitor, and a stalled relay means events pile up unseen, so watch the age of the oldest unpublished row. microservices.io lists the drawbacks as duplicates, ordering for polling, and database specific tools for log tailing, and one more: a developer can still forget to write the outbox row.

Putting it behind one function that saves the change and the event together avoids that.

Some databases skip the table. In DynamoDB, a stream of table changes can feed a function that forwards new items, with no outbox table. And if a service's state is only a log of events, as in [Event Sourcing](/system-design/event-sourcing), then publishing the log is the outbox.

## Key Points

- Writing to the database and to a broker can't be atomic, so one failure leaves them disagreeing: about 1 purchase in 200 in our simulation
- <u>Write the event to an outbox table in the same transaction</u> as the change, and let a relay publish it later
- The relay polls the table or tails the transaction log, and it can publish a row twice, so consumers must be idempotent
- Order comes from the relay's design, and rows need a cleanup policy
- Watch the age of the oldest unpublished row, and wrap the change and the event in one function so nobody forgets the second write
