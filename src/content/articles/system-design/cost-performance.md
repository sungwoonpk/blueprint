> **Balancing cost and performance** means choosing the cheapest design that still meets the targets for speed, reliability and capacity, and knowing what each step past those targets costs. Better latency, another nine of availability and more headroom each have a price, and the price rises faster than the benefit.

The previous topics each asked for more servers. [Capacity Planning](/system-design/capacity-planning) put the textbook app at 8 servers for the peak, [Chaos Engineering](/system-design/chaos-engineering) showed that fewer left no room for a failure, and [Autoscaling](/system-design/autoscaling) added them on a schedule.

A teammate will ask a fair question at the next review: could 6 do? Or the opposite: could we make search twice as fast?

Both questions are about a price. This topic is about how to find it, and how to decide.

## A Low Cost Isn't the Goal

A cost optimized workload isn't necessarily a low cost workload. The aim is to spend just what is needed to reach the highest return, and not to design beyond planned growth, since that lowers the return.

In other words, the workload uses its resources fully, reaches the outcome at the lowest price and meets its functional requirements. The words that matter are the last ones. The requirements come first, and the cost is minimized under them.

That means the targets have to be written down before the arithmetic starts. [SLIs, SLOs and Error Budgets](/system-design/slo) gives the targets, and this topic prices them.

## What Speed Costs

We priced latency for the textbook app. At the peak of 3,000 requests a second, each server finishes 600 requests a second, requests arrive at random, and each server has its own queue. We simulated fleets of different sizes and measured the 99th percentile:

| Servers | Relative Cost | 99th Percentile at Peak |
| --- | --- | --- |
| 6 | 100% | 47.8 ms |
| 7 | 117% | 27.9 ms |
| 8 | 133% | 20.7 ms |
| 10 | 167% | 15.5 ms |
| 12 | 200% | 13.2 ms |
| 16 | 267% | 11.2 ms |

The first extra server cut the 99th percentile by 20 ms for 17 percent more cost. Going from 10 to 12 servers cut it by 2.3 ms for 20 percent more.

The curve flattens because the delay that remained is mostly the service time itself, which more servers can't shorten. The same effect appears in [Capacity Planning](/system-design/capacity-planning), where the latency bends upward as utilization nears the limit.

The right size depends on the target. If users need the 99th percentile under 100 ms, six servers meet it and the others add no speed. What they do buy is headroom for a failed server, a deploy or a surge, and that is a reliability purchase, not a speed one.

Google's work on tail latency shows the same tension at a larger scale: techniques exist to run a system at higher utilization without a longer latency tail, avoiding wasteful overprovisioning.

The reason a slow tail matters at scale shows in simple arithmetic of our own: if each server is slow 1 percent of the time and a request fans out to 100 servers, the chance that at least one is slow is 1 minus 0.99 to the 100th power, about 63 percent. At that scale a slow tail costs real money to avoid.

## What Reliability Costs

Reliability has a steep price. An incremental improvement may cost 100 times more than the previous one, and each additional nine is an order of magnitude closer to 100 percent. At 99.99 percent, the allowance is up to 52.56 minutes of downtime in a year.

| Availability | Downtime in a Year |
| --- | --- |
| 99% | About 87.6 hours |
| 99.9% | About 8.8 hours |
| 99.99% | About 52.6 minutes |
| 99.999% | About 5.3 minutes |

The rows are our arithmetic on the year's 8,760 hours.

A rule decides it. Take a service with revenue of 1 million dollars and propose to move from 99.9 to 99.99 percent, an improvement of 0.09 percent. The value is 1 million times 0.0009, or 900 dollars, so the improvement is worth doing if it costs less than that, and not otherwise.

For the textbook app, if we assume revenue of 200,000 dollars a year, the same nine is worth 180 dollars a year. Few designs that add a nine cost that little, and the error budget is the tool for spending the nines that remain.

Users also set a ceiling. A user on a 99 percent reliable phone can't tell 99.99 from 99.999 percent service.

Paying for less can be right too: a throughput oriented Bigtable cluster can cost as little as 10 to 50 percent of a low latency one, and ads that may be hundreds of milliseconds slower can be served from fewer locations, at lower cost.

Redundancy follows the same logic. Disaster recovery options come in order of price. A hot, active-active setup is the most expensive and recovers fastest. A cold one keeps just backups and images. One that redeploys from code costs little while idle and takes the longest to recover. [Backups and Disaster Recovery](/system-design/backup-dr) covers the choice with recovery times attached.

## Spending to Save

Some spending lowers the bill. A cache is the usual case, since it takes reads away from the most expensive part of the system. For the textbook app, assume the database serves 1,000 reads a second per server, and 3,000 reads a second arrive at the peak:

| Cache Hit Ratio | Reads Reaching the Database | Database Servers |
| --- | --- | --- |
| 0% | 3,000 | 3 |
| 50% | 1,500 | 2 |
| 80% | 600 | 1 |
| 95% | 150 | 1 |

These figures are our arithmetic, and they leave out the spare server each tier would need for a failure. The cache itself costs a server or more, so the saving is the difference.

The point holds beyond caching: a queue that flattens a peak, a design from [Caching Patterns for Reads and Writes](/system-design/caching-patterns) that avoids a hot query, and an index that avoids a scan each spend a little to save a lot.

## Usage and Rate

The work splits in two. **Usage optimization** means using fewer resources to get an acceptable outcome, and **rate optimization** means paying a fair price for the resources that are needed. Usage generally comes first, since a commitment discount lowers the price of running resources and does not reduce how many are running.

The usage levers match this phase's topics:

- **Right sizing**: watch CPU, memory and storage, find low or uneven use, and shrink what is over allocated
- **Scaling to demand**: [Autoscaling](/system-design/autoscaling) removes the capacity that the peak needed once it has passed
- **Waste**: decommission unused resources and delete data that is no longer needed
- **Environments**: non production environments can use fewer and smaller instances, and be created on demand, though they should still resemble production for the tests that matter

The rate levers are commitments for the steady baseline and cheaper interruptible capacity for work that can be stopped, as in the purchase options of [Capacity Planning](/system-design/capacity-planning).

## Measuring

A bill says how much was spent, and no more. The FinOps framework adds unit economics, which relate spending to the value it creates, with metrics such as cost per transaction, cost per tenant or cost to serve. Its own worked example is cost per API call: 1,200 dollars over 240,000 calls is 0.005 dollars a call.

For the textbook app, suppose the monthly bill is 1,800 dollars and the app serves 360 million requests. That is 0.005 dollars for each 1,000 requests.

A rising figure over time means cost is growing faster than the use it supports, and a falling one after an optimization is the proof that it worked. Both numbers are our assumptions.

Two supports make the figure useful. Allocation, using accounts and tags, shows which team and which feature a cost belongs to, which fits the FinOps principle that each team owns its technology use. And alerts on anomalies against a trend catch a runaway scaling group early.

The framework's three phases form a loop: inform, to see the cost and its allocation, optimize, to choose the changes, and operate, to carry them out and keep watching. The principles stress that teams collaborate, that business value drives technology decisions, and that cost data is timely and accurate.

## Deciding

For each choice, write down what it buys and what it costs, then compare against the targets:

| Choice | What It Buys | What It Costs |
| --- | --- | --- |
| One Spare Server at Peak | Survives a server loss | 1 server for the peak days |
| A Cache | Lower database load and latency | The cache nodes and staleness |
| Two Zones, Not One | Survives a zone loss | A second set of capacity |
| Cells | A smaller blast radius | Duplicated minimums, as in [Cellular Architecture](/system-design/cells) |
| Another Nine | A smaller yearly downtime | Often 10 times the cost |

Then pick the point where the next step costs more than it returns, and revisit when traffic or prices change. A decision recorded with its numbers is easy to review.

## Pitfalls

- **Cutting below the requirement**: saving money by dropping the spare server, a saving the first outage can erase
- **Over buying a nine**: reliability that users can't see and the revenue doesn't repay
- **Optimizing the rate first**: a three year commitment for capacity that waste hasn't been removed from
- **A bill without allocation**: a total that no team feels responsible for
- **Forgetting the people**: engineering time to run a complex design is a cost too
- **Measuring once**: prices and traffic move, so the plan needs a review on a schedule

## Key Points

- Balancing cost and performance means meeting written targets at the lowest price and pricing each step beyond them
- In our simulation, going from 6 to 7 servers cut the 99th percentile from 47.8 ms to 27.9 ms for 17 percent more cost, while 10 to 12 servers cut 2.3 ms for 20 percent more
- <u>Each extra nine of availability costs about ten times more</u>, and the rule is to buy it when the revenue it protects is larger than the cost
- Some spending saves money: a cache that cut database servers from 3 to 1 in our arithmetic, and usage savings such as right sizing and autoscaling come before rate discounts
- Measure with unit economics, such as cost per 1,000 requests, and allocate cost to the teams that cause it
