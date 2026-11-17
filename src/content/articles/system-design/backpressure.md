> **Backpressure** is a signal that travels from a slow consumer back to a fast producer, telling it to slow down, so that work doesn't pile up without limit. The alternatives are to buffer more, to drop work, or to add capacity.

The queues in this phase absorb a spike, as [When to Go Asynchronous](/system-design/when-async) showed. That works only while the consumers eventually catch up.

If producers keep sending faster than consumers can finish, a queue doesn't solve the problem. It just stores it, and the cost shows up as waiting. This topic is about what happens then and how to push back.

## Faster In Than Out

Say the textbook app's resizer receives 1,500 jobs a second and can finish 1,000. Each client gives up after 30 seconds. The backlog grows by 500 jobs a second, so the wait at the back of the line grows by half a second every second.

After 60 seconds the wait passes 30 seconds, and from then on each job reaches a worker after its client has gone. The workers stay busy and nothing they finish is of any use.

This is work nobody credits, and the right measure for it is **goodput**: the responses that are successful and on time, not throughput, the count of every request handled. We worked out the first 10 minutes of the example for four ways of handling the surplus:

| Policy | Jobs Finished in Time | Share of All Jobs Sent |
| --- | --- | --- |
| An unbounded queue, oldest first | 90,000 | 10% |
| An unbounded queue, newest first | 600,000 | 67% |
| A queue holding at most 5,000, the rest rejected | 600,000 | 67% |
| The producer slowed to 1,000 a second | 600,000 | 100% |

The first row is the trap: 900,000 jobs were sent, and only those in the first minute were finished before their clients gave up.

In the others the consumer's full 1,000 jobs a second were useful, either because stale jobs were skipped or because fewer jobs were sent. The last row is backpressure: the producer sent only what the consumer could take, and nothing was wasted.

## Four Ways to React

When a consumer can't keep up, there are four options:

| Choice | How | Cost |
| --- | --- | --- |
| Slow the Producer | The consumer says how much it can take, or the producer is rate limited | The producer must be able to wait |
| Bound the Buffer | Reject new work when the queue is full | Some work is refused, and callers must cope |
| Drop or Sample | Skip stale or low value work | Some results are lost |
| Add Capacity | More consumers, as in [Autoscaling](/system-design/autoscaling) | Costs money, and fails if the bottleneck is downstream |

The first option is the true backpressure: slow the producer. The Reactive Streams standard builds it into an interface. The subscriber asks for `n` items with `request(n)`, and the publisher may send no more than it has been asked for. Nothing blocks, and a receiver isn't made to buffer arbitrary amounts, so the queues between parts can be bounded.

Bounding the buffer is the second. A queue in front of a thread pool should be no larger than about half the pool for steady traffic, so that the server rejects early when it can't keep up. A rejection is cheap and fast, while a long queue turns into slow failures. Bound the age of a queued item as well as the size, and throw away items that have waited too long.

The third is to drop or sample, for sources that can't be slowed, such as clock ticks and mouse movement. The publisher has to buffer or drop. Under overload, serving the newest requests first can help, since a user whose request has waited 10 seconds has probably refreshed.

The fourth is to add capacity. More workers help when the limit is concurrency or CPU, and don't help when a downstream service is the bottleneck: extra workers just push the overload onto it.

## Backpressure in Code

Node.js streams show the idea in a few lines. The `write()` method returns `false` when its buffer is over the high water mark, 16 KiB by default, and the source should pause until the `'drain'` event says there is room:

```javascript
if (!writable.write(chunk)) {
  readable.pause();
  writable.once('drain', () => readable.resume());
}
```

In practice `pipeline()` wires this up. In a Node.js experiment compressing a large file, the process used a peak of about 88 MB of memory with backpressure, and about 1.5 GB with the signal ignored, with garbage collection working much harder.

The mechanism is the same idea as Unix pipes and TCP flow control at the network layer, as in [TCP and UDP](/system-design/tcp-udp).

A practical note: asking for one item at a time is a slow stop and wait protocol, so a subscriber should request the largest batch it can handle.

## Between Services and Queues

The same signal appears in the pieces from the earlier topics.

Pull based consumers carry the signal naturally. A Kafka consumer fetches at its own pace, whereas in a push system the broker sets the rate and a slow consumer is overwhelmed. A consumer that falls behind just has more lag, as in [Logs as Message Brokers](/system-design/log-based-brokers). A limit on unconfirmed messages does the same job: RabbitMQ's prefetch caps how many messages a consumer holds, as in [Message Queues and Pub/Sub](/system-design/message-queues).

Queue depth and age are the signals that something upstream should slow down, or that consumers should scale out. And at the edge, HTTP status codes say it to callers: a `429` or `503` with a `Retry-After` header tells the caller to wait, as in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice).

Callers have to obey the signal, and many don't. Take a backend with a limit of 10,000 requests a second that is offered 10,100: naive retries push it to 10,200 and then higher, and cutting the load to 9,000 may not bring it back.

Its rules for clients are a limit of three attempts for each request, a budget that allows retries only while they are below 10 percent of a client's requests, randomized exponential backoff, and retrying only at the layer just above the one that rejected.

Otherwise retries multiply: 4 attempts at each of 3 layers is 64 attempts at the database.

## Shedding by Priority

When a service is nearly overloaded, **load shedding** drops a share of the traffic cheaply, so the rest is served well. It should drop the right things. Give requests a criticality: the most critical ones are shed last, ordinary production traffic next, and batch work, which can retry later, first.

Rank by request type, with health checks from the load balancer first, and a request that finishes a piece of work ahead of one that starts it.

For the textbook app the order is clear: buying a book is critical, searching is important, and generating thumbnails can wait. Graceful degradation is the companion: serve a cheaper answer, such as searching a smaller set of data, instead of failing.

Rejecting a request must itself be cheap, or the rejections use the capacity that was meant to be saved. When overload spreads from one service to the next, it becomes a [Cascading Failures](/system-design/cascading-failures).

## Key Points

- A queue stores the problem when producers outrun consumers, and the cost is waiting, until replies come after the client has given up
- Measure goodput, the responses that are in time, and not only throughput
- <u>Slow the producer, bound the buffer, drop stale work or add capacity</u>, and choose by what the producer can accept and where the bottleneck is
- A consumer should signal how much it can take, by demand requests, a full buffer, queue age, or `429` with `Retry-After`, and callers must obey with a retry budget and backoff
- Shed low priority work first, and make rejection cheap
