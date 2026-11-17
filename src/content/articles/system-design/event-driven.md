> **Event-driven architecture** is a way of building a system in which services communicate by publishing **events**, facts about something that happened, and other services react to them, instead of calling each other directly.

When a student posts a listing in the textbook app, several parts of the system care. The photo resizer, the search index, the email sender, the analytics job and the recommendation engine each need to know. In the first design, the listing service calls each of them in turn.

It has to know the five of them, it waits for each answer, and if the email service is down the post fails. In an event-driven design, the listing service says "a listing was posted" once and carries on. Whoever is interested listens.

## Events and Commands

The two kinds of message that services send differ in what they say. A **command** tells one receiver to do something: "resize these photos". An **event** reports a fact about the past: "listing 17 was posted".

The difference follows from where the message is aimed. An event is a fact, so it has no destination, and a command conveys intent from a source to a given destination. Sending a command dressed as an event is a known mistake, sometimes called a passive aggressive command. If you want something done, send a command.

| Message | Says | Goes To | Example |
| --- | --- | --- | --- |
| Command | Do this | One named receiver | `ResizePhotos` |
| Event | This happened | Anyone who is interested | `ListingPosted` |

An event is a change of state or an update. It can carry the whole new state, such as the item, the price and the address, or just an identifier, such as "order shipped". Here is the textbook app's event, laid out in the CloudEvents format, a standard description for events:

```json
{
  "specversion": "1.0",
  "type": "app.textbooks.listing.posted.v1",
  "source": "https://textbooks.example/listings",
  "id": "evt-000812",
  "time": "2026-11-16T09:00:04Z",
  "subject": "listing/17",
  "datacontenttype": "application/json",
  "data": { "listing_id": 17, "seller_id": 3, "price_cents": 4500 }
}
```

The `type` names what happened, with a version at the end. The `source` and `id` together must be unique for each event, which lets a consumer recognize a duplicate, as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees). The `data` holds the details.

## Four Things People Mean

The phrase covers four different patterns. People often blame one for the problems of another, so it helps to keep them apart:

| Pattern | What the Event Carries | Cost |
| --- | --- | --- |
| Event Notification | Little: an id and a way back to the source | The flow is hard to see |
| Event-Carried State Transfer | The changed data itself | Receivers keep copies |
| Event Sourcing | Every change, as the record of the state | Replay and schema changes are hard |
| CQRS | Not an event pattern, but often paired with them | An extra model to maintain |

With event notification, the posted event holds the listing id, and a consumer that needs the price asks the listing service. Coupling stays low, but each consumer calls back. With event carried state transfer, the event holds the price and the title, so the search index builds its own copy and doesn't call the source.

The gains are resilience when the source is down, lower latency, and less load on the source. The cost is duplicated data, the same trade as in [Choosing Between Normalization and Denormalization](/system-design/normalization). The last two patterns have topics of their own: [Event Sourcing](/system-design/event-sourcing) and [CQRS](/system-design/cqrs).

## What You Gain

The change in coupling shows in a picture:

<figure class="diagram">
<p class="rowname">Request Driven</p>
<div class="flow">
<div class="node">Listing Service</div>
<div class="arrow" data-label="calls each" aria-hidden="true"></div>
<div class="stack">
<div class="node">Resizer</div>
<div class="node">Search</div>
<div class="node">Email</div>
</div>
</div>
<p class="rowname">Event Driven</p>
<div class="flow">
<div class="node">Listing Service</div>
<div class="arrow" data-label="publishes" aria-hidden="true"></div>
<div class="node">Broker</div>
<div class="arrow" data-label="delivers" aria-hidden="true"></div>
<div class="stack">
<div class="node">Resizer</div>
<div class="node">Search</div>
<div class="node">Email</div>
</div>
</div>
<figcaption>The publisher stops knowing who listens</figcaption>
</figure>

Several benefits follow. A new consumer needs no change to the publisher: adding a recommendation engine means subscribing to the event, with no change to the listing service.

Failures and scaling stay independent. If the email service is down, posts still succeed and its events wait. With direct calls, four services in a row at 50 ms each would add 200 ms to each post, in our example, and any one of them could fail it.

The broker also buffers surges, holding events while consumers catch up, as in [Message Queues and Pub/Sub](/system-design/message-queues). And nobody polls: a service learns about a change when it happens, and doesn't ask repeatedly.

## What You Pay

The costs are real, and the first is blunt: the end to end flow is not written in any program, and is often found by watching the system run. The rest of the bill follows from that.

Publishers and consumers deploy separately, so a changed event can break a consumer that hasn't been updated. This is coupling hidden in the schema. Plan a versioning scheme from the start, and have consumers ignore what they don't know.

Consumers work at their own pace, so parts of the system disagree for a while, and the design has to tolerate stale reads. With several consumer instances, order and one time processing are lost unless handled, as in [Partitions, Ordering and Consumer Groups](/system-design/ordering) and with idempotent handlers.

If a component crashes before handing an event on, the event can be lost, so events should be persisted and acknowledged once the next step confirms. [The Transactional Outbox](/system-design/transactional-outbox) is the standard answer.

A multi step business transaction has no automatic undo across services, so it needs compensation, as in [Sagas](/system-design/sagas) and [Workflow Engines](/system-design/workflow-engines). And there is no call stack through the services, so each event should carry a correlation id, as in [Logs, Metrics and Traces](/system-design/observability).

Finally, granularity is a judgment. Very fine grained events overwhelm a system, and too few cause extra work in the consumers.

## Designing Events

A few habits keep a set of events manageable. Name facts in the past tense, `listing.posted` and `price.changed`, and not `please.resize`.

Version the type. A compatible change keeps the type, and an incompatible change gets a new type, with the old and new events produced side by side for a while.

Keep events compact. Intermediaries must forward events up to 64 KiB, and no more is required, so link to large items, such as the photo, instead of embedding them.

Choose thin or full on purpose. A thin event makes consumers call back, and a full one spreads copies. Thin events have a privacy benefit: consumers fetch the details from the source with their own authorization. Remember that events are visible beyond their intended consumers, so keep sensitive data out of them.

## When to Use It

Event-driven design fits when several subsystems process the same events, when near real time response and high volume matter, and when producers and consumers must scale independently.

It is a poor fit when plain request and response is fast enough, when strong consistency across services is required, or when the team has no experience running asynchronous systems.

The textbook app shows both sides. A posted listing is a good event, with many independent listeners. The purchase, where money moves and each step depends on the last, is better as a workflow with a coordinator, and the reservation of the book stays synchronous, since the buyer is waiting for it.

## Key Points

- An event is a fact about the past that anyone may react to, and a command asks one receiver to do something
- Four patterns share the name: event notification, event carried state transfer, event sourcing and CQRS, and each has its own costs
- <u>The publisher stops knowing its consumers</u>, so new listeners need no change, failures stay apart and surges are buffered
- You pay in a flow that is hard to see, schemas that couple the sides, eventual consistency, duplicates, and no automatic rollback
- Name events as past facts, version their types, keep them compact, and use workflows for steps that depend on each other
