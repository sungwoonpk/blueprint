> A **distributed system** is a set of computers that work together on one job by sending messages over a network. It is hard because the parts fail separately, messages take unpredictable time and can disappear, and no computer can see the whole system at once.

On one server, the textbook app either works or it doesn't. When it crashes, everything stops together, and when it restarts, it starts from a known place. The app we have built over four phases is no longer like that.

It has 6 web servers, a database with replicas, a cache, a queue and workers, and most of the earlier topics were about coping with that: [Message Queues and Pub/Sub](/system-design/message-queues), [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees), [Cache Invalidation](/system-design/cache-invalidation).

This topic names what those problems have in common, so the rest of the phase can solve them one at a time.

## Partial Failure

A single computer fails as a unit. A group of computers fails in pieces: one server is down while five work, one network link is slow while the others are fine, one disk is full.

The Amazon Builders' Library notes that systems usually don't fail as a single unit, and defines partial failure as a share of requests that succeed.

Pieces that depend on each other multiply their failure rates. If each of 10 services in a chain is up 99.9 percent of the time, a request that needs each of them succeeds 99.0 percent of the time, which we calculated as 0.999 to the power of 10.

With services at 99 percent, 10 in a chain give 90.4 percent, and 50 give 60.5 percent.

| Services in the Chain | Each at 99.9% | Each at 99% |
| --- | --- | --- |
| 1 | 99.90% | 99.00% |
| 5 | 99.50% | 95.10% |
| 10 | 99.00% | 90.44% |
| 50 | 95.12% | 60.50% |

Each added piece also adds the chance that one of them is failing right now, so a large system is often partly broken. The design has to work anyway, which is why the later topics on replication and consensus exist.

## The Network Between

Computers talk over a network, and the network is where the trouble is hardest to see. In the 1990s, engineers at Sun Microsystems collected the false assumptions that developers make about it.

L. Peter Deutsch listed seven in 1994, building on earlier work by Bill Joy and Dave Lyon, and James Gosling added an eighth. They are called the fallacies of distributed computing:

| Fallacy | What Goes Wrong in the Textbook App |
| --- | --- |
| The network is reliable | A request to the payment service gets no reply |
| Latency is zero | A page makes 30 calls and each one waits |
| Bandwidth is infinite | Photo uploads at 300 KB each crowd out everything else |
| The network is secure | A service trusts any caller inside the network |
| Topology doesn't change | A server is replaced and its address changes |
| There is one administrator | The email provider changes its rules on its own schedule |
| Transport cost is zero | Moving photos between regions costs money and time |
| The network is homogeneous | Phones, campus Wi-Fi and data centers behave differently |

Kyle Kingsbury's notes for his distributed systems course describe the network model the real world gives us, an **asynchronous network**: messages can be delayed for any length of time, duplicated, dropped or reordered, and there is no clock that the nodes share.

Most networks recover within seconds to weeks, and that is cold comfort when a buyer is waiting.

## Slow or Dead? You Can't Tell

The consequence of an asynchronous network is the central difficulty. The buyer's payment request goes to the payment service, and no reply comes back. Three different things could have happened.

<figure class="diagram">
<p class="rowname">Request Lost</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Dropped</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">No Charge</div>
</div>
<p class="rowname">Server Slow or Crashed</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Stalled</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Charge Unknown</div>
</div>
<p class="rowname">Reply Lost</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Reply Dropped</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Charged</div>
</div>
<figcaption>The caller sees the same silence in the three cases</figcaption>
</figure>

A timeout can't separate the cases, and the caller must decide anyway. Retrying risks a second charge in the last case, and giving up risks a lost sale in the first. This is why [Idempotency and Safe Retries](/system-design/idempotency) matters, and why [Failure Detection and Gossip](/system-design/failure-detection), the next topic, has to guess whether a machine is dead.

## Remote Calls Are Not Function Calls

A call to another machine is a different kind of operation from a call in the same program. Jeff Dean's well known table of latencies, from about 2012, gives a round trip inside one data center as 500 microseconds, against 100 nanoseconds for a read from main memory.

The remote call is about 5,000 times slower, a disk seek is 10 ms, and a packet to the Netherlands and back takes 150 ms. The table ignores queueing and contention, so real numbers are worse.

A page that makes 30 sequential remote calls at 0.5 ms each spends 15 ms just on the network, before any work. In a single program, the same calls would cost close to zero, and that difference is why the design of a call path matters.

## The Slowest Part Sets the Pace

Variation in speed gets amplified when a request touches many machines. Jeffrey Dean and Luiz Barroso, in their paper on tail latency, give a clear example.

If a server is slow for 1 request in 100, a request handled by one server is slow 1 percent of the time. If the request must collect answers from 100 such servers, 63 percent of requests are slow.

We calculated the same effect for the textbook app's search, if one slow request in 100 hits each server:

| Servers a Request Waits For | Chance That One Is Slow |
| --- | --- |
| 1 | 1.0% |
| 6 | 5.9% |
| 20 | 18.2% |
| 100 | 63.4% |

The paper adds that a service whose servers are slow for 1 request in 10,000 will still see almost one request in five slow, when each request waits for 2,000 servers.

In a real Google service it measured, the 99th percentile for one request to finish was 10 ms, and the 99th percentile for the full set of leaf requests was 140 ms.

The authors' remedy is to send a second copy of a request after a short wait and use whichever answer arrives first, called a hedged request.

In one benchmark of reading 1,000 keys from a table spread over 100 servers, a hedge after 10 ms cut the 99.9th percentile from 1,800 ms to 74 ms, for about 2 percent more requests.

## Retries Can Make It Worse

The natural reaction to a timeout is to retry, and retries carry a risk. Marc Brooker's article in the Amazon Builders' Library calls retries selfish, since each one asks for more of a service that may already be struggling.

His example is a stack five layers deep in which each layer retries three times. A failure at the bottom then multiplies into 243 times the load on the database, just when it can least take it.

His advice is to retry at one layer, back off with random jitter, retry operations that are safe to repeat, and set timeouts from the latency the dependency normally shows, such as the level that 0.1 percent of calls exceed.

These are the subject of [Timeouts, Retries and Backoff](/system-design/timeouts-retries) and of [Cascading Failures](/system-design/cascading-failures) in the next phase.

## Clocks Disagree

Each computer has its own clock, and the clocks drift apart. A program that compares timestamps from two machines to decide which event happened first can be wrong.

Kingsbury's notes describe a time sync service that steps a clock backwards, and a leap second in 2017 that made time run backwards on Cloudflare's servers. A negative duration crashed part of their DNS software, and about 1 percent of HTTP requests failed for several hours.

For this reason, ordering events in a distributed system uses logical clocks and agreement between machines, as in [Physical and Logical Clocks](/system-design/clocks).

## Designing With the Problems

The remaining topics in this phase answer one of these problems each:

| Problem | Where the Phase Deals With It |
| --- | --- |
| Can't tell dead from slow | [Failure Detection and Gossip](/system-design/failure-detection) |
| Clocks disagree | [Physical and Logical Clocks](/system-design/clocks) |
| Copies of data drift apart | [Single Leader Replication](/system-design/replication-one-leader) and [Consistency Models](/system-design/consistency-models) |
| One node can't hold the data | [Sharding Strategies](/system-design/sharding) |
| Several steps must agree | [Two-Phase Commit](/system-design/two-phase-commit) and [Sagas](/system-design/sagas) |
| Who is in charge | [Consensus and Leader Election](/system-design/consensus-leader-election) |

A few habits apply throughout. Put a timeout on each remote call, and make operations safe to repeat. Expect each dependency to fail, and decide what the system does then. Prefer designs that need less agreement between machines, since agreement is the most expensive thing to get.

## Key Points

- A distributed system fails in pieces, and the chance that something is failing grows with its size: 10 services at 99.9 percent give 99.0 percent together
- The network can delay, drop, duplicate and reorder messages, so <u>a caller can't tell a slow server from a dead one</u> and must design for either
- Remote calls are thousands of times slower than local ones, and the slowest of many servers sets the pace: 63 percent of requests are slow when each waits for 100 servers that are slow 1 percent of the time
- Retries help against transient failures and multiply load when stacked, so they need limits, backoff and safe operations
- Clocks on different machines disagree, so order comes from logical clocks and agreement, which the rest of the phase covers

