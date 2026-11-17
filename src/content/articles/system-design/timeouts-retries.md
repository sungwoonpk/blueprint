> A **timeout** limits how long a caller waits for an answer. A **retry** repeats a call that failed. **Backoff** spaces the retries out, usually doubling the gap each time, and **jitter** adds randomness to the gaps so that many clients don't retry together.

[Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard) ended its first problem with a payment request that gets no reply. The caller can't tell whether the request was lost, the server is slow or the reply was lost, so it picks a time to give up, and then it chooses whether to try again.

Both choices are easy to get wrong in ways that don't show until the system is under stress, which is how [Cascading Failures](/system-design/cascading-failures) begin.

## Every Call Needs a Timeout

Set a timeout on each remote call, including the connection and the request, even calls to the same host. Too high, and the caller wastes resources waiting. Too low, and the extra retries add load that can cause an outage of its own.

The trouble is that many clients and servers ship with no timeout, or with a very long one:

| System | Default |
| --- | --- |
| Python `requests` | No timeout, so a call can hang for minutes or more |
| gRPC | No deadline, so a client can wait effectively forever |
| Go `http.Get` and the default client | No timeout |
| Envoy, Route | 15 seconds |
| Envoy, Connecting to an Upstream | 5 seconds |
| nginx, Connecting to and Reading from a Proxied Server | 60 seconds each |
| Linux, TCP Connection Attempt | About 127 seconds, with 6 retries |
| Linux, an Established Connection With Unacknowledged Data | About 13 to 30 minutes, with 15 retries |

The last two are the operating system's own patience, and they are far longer than any user will wait. A service that relies on them has an outage of minutes whenever a peer disappears without closing its connection.

Two details on what a timeout measures. In Python's `requests`, the read timeout is the wait between bytes received, not for the whole response, and the connect timeout applies to each IP address, so a host with IPv4 and IPv6 addresses can take about twice as long.

A connect timeout a little above 3 seconds fits, tied to the TCP retransmission window. Go's timeouts are absolute deadlines that don't reset when data flows, and its convenience server functions have no way to set them, which makes them unsafe on the public internet.

## Choosing the Number

The Builders' Library gives a method. Decide on an acceptable rate of false timeouts, requests that would have succeeded if given more time, such as 0.1 percent, and take the latency of the downstream service at that percentile, here the 99.9th.

It adds caveats: add network time for clients on the internet, pad the value when the 99.9th percentile is close to the median, and use well tested library timeouts.

One example is a timeout of about 20 ms that failed because it included the time to set up a TLS connection. The fix was to open connections at startup.

We tried several timeouts on the latency distribution from [Logs, Metrics and Traces](/system-design/observability), where 99 percent of requests take about 40 ms and 1 percent take 3 to 8 seconds, each with one retry that is independent of the first. Without a timeout, the 99.9th percentile was 7,507 ms:

| Timeout | Requests Retried | 99.9th Percentile With One Retry |
| --- | --- | --- |
| 100 ms | 2.08% | 181 ms |
| 200 ms | 0.99% | 267 ms |
| 1 second | 0.99% | 1,068 ms |
| 3 seconds | 0.99% | 3,067 ms |
| 8 seconds | 0% | 7,507 ms |

A timeout of 200 ms, a few times the typical request, cut the slowest requests from 7.5 seconds to 267 ms, for 1 percent more calls. A timeout set at 1 second helps much less, and the 100 ms one starts to cut off healthy requests.

The effect depends on the slowness being random for each attempt. When a server is overloaded, the retry is slow too, which is the next section's subject.

## Deadlines Across a Call Chain

A request often passes through several services, and each should know how long it has left. gRPC makes the idea explicit.

A **deadline** is an absolute point in time, a timeout is a duration that becomes a deadline when the call starts, and gRPC passes the remaining time to the next call as a timeout, not the absolute time, which avoids clock differences between machines.

A call with a 2 second deadline that has used 0.5 seconds sends 1.5 seconds downstream.

When the deadline passes, the client gets an error, and the server cancels the call, though the application code still has to notice and stop its work. Check the remaining time at each stage and drop work whose time has run out.

Envoy applies the idea to retries: its route timeout covers them together, so a 3 second timeout with a first attempt that took 2.7 seconds leaves 0.3 seconds for the rest.

## Which Failures to Retry

A retry is worth it when the next attempt can succeed and is safe to repeat. The guidance from the Builders' Library and Azure agrees:

- **Retry**: Temporary failures such as timeouts, HTTP 429, and 5xx errors from a server that may recover
- **Don't retry**: Errors that repeat, such as 400, 401, 403 and 404, which won't change
- **Obey the server**: If a response has a `Retry-After` header, wait at least that long
- **Retry safe operations**: Calls without side effects are typically safe, and a call with side effects needs an idempotency key, as in [Idempotency and Safe Retries](/system-design/idempotency), since a lost reply makes a retry run the request twice

The Builders' Library calls retries selfish: each one takes more of the server's time in return for a better chance of success. That is fine for the rare transient failure and harmful when the server is overloaded, where retries can delay recovery.

## Backoff and Jitter

Retrying at once is the worst choice, since the server that failed is still busy.

Waiting longer after each failure, **exponential backoff**, is better, and it has a flaw that a simple experiment shows: when many clients fail at the same moment, they back off by the same amounts and retry together again.

We repeated the experiment. 100 clients contend for one resource, in which one attempt succeeds in each time slot and the others fail. A base wait of 1 slot, doubling to a cap of 64:

| Retry Policy | Calls Made | Slots Until the Last Client Succeeds |
| --- | --- | --- |
| Retry Next Slot | 5,050 | 99 |
| Exponential, No Jitter | 5,050 | 6,078 |
| Full Jitter | 657 | 166 |
| Equal Jitter | 627 | 209 |
| Decorrelated Jitter | 760 | 192 |

Exponential backoff with no randomness made exactly as many calls as retrying at once, since the clients stayed in step, and it was far slower. Adding jitter cut the calls by 85 to 88 percent.

The blog's variants are full jitter, a random wait between 0 and the exponential value, equal jitter, half the value plus a random half, and decorrelated jitter, which bases the next wait on the previous one.

Full jitter used the least work, and equal jitter was the slowest of the three, which our run matches. Jitter is a cheap change that should be standard for remote clients.

Real libraries have it built in. gRPC applies plus or minus 20 percent to its backoff, so an initial backoff of 100 ms gives a first delay between 80 and 120 ms.

Envoy uses fully jittered exponential backoff from a 25 ms base, capped at 250 ms, with the first retry waiting 0 to 24 ms, the second 0 to 74 ms and the third 0 to 174 ms.

Waits of 2, 4 and 8 seconds plus jitter suit background work, and immediate or regular intervals for interactive work. Most AWS SDKs implement backoff with jitter in their standard retry mode.

## Limiting the Retries

Backoff spaces retries out. It doesn't limit them, and for that there are three tools:

- **A cap on attempts**: The Builders' Library prefers a limit on the number of retries and an earlier failure, over a long capped backoff, which retries forever at the cap
- **One layer**: A stack five layers deep with 3 retries at each makes 3 to the power of 5, or 243 calls to the database. Retry at one layer for cheap operations, as the library advises, and 3 retries at each of 2 layers gives 9 attempts
- **A budget**: Retries are allowed while a bucket of tokens lasts, and then proceed at a fixed rate. AWS added this to its SDK in 2016, and it is preferred to a circuit breaker, which adds behavior that is hard to test and can slow recovery

gRPC's retry throttling is an example: each server has a token count that starts at a maximum such as 10, each failure subtracts 1, each success adds a ratio such as 0.1, and retries pause while the count is below half of the maximum.

A reasonable budget is 60 retries a minute per process, or per dependency. When the budget is exhausted, the call fails at once.

A related idea is the hedged request, in which a second copy is sent after a short wait. gRPC supports it with a limit of 5 attempts, and the tail latency work quoted in the first topic of this phase measured a hedge after 10 ms cutting the 99.9th percentile of a large read from 1,800 ms to 74 ms for 2 percent more requests.

It needs the same care as a retry, since it adds load.

## Settings for the Textbook App

| Call | Timeout | Retries | Reason |
| --- | --- | --- | --- |
| Listing Search | 300 ms | 1, with jitter | No side effects, and a slow answer is worse than a retry |
| Reserve a Listing | 500 ms | 2, with a key | A write, so the key makes it safe |
| Charge the Buyer | 3 seconds | 2, with a key and a budget | The provider is slow, and a double charge is costly |
| Send the Receipt | 5 seconds | Until it works, by a queue | Not urgent, as in [Task Queues](/system-design/task-queues) |

The caller's deadline, of 4 seconds for a purchase, is passed on to each call, so a retry does not start when the buyer has already given up. The circuit breakers that come next, in [Circuit Breakers](/system-design/circuit-breakers), stop calls to a dependency that is known to be down.

## Key Points

- Put a timeout on each remote call, since many defaults are a missing limit or minutes, and choose it from the latency percentile that gives an acceptable false timeout rate
- In our test a 200 ms timeout with one retry cut the 99.9th percentile from 7.5 seconds to 267 ms for 1 percent more calls, when slowness is random for each attempt
- Pass a deadline down the call chain as the remaining time, and drop work when it has run out
- <u>Add jitter to exponential backoff</u>: 100 clients without jitter made as many calls as retrying at once, 5,050, and full jitter made 657
- Retry transient errors on safe operations, at one layer, with a cap and a budget, since retries multiply across the layers: 243 calls from 3 retries at 5 layers
