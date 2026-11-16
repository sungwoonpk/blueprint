> To handle more load, you can make one machine bigger or add more machines. The first is **scaling up**, the second is **scaling out**, and most real systems end up doing both.

In [From One Server to Many](/system-design/one-server-to-many), the first fix for a slow server was a bigger one, and a little later we added several behind a load balancer. [Performance and Scalability](/system-design/performance-scalability) explained why the second doesn't speed things up evenly. This topic compares the two as a decision: what each one costs, and which part of a system suits which.

## Two Ways to Grow

You will also hear them called vertical scaling (up) and horizontal scaling (out):

<figure class="diagram">
<p class="rowname">Scaling Up</p>
<div class="flow">
<div class="node">Server<small>2 CPUs, 8 GB</small></div>
<div class="arrow" data-label="bigger" aria-hidden="true"></div>
<div class="node">Server<small>32 CPUs, 128 GB</small></div>
</div>
<p class="rowname">Scaling Out</p>
<div class="flow">
<div class="node">Server<small>2 CPUs, 8 GB</small></div>
<div class="arrow" data-label="more" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Server<small>2 CPUs, 8 GB</small></div>
<div class="node">Server<small>2 CPUs, 8 GB</small></div>
<div class="node">Server<small>2 CPUs, 8 GB</small></div>
</div>
</div>
<figcaption>One machine that grows, or many machines of the same size</figcaption>
</figure>

## What Each One Costs

Neither is better everywhere, in the way [Thinking in Tradeoffs](/system-design/trade-offs) describes. Each one gives something up:

| | Scaling Up | Scaling Out |
| --- | --- | --- |
| What You Do | Move to a bigger machine | Add more machines of the same size |
| Code Changes | Usually none | Servers must not keep data for each user |
| The Limit | The biggest machine you can buy | Far away, though coordination costs grow |
| If a Machine Fails | Everything stops | The others keep serving |
| Growing Further | Resizing often needs a restart | Add one at a time, with no restart |
| Cost | Tends to rise faster than capacity at the top sizes | Rises in step, plus a load balancer and more to run |

The ceiling for scaling up is higher than most people expect, since the largest cloud machines have hundreds of CPU cores and many terabytes of memory. That is why many teams scale up first while it is cheap and simple. One machine is also a **single point of failure**, a part whose failure stops everything, which [Redundancy and Failover](/system-design/redundancy-failover) returns to. That and the ceiling are the reasons teams don't stop at scaling up.

## Scaling Out Needs Some Preparation

Adding a second server only helps if any server can answer any request. The next request from a user can land on a different machine, so a server that keeps your login or a half finished upload in its own memory breaks the moment it is copied. Servers that keep nothing between requests are called stateless, and making them so is the subject of [Stateless and Stateful Services](/system-design/stateless-stateful). It costs little to build that way early, and it keeps scaling out possible later.

The data is harder. Copies of a stateless web server are interchangeable, but a database holds one particular set of data, so it can't simply be duplicated. That takes the replicas and the sharding from [From One Server to Many](/system-design/one-server-to-many), with the tradeoffs they bring. See [Single Leader Replication](/system-design/replication-one-leader) and [Sharding Strategies](/system-design/sharding).

## In Practice, Both

Different parts of the same system usually take different answers:

| Part | Usual Way | Why |
| --- | --- | --- |
| Web servers | Out | They keep nothing between requests, so any copy will do |
| Workers | Out | Each job is independent of the others |
| Cache | Up first, then out | One big node is simple, and more nodes mean splitting the data |
| Database | Up first, then replicas, then shards | Its data lives in one place, so copying or splitting it is hard |

Scaling only the web servers can backfire. A hundred servers all waiting on one database only moves the bottleneck, as in [Performance and Scalability](/system-design/performance-scalability), so the bigger lever is often the part that holds the data.

## Letting the System Do It

In the cloud, adding or removing a machine takes minutes and no hardware order. **Autoscaling** does it automatically: it adds machines when a measure such as CPU use climbs above a target, and removes them when it falls, so you pay for what the load needs. It suits stateless parts well. New machines take time to start, so a sudden spike can still outrun it. More in [Autoscaling](/system-design/autoscaling).

## Key Points

- Scaling up makes one machine bigger and scaling out adds more machines
- Scaling up is simple, but it has a ceiling, often needs restarts and leaves a single point of failure
- Scaling out has a distant ceiling and survives failures, but it needs preparation
- Servers must be stateless before copies help, and <u>the data layer is the hard part</u>
- In practice the web servers and workers scale out, and the database scales up first, then out
- Autoscaling adds and removes machines to follow load, but starting them takes time
