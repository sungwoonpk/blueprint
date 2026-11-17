> **Load shedding** means refusing some requests on purpose when a service nears overload, so that the ones it accepts finish in time. **Graceful degradation** goes a step further and gives each user a cheaper, lower quality answer, so that less work is done for each request.

Registration day arrives at the textbook app, and the traffic is twice what the servers can handle. A service in that position has three choices.

It can try to serve everyone and let the queue grow, it can refuse some requests quickly and serve the rest well, or it can serve everyone a lighter version of the page.

The first choice looks the kindest and is the worst. This topic is about the other two.

The previous topics set the stage: [Cascading Failures](/system-design/cascading-failures) showed how overload spreads, and [Bulkheads](/system-design/bulkheads) limited what one part can take. Shedding is what a server does with its own overload, once the limits are reached.

## Why Waiting Is the Worst Choice

The AWS Builders' Library separates two numbers. **Throughput** is the requests a second that arrive. **Goodput** is the part of them answered without error and fast enough for the client to use the answer.

A server that does not shed sees its goodput fall once the load passes its capacity, because each request waits in line behind the others, and the client has often given up before its turn comes.

We simulated a service that can finish 1,000 requests a second, with clients that give up after 1 second. Requests arrive at random, a Poisson process, at the rate on the horizontal axis:

<figure class="chart">
<svg viewBox="0 0 420 262" role="img" aria-label="Line chart of goodput against offered load for a service that can finish 1,000 requests a second. With an unbounded queue, goodput rises to about 1,000 and then collapses below 100 once the load passes 1,250. With a bounded queue that sheds the excess, goodput stays at 1,000 as the load rises to 3,000." style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto">
<line x1="56" y1="196" x2="400" y2="196" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="56" y1="24" x2="56" y2="196" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="56" y1="39.6" x2="400" y2="39.6" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
<g font-size="11" style="fill:var(--muted)" text-anchor="end"><text x="50" y="43.6">1,000</text><text x="50" y="121.8">500</text><text x="50" y="200">0</text></g>
<g font-size="11" style="fill:var(--muted)" text-anchor="middle"><text x="56.0" y="212">0</text><text x="170.7" y="212">1,000</text><text x="285.3" y="212">2,000</text><text x="400.0" y="212">3,000</text></g>
<text x="228.0" y="232" font-size="11" text-anchor="middle" style="fill:var(--muted)">Offered Load (requests a second)</text>
<text x="14" y="110.0" font-size="11" text-anchor="middle" style="fill:var(--muted)" transform="rotate(-90 14 110.0)">Goodput (requests a second)</text>
<polyline points="84.7,157.1 113.3,117.7 142.0,78.6 170.7,39.9 199.3,39.6 228.0,39.6 285.3,39.6 342.7,39.6 400.0,39.6" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
<polyline points="84.7,156.6 113.3,117.5 142.0,78.6 170.7,40.6 199.3,183.2 228.0,188.0 285.3,190.8 342.7,191.8 400.0,192.1" fill="none" style="stroke:var(--text)" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"/>
<g font-size="12" font-weight="600"><text x="205.1" y="31.6" style="fill:var(--accent)">Bounded Queue, Excess Shed</text><text x="205.1" y="182.8" style="fill:var(--text)">Unbounded Queue</text></g>
</svg>
<figcaption>Goodput of a service that can finish 1,000 requests a second, from our simulation with a 1 second client timeout</figcaption>
</figure>

Up to 1,000 requests a second the two designs are the same. At 1,250 the unbounded queue has already collapsed to 82 requests a second of useful work, and at 3,000 it manages 25. The service is as busy as it can be, and most of that work goes to requests whose clients have left.

The bounded queue refuses a request when 100 are already waiting, which is a wait of at most 0.1 seconds. Its goodput stays at 1,000, and the refused requests get an instant error.

| Offered Load | Unbounded Queue | Bounded Queue, Excess Shed |
| --- | --- | --- |
| 1,000 a Second | 994 Answered in Time | 998 Answered in Time |
| 1,500 a Second | 51 Answered in Time | 1,000 Answered in Time, 492 Refused |
| 3,000 a Second | 25 Answered in Time | 1,000 Answered in Time, 1,986 Refused |

The idea is the same one as in [Cascading Failures](/system-design/cascading-failures): a backlog keeps a system busy after the trigger is gone. Refusing early is the cheap way to avoid the backlog.

## What a Server Can Use as a Signal

A server needs a cheap, local measure of being overloaded. The designs in the sources use a few:

- **Concurrent requests**: A limit on requests in flight, with a quick 503 above it
- **Queue length and age**: A queue of about half the size of the thread pool or less suits steady traffic. Add a limit on how long a request may wait, dropping requests that are too old
- **CPU or thread load**: An executor load average, the count of active threads smoothed over time, is a good signal: start rejecting when it exceeds the number of processors
- **Memory and connections**: Envoy's overload manager watches heap, cgroup memory, CPU use and open connections

Envoy's design shows how the signal becomes an action. Each monitor reports a pressure between 0 and 1, and each action has a trigger. A threshold trigger flips on above one value. A scaled trigger ramps up between two values, so the response grows with the pressure.

In its examples, stopping new requests with an immediate 503 begins at 95 percent of heap, and a CPU based version ramps from 80 to 95 percent. Other actions shorten idle timeouts or close idle connections to free resources before the last resort.

Set connection limits high at the load balancer and let each server decide, using local information, when to refuse. A limit on connections must stay below the number of listener threads and file descriptors, so that the server can still answer its health checks.

## Which Requests to Refuse

Refusing at random is better than collapse. Refusing the right requests is better again.

Give each request a criticality, which travels with the request through each service it calls:

| Criticality | Meaning |
| --- | --- |
| Critical Plus | The most important, with serious user impact if it fails |
| Critical | The default for production requests |
| Sheddable Plus | Partial unavailability is expected, the default for batch jobs |
| Sheddable | Frequent partial and occasional full unavailability is expected |

An overloaded task starts by rejecting the lower levels, and it rejects a level just after the ones below it are already being rejected. Four levels are enough to model nearly any service.

It adds a point that is easy to miss: criticality is separate from latency. A suggestion as you type is sheddable, and it is also very sensitive to delay.

Ordering matters in other ways too. The load balancer's health check ping comes first, because a server that misses pings is taken out of rotation and the fleet shrinks in the middle of the overload.

After that come requests from people before crawlers, the end of a multistep operation before its start, and the next page of a result before the first. Each of those lets the clients that have already invested effort finish.

For the textbook app, the arithmetic is simple. At twice the capacity, 2,000 requests a second arrive: 10 percent are checkouts, 60 percent browsing and 30 percent a crawler that indexes the listings. The service handles 1,000:

| Refusal Rule | Checkouts Served | Browsing Served | Crawler Served |
| --- | --- | --- | --- |
| At Random | 50% | 50% | 50% |
| Lowest Priority First | 100% | 67% | 0% |

The second row is our own arithmetic: the crawler's 600 requests go first, then 400 of the 1,200 browsing requests. A buyer in the middle of paying finishes, and some students get an error on a browse, which they can retry.

A second control is a quota for each customer. For example, a backend with 10,000 CPUs might give Gmail and Calendar up to 4,000 CPU seconds a second each, Android 3,000 and the rest of the users 500 together.

The limits add up to more than the machine has, which is deliberate, since the customers aren't expected to hit their limits together. [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) covers the same idea at the edge.

## Saying No Clearly

A refusal is a message to the caller, and the standard has two for it:

- **503 Service Unavailable**: RFC 9110 says the server can't handle the request now because of a temporary overload or maintenance, and it may send a `Retry-After` header to suggest how long to wait. The same text says the status doesn't oblige a server to use it when it is overloaded
- **429 Too Many Requests**: RFC 6585 says the user sent too many requests in a given time, and it may include `Retry-After`. It describes a limit on one client, so it fits a quota more than an overload of the whole server

A fast, clear error does two things. Clients that follow [Timeouts, Retries and Backoff](/system-design/timeouts-retries) wait and retry with jitter, within their budget. And the refusal costs the server little.

A refusal still takes CPU, and for a service where rejecting is nearly as expensive as serving, as in a lookup in memory, shedding alone can fail to protect the backend, so the refusal has to happen early and cheaply.

A refused request tells a client to slow down when the client listens. If each client retries at once, shedding turns into a retry storm, as described in [Cascading Failures](/system-design/cascading-failures), which is why the retry budget and the adaptive throttling of [Circuit Breakers](/system-design/circuit-breakers) matter on the client side.

## Working Through the Queue

If a queue is kept, its order matters. The first in, first out order serves the oldest request first, and under overload the oldest request is the one whose client is the most likely to have left.

Switch to last in, first out, or to a scheme like CoDel that drops requests which have waited too long. Take a search request that sat 10 seconds in the queue after the user refreshed the page.

That works with a condition: HTTP/2 allows last in, first out handling, and HTTP/1.1 pipelining doesn't.

In our simulation, a last in, first out queue with a 1 second age check kept goodput at 1,000 from 1,250 requests a second up to 3,000. The requests that had waited too long stayed in the queue, and nobody was served late.

## Graceful Degradation

Shedding refuses work. **Graceful degradation** takes load shedding one step further by reducing the work for each request.

The book's examples are searching a smaller part of the index, such as the copy kept in memory, using a cheaper ranking method, and answering from a local copy that may be stale in place of the canonical store.

Each degraded path has to be designed before the incident, since it is a second implementation of the feature. Some for the textbook app:

| Feature | Normal | Degraded |
| --- | --- | --- |
| Search | Ranked over the 3 million listings | The newest and most popular listings from a cache |
| Listing Page | Photos, seller details, similar books | Text and one photo |
| Recommendations | Personal | A fixed list, or hidden |
| Counts | Exact | Rounded or a few minutes old |

Registration day suits it: for 30 minutes the app is slightly plainer for each student, which beats a crash for some.

The same applies to the dependencies of a request. If the recommendation service hangs, the page doesn't wait for it, and the timeouts and circuit breakers of the earlier topics supply the cutoff, so the page returns without that part.

## When Shedding Goes Wrong

The sources are frank that shedding is a sharp tool:

- **False positives**: Aim for no refusals while there is spare capacity, and treat a regular small rate of refusals as a sign that the limits are tuned wrongly or the load is uneven
- **A clash with autoscaling**: If shedding starts at a CPU level near the target of the scaling policy, it can stop the fleet from growing, as discussed in [Autoscaling](/system-design/autoscaling)
- **Lost headroom**: A fleet that sheds can run much closer to refusing than its CPU suggests, and may have no room left when a zone fails
- **Misleading metrics**: A fast error pulls the median latency down, so count refusals in their own metric
- **Untested paths**: The code path you don't use is the one that often doesn't work, so run a few servers near overload regularly, which also shows whether the limits are right
- **Feedback loops**: Complex rules can start degraded mode when it isn't needed, so keep them simple, and build a quick way to turn them off or tune them

Dropping a request can cost as much as holding it, in which case slow the refusal to match the latency of the successes. Also watch it: log the client and the operation of each refusal, and alert on a high volume.

Shedding triggers shouldn't fire often. When many servers are shedding, the lesson isn't in the shedding, it is in the capacity, and [Capacity Planning](/system-design/capacity-planning) is where that is decided.

## Key Points

- A service that queues its whole overload loses its goodput: in our simulation, one that could finish 1,000 requests a second managed 25 a second at 3,000 offered
- Refuse early and cheaply, with a bounded queue, a limit on waiting time or a load signal, and goodput stays at capacity while the excess gets a fast error
- <u>Choose what to refuse</u>: criticality levels, health checks first, and per customer quotas let the important requests finish, as in our example where checkouts were served in full and the crawler got none
- Answer clearly with 503 or 429 and Retry-After, and serve the newest requests first when a queue is kept
- Graceful degradation gives a cheaper answer to everyone, needs a designed and tested path, and can clash with autoscaling or lost headroom if it isn't watched
