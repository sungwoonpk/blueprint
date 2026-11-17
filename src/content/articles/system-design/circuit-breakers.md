> A **circuit breaker** sits between a caller and a dependency, and counts failures. When too many calls fail, it **opens** and rejects calls at once, without trying the dependency, and after a pause it lets a few trial calls through to see whether the dependency has recovered.

The textbook app calls a payment provider. One afternoon the provider hangs, and each call waits for its 1 second timeout before failing. The app has 100 threads, so within a second or two they are waiting on the provider, and the pages that don't use payments, such as the search, can't get a thread either.

A timeout bounds each call. It doesn't stop the app from making the calls, one after another, to a service that is known to be down.

[Timeouts, Retries and Backoff](/system-design/timeouts-retries) ended on this gap. A circuit breaker fills it: after enough failures, stop calling.

## Three States

Michael Nygard described the pattern in *Release It!*, named after the switch in an electrical panel:

<figure class="diagram">
<div class="flow">
<div class="node">Closed<small>calls go through</small></div>
<div class="arrow" data-label="too many failures" aria-hidden="true"></div>
<div class="node lost">Open<small>calls are rejected</small></div>
<div class="arrow" data-label="after a pause" aria-hidden="true"></div>
<div class="node wait">Half Open<small>a trial call</small></div>
</div>
<figcaption>A successful trial closes the breaker, and a failed trial opens it again for another pause</figcaption>
</figure>

- **Closed**: Calls pass through, and the breaker counts the failures. When they pass a threshold, it opens
- **Open**: Calls fail immediately, with an error or a fallback. After a reset timeout, it moves to half open
- **Half open**: A limited number of trial calls go through. If they succeed, the breaker closes, and if one fails, it opens again and restarts the timer

Fowler's example in Ruby trips after 5 failures. He also mentions a more refined rule, such as tripping at a 50 percent failure rate, and different thresholds for different errors, such as 10 for timeouts and 3 for connection failures.

## What the Libraries Use

The numbers in real libraries show how the knobs are set:

| Setting | Hystrix | Resilience4j |
| --- | --- | --- |
| Minimum Calls Before It Can Trip | 20 in a 10 second window | 100 |
| Failure Rate That Trips It | 50% | 50% |
| Window | 10 seconds, in 10 buckets | The last 100 calls, or a time span |
| Time Open Before a Trial | 5,000 ms | 60,000 ms |
| Trial Calls | 1 | 10 |

Resilience4j also trips on slow calls: its slow call threshold is 60,000 ms by default, and its slow call rate is 100 percent, so slowness doesn't trip it unless the defaults are changed.

Hystrix, Netflix's library, adds an execution timeout of 1,000 ms and a thread pool of 10 threads for each dependency by default. With 19 requests, the circuit doesn't trip even if each one fails, since the minimum volume of 20 hasn't been reached.

The minimum volume matters. With 2 calls in a window and 1 failure, the failure rate is 50 percent, and a breaker that trips on that would flap on any quiet service.

## Watching It Work

We simulated the textbook app: 200 requests a second, 100 threads, 80 percent of requests need the payment provider and the rest don't.

The provider is down for 60 seconds, and a call to it holds a thread for the 1 second timeout. The breaker uses Hystrix's defaults, 20 calls in 10 seconds, 50 percent and a 5 second pause, with one trial call:

| Measure | No Breaker | Breaker |
| --- | --- | --- |
| Pages Without Payments Answered During the Outage | 63% | 95% |
| Calls Made to the Failing Provider | 5,925 | 667 |
| Requests Rejected by the Open Breaker | 0 | 8,615 |
| Payment Requests Answered in the 30 Seconds After Recovery | 100% | 82% |
| First Success After the Provider Returns | Immediately | 5.6 seconds |

Without the breaker, threads piled up behind the hung calls, and 37 percent of the requests that didn't even need the provider were refused. With it, the app sent 91 percent fewer calls to the provider and kept the unrelated pages up.

The price is in the last two rows: a breaker that is open doesn't know the provider is back until the next trial, so recovery came up to 5 seconds late, and the payment requests in that gap failed fast.

That trade is the whole design. A short pause recovers sooner and tests the dependency more often, which adds load at the worst time. A long pause is gentle and leaves users with errors after the dependency has healed.

## What Counts as a Failure

The breaker is as good as its definition of failure. Several points need a decision:

- **Which errors count**: Timeouts, connection failures and 5xx responses count, and a 404 or a validation error is the caller's mistake, so it should not open the breaker
- **Slow calls**: A dependency that answers in 10 seconds is failing for the caller, and Resilience4j can count calls above a duration
- **Throttling signals**: A response that says "retry in a few minutes", such as HTTP 429 or 503, can open the breaker at once for that time, sometimes called accelerated circuit breaking
- **Weights**: Some errors can count more than others, as in Fowler's thresholds of 10 and 3

Use one breaker for each dependency, or each independent part of it, such as each provider or shard, not one for a whole service. A single breaker across two payment providers stops both when one fails.

## Around the Breaker

An open breaker needs a plan for the callers. Fowler suggests a fallback: queue the work, show stale data or offer a degraded answer. For the textbook app, a payment that can't be taken is queued and shown as pending, as in [Sagas](/system-design/sagas), and the buyer is told.

Operations need to see it. Log each state change, expose the state in metrics, alert when a breaker trips, and give operators a way to force it open or closed.

The half open check can be a health probe and not a real request, so no user's request is spent on the test, and that rejected requests can be journaled and replayed later.

## At the Edge of the Cluster

Proxies apply the idea to individual servers. Envoy's **outlier detection** ejects a host from the load balancing pool after consecutive failures. Its defaults:

| Setting | Default |
| --- | --- |
| Consecutive 5xx Responses to Eject | 5 |
| Base Ejection Time | 30 seconds, multiplied by the number of times it has been ejected |
| Longest Ejection | 300 seconds |
| Largest Share of Hosts Ejected | 10% |
| Check Interval | 10 seconds |

The limit of 10 percent is a safety valve: if each host looks bad, the cause is probably shared, and ejecting the whole pool would turn a partial failure into a total one.

Envoy also has settings it calls circuit breakers that are limits on connections, pending requests and retries, covered in [Cascading Failures](/system-design/cascading-failures), which work as protection and not as a state machine.

## The Case Against

Not everyone likes them. The Amazon Builders' Library notes that circuit breakers are widely promoted and add modal behavior, a system that acts one way when closed and another when open, which is hard to test and can slow recovery.

It prefers a local token bucket for retries, which throttles retries without a state machine. Our simulation's 5.6 seconds of delay is the cost it means.

Another way is **adaptive throttling**. Each client keeps two counts over the last 2 minutes: the requests it attempted and the requests the backend accepted.

Once the requests exceed K times the accepts, with K at 2 by default, the client rejects new requests itself with a probability that rises as the gap grows, so the backend sees fewer calls and recovers.

A lower K, such as 1.1, throttles more aggressively. There is no open state and no timer. Clients keep separate statistics for each criticality level, so important requests are throttled last.

The mechanisms fit together:

| Mechanism | Protects Against |
| --- | --- |
| Timeout | A call that waits too long |
| Retry With Backoff | A transient failure |
| Circuit Breaker | Calling a dependency that is down |
| Bulkhead | One dependency taking the whole pool of threads |
| Adaptive Throttling | Overloading a dependency that is struggling |

## Pitfalls

- **An untested open path**: The fallback runs rarely, so test it, and trip a breaker on purpose in a game day
- **A herd at the close**: When a breaker closes, the whole waiting backlog arrives at once, so let in a few trial calls, as Resilience4j's 10, and ramp up
- **Counting your own rejections**: A breaker that counts the calls it rejected as failures can't close
- **One breaker for everything**: It hides which dependency is the problem

## Key Points

- A circuit breaker counts failures while closed, rejects calls while open, and tests with a few calls while half open
- Defaults such as 50 percent failures, a minimum of 20 calls and a pause of 5 seconds, show the knobs: threshold, minimum volume, window and pause
- <u>An open breaker protected the rest of the app</u> in our test, sending 91 percent fewer calls to the failing provider and keeping 95 percent of unrelated pages up, and cost up to 5.6 seconds of delay in recovery
- Decide what counts as a failure, use one breaker for each dependency, and provide a fallback and monitoring
- Proxies eject bad hosts with outlier detection, capped at 10 percent, and adaptive throttling is a stateless alternative
