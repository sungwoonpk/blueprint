> **Latency** is how long one request takes. **Throughput** is how many requests the system finishes each second. They sound alike but move independently, and mixing them up leads to fixing the wrong thing.

In [The Life of a Request](/system-design/life-of-a-request), one request took 300 ms from start to finish. That number is its latency. This topic is about what happens when many requests arrive at once, and how to measure both sides honestly.

## A Road, Not a Race

Picture a highway:

| On a Highway | In a System | Measured In |
| --- | --- | --- |
| How long one car takes to get from A to B | Latency | Milliseconds |
| How many cars pass per hour | Throughput | Requests per second, or megabytes per second |
| How many lanes there are | Bandwidth, the most the pipe could carry | Megabytes per second |

Throughput is what you actually get, so it is at or below the bandwidth. And adding lanes doesn't shorten anyone's trip. In the same way, adding servers, from [From One Server to Many](/system-design/one-server-to-many), lets you finish more requests per second, but one request isn't any faster.

## Averages Hide the Slow Ones

Suppose 100 requests arrive. 98 take 100 ms and 2 get stuck for 5 seconds:

| Measure | Value | What It Says |
| --- | --- | --- |
| Average | 198 ms | Looks fine |
| Median, or p50 | 100 ms | The typical request |
| p99 | 5,000 ms | At least 1 request in 100 takes this long |

The average hides the two unhappy users. So latency is reported in **percentiles**: p50 is the middle, p95 is the time that 95 out of 100 requests come in at or under, and p99 is the time that 99 out of 100 do. Look at p95 or p99 when you care about the worst experiences.

One more catch: percentiles from different servers can't be averaged together. Combine the raw measurements first, then work out the percentile.

## Slow Calls Add Up

A call that is slow 1% of the time sounds rare. But one page often needs many calls to the services behind it, all of which have to finish before the page can load. Say each call has a 1% chance of being slow:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>1 call</span><span class="track"><span class="fill" style="--w: 1.6%"></span></span><span class="value">1%</span></div>
<div class="hbar"><span>10 calls</span><span class="track"><span class="fill" style="--w: 15.1%"></span></span><span class="value">10%</span></div>
<div class="hbar"><span>50 calls</span><span class="track"><span class="fill" style="--w: 62.3%"></span></span><span class="value">40%</span></div>
<div class="hbar peak"><span>100 calls</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">63%</span></div>
</div>
<figcaption>Chance that a page load meets at least one slow call</figcaption>
</figure>

The chance of meeting at least one slow call is 1 minus 0.99 to the power of the number of calls. With 100 calls, a rare 1% slowness reaches 63% of page loads. This is the tail latency effect described in Google's "The Tail at Scale" paper.

It assumes slow calls are independent, so read it as an illustration, not a forecast. Still, the tail of a backend becomes the typical experience of the front end, which is one reason to cut the number of calls a request makes.

## Load Makes Everything Slower

Even a healthy server slows down when it gets busy, because requests start to wait in line behind each other. In the simplest queueing model, a request's time is its idle time multiplied by 1 divided by the share of free capacity:

<figure class="chart">
<svg class="line" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Response time stays close to its idle value until the server is about 70 percent busy, then climbs steeply: about twice the idle time at 50 percent, 5 times at 80 percent, 10 times at 90 percent and 20 times at 95 percent">
<line class="grid" x1="0" y1="40" x2="100" y2="40"></line>
<path class="area" d="M0 40 L2.1 40 L4.2 39.9 L6.2 39.9 L8.3 39.8 L10.4 39.8 L12.5 39.7 L14.6 39.7 L16.7 39.6 L18.8 39.6 L20.8 39.5 L22.9 39.4 L25 39.4 L27.1 39.3 L29.2 39.2 L31.2 39.2 L33.3 39.1 L35.4 39 L37.5 38.9 L39.6 38.8 L41.7 38.7 L43.8 38.6 L45.8 38.5 L47.9 38.3 L50 38.2 L52.1 38 L54.2 37.9 L56.2 37.7 L58.3 37.5 L60.4 37.3 L62.5 37.1 L64.6 36.8 L66.7 36.5 L68.8 36.2 L70.8 35.9 L72.9 35.5 L75 35 L77.1 34.5 L79.2 33.9 L81.2 33.2 L83.3 32.4 L85.4 31.4 L87.5 30.1 L89.6 28.6 L91.7 26.5 L93.8 23.7 L95.8 19.7 L97.9 13.3 L100 2 L100 40 L0 40 Z"></path>
<path class="stroke" d="M0 40 L2.1 40 L4.2 39.9 L6.2 39.9 L8.3 39.8 L10.4 39.8 L12.5 39.7 L14.6 39.7 L16.7 39.6 L18.8 39.6 L20.8 39.5 L22.9 39.4 L25 39.4 L27.1 39.3 L29.2 39.2 L31.2 39.2 L33.3 39.1 L35.4 39 L37.5 38.9 L39.6 38.8 L41.7 38.7 L43.8 38.6 L45.8 38.5 L47.9 38.3 L50 38.2 L52.1 38 L54.2 37.9 L56.2 37.7 L58.3 37.5 L60.4 37.3 L62.5 37.1 L64.6 36.8 L66.7 36.5 L68.8 36.2 L70.8 35.9 L72.9 35.5 L75 35 L77.1 34.5 L79.2 33.9 L81.2 33.2 L83.3 32.4 L85.4 31.4 L87.5 30.1 L89.6 28.6 L91.7 26.5 L93.8 23.7 L95.8 19.7 L97.9 13.3 L100 2"></path>
</svg>
<div class="axis"><span>Idle</span><span>50% busy</span><span>90% busy</span></div>
<figcaption>Response time as a server gets busier, relative to its idle time</figcaption>
</figure>

At 50% busy a request takes about twice its idle time, at 80% about five times and at 90% about ten times. This is the chart from [From One Server to Many](/system-design/one-server-to-many), where response time stayed flat and then shot up. Real servers are less tidy than the model, and bursts make the curve worse, but the shape holds.

That is why a server with room to spare behaves very differently from one running at 90%, and why teams plan for a margin at peak. See [Capacity Planning](/system-design/capacity-planning) and [Load Shedding and Graceful Degradation](/system-design/load-shedding).

## How Many Requests Are in Flight

The two numbers also fix a third one, how many requests are being handled at the same moment. This is **Little's Law**, and it holds for the averages of any steady system:

`requests in flight = requests per second × seconds per request`

| Requests per Second | Seconds per Request | Requests in Flight |
| --- | --- | --- |
| 1,000 | 0.2 | 200 |
| 1,000 | 0.8 | 800 |

If latency rises to 0.8 seconds at the same traffic, four times as many requests are in flight. A connection pool sized for 200, like the ones in [TCP and UDP](/system-design/tcp-udp), is suddenly too small, requests queue up, and latency rises again. This is how one slow dependency can bring down a healthy service.

## Improving One Without the Other

Different tools help each side:

| To Lower Latency | To Raise Throughput |
| --- | --- |
| Cache the answer, as in [From One Server to Many](/system-design/one-server-to-many) | Add servers behind a load balancer |
| Move servers closer to users | Batch work together |
| Reuse connections and cut round trips | Do slow work in the background with a queue |
| Make the code or the query faster | Work on several requests in parallel |

Some choices trade one for the other. Batching raises throughput because the fixed cost of an operation is shared, but the first item waits for the batch to fill, the dial from [Thinking in Tradeoffs](/system-design/trade-offs). So decide what matters for each path: a page a person waits for wants low latency, and a nightly job wants throughput.

A practical target joins them: pick a latency goal, such as p99 under 300 ms, and find how much traffic the system carries while staying under it. See [SLIs, SLOs and Error Budgets](/system-design/slo) and [Load Testing](/system-design/load-testing).

## Key Points

- Latency is how long one request takes, throughput is requests finished per second, and bandwidth is the most the pipe could carry
- Averages hide the slow requests, so look at p95 and p99
- <u>Slow calls add up</u>: a 1% slow call hits 63% of requests that make 100 of them
- Response time climbs steeply as a server gets busy, so keep a margin at peak
- Requests in flight equals requests per second times seconds per request, which is how to size pools
- Caches and closer servers lower latency, more servers and batching raise throughput, and batching can cost latency
