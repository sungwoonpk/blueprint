> **Event sourcing** stores what happened to something as a sequence of events, appended one after another and not changed afterwards, instead of storing just its current state. The current state is worked out by replaying the events.

The textbook app lets sellers collect their earnings in a wallet. The usual design is one row for each wallet with a `balance` column, and each sale adds to it.

One day a seller writes in: "My balance should be higher. Where did the money go?" The row can say what the balance is now, and little else. The earlier balances were overwritten, and no one can tell which update went wrong.

Event sourcing starts from a different question: what if the history was the data? This topic builds on [Event-Driven Architecture](/system-design/event-driven), where events were messages between services. Here they are the record itself.

## Store the Events, Not the State

For the wallet, we keep a table of events. Each row says what happened, which wallet it belongs to and its position in that wallet's sequence:

```sql
CREATE TABLE wallet_events (
  wallet_id  bigint      NOT NULL,
  version    int         NOT NULL,
  type       text        NOT NULL,
  data       jsonb       NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_id, version)
);
```

A seller's wallet then looks like this:

| Version | Type | Data |
| --- | --- | --- |
| 1 | WalletOpened | seller 3 |
| 2 | BookSold | 4,500 cents |
| 3 | BookSold | 2,000 cents |
| 4 | WithdrawalRequested | 5,000 cents |

The balance is 1,500 cents, and no row says so. It is worked out by reading the events in order, the way a bank statement is a list of transactions and the balance is derived from it.

The rule: each change to the application's state is first captured as an event object, and the events are kept in the order they were applied.

Each sequence of events belongs to one thing, such as one wallet or one order. This is the entity's **event stream**, and a store built for the pattern, such as Kurrent, gives it a string name like `wallet-3`.

The event store is the system of record, and saving an event is a single write, which makes it atomic by nature.

## Rebuilding the State

To handle a new request, the service loads the wallet's events and replays them to reach the current state. This is the whole mechanism in a few lines:

```python
def balance(events):
    total = 0
    for e in events:
        if e["type"] == "BookSold":
            total += e["cents"]
        elif e["type"] == "WithdrawalRequested":
            total -= e["cents"]
    return total
```

The usual flow: a command handler loads the stream, replays it to get the state, checks the business rules against that state, and appends the new events that result. Events are named for what the user meant, such as `BookSold`, not `BalanceChanged`.

Microsoft prefers events that carry intent over events that carry just the new value, because intent keeps the history meaningful and lets later features read it in new ways.

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">BookSold<small>4,500</small></div>
<div class="node">BookSold<small>2,000</small></div>
<div class="node">Withdrawal<small>5,000</small></div>
</div>
<div class="arrow" data-label="replay" aria-hidden="true"></div>
<div class="node hot">Balance<small>1,500</small></div>
</div>
<figcaption>The events are stored, and the balance is worked out from them</figcaption>
</figure>

## Appending Safely

Two things can touch the same wallet at once. Suppose a seller has 1,500 cents and two withdrawals of 1,000 cents arrive at the same moment. Each handler replays the events, sees enough money and appends its own event. Together they overdraw the wallet.

The standard guard is optimistic concurrency. The writer says which version it based its decision on, and the store rejects the append if the stream has moved on.

With the table above, the primary key does this for free. Both handlers read up to version 4 and try to write version 5:

```sql
INSERT INTO wallet_events (wallet_id, version, type, data)
VALUES (3, 5, 'WithdrawalRequested', '{"cents": 1000}');
-- the second writer fails on the primary key: version 5 exists
```

The loser reloads, replays the new event, sees 500 cents left and refuses. The Python library `eventsourcing` works the same way, with a uniqueness rule on the aggregate id and version, and Kurrent calls the version the writer expects an expected revision.

A rule spanning several entities, such as stock across many orders, still needs a decision in the application, such as a back order.

## Snapshots

Replaying a long stream costs time. We replayed wallets of three sizes in a toy Python program of our own. With 1,000,500 events, the replay visited each one. With a snapshot taken after each 1,000 events, it loaded the latest snapshot and replayed 500, about 2,000 times fewer.

A **snapshot** is a saved copy of the state at some version. Rebuilding loads the newest one and replays the events after it. The sources agree on the details:

- **Just an optimization**: The stream stays the source of truth, and a snapshot can be thrown away and made again from it
- **Taken by a rule**: One after each N events. Axon, a Java framework, lets each entity set a policy by event count or by how long loading took, and the Python library takes an interval for each aggregate class, with snapshots off until enabled
- **Safe to lose**: Axon falls back to a full replay if a snapshot is unusable, for instance after a change in the model
- **Often not needed**: Kurrent recommends fine grained streams, such as one for each wallet, and describes them as cheap, so most streams stay short

In our numbers the wallets were extreme, with a million events each. A seller's wallet in the textbook app gets a handful of events a month and needs no snapshot for years.

## What the History Gives You

The extra effort pays for things a single row can't offer:

| Question | State Only | Event Log |
| --- | --- | --- |
| What Is the Balance | Read the row | Replay, or read a snapshot |
| How Did It Get Here | Unknown | Read the events |
| What Was the Balance After Event 500 | Unknown | Replay the first 500 events |
| A Rule Was Wrong Last Month | Fix the code, and old rows stay wrong | Fix the code, and replay |
| A New Report Is Wanted | From now on | Build it from the full history |

Fowler calls the third row a **temporal query**, and the fourth a **complete rebuild**: throw the state away and run the events again through the corrected code. In our simulation, a wallet of 1,000 events had a bug that charged 1 percent too much on each debit.

Replaying the same events with the fixed code changed the final balance by 6,317 cents, and the history held the numbers needed to correct it. A balance column would have been wrong with no way to find by how much.

The strengths: an audit trail, the ability to replay and compensate for multi step work, and the freedom to build new read models later. For microservices there is one more: entities exchanging events are easier to separate.

## Reading Without Replaying

The event table is poor at questions across wallets, such as which sellers have more than 50,000 cents. The one built in query is the stream of one entity, so the pattern needs CQRS for queries, which is the next topic: [CQRS](/system-design/cqrs).

In practice, a handler watches the stream of events and keeps a **projection**, a table shaped for a query, up to date. Kurrent's projections work this way and save a checkpoint after each 4,000 events by default, so a restart resumes from the checkpoint and not from the beginning.

Two consequences follow. A projection is eventually consistent, since it trails the events by a short time, and a seller who withdraws money may briefly see the old balance. And the handler is at least once, so, as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees), it should record the last event it applied.

To tell other services about the events, the usual routes are the ones from earlier topics. Richardson's event store doubles as a broker, delivering each saved event to subscribers.

Alternatively the events can be read from the table with [Change Data Capture](/system-design/cdc), and the outbox from [The Transactional Outbox](/system-design/transactional-outbox) is the same idea with a table that holds events for publishing alone. With event sourcing, the events table is the outbox.

## Changing the Past Is Not Allowed

Events are facts, so an event is not edited. A wrong withdrawal is corrected by appending a compensating event, such as `WithdrawalReversed`. A bug that wrote bad events leaves them in the stream, so replay code may need to handle them.

Events will outlive the code that wrote them, and the shape of an event changes over time. There are four ways to cope, and frameworks such as Axon rely on versions and upcasting too:

| Strategy | What It Does | Use It For |
| --- | --- | --- |
| Tolerant Reading | Ignore unknown fields and default missing ones | Added fields |
| Versioned Events | Put a version in the event type or its metadata | Changes that readers must tell apart |
| Upcasting | Convert old events to the new shape while reading them | Renames and restructuring |
| Rewriting Stored Events | Migrate the data in place | A last resort |

Rewriting breaks the promise that history doesn't change, so Microsoft treats it as the last option. Upcasting keeps the stored events as they were, and chains one small conversion after another, so an event written years ago passes through each of them on its way to the code.

The cheapest habit is to add fields and leave old ones alone.

## Replays Must Not Repeat the World

Replaying an event must not send the email or charge the card again. The usual fix is to put each external system behind a gateway that knows whether the code is replaying and skips the call then. External lookups, such as an exchange rate, are another case, since their answer would differ on a replay.

The gateway can record each answer and return the recorded one later. A simpler rule in practice is to keep side effects out of the code that rebuilds state, and run them in handlers that react to new events.

## Personal Data in an Unchangeable Log

A seller asks to be deleted, and the law may require it, while the log is meant to be permanent. There are two answers.

Keep personal data outside the events and refer to it by id, so deleting the other record is enough. Or use crypto shredding: encrypt the personal fields with a key for each person, and delete the key to make the data unreadable.

Axon supports this at the field level, with a key per data subject and a replacement value that reads back after the key is gone. Kurrent offers a different tool, a scavenge process that physically removes events that were deleted, which is destructive and needs care.

One Python library uses a single application wide key, so shredding for one person would need more work. Decide how deletion works before the first event is written, since later it is hard to add.

## When to Use It

Use the pattern where it earns its cost: an audit trail with intent matters, replay and compensation are needed, or many readers want different views.

Microsoft's guidance advises against it for simple create, read, update and delete work, for short lived or early prototypes, for data that is mostly static, when views must be fully up to date at once, and for a team that is new to event driven design.

It also advises using it for a part of a system and keeping plain tables elsewhere. The textbook app's wallet and its orders are good candidates, because money moves and disputes need answers. Seller profiles and the course list are plain tables.

## Key Points

- Event sourcing stores each change as an event added to the end of a log and works out the state by replaying them, so the history is the data
- An event stream belongs to one entity, and a version check on append, optimistic concurrency, stops two writers from deciding on the same old state
- <u>Snapshots are an optimization</u> for long streams and can be rebuilt from the events
- Replay gives an audit trail, queries about the past and fixes of old mistakes, and projections serve the queries across entities with some delay
- Events are not edited, so correct them with compensating events, plan for schema changes and for deleting personal data, and keep side effects out of replay

