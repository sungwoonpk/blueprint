> A **bulkhead** divides a system's resources into separate pools, so that a failure or an overload in one part can't use up what the others need. The name comes from the watertight walls in a ship's hull, which keep a leak in one compartment from sinking the ship.

[Circuit Breakers](/system-design/circuit-breakers) stop a caller from calling a dependency that is known to be down. They need a few failures to notice, and during that time the damage is already spreading. The textbook app has a simpler weakness underneath: its calls share one pool of 100 threads.

When the payment provider hangs, calls to it hold threads for their full timeout, the pool fills with waiting calls, and a search request that doesn't touch payments finds no thread free.

The remedy is old and plain: give the payment calls their own pool, a small one. When the provider hangs, that pool fills and the payment calls are refused. The other 80 threads go on serving everything else.

## The Idea

The pattern partitions an application's elements into pools, so that a failure in one doesn't cascade to the rest, and it is related to cell-based architecture.

The partition can follow the consumer, by load and availability needs, or the dependency, with one connection pool for each downstream service. Its examples are a pool for each downstream service, one service instance for each client, and separate queues for asynchronous services.

It lists three benefits: isolation from cascading failures, preserved partial functionality, and different levels of service for different consumers. It also says to combine bulkheads with retries, circuit breakers and throttling for more sophisticated handling, since each covers something the others don't.

## How Much a Pool Saves

We simulated the textbook app with 200 requests a second, 100 threads, and 60 percent of the requests calling the payment provider. The provider hangs, and each call to it holds a thread for its 1 second timeout, while other calls take 20 ms.

In the shared design the 100 threads are common. In the bulkhead design, payment calls have 20 threads and everything else has 80:

| Design | Search and Listing Requests Answered |
| --- | --- |
| One Shared Pool of 100 Threads | 81% |
| A Pool of 20 for Payments, 80 for the Rest | 100% |

The payment calls need 120 threads to keep up with the hang, since 120 a second each hold a thread for a second, more than the whole pool. In the shared design they took the pool and 19 percent of the unrelated requests found no thread.

With the bulkhead, the damage stopped at the payment pool. The payment requests still failed, which is the right result when the provider is down, and the rest of the app didn't notice.

## Threads or Semaphores

Two ways to build the limit are common in the libraries, and they trade overhead against control:

| Property | Thread Pool Per Dependency | Semaphore |
| --- | --- | --- |
| How It Limits | Calls run on the pool's own threads | A counter of calls in flight |
| Timeout and Walking Away | The caller's thread can leave on timeout | The caller is stuck in the call |
| Cost | A thread handoff on each call | Almost none |
| Fits | Slow or unreliable network calls | Very fast, in memory calls |

Netflix's Hystrix used a thread pool for each dependency. Most of the Netflix API's 40 or more pools on each instance were set to 10 threads, in a range of 5 to 20, and when a pool is full, Hystrix rejects the call instead of queueing it.

The overhead was measured at 60 requests a second on one instance: none at the median, 3 ms at the 90th percentile and 9 ms at the 99th.

It also notes that a call that can't be interrupted keeps running after a timeout and can still saturate the pool, so clients need their own connect and read timeouts.

Semaphore isolation limits the number of concurrent callers and can't time out or walk away. A fast in memory call can do well over 5,000 requests a second with a semaphore of 1 or 2.

Resilience4j offers both. Its semaphore bulkhead has `maxConcurrentCalls` at 25 by default and `maxWaitDuration` at 0, so a caller doesn't wait when the bulkhead is full. Its thread pool bulkhead defaults to the number of processors for its maximum size, one less for its core size, a queue of 100 and a keep alive of 20 ms.

## Sizing the Pool

A pool needs the right size. Too large, and it doesn't isolate. Too small, and it refuses healthy traffic. Little's law gives the starting point: the number of calls in flight is the arrival rate times the time each takes.

The textbook app sends 120 payment calls a second, and each takes 20 ms, so about 2.4 threads are busy in normal times.

A pool of 20 is 8 times that, enough for a surge and small enough that a hang can't take much.

For database connections the advice is to go smaller than instinct says. The HikariCP wiki describes an Oracle performance demonstration in which cutting a pool from 2,048 connections to 96 lowered response times from about 100 ms to about 2 ms, with no other change.

The starting formula from the PostgreSQL project is connections equal to twice the core count plus the effective number of disk spindles, and HikariCP's default maximum is 10.

Its axiom is to keep the pool small and let the application threads wait for it. The waiting needs a limit of its own, and HikariCP's connection timeout defaults to 30 seconds, much longer than a user waits.

## Isolation at Other Levels

The same idea works wherever resources are shared:

- **Connection pools**: One for each downstream database or service, not one for the whole application
- **Queues**: A separate queue for each kind of work, so a backlog of one doesn't delay another, as in [Message Queues and Pub/Sub](/system-design/message-queues)
- **Instances**: A service instance for each large customer
- **Quotas for each customer**: One approach is to set a limit for each customer from negotiated agreements, so one team's heavy use can't exhaust the capacity of the others
- **The platform**: Kubernetes limits a container's CPU and memory

The platform level has its own details. Kubernetes enforces limits through Linux cgroups. A container that goes over its CPU limit is throttled, and one that exceeds its memory limit is likely to be killed, which shows as `OOMKilled` with exit code 137.

A ResourceQuota caps the total for a namespace, and requests that would exceed it are rejected with an HTTP 403.

Priority classes let important pods preempt less important ones when the cluster is full, and its default policy lets a pending pod evict lower priority pods. These limits don't isolate network or disk traffic, and they don't limit concurrency inside the application, so they complement the pools in the code.

The noisy neighbor problem is the symptom in multitenant systems: one tenant's heavy use degrades the others.

It suggests tracking use for each tenant, then limiting it, with quotas, throttling and rate limits, restricting expensive operations such as a cap on the records a query returns, moving non urgent work to off peak jobs, and moving heavy tenants to separate capacity.

## Shuffle Sharding

A bulkhead protects one kind of work from another. **Shuffle sharding**, described in the AWS Builders' Library, protects each customer from the others. Instead of putting a customer on one fixed group of workers, give each customer a random small subset.

With 8 workers and 2 for each customer, there are 28 possible pairs, so a customer who sends a poisonous request, or a flood, hurts at most 1 of the 28 groups.

With 4 plain shards of 2 workers, a bad customer takes out 25 percent of the others. We simulated 2,000 customers, with one of them bringing down its two workers:

| Placement | Customers With Both Workers Down | Customers With One Worker Down |
| --- | --- | --- |
| Four Plain Shards of Two Workers | 24.8% | 0% |
| Shuffle Sharding, Two of Eight | 4.0% | 46.9% |

About 47 percent of customers lost one of their two workers, and a client that retries finds the other, since any other customer shares at most one worker with the bad one.

Route 53 uses the same idea: 2,048 virtual name servers, 4 for each domain, which allows about 730 billion distinct shards, and no two domains share more than 2 of them. The number of combinations grows quickly: 5 workers out of 100 give 75,287,520, our arithmetic.

The next topic, [Cellular Architecture](/system-design/cells), takes the idea to the whole stack.

## The Costs

Isolation isn't free:

- **Idle capacity**: Separate pools can't share each other's spare threads, so some stay idle while another pool is full
- **Sizing and upkeep**: Each pool is a number to choose and keep right as traffic changes
- **More to configure and watch**: A pool for each dependency needs a metric and an alert, as in [Alerting and Dashboards](/system-design/alerting)

For the textbook app, three pools are enough: payments, search and everything else, with a rejected call counted as a metric and a circuit breaker on the payment calls so that, once the pool has done its job, the breaker stops the calls altogether.

## Key Points

- A bulkhead gives each dependency or customer its own pool of resources, so one hung or overloaded part can't take the rest down with it
- In our simulation, a shared pool left 81 percent of unrelated requests answered during a payment outage, and a pool of 20 for payments kept it at 100 percent
- <u>Size each pool from arrival rate times latency</u>, reject when it is full, keep database pools small, and put a limit on the waiting
- Isolation works at many levels: threads, connection pools, queues, instances, per customer quotas and platform limits such as Kubernetes requests and limits
- Shuffle sharding gives each customer a random small subset: 4.0 percent of customers were fully affected by one bad customer, against 24.8 percent with plain shards
