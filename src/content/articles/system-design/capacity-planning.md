> **Capacity planning** is the process of predicting the resources a workload needs to meet its performance targets, and having them ready before the demand arrives. It turns a forecast of demand into a number of servers, disks and connections, with room left for failures and surprises.

The textbook app had six servers for registration day, and the [Chaos Engineering](/system-design/chaos-engineering) experiment showed that the sixth was not a spare: at the 3,000 requests a second peak, five servers had no headroom left. Someone chose six, and the number came from somewhere or it came from nowhere.

Capacity planning is how the number comes from somewhere. It is the answer to a question that [Load Shedding and Graceful Degradation](/system-design/load-shedding) assumed was already settled: how much load will the service be asked to carry?

## The Three Jobs

Capacity planning covers two kinds of demand. **Organic growth** comes from natural adoption of the product, and **inorganic growth** comes from events such as feature launches and marketing campaigns. A plan needs three things:

- **An organic forecast**: Accurate, and reaching further ahead than the time it takes to get new capacity, the lead time
- **Inorganic demand included**: The launches, campaigns and business events that the trend line doesn't show
- **Regular load testing**: A test that connects raw capacity, such as servers and disks, to the service capacity users receive

Provisioning has to be done quickly and just when it is needed, since capacity is expensive, and it has to be done correctly, or the capacity isn't there when it is needed.

Both sides cost something: too little breaks the service, and too much wastes money, which is the subject of [Balancing Cost and Performance](/system-design/cost-performance).

Lead time is the part that moves with the platform. Traditional planning for hardware uses forecasts covering several quarters to years. In a cloud, instances arrive in minutes, but quotas, a database that can't be resized quickly, and a dependency with its own limits still have lead times of their own.

## From Demand to Servers

Work backward from the peak. For the textbook app:

| Step | Figure | How We Got It |
| --- | --- | --- |
| Peak Demand | 3,000 requests a second | Registration day at 9:00 AM |
| One Server Handles | 600 requests a second | A load test at the latency target |
| Servers for the Peak | 5 | 3,000 divided by 600 |
| Loss of One Server | 6 | The N plus 1 rule |
| Loss of Two Servers | 7 | The N plus 2 rule |

The 600 figure is the measurement that links raw capacity to service capacity. It comes from a load test, as in [Load Testing](/system-design/load-testing), not from the size of the machine.

The question: how many compute resources does a service need to serve a given number of user queries, and some services get that number from load tests and others infer it from past performance.

The N plus 1 and N plus 2 labels come from the same book. Its examples are intents such as meeting demand in each region with N plus 2 redundancy, and it notes that N plus 2 for one service may matter more than N plus 1 for another.

N is the number needed for the load, and the extra servers cover failures, as the chaos experiment did.

A second tool, from queueing theory, converts concurrency into numbers. Little's law says the average number of requests in the system equals the arrival rate times the time each spends there.

At 3,000 requests a second with a 50 ms response, about 150 requests are in flight, which is the number of connections or threads to plan for, as in [Bulkheads](/system-design/bulkheads).

## Why Not Run at 100 Percent

A server that is busy constantly has no room for a burst. Queueing theory says how fast the wait grows. For a single server fed by random arrivals, the M/M/1 model gives the mean time in the system as the service time divided by one minus the utilization:

| Utilization | Time in System, Compared With the Service Time |
| --- | --- |
| 50% | 2 times |
| 70% | 3.3 times |
| 80% | 5 times |
| 90% | 10 times |
| 95% | 20 times |
| 99% | 100 times |

With a 10 ms service time, a server at 90 percent utilization answers in 100 ms on average. These multiples come from queueing theory: for random arrivals at one server, the average time in the system is the service time divided by one minus the utilization.

Real services have many servers and many kinds of waiting, so we simulated the textbook fleet, 6 servers that each finish 600 requests a second, and measured the 99th percentile:

<figure class="chart">
<svg viewBox="0 0 420 262" role="img" aria-label="Line chart of 99th percentile latency in milliseconds against server utilization from 30 to 95 percent, for servers that each finish 600 requests a second. With one shared queue for 6 servers, latency rises from 7.7 ms to 24.9 ms. With a separate queue for each server, it rises from 11 ms to 142 ms, and climbs steeply above 80 percent." style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto">
<line x1="56" y1="196" x2="404" y2="196" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="56" y1="24" x2="56" y2="196" style="stroke:var(--border)" stroke-width="1.5"/>
<g font-size="11" style="fill:var(--muted)" text-anchor="end"><text x="50" y="200.0">0</text><text x="50" y="142.7">50</text><text x="50" y="85.3">100</text><text x="50" y="28.0">150</text></g>
<g font-size="11" style="fill:var(--muted)" text-anchor="middle"><text x="56.0" y="212">30%</text><text x="163.1" y="212">50%</text><text x="270.2" y="212">70%</text><text x="377.2" y="212">90%</text></g>
<text x="230.0" y="232" font-size="11" text-anchor="middle" style="fill:var(--muted)">Server Utilization</text>
<text x="14" y="110.0" font-size="11" text-anchor="middle" style="fill:var(--muted)" transform="rotate(-90 14 110.0)">99th Percentile (ms)</text>
<polyline points="56.0,187.2 163.1,187.1 216.6,186.9 270.2,186.5 323.7,185.1 350.5,183.3 377.2,179.3 404.0,167.4" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
<polyline points="56.0,183.4 163.1,178.2 216.6,173.6 270.2,165.7 323.7,149.8 350.5,135.5 377.2,105.4 404.0,33.6" fill="none" style="stroke:var(--text)" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"/>
<g font-size="12" font-weight="600"><line x1="68" y1="34" x2="98" y2="34" style="stroke:var(--accent)" stroke-width="2.5"/><text x="106" y="38" style="fill:var(--accent)">One Shared Queue</text><line x1="68" y1="54" x2="98" y2="54" style="stroke:var(--text)" stroke-width="2.5" stroke-dasharray="6 4"/><text x="106" y="58" style="fill:var(--text)">Queue for Each Server</text></g>
</svg>
<figcaption>The 99th percentile bends upward as utilization nears the limit, from our simulation of 6 servers that each finish 600 requests a second</figcaption>
</figure>

Two lessons. The curve is nearly flat and then it bends: with one shared queue, the 99th percentile was 9.5 ms at 80 percent and 24.9 ms at 95 percent, a flat stretch with a knee. And the layout of the queues matters.

When each server has a queue of its own and requests are sent at random, a request can wait behind a slow one while another server sits idle, and at 80 percent the 99th percentile was 40.3 ms, four times higher.

The shared queue is the best case, like a single line for the whole bank. A balancer that sends each request to a free or less busy server gets closer to it, as [Load Balancing Algorithms](/system-design/load-balancing-algorithms) discusses.

The target utilization comes from the knee of your own curve and your latency goal. There is no universal number, only a balance between the cost of too much and the harm of too little.

For the textbook app, we pick 80 percent from the knee of the curve, so the planning figure is 480 requests a second for each server.

| Step | Servers | Reason |
| --- | --- | --- |
| Peak Divided by 480 | 7 | 3,000 divided by 480 is 6.25, rounded up |
| One Extra for a Failure | 8 | N plus 1 on top of the target utilization |

The earlier number of 6 was the arithmetic at 100 percent utilization with no allowance. Our plan says 8 for the peak, and the rest of the year needs far fewer.

## Forecasting Demand

A method works. Collect history: utilization, performance data and the shape of the workload, with its peak hours, user load and transaction rates. Pick indicators, such as requests a second and database CPU. Then fit a trend with moving averages, regression or time series methods, and plan before the usage pattern changes.

Its examples are simple on purpose. A 10 percent yearly growth is extended forward, and a feature release that adds about 5 percent is planned as 5 percent.

A new workload with no history gets market research, expert judgment, a pilot or outside data. Plan for the regular spikes too, such as an 8:00 AM sign in rush, a marketing push, a season and a feature launch.

For the textbook app, a forecast looks like this. These figures are assumptions for illustration:

| Source | Effect on Next Year's Peak |
| --- | --- |
| This Year's Peak | 3,000 requests a second |
| Organic Growth, 10% | 3,300 |
| A Planned Campaign, 20% More Students | 3,960 |
| Servers at 480 Each, Plus One | 10 |

The campaign is inorganic demand, which no trend line shows, and so it comes from asking the people who plan it. The calendar matters too, since the semester starts twice a year and the peak is the first two days of it. A plan built from yearly averages misses both.

## Buying the Capacity

Capacity has more than one price. EC2 shows three options: On-Demand, paid by the hour or second with no commitment, Savings Plans, up to 72 percent cheaper in exchange for a usage commitment, and Spot, up to 90 percent cheaper, for capacity that can be taken back.

The figures are the provider's best case, and the page doesn't say how often each applies.

A common split follows from the shape of demand: commit to the steady baseline, rent the peak by the hour, and run interruptible work such as [Batch Processing](/system-design/batch-processing) on the cheapest capacity. The textbook app needs about 2 servers through the year and 8 for 10 peak days:

| Plan | Server Days a Year |
| --- | --- |
| Always 8 Servers | 2,920 |
| 2 Always, 6 More on the 10 Peak Days | 790 |

Both numbers are our arithmetic, in server days, before any discount, and the second plan needs a way to add servers fast, which is the next topic, [Autoscaling](/system-design/autoscaling).

## Checking the Plan

A plan is a prediction, so it needs the same treatment as any other. Load test it before the peak, as in the first table. Compare the forecast with what happened after each peak and correct the method.

Watch the headroom with the dashboards from [Alerting and Dashboards](/system-design/alerting), and alert before the limit is reached, not after. Azure's advice is to change the workload before a known limit becomes a performance problem.

Other limits fit the same method:

- **The database**: Connections, storage and write rate, which grow differently from web servers
- **Dependencies**: A payment provider or an email service with its own rate limit
- **Account quotas**: Cloud limits on instances and addresses, which have to be raised ahead of the peak
- **People**: The on-call rotation and the team that handles a launch

## Pitfalls

- **Planning to the average**: The peak is what breaks the service, so plan for it
- **Counting raw capacity**: A bigger machine is not a known number of requests until a test says so
- **No allowance for failure**: Capacity that is just enough at full health is short when a server is lost
- **Forgetting retries**: A slow dependency multiplies the load, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries)
- **A plan made once**: Growth and code change the numbers, so repeat the plan on a schedule

## Key Points

- Capacity planning predicts the resources a workload needs and has them ready, from an organic forecast, known inorganic events and a load test that ties servers to requests
- Work backward from the peak: 3,000 requests a second at 600 a server needs 5 servers, and a target utilization of 80 percent and a spare for a failure makes it 8
- <u>Don't plan for 100 percent utilization</u>: latency is flat and then bends, and in our simulation the 99th percentile was 9.5 ms at 80 percent and 24.9 ms at 95 percent with a shared queue
- The layout of the queues changes the curve: a queue for each server gave 40.3 ms at 80 percent, four times the shared queue
- Buy a baseline cheaply, rent the peak, and check the plan with load tests and each peak's actual numbers
