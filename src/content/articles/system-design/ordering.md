> A **partition** is one ordered slice of a topic. Messages with the same key go to the same partition, and a **consumer group** shares the partitions among its members so that each partition has one reader at a time. Order is kept inside a partition, and not between partitions.

The textbook app's "listing" events must be handled in order for each listing: posted, then price changed, then sold. Handled the other way round, a listing could be marked sold and then reappear as open.

At 3,000 events a second, one consumer can't keep up, so the events have to be split among several. This topic is about how to split them so that the order that matters survives, using the log from [Logs as Message Brokers](/system-design/log-based-brokers).

## Splitting the Log

A topic in a log based broker is divided into partitions, and each is its own log with its own offsets. Kafka's design document says the producer chooses the partition: at random, which spreads load evenly, or by a key that is hashed to pick one.

If the key is the listing id, all the events of one listing go to the same partition, and a partition is totally ordered, so they stay in the order they were written:

<figure class="diagram">
<p class="rowname">Partition 0</p>
<div class="flow packets">
<div class="node">17 posted</div>
<div class="node">42 posted</div>
<div class="node">17 price</div>
<div class="node">17 sold</div>
</div>
<p class="rowname">Partition 1</p>
<div class="flow packets">
<div class="node">8 posted</div>
<div class="node">8 sold</div>
<div class="node">31 posted</div>
</div>
<p class="rowname">Partition 2</p>
<div class="flow packets">
<div class="node">5 posted</div>
<div class="node">5 price</div>
<div class="node">12 posted</div>
</div>
<figcaption>Events keyed by listing id: each listing's events share a partition, in order</figcaption>
</figure>

Nothing is promised between partitions. Whether listing 8's sale was handled before or after listing 17's post is undefined, and it doesn't matter, since the two are unrelated. Partitions are like the shards in [Sharding Strategies](/system-design/sharding), and for the same reason: a partition is the unit that one machine handles.

## Consumer Groups

A **consumer group** is a set of consumers that together read a topic. Kafka's document states the rule: each partition is consumed by exactly one consumer within each subscribing group at any time.

So the group shares the partitions, and the number of partitions is the ceiling on how many consumers can work in parallel. For a topic with six partitions:

| Consumers in the Group | Partitions for Each |
| --- | --- |
| 1 | 6 |
| 2 | 3 |
| 3 | 2 |
| 6 | 1 |
| 8 | 1 for six of them, and 2 sit idle |

Different groups read independently, each with its own offsets: the search indexer and the email sender can both be groups on the same topic, as in the log design of the last topic.

When a consumer joins, leaves or crashes, the group **rebalances**: partitions are handed out again. Kafka's documentation describes the cost of the default way, where member ids change when a consumer restarts, so a deploy can shuffle a large share of the work and, for applications that keep local state, leave them unavailable while they rebuild it.

Its fix is static membership, in which each instance has a persistent id and keeps its partitions through a restart.

## Choosing the Key

The key decides two things at once, which pull in opposite directions: what stays in order, and how evenly the load spreads. We simulated 100,000 events from 100 sellers, one of whom is a power seller who makes 30 percent of the listings, over 6 partitions:

| Partition Key | Share on the Busiest Partition |
| --- | --- |
| Seller id | 39.9% |
| Listing id | 16.8% |

An even split would be 16.7 percent. Keyed by seller, one partition carries 40 percent of all events, and its consumer is the slowest in the group, a hot partition like the hot key from [Key-Value Stores](/system-design/key-value-stores).

Keying by listing spreads the load almost evenly. Ordering for all the events of a seller wasn't needed, only for each listing, so the finer key was the right one.

The rule is to use the smallest unit whose order you need. If even the finest key is too hot, a single very busy listing for instance, the options are to add a suffix to the key and give up the order inside that key, or to make the work cheaper.

There is one more trap. The partition is picked by hashing the key and dividing by the number of partitions, the same mod N scheme that [Consistent Hashing](/system-design/consistent-hashing) warns about.

If the number of partitions changes later, a key can map to a different partition, and its old and new events land in different logs. So choose the number with room to grow.

## What Order You Really Get

The guarantee is narrow: order inside a partition, for the messages that reached it. We measured what is lost without it, in a simple model. Each listing has three events one second apart, and the six partitions' consumers each run between 0 and 3 seconds behind:

| How Events Are Spread | Listings Handled Out of Order |
| --- | --- |
| Randomly across partitions | 36.4% |
| By listing id | 0% |

With random placement, more than a third of the listings had an event handled before an earlier one. Keyed by listing, a listing's events go through one consumer, which processes them one after another.

Queue brokers offer the same idea under other names. In Amazon SQS FIFO queues, messages with the same message group id are processed one at a time in strict order, and while one message of a group is in flight, no other consumer can take that group's messages.

Azure Service Bus does it with sessions: a receiver that accepts a session holds an exclusive lock on its messages, and other receivers get other sessions.

| System | Unit of Order | What Enforces It |
| --- | --- | --- |
| Kafka | Partition | One consumer per group |
| SQS FIFO | Message group | One message in flight per group |
| Service Bus | Session | An exclusive session lock |

The price is head of line blocking, the same trouble as a lost packet holding up a TCP stream. A message that keeps failing blocks the rest of its partition or group, since later messages can't pass it.

AWS's documentation says a backlog in one group can even hold up messages of other groups when it grows large, and recommends a dead letter queue after a number of failed attempts so the group moves on.

Service Bus moves a message to the dead letter queue after 10 deliveries by default and continues the session, and a message returned from that queue has lost its original place in the order. See [Dead Letter Queues](/system-design/redelivery-dlq).

## Choosing the Number of Partitions

More partitions allow more consumers, but each partition has its own replicas and leader, which Kafka's document names as the unit of replication, so there is a cost.

A workable rule uses the arithmetic of [Message Queues and Pub/Sub](/system-design/message-queues): work out how many workers you need at the peak, and set the partitions to at least that, with headroom.

The textbook app's resizer needed 60 workers at 50 posts a second, so a topic for it should have at least 60 partitions, and the "listing" topic, which feeds a handful of consumers, needs far fewer.

How a consumer that falls behind affects everything, and what to do about it, is the subject of [Backpressure](/system-design/backpressure).

## Key Points

- A topic is split into partitions, each ordered, and a key hashed to a partition keeps related messages together in order
- A consumer group shares the partitions, with at most one consumer per partition, so the number of partitions caps the parallelism
- <u>Key by the smallest unit whose order matters</u>: our listing key spread load evenly, while the seller key put 40 percent on one partition
- Order holds only inside a partition, group or session, and in our model random placement put 36 percent of listings out of order
- A failing message blocks its partition, so pair ordering with a dead letter queue, and choose the partition count with room to grow
