> A **cascading failure** is a failure that grows by feeding on itself: when part of a system fails, the load that it carried moves to the rest, which makes them more likely to fail, and so on. A **metastable failure** is the worst kind, where the system stays broken after the original cause has gone.

At 9:00 AM on registration day, one of the textbook app's wallet servers crashes. The five that remain take its traffic. If they had room, no one would notice.

If they were already busy, they slow down, requests start to time out, the clients retry, and the retries add load. A minute later the six are failing, and restarting the crashed server doesn't help, since it is hit by the full load the moment it returns.

The first topics of this phase gave the tools to see such an event. This topic is about why it happens and how to stop it, and the next ones, on timeouts, circuit breakers, bulkheads and load shedding, are the defenses in detail.

## How a Failure Spreads

The causes are few. The most common is server overload. Take a cluster that handles 1,000 requests a second. When a second cluster fails, its load moves over and the first one gets 1,200.

Its frontends run out of resources, and the number of successful requests falls well below 1,000. Within a couple of minutes the overload can spread to other clusters as the load balancer reacts.

Overload shows up as running out of something.

When CPU runs out, requests slow down, more of them are in flight, queues grow, health checks fail and deadlines are missed. When memory runs out, tasks die, or a garbage collection spiral starts, where less CPU leads to more collection and less CPU still. Threads running out show up as errors and failed health checks, and the threads themselves use memory. And when file descriptors run out, connections can't be set up, so health checks fail.

Three more mechanisms make it worse.

Retries are the first. A client that retries a failed request sends more load to a server that is already failing.

Load balancing is the second. A server that fails health checks leaves the pool, and the policy that avoids servers with recent errors pushes their load onto the rest. A server that crashes and restarts is hit with the full load at once.

Cold starts are the third. New tasks are slow to start, with connections to set up and code to warm, and a cold cache sends each request to the expensive path.

Here is how hard it is to get out. A service that was healthy at 10,000 requests a second and begins crashing at 11,000 will not recover when the load drops to 9,000.

If 10 percent of its servers are healthy, the request rate has to fall to about 1,000 a second to stabilize.

## Retries Multiply

An example of retry amplification: a backend can handle 10,000 requests a second for each task, and the frontend sends 10,100.

Each failed request is retried, up to 10 times, so each second adds load on top of the last, and the backend melts down. Even when traffic returns to 9,000 a second, failing requests still use resources.

Retries compound across layers. With 3 retries at each of 3 layers, each request is tried 4 times at each layer, which makes 4 to the power of 3, or 64 attempts at the database.

[Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard) gave a five layer version, 243 times the load. The defenses are in [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

## Metastable Failures

Nathan Bronson and colleagues, in a 2021 paper from engineers at Facebook and universities, gave the pattern a name. In a metastable failure, a trigger pushes the system into a bad state, with goodput, the throughput of useful work, unusably low, and a **sustaining effect**, often work amplification, keeps it there after the trigger is gone.

Failures that end when the trigger ends, such as a denial of service attack, are not metastable. Leaving the state takes a strong push, such as a reboot or a large cut in load.

Their example is a web application that queries a database. The database answers in under 100 ms below 300 queries a second and is an order of magnitude slower above that. The application makes one query and retries once if there is no answer in 1 second. At 280 queries a second the system is fine.

Then a 10 second outage of the network switch hits. When connectivity returns, the lost requests and their retries arrive together, the database is overloaded, and its latency rises. While latency stays high, each client query is followed by a retry, 560 queries a second, so the database can't recover and no query succeeds.

The system had two states at the same load. Below 150 queries a second it can't be pushed into the trap. Between 150 and 300 it is vulnerable, and a trigger can tip it. The trigger tends to get the blame, and the real root cause is the sustaining effect.

A follow up study at OSDI 2022 read public incident reports. It examined 22 metastable failures from 11 organizations, and found that at least 4 of 15 major outages at Amazon Web Services in a decade were of this kind.

The most common sustaining effect was the retry policy, which affected more than 50 percent of the incidents studied. Outages lasted from 1.5 to 73.5 hours, with 4 to 10 hours the most common.

## Two Real Cascades

Amazon's DynamoDB outage of 20 September 2015 shows the pattern. Storage servers in DynamoDB ask an internal metadata service for their membership, the partitions they own, at startup and on check ins. Customers had adopted global secondary indexes quickly, and membership lists had grown, so each request was larger.

At 2:19 AM Pacific time a brief network disruption hit part of the storage fleet. Affected servers asked for their membership and found the answers slower than their timeout, so they dropped out of service and asked again.

The retries and large requests slowed the metadata service, which then answered healthy servers slowly, and they too failed their renewals and retried.

By 2:37 AM the customer error rate stabilized at about 55 percent. Adding capacity to the metadata service failed at first, since the administrative requests couldn't get through the overload. At 5:06 AM the team paused requests to the metadata service, which cut the retry load, and capacity was added.

Requests were allowed again at 7:10 AM. The effects spread: SQS had errors and Auto Scaling actions were delayed until 10:52 AM. The console's login took tens of seconds, because a long timeout on a call to DynamoDB blocked it.

Cloudflare's outage of 12 June 2025 is similar in kind. A failure in the storage under its Workers KV service, partly run by a third party that had its own outage, made 90.22 percent of KV requests fail.

Services that depended on KV followed: Access failed 100 percent of identity based logins, and several other products reached error rates near 100 percent.

Retries from device registrations increased load in several locations. At 19:32 UTC Cloudflare began to drop identity and posture requests deliberately to shed load, and recovery began at 20:23. The follow up work includes bringing namespaces back in stages so that cache repopulation doesn't overload the infrastructure again.

## A Toy Model

We built a small model to see the feedback. Six servers each handle 500 requests a second, and 2,400 new requests a second arrive. At 60 seconds two servers die for 15 seconds, and restart cold. A failed request is retried one second later, up to 4 attempts.

Without shedding, a server offered more than its capacity serves less than its capacity: it loses half of it for each 100 percent of overload. A server offered more than 1.6 times its capacity for 3 seconds crashes. These numbers are our assumptions, and the behavior is what the sources describe:

| Defense | Lowest Goodput | Result |
| --- | --- | --- |
| Retries Without Limit | 0% of the new load | Did not recover in 840 seconds |
| Retry Budget of 10% | 70% | Stuck at 70% for the whole run |
| Load Shedding Only | 83% | Recovered 15 seconds after the trigger |
| Shedding and Retry Budget | 83% | Recovered 21 seconds after the trigger |

With unlimited retries, goodput fell to zero and stayed there. The retry budget alone stopped the retry storm and the system still stuck at 70 percent: the two restarted servers crashed again each time they came back, because a cold server offered a full share of load can't keep up, which is the classic crash loop.

Load shedding kept the servers at capacity, so they stayed healthy and the cold ones warmed up, and the system recovered in seconds.

## Defenses

The defenses, in order of importance.

The most important exercise is load testing, to find the limits and see how the service fails under overload. Capacity planning comes next: an example has a breaking point of 5,000 requests a second for each cluster and a peak of 19,000, which needs about six clusters for N plus 2, and planning alone is not enough.

Queue management keeps the queue at 50 percent of the thread pool or less for steady traffic, so that the server rejects early. A queue of 10 times the thread count with 100 ms requests holds a wait of about 1.1 seconds when full. Load shedding returns an error such as HTTP 503 when more than a set number of requests are in flight, and serves the newest first, or uses CoDel, in preference to first in, first out.

Graceful degradation serves a cheaper answer, such as a cached subset or a simpler ranking, and the degraded path should be exercised regularly since it is rarely used.

Retry discipline means randomized exponential backoff with jitter, a limit on retries for each request, a server wide retry budget, such as 60 retries a minute per process, and retries at one layer. Deadlines propagate the remaining time down the call tree, so that a 30 second deadline with 7 seconds spent leaves 23 for the next call, and work whose time has run out is dropped.

The reason is **goodput**, the requests handled without error and quickly enough for the client to use. As load rises past capacity, latency rises, and a timeout on the client turns a slow answer into an error, so goodput can fall to zero.

Shedding keeps goodput flat by rejecting excess work early. Its advice: load test well past the point where goodput stops growing, serve health checks first, and prefer rejecting work that hasn't started to abandoning work that has.

Envoy, a widely used proxy, puts some of these limits in the network layer. It enables circuit breakers by default, with modest limits, one example being 1,024 connections for each cluster, and retry budgets are preferred over static retry limits.

Its retry backoff is exponential with full jitter from a 25 ms base, capped at 250 ms, and the route timeout covers the retries together.

## Getting Out

When a cascade has started, adding capacity is not the first move, since new servers start cold. The pattern in the incidents is to reduce load first:

| Step | Example |
| --- | --- |
| Stop the Retries | Pause requests to the overloaded service, as DynamoDB did at 5:06 AM |
| Shed Load Deliberately | Drop low priority traffic, as Cloudflare did at 19:32 |
| Add Capacity After Load Is Low | New servers need a warm up and a share they can take |
| Bring Traffic Back in Steps | Enable parts one at a time again, as Cloudflare plans to do |
| Find the Sustaining Effect | Retry policy, cache refill or restart storm, and not just the trigger |

## Checklist

For the textbook app, the team writes down these items and tests them:

- **Capacity with a failure**: The fleet can lose a server and still carry the peak, tested in a load test and not on paper
- **Shedding in place**: Each service rejects work beyond a fixed number in flight, and keeps health checks fast
- **Retries limited**: One layer retries, with backoff, jitter and a budget
- **Cold starts survivable**: A restarted server takes load slowly, with a warm up
- **A way to cut load**: A switch to pause or reduce a caller, tried in a game day

## Key Points

- A cascading failure feeds on itself: lost capacity moves load to the rest, and overload, retries and cold restarts turn a small failure into a large one
- Retries multiply across layers, 4 attempts at 3 layers is 64 attempts, so limit and budget them
- <u>A metastable failure persists after its trigger is gone</u>, sustained by effects such as retries: more than 50 percent of the incidents in one study
- In our toy model, unlimited retries did not recover, a retry budget alone stayed at 70 percent, and load shedding recovered in 15 seconds
- Recover by cutting load first, bring traffic back in steps, and test the defenses before the incident
