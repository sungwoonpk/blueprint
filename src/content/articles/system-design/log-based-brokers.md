> A **log based broker** keeps messages in an append-only log and lets each consumer read it by position, called an **offset**, instead of deleting a message once it has been read. Apache Kafka is the best known example.

A queue from [Message Queues and Pub/Sub](/system-design/message-queues) forgets a message as soon as someone confirms it. That suits jobs, and it fails two other needs of the textbook app. The search index, the email sender and a new analytics system all want to read the same stream of "listing posted" events, each at its own pace.

And when the analytics team fixes a bug in how they count, they want to read last week's events again. A log keeps the messages, so both are possible. It is the idea from [Write-Ahead Logs](/system-design/write-ahead-logs), used as the thing that carries data between systems.

## A Queue That Doesn't Forget

Kafka's design document describes the log and its readers. New messages are appended at the end. A consumer fetches by saying "give me what comes after offset 7", and the broker returns a chunk of log from there.

Nothing is removed when it is read. Here is a log of ten events, and three consumers at different places in it:

<figure class="diagram">
<p class="rowname">The Log, Oldest to Newest</p>
<div class="flow packets">
<div class="node">0</div>
<div class="node">1</div>
<div class="node">2</div>
<div class="node">3</div>
<div class="node">4</div>
<div class="node">5</div>
<div class="node">6</div>
<div class="node">7</div>
<div class="node">8</div>
<div class="node">9</div>
</div>
<figcaption>Events stay in the log in the order they were written, each with a fixed offset</figcaption>
</figure>

| Consumer | Next Offset to Read | Behind by |
| --- | --- | --- |
| Search Indexer | 9 | 1 event |
| Email Sender | 5 | 5 events |
| New Analytics Job | 0 | 10 events |

Each consumer's whole state is one number. Kafka's documentation points out why that is a strong idea. A queue broker has to track the fate of every message, which gets expensive, and it has the confirmation problem of the last topic.

In a log, a topic is split into ordered partitions, each read by one consumer at a time within a group, so the position is a single offset per partition, cheap to store and to save regularly.

It also allows something a queue can't do. The consumer can move its offset backward and read old events again.

Kafka's documentation says this breaks the usual contract of a queue, and gives the case where it matters most: a bug is found in the consumer, and once it is fixed the same messages can be processed again. For the analytics job that starts at offset 0, replay is the whole way it catches up.

## Why Logs Are Fast

Kafka's documentation argues against the idea that disks are slow. Disks are slow at seeking and fast at reading and writing in a line.

It quotes a drive array on which linear writes ran at about 600 MB per second while random writes ran at about 100 KB per second, a difference of over 6,000 times. That figure is from older hardware, but the gap between sequential and random access is still the point.

A log only appends and only reads forward, so it stays on the fast side. The document lists the other ingredients:

- **Constant time operations**: Many brokers keep for each message metadata in a tree, where each step can mean a disk seek of about 10 ms. Appending to and reading from a file costs the same however big the log is
- **The operating system's cache**: Kafka writes to files and relies on the page cache, the free memory the operating system uses for files, which stays warm even if the broker restarts
- **Batching**: Producers collect messages into batches, for example up to 64 KB or 10 ms, and the broker appends and serves them in chunks. The document says this gives orders of magnitude of speed up, and it connects to our own measurement in [Write-Ahead Logs](/system-design/write-ahead-logs), where flushing once for 100 records was about 80 times faster than flushing for each record
- **Zero copy**: When the data is not encrypted in the broker's process, the operating system sends it from the page cache to the network card directly, one copy instead of four, so consumers who are caught up cause no disk reads at all

These are the same ideas as in [LSM Trees](/system-design/lsm-trees): write in a line, batch, and let the operating system do the caching.

## Keeping the Log

Since messages aren't deleted on read, a log needs a rule for when to drop them. The simplest rule is time or size: keep a week, or a number of gigabytes. A week is cheap, as the arithmetic shows for the textbook app, with 200 byte events:

| Event Rate | Per Week |
| --- | --- |
| 100 a second, the daily average | 12 GB |
| 3,000 a second, the registration day peak held for a whole week | 363 GB |

The second row is the worst case, and even that fits on one modern disk.

The other rule is **log compaction**, for logs that hold changes to keyed records. Kafka's example is a user's email address: the log holds every change under the user id, but a new consumer that wants the current state needs only the last one. For the textbook app, take price changes keyed by the listing id:

```text
17 => 4500
17 => 4000
17 => 3500
```

Compaction guarantees that the last value for each key stays, which is 3500 for listing 17, and removes the earlier ones in the background.

A message with a key and an empty value is a delete marker, also called a tombstone, which removes the key and is itself cleaned up after a time, 24 hours by default in Kafka.

Kafka's document lists what remains true: order is never changed, an offset keeps its meaning, and a consumer that stays close to the head of the log sees every message.

With compaction a log holds the full current state and not only recent changes. That is how a cache or a search index can be rebuilt from the log, the use behind [Change Data Capture](/system-design/cdc) and [Event Sourcing](/system-design/event-sourcing).

## Pull, Not Push

Kafka consumers pull. They send fetch requests that include their offset. The design document gives the reasons. A broker that pushes controls the rate, so a slow consumer is overwhelmed, whereas a consumer that pulls takes what it can handle. Pulling also batches well, since the consumer takes everything after its position, up to a limit.

The weakness of pulling is a tight loop of polling an empty log, which a long poll solves by letting the request wait until data arrives. This is the shape that makes [Backpressure](/system-design/backpressure) natural: a consumer that falls behind simply has more lag, and the log holds the difference.

## Queue or Log

| Question | Queue | Log |
| --- | --- | --- |
| After a Message Is Read | It is deleted | It stays until retention removes it |
| Where Progress Is Kept | Per message, at the broker | One offset for each partition |
| Reading Again | Not possible | Rewind the offset |
| Several Independent Readers | A queue for each, filled by pub/sub | A group for each, on one log |
| Retries and Bad Messages | Per message, with a dead letter queue | Not built in, since the offset moves past a failure |
| Order | Roughly first in, first out | Total order inside a partition |

Kafka has noticed that last gap. Its documentation describes **share groups**, a newer kind of group where consumers acknowledge records one at a time, a record is locked for 30 seconds by default, and delivery attempts are counted so unprocessable records can be set aside. In effect, it adds queue behavior on top of a log.

A rough guide for the textbook app: use a queue for jobs that one worker should do, such as resizing a photo. Use a log for facts that many systems want to hear, read again and again, such as "listing posted" and "price changed".

The details of what each system promises when something fails come next in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees), and the partitions that give a log its order are the subject of [Partitions, Ordering and Consumer Groups](/system-design/ordering).

## Key Points

- A log based broker appends messages to a log and keeps them, so each consumer is just an offset, and a new reader can start from the beginning
- Rewinding the offset makes replay possible, which is how bugs are fixed and new consumers catch up
- Logs are fast because they use linear disk access, the page cache, batching and zero copy
- <u>Retention by time or size, or compaction by key</u>, decides what the log keeps
- Use queues for jobs and logs for facts many systems want, and remember that queue behavior can be added on top of a log, as share groups do
