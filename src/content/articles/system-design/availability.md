> **Availability** is how much of the time, or how many of the requests, a system works when people need it. It is quoted in **nines**: 99.9% is three nines.

In [What is System Design?](/system-design/what-is-system-design), availability was one of the qualities, and its question was "Up at 9:00 AM on registration day?" This topic turns that question into numbers you can plan with.

## What the Nines Mean

Availability is the share of time a system is up:

`availability = uptime ÷ (uptime + downtime)`

Every extra nine cuts the allowed downtime to a tenth. The numbers look close together, but the downtime is not:

| Availability | Down per Year | Down per 30 Days | About as Long as |
| --- | --- | --- | --- |
| 99% | 3.65 days | 7.2 hours | A long weekend |
| 99.9% | 8.8 hours | 43 minutes | A working day, spread over a year |
| 99.99% | 53 minutes | 4.3 minutes | One TV episode |
| 99.999% | 5.3 minutes | 26 seconds | A coffee break |

Look at the right end of the table. At five nines a team has about 5 minutes a year, so even one slow recovery can use it all. Providers also count differently: some leave out planned maintenance, so check what an availability promise includes before comparing two of them.

## How It is Measured

Counting minutes works for a single machine, but a service with users everywhere is rarely fully up or fully down. Google's SRE book points out that time based availability usually isn't meaningful for global services, and that counting requests works better:

`availability = successful requests ÷ all requests`

If the textbook app handles 10 million requests in a month and 10,000 fail, its availability is 99.9%. A failure here means a response that is an error, and a team can choose to count very slow responses too. Counting requests also fits real life better: a one hour outage at 3 AM costs a few requests, and the same hour during registration costs a great many. The monthly average hides that difference, but your users feel it. The idea of an error budget built on this is in [SLIs, SLOs and Error Budgets](/system-design/slo).

## Parts Add Up

Availability is also a calculation across the parts of a system. In a chain where every part must work, the availabilities multiply. Where one working part is enough, the chances of failure multiply instead:

<figure class="diagram">
<p class="rowname">In a Chain: Every Part Must Work</p>
<div class="flow">
<div class="node">Load Balancer<small>99.9%</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Server<small>99.9%</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Database<small>99.9%</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Together<small>99.7%</small></div>
</div>
<p class="rowname">In Parallel: One is Enough</p>
<div class="flow">
<div class="stack">
<div class="node">Server A<small>99%</small></div>
<div class="node">Server B<small>99%</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Together<small>99.99%</small></div>
</div>
<figcaption>Three parts at three nines make 99.7%, about 26 hours a year, and two parts at two nines make four nines</figcaption>
</figure>

A chain is weaker than its weakest part, and a little weaker with every part you add. Ten dependencies at 99.9% each give about 99.0%, so every extra service a request calls costs a little availability. Copies work the other way: two servers that are each up 99% of the time are both down together only 1% times 1%, or 0.01%, of the time, which is 99.99%.

That second number comes with two conditions. The copies have to fail independently, because two servers in one rack that lose power together count as one. And something has to notice a failure and move traffic to the healthy copy, which is the subject of [Redundancy and Failover](/system-design/redundancy-failover). The extra machinery is itself something that can break.

## Failing Less or Fixing Faster

There are two ways to raise availability. Fail less often, or recover faster when failures happen. The formula uses the **MTBF**, the mean time between failures, and the **MTTR**, the mean time to repair:

`availability = MTBF ÷ (MTBF + MTTR)`

Say a service fails about once a month, so the MTBF is 720 hours:

| Change | MTBF | MTTR | Availability |
| --- | --- | --- | --- |
| As it is now | 1 month | 60 minutes | 99.86% |
| Fix it twice as fast | 1 month | 30 minutes | 99.93% |
| Fail half as often | 2 months | 60 minutes | 99.93% |

Halving the repair time is worth as much as doubling the time between failures, and it is often cheaper: better alerts, a tested rollback, a clear runbook. Neither is a full answer, though. A service that fails every week isn't saved by quick repairs. See [Health Checks](/system-design/health-checks) and [Incidents and Postmortems](/system-design/postmortems).

## How Many Nines Do You Need

A common rule of thumb is that each extra nine costs about ten times more to build and run, because it takes more copies, more automation and people on call around the clock. It is a rough guide, not a price list. So the question is what the downtime costs you. Compare an hour of downtime, in lost sales, idle staff and angry users, with the cost of the next nine. If an hour of downtime costs a few hundred dollars, five nines isn't worth it.

Three nines suits many services, and the higher levels tend to be reserved for infrastructure that other systems depend on, or for fields such as payments and healthcare. For the textbook app, an outage on registration day matters more than one on a Sunday night, so it can spend its effort on the days that count.

## Key Points

- Availability is the share of time, or of requests, that a system works, and it is quoted in nines
- Each nine cuts the allowed downtime to a tenth: 99.9% is about 8.8 hours a year, and 99.999% about 5 minutes
- Counting successful requests fits a global service better than counting minutes, and peak hours matter more than the monthly average
- <u>A chain multiplies its weaknesses</u>, and copies help only if they fail independently and failover works
- Faster repair is often as valuable as fewer failures, and cheaper
- Choose the number of nines by what an hour of downtime costs, not by how good the number sounds
