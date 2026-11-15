> **Redundancy** means keeping spare parts. **Failover** is switching to a spare when the working part stops. Together they let a system survive a failure that would otherwise take it down.

In [Availability and the Nines](/system-design/availability), copies raised availability only under two conditions: they must fail independently, and something must move traffic to the healthy one. This topic is about the second condition, and about everything that can go wrong with it.

## Hunt the Single Points of Failure

A single point of failure is a part with no spare, so its failure stops everything. Walk the request path of the textbook app and ask of each stop: what happens if this one dies?

| Part | If It Fails | A Spare |
| --- | --- | --- |
| DNS provider | Users can't find the app | A second provider, as in [How DNS Works](/system-design/dns) |
| Load balancer | Nothing reaches the servers | A second one that takes over, in a pair |
| One web server | Less capacity | More servers behind the load balancer |
| Database primary | No new writes | A replica ready to be promoted, from [From One Server to Many](/system-design/one-server-to-many) |
| The whole data center | Everything | A second data center or zone |

Each spare can fail too, so the exercise repeats: the thing that detects failures and flips to the spare must not be a single point of failure itself.

## Two Ways to Keep Spares

<figure class="diagram">
<p class="rowname">Active-Passive: A Spare Waits</p>
<div class="flow">
<div class="node">Primary<small>serves all traffic</small></div>
<div class="arrow" data-label="copies" aria-hidden="true"></div>
<div class="node">Standby<small>waits, takes over on failure</small></div>
</div>
<p class="rowname">Active-Active: Every Copy Works</p>
<div class="flow">
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Copy A<small>serves traffic</small></div>
<div class="node">Copy B<small>serves traffic</small></div>
</div>
</div>
<figcaption>A spare that sits idle, or spares that share the work</figcaption>
</figure>

With **active-passive**, one copy serves and the other waits, getting copies of the data. It is simpler, and it suits things with one main copy of the data, like a database primary. The cost is an idle machine, and a pause while the standby takes over. With **active-active**, every copy serves traffic, so losing one costs only its share, and there is no idle machine. The cost is that the copies must stay in step with each other, which is easy for stateless web servers from [Stateless and Stateful Services](/system-design/stateless-stateful) and hard for data.

A standby can also be kept at different temperatures:

| Standby | State | Takes Over In | Cost |
| --- | --- | --- | --- |
| Hot | Running and kept in step | Seconds to a minute | Highest |
| Warm | Running smaller, or a little behind | Minutes | Medium |
| Cold | Not running, started from backups | Tens of minutes to hours | Lowest |

## The Spares Need Room

Spares are only real if they can carry the load. Take three web servers all running at 70% busy. When one fails, the other two must carry all three servers' work, so each now runs at 105% and the survivors overload:

| Servers | Busy Normally | Busy After One Fails |
| --- | --- | --- |
| 3 | 70% | 105% |
| 3 | 45% | 68% |
| 6 | 70% | 84% |

So the load you plan for is the load after a failure. With more servers, losing one hurts less, because its work spreads over more of them. And remember the curve from [Latency and Throughput](/system-design/latency-throughput): even 84% busy is a slow place to be, so the margin matters.

## What Happens During a Failover

A failover is not instant. Something has to notice the failure, decide what to do and then move the traffic. Here is an example for a database primary:

<figure class="chart">
<div class="waterfall">
<div class="wf"><span>Detect the failure</span><span class="track"><span class="bar" style="--s: 0%; --w: 27.3%"></span></span><span class="value">15 s</span></div>
<div class="wf"><span>Decide and promote</span><span class="track"><span class="bar" style="--s: 27.3%; --w: 18.2%"></span></span><span class="value">10 s</span></div>
<div class="wf peak"><span>Switch the traffic</span><span class="track"><span class="bar" style="--s: 45.5%; --w: 54.5%"></span></span><span class="value">30 s</span></div>
</div>
<figcaption>About 55 seconds of errors from the failure to normal service (example numbers)</figcaption>
</figure>

Detection comes from health checks, covered in [Health Checks](/system-design/health-checks). If a check runs every 5 seconds and three misses count as a failure, that alone takes 15 seconds. Switching can depend on how fast clients learn the new address, which includes the DNS caches from [How DNS Works](/system-design/dns).

Tie it to the nines: at 99.99%, a team has about 53 minutes a year, which is room for roughly 57 failovers of 55 seconds. At five nines it is about 5.

Two numbers describe a failover. The **RTO**, recovery time objective, is how long the service can be down. The **RPO**, recovery point objective, is how much recent data it can afford to lose. With a replica that copies asynchronously, as in [Replication Lag](/system-design/replication-lag), the last few writes may not have reached the standby, so the RPO is above zero. Copying synchronously can bring the RPO to zero, at the price of slower writes.

## When Failover Goes Wrong

One of the nastiest failures is a failover that should not have happened. Imagine the network between the primary and the rest breaks. The primary is fine but looks dead from outside, so a standby is promoted, and now two copies both think they are in charge:

<figure class="diagram">
<div class="flow packets">
<div class="node hot">Old Primary<small>cut off, still takes writes</small></div>
<div class="node hot">New Primary<small>promoted, takes writes</small></div>
</div>
<figcaption>Split brain: two copies accept writes and drift apart</figcaption>
</figure>

This is **split brain**. Each side now holds writes the other lacks, and merging them can be slow and painful. In October 2018, GitHub lost the link between its East Coast network hub and its primary East Coast data center for a short time. Automation moved database leadership to the West Coast, and afterward both sides held writes the other lacked. GitHub chose to protect the data over a quick return, and service was degraded for just over 24 hours. The details are in [GitHub's own post-incident analysis](https://github.blog/2018-10-30-oct21-post-incident-analysis/).

Systems guard against this in two ways. A quorum means a copy may lead only when a majority agrees it should, and fencing means the old primary is cut off from the data before the new one starts. See [Single Leader Replication](/system-design/replication-one-leader).

A failover plan that has never run is a guess. Teams practice it on purpose, with scheduled drills in which they stop a real component and watch what happens, and they write down what broke. A first failover should not happen at 9:00 AM on registration day.

## Key Points

- A single point of failure is a part with no spare, so walk the request path and find each one, including the thing that does the failing over
- Active-passive keeps a standby waiting, and active-active spreads the work over every copy
- <u>Plan for the load after a failure</u>: three servers at 70% leave the survivors at 105%
- A failover takes time to detect, decide and switch, and asynchronous copies can lose the last writes
- Split brain, two primaries at once, is the dangerous case, and quorum and fencing guard against it
- Practice failovers, because an untested plan often fails when it is needed
