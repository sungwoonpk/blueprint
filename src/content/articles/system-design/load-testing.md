> A **load test** sends controlled, realistic traffic at a service to learn how it behaves under that traffic: how much it carries, how its latency changes as the load rises, where it breaks, and how it fails.

[Capacity Planning](/system-design/capacity-planning) rested on one measurement: a server handles 600 requests a second at the latency target. A plan built on that number is as good as the test that produced it, and no better.

A test that is easy to run and quietly wrong gives a plan that fails on registration day, at 9:00 AM, with 3,000 requests a second.

This topic covers how to run a test that tells the truth. The hardest part isn't the tool. It is the model of the users that the tool uses.

## Kinds of Tests

There are six kinds, which differ in load shape and in the question they ask:

| Test | Load Shape | The Question |
| --- | --- | --- |
| Smoke | Low, for a short time | Do the test and the system run? |
| Load | Average production load, 5 to 60 minutes | Does it hold its performance under normal use? |
| Stress | Above average, 5 to 60 minutes | How does it behave when the load is higher than usual? |
| Soak | Average load, for hours | Does it survive long, continuous use? |
| Spike | Very high, for a few minutes | Can it take a sudden surge? |
| Breakpoint | Rising until it breaks | Where is the upper limit? |

Three pieces of advice. Start with a smoke test, then move to the larger patterns. Keep the shape simple: ramp up, hold a plateau, and ramp down, since a rollercoaster pattern is hard to interpret.

And remember that the names are relative: a stress test for one application is an average load test for another. It also says that no single type removes the whole risk.

The textbook app needs most of them. A load test at the usual daytime rate, a spike test shaped like 9:00 AM on registration day, a breakpoint test to find the limit of one server, and a soak test overnight to find a memory leak.

## Who Sends the Requests

A load generator can behave in two ways, and the choice changes the results. They are:

- **Closed model**: A fixed number of virtual users each send a request, wait for the response, and send the next. The speed of the system sets the rate of the test
- **Open model**: New requests arrive at a set rate, whether or not earlier ones have finished. The test sets the rate, as real users do

In k6, the constant virtual users executor is a closed model, and the arrival rate executors are the open ones. Gatling has the same split, with separate calls for injecting users at a rate, or keeping a constant number of concurrent users.

Take an endpoint that takes about 6 seconds: one closed virtual user completes about 10 iterations in a minute, while an open test at 1 a second starts 60, with the pool of virtual users growing to keep up.

Real traffic is open. Students don't wait for one another's requests to finish before they open the app. A closed test has a built in brake: when the service slows down, the virtual users slow down with it, and the test sends less load exactly when the service is struggling.

## Coordinated Omission

The effect has a name. Gil Tene, who studied it, described the problem as the measuring system inadvertently coordinating with the system being measured, and so it misses sending requests.

A closed loop waits during a stall, so the slow period gets few samples, and the measured percentiles look far better than what real users would see.

The sources give numbers:

- **wrk2**: In its README example, a pause of 1.4 seconds gave a 99th percentile of 6.04 ms uncorrected and 1.27 seconds corrected, about 200 times higher
- **ScyllaDB**: In a database test, the read 99th percentile was 647 microseconds uncorrected and about 665 milliseconds when measured from the intended time
- **Red Hat**: A call center analogy, in which testers measured an average of 0.6 minutes while customers experienced 1.9 minutes, since the testers didn't count the wait of callers during a 10 minute outage

We reproduced the effect with a service that can finish 1,000 requests a second, stalled for 2 seconds at the 30 second mark of a 120 second test:

| Test Style | 99th Percentile | Slowest Request |
| --- | --- | --- |
| Closed, 8 Virtual Users | 16 ms | 2,008 ms |
| Open, 800 Requests a Second | 1,755 ms | 2,003 ms |

The closed test saw the stall in 8 requests, the ones in flight, and reported a healthy 99th percentile.

The open test kept sending on schedule, so about 1,600 requests waited behind the stall, and it reported what a user would have felt. The slowest request is almost the same in both, which is why the maximum alone doesn't show the problem.

The fix is in how latency is measured, and the formula is: the latency of a request is the time now minus the time it was meant to be sent, plus the service time.

Use a generator with a constant rate and measure from the intended send time, as wrk2 does, or use the arrival rate executors in k6. Red Hat suggests a quick check: pause the generator for a few seconds, resume, and see whether it sent the number of requests it should have.

## Finding the Breaking Point

The same simulated service, driven by an open test at rising rates, shows the limit:

| Offered Rate | 99th Percentile | Requests Over 1 Second |
| --- | --- | --- |
| 400 a Second | 7 ms | 0% |
| 700 a Second | 13 ms | 0% |
| 900 a Second | 36 ms | 0% |
| 1,000 a Second | 144 ms | 0% |
| 1,100 a Second | 1,995 ms | 46% |
| 1,400 a Second | 7,988 ms | 87% |

Latency is nearly flat until 900, bends at 1,000 and collapses past capacity, as the queue grows without limit. If the goal is a 99th percentile under 100 ms, the usable rate for this service is about 900 requests a second, 90 percent of its capacity, and the planning figure would be set there.

The curve matches the shape in [Capacity Planning](/system-design/capacity-planning) and the collapse that [Load Shedding and Graceful Degradation](/system-design/load-shedding) was built to avoid.

A closed test of the same service looks very different. With 10, 50 and 200 virtual users, the throughput stayed at about 1,000 requests a second and the 99th percentile rose from just 19 to 68 to 233 ms, with no request over 1 second.

The test can't push past the limit, so it doesn't show the collapse. It measures the capacity of the service, which is useful, but not what happens when real demand exceeds it.

## Making the Test Realistic

A test is a model, and the model has to match the traffic:

- **The mix**: The share of searches, views and purchases, with the same proportions as production
- **Popular items**: Real traffic hits a few popular books far more than the others, which a uniform random test hides from caches and from [Handling Hot Spots and Celebrity Users](/system-design/hot-spots)
- **Data volume**: A database with 3 million listings behaves differently from one with 3,000
- **Caches**: A cold cache and a warm cache give different numbers, so warm up first and test the cold start separately
- **The dependencies**: Replace the payment provider with a stub that has a realistic delay, and don't call real services that charge money or have their own limits
- **Connections and think time**: Real users keep connections open, pause and leave, and new clients bring the cost of a new connection
- **The environment**: The same configuration, instance types and settings as production, since a smaller copy can mislead

Environments matter too: testing is often said to belong in a hermetic environment, and production usually isn't hermetic. A test environment can't reproduce each detail, which is one reason the experiments in [Chaos Engineering](/system-design/chaos-engineering) also happen in production.

The generator itself can be the weak point. A single machine may run out of CPU or connections before the service does, and then the test measures the generator. Watch its resource use, and spread the load over several machines.

## Running a Test

A routine for the textbook app:

1. **Smoke test**: A few requests, to prove the test and the system work
2. **Ramp**: Raise the rate in steps of 5 to 10 minutes, long enough to settle
3. **Plateau**: Hold the target rate, and record latency, errors and resource use
4. **Push past it**: Keep going to find the breaking point and watch how the system fails
5. **Recover**: Drop the load and see whether latency returns to normal, as in the metastable failures covered in [Cascading Failures](/system-design/cascading-failures)
6. **Change one thing, repeat**: A new setting, a bigger instance or a cache, and compare against the first result

During each run, read the dashboards from [Logs, Metrics and Traces](/system-design/observability), since the result isn't just the client's numbers. The question is which resource saturates first: CPU, the connection pool, the database, a lock or the network. That resource is what to fix, and it sets the next limit.

Run the load test again after each large change and before each known peak, and keep the results, so that a slow drift in capacity shows up. A test that runs in the delivery pipeline on each release catches a regression when it is cheap to fix.

## What the Results Feed

The numbers connect to the rest of the phase:

- **Capacity**: The rate for each server at the latency goal gives the figure in [Capacity Planning](/system-design/capacity-planning)
- **Settings**: Timeouts, pool sizes and shedding thresholds from [Timeouts, Retries and Backoff](/system-design/timeouts-retries) and [Bulkheads](/system-design/bulkheads) should be set from measured latencies and checked in a stress test
- **Autoscaling**: The trigger and the speed of [Autoscaling](/system-design/autoscaling) are tested by a spike
- **Cost**: A faster service needs fewer servers, the trade in [Balancing Cost and Performance](/system-design/cost-performance)

## Pitfalls

- **A closed loop for a spike**: It can't send more than the service finishes, and so can't show overload
- **Averages**: Report percentiles from the intended send time, and the rate of errors
- **A test that is too short**: Memory leaks and slow queues take hours, and the soak test is for them
- **A stubbed dependency that is too fast**: The service looks better than it is when each call returns at once
- **One run**: The results vary, so repeat the run and compare
- **Testing a copy of the wrong size**: A test on one small instance says little about 6 large ones behind a balancer

## Key Points

- A load test measures how a service behaves under traffic, and the kinds differ in shape: smoke, load, stress, soak, spike and breakpoint
- Real users are open: they arrive at a rate and don't wait for others, so use a constant arrival rate generator and measure from the intended send time
- A closed loop slows down with the service, and coordinated omission hides the stall: in our simulation a 2 second stall gave a 99th percentile of 16 ms closed and 1,755 ms open
- <u>Push past the limit to find the breaking point</u>: in our test latency was flat to 900 requests a second, bent at 1,000 and collapsed at 1,100, with 46 percent of requests over 1 second
- Make the model realistic with the traffic mix, popular items, data volume, caches and stubbed dependencies, and check that the generator isn't the bottleneck
