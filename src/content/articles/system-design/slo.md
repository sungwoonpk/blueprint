> A **service level indicator**, or SLI, is a measurement of how well a service is doing, such as the share of requests that succeed. A **service level objective**, or SLO, is a target for that measurement, such as 99.9 percent over 28 days. The **error budget** is what the target leaves over: the amount of failure the service may have and still meet it.

[Logs, Metrics and Traces](/system-design/observability) gave the textbook app numbers about itself. Numbers need a verdict.

Is a 99th percentile of 400 ms good? Is an error rate of 0.3 percent a problem? Without an agreed target, each engineer answers by instinct, and a team can spend a month making the site faster when students were fine with it, or ship features while the checkout quietly decays.

SLOs turn the question into arithmetic that the whole team, including product managers, can read.

## SLI, SLO and SLA

Three terms matter, and they are often confused:

| Term | What It Is | Example |
| --- | --- | --- |
| SLI | A carefully defined measure of some aspect of service level | The fraction of page requests that return successfully within 400 ms |
| SLO | A target value or range for an SLI | At least 99.9 percent of them, over 28 days |
| SLA | A contract with consequences, usually money, for missing the objective | A refund of 10 percent if monthly uptime falls below 99.9 percent |

The test is simple: if there is no explicit consequence for missing it, it is an SLO. Google Search, for instance, has no public SLA and still has SLOs. An SLA is usually looser than the internal SLO, so that the team gets a warning before a contract is breached.

Cloud providers show real SLAs. Amazon's S3 SLA measures the error rate in each 5 minute interval and gives credits of 10 percent if monthly uptime falls below 99.9 percent, 25 percent below 99.0 percent and 100 percent below 95.0 percent.

Amazon's EC2 SLA promises 99.99 percent for instances spread over two or more availability zones, and 99.5 percent for a single instance, with credits of 10, 30 and 100 percent at lower tiers. Both are limited promises with narrow definitions, which is how an SLA differs from the experience of a user.

## Choosing Indicators

An SLI should reflect what users feel. Typical ones by kind of service:

| Kind of Service | Typical SLIs |
| --- | --- |
| Serving Requests | Availability, latency, throughput |
| Storage | Latency, availability, durability |
| Data Pipelines | Throughput, end to end latency, freshness |
| Any System | Correctness |

An SLI has a simple form: good events divided by total events, a percentage from 0 to 100. It separates the **specification**, the outcome that matters, such as the ratio of home page requests that load in under 100 ms, from the **implementation**, the way it is measured.

Three ways to measure a web service are server logs, which miss requests that don't reach the backend, probes that run a browser from outside, which catch network failures, and client instrumentation.

Client instrumentation is the closest to the user and costs the most engineering effort. The advice is to start with the cheapest accurate measure.

For the textbook app, three SLIs cover the purchase path:

- **Availability**: The share of purchase requests that don't return a server error
- **Latency**: The share of listing page requests served in under 400 ms
- **Freshness**: The share of new listings that appear in search within 60 seconds

Use percentiles and not averages for latency, since an average hides the tail: a median near 50 ms can sit beside 5 percent of requests that are about 20 times slower. State it as several grades at once, such as 90 percent under 100 ms and 99 percent under 400 ms.

## Setting the Target

How high? 100 percent is the wrong goal. Past a point, each extra nine costs far more, it slows feature work, and users can't tell the difference: someone on a phone with 99 percent reliability can't see 99.99 percent in the service.

The cost of each increment can be about 100 times the previous one.

It also notes that background errors on the internet run roughly 0.01 to 1 percent, so a service far more reliable than that is invisible to users.

Each nine is an order of magnitude less failure. Over a 28 day window, as we calculated:

| Target | Allowed Full Outage |
| --- | --- |
| 99% | 6.72 hours |
| 99.9% | 40.3 minutes |
| 99.95% | 20.2 minutes |
| 99.99% | 4.0 minutes |
| 99.999% | 24 seconds |

The Azure reliability guidance has the same table for a month, 43.2 minutes at 99.9 percent. A 99.999 percent target leaves 24 seconds, which is shorter than the 30 second leader key lifetime that Patroni uses by default in [Single Leader Replication](/system-design/replication-one-leader), so it needs a design that survives failures with no one acting.

Dependencies lower what a service can promise. As the first topic of the previous phase showed, 10 services in a chain at 99.9 percent give 99.0 percent together.

The rule for a chain is the product of the components' values, and for redundant copies availability is 1 minus the product of the chances that each copy fails.

Two pieces of advice apply when choosing.

- **Start from the user**: Don't pick a target from what is easy to measure, or from the current performance, which can lock in a level that takes heroics to keep
- **Keep it small**: Have as few SLOs as possible, avoid absolute promises such as perfect availability, and start loose and tighten later, since loosening a promise is harder

A worked example is a mobile game with four weeks of data: 3,663,253 requests, of which 97.123 percent succeeded, with a 90th percentile of 432 ms and a 99th of 891 ms.

Its starter SLOs were set just under the observed values: 97 percent availability, 90 percent of requests under 450 ms and 99 percent under 900 ms.

## The Error Budget

The error budget is 100 percent minus the SLO. At 99.9 percent, 0.1 percent of requests may fail, and the team can spend them on risk: releases, experiments, maintenance.

The textbook app serves 3,000 requests a second, which is 7.26 billion requests in 28 days, so the budget at 99.9 percent is 7.26 million failed requests, or 40.3 minutes of full outage.

The SRE workbook's smaller example makes it concrete: 99.9 percent over 3 million requests in four weeks leaves 3,000 errors, and an outage that causes 1,500 of them uses 50 percent of the budget.

The use: an error budget is an SLO for meeting other SLOs, and as long as budget remains, releases continue.

The budget changes the argument between teams. Without it, product wants features and operations wants stability, and each side is arguing from taste. With it, the question is how much budget is left.

The system polices itself: when the budget runs low, the product team itself slows releases, since it would pay for the failures.

## A Policy for When the Budget Runs Out

A budget needs a rule to mean anything. Take a game service whose policy covers backend and client releases, with these terms:

- **Within budget**: Releases proceed under the normal release process
- **Out of budget**: The team halts changes and releases except for top priority fixes and security fixes, until the service is back within its SLO
- **Reliability work is required**: If a code bug or a procedural error caused the overrun, if a postmortem shows a hard dependency can be made soft, or if some errors weren't counted
- **Feature work may go on**: If the cause was a company wide network problem, another team's service that froze its own releases, or users outside scope such as load tests
- **Postmortem trigger**: A single incident that uses more than 20 percent of the four week budget needs a postmortem, with at least one top priority action item for the root cause
- **Escalation**: Disagreements over the budget math or the required actions go to the CTO

The policy also states its purpose: it isn't a punishment, it is a way to focus on reliability when the data says so. Changes cause about 70 percent of outages, which is why release speed is what the budget governs.

Developers have to accept a freeze, product managers have to accept the threshold, and the team on call has to find the SLO defensible without heroics. If any of them won't, the SLIs and targets need another round.

## Windows and Reporting

Over what time is the SLO measured? A rolling four week window is a good general purpose interval, in whole weeks so that each window has the same weekends, with weekly summaries and quarterly reports.

A calendar month is easy to plan around, and it hides the forecast: at the start of the month, one bad hour looks small, and on the 29th it looks fatal. A rolling window removes that cliff.

One note about aggregation: a rate averaged over a day can hide a bad minute, so think about the interval of each SLI.

## Don't Overachieve

An SLO is a ceiling as well as a floor. A cautionary example is Chubby, Google's lock service, which was so reliable that other services began to assume it would not fail, and built hard dependencies on it.

To avoid it, the Chubby team keeps it near its SLO, and if a quarter passes with no real failure that takes availability below target, they cause a controlled outage so that unreasonable dependencies show up while they can be fixed.

The same applies to the textbook app's internal services. If the wallet service is rarely down, other teams will stop handling its failures, and the day it fails, the checkout fails with it.

## Writing It Down

An SLO document records the service, the SLIs and how each is measured, the targets, the budget math, the reasons, and who approved it. Review it monthly at first and then quarterly. For the textbook app:

| SLI | Target | Window | Budget |
| --- | --- | --- | --- |
| Purchase Requests Without a Server Error | 99.9% | 28 days rolling | 7.26 million failed requests |
| Listing Pages Served Within 400 ms | 99% | 28 days rolling | 1% slow requests |
| New Listings Searchable Within 60 Seconds | 99% | 28 days rolling | 1% late listings |

The next topic, [Alerting and Dashboards](/system-design/alerting), uses the budget to decide what deserves waking someone up.

## Key Points

- An SLI measures what users feel, an SLO is the target for it, and an SLA is a contract with consequences, usually looser than the SLO
- Choose a few indicators, use percentiles for latency, and set targets from what users need and not from what is easy or current
- Each nine cuts the allowed failure tenfold: 99.9 percent over 28 days is 40.3 minutes of full outage, and 99.999 percent is 24 seconds
- <u>The error budget is 100 percent minus the SLO</u>, and it turns the argument about reliability and speed into a number that both sides read
- Agree a policy in advance for when the budget runs out, use a rolling four week window, and don't overachieve, since users and other teams come to depend on it
