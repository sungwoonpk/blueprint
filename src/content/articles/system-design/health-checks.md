> A **health check** is a small question a load balancer asks each server on a schedule: "can you take requests right now?" A server that keeps answering no is skipped until it answers yes again.

[Load Balancers](/system-design/load-balancers) and [Load Balancing Algorithms](/system-design/load-balancing-algorithms) chose among servers as if they were all fine. Real servers crash, hang, run out of disk or are halfway through starting up.

In [Redundancy and Failover](/system-design/redundancy-failover), the first part of any failover was noticing the failure, and the health check is how a load balancer notices. Its settings decide how fast, and what the question asks decides whether the answer can be trusted.

## The Basic Loop

Every few seconds, the load balancer sends a request to a path on each server, often `/health`, and looks at the reply:

```http
GET /health HTTP/1.1
Host: 10.0.1.11

HTTP/1.1 200 OK
```

A success is usually an exact status code. Google's load balancers require a plain 200, and a redirect, such as to a login page, counts as a failure. AWS's Application Load Balancer expects 200 by default and lets you accept a range.

One check isn't enough to change a server's state, because a single slow reply shouldn't remove a good server. So each server keeps a streak, and the state changes only after enough failures or successes in a row:

<figure class="diagram">
<p class="rowname">Going Out of Rotation</p>
<div class="flow">
<div class="node">Healthy<small>gets requests</small></div>
<div class="arrow wide" data-label="2 failed checks in a row" aria-hidden="true"></div>
<div class="node lost">Unhealthy<small>skipped</small></div>
</div>
<p class="rowname">Coming Back</p>
<div class="flow">
<div class="node lost">Unhealthy<small>skipped</small></div>
<div class="arrow wide" data-label="5 passes in a row" aria-hidden="true"></div>
<div class="node">Healthy<small>gets requests</small></div>
</div>
<figcaption>The default thresholds of AWS's Application Load Balancer</figcaption>
</figure>

The settings are an interval between checks, a timeout for each, and the two thresholds. They form a tradeoff, like those in [Thinking in Tradeoffs](/system-design/trade-offs).

Quick checks with low thresholds remove a failing server fast and may also remove good servers over a brief hiccup. Slow checks with high thresholds are calm and leave users hitting a dead server longer.

## How Long Detection Takes

Multiply the interval by the threshold and you get roughly how long a failure goes unnoticed. The defaults of two big providers differ a lot:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>AWS ALB<br><small>taken out</small></span><span class="track"><span class="fill" style="--w: 40%"></span></span><span class="value">60</span></div>
<div class="hbar peak"><span>AWS ALB<br><small>brought back</small></span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">150</span></div>
<div class="hbar"><span>Google Cloud<br><small>taken out</small></span><span class="track"><span class="fill" style="--w: 6.7%"></span></span><span class="value">10</span></div>
<div class="hbar"><span>Google Cloud<br><small>brought back</small></span><span class="track"><span class="fill" style="--w: 6.7%"></span></span><span class="value">10</span></div>
</div>
<figcaption>Seconds, roughly, from the interval times the threshold at each provider's defaults: 30 s with 2 and 5 on AWS, 5 s with 2 and 2 on Google</figcaption>
</figure>

With AWS's defaults, a dead server can keep receiving requests for about a minute, and a recovered one waits more than two minutes to return.

Each request that lands on the dead server fails, which is why the 55 second failover in [Redundancy and Failover](/system-design/redundancy-failover) began with a detection step. You can tighten the settings, and the price is a twitchier system.

## What Should the Endpoint Check?

The loop is simple. The hard part is deciding what `/health` actually tests. The AWS Builders' Library article on health checks separates three levels:

| Level | What It Tests | Example |
| --- | --- | --- |
| Liveness | The process is up and answering | Returns 200 with no other work |
| Local Health | Resources this server owns | Free disk space, a worker pool that isn't stuck |
| Dependency Health | Services it relies on | Can it reach the database and the cache |

Microsoft's Azure Architecture Center makes the same split with two endpoints, one for liveness and one for readiness. Here is how they look in our app:

```python
@app.get("/health/live")
def live():
    return "ok", 200                      # the process answers

@app.get("/health/ready")
def ready():
    if not startup_finished:
        return "starting", 503            # not ready for traffic yet
    if disk_free_bytes() < 1_000_000_000:
        return "disk almost full", 503
    return "ok", 200
```

Local checks catch real problems, such as a full disk or a stuck worker pool, and they fail one server at a time, so skipping that server is the right reaction. The third level needs more care.

## The Trap: Checking the Database

It feels natural to have `/health` run a query, because a server that can't reach the database can't do much. Now suppose the database gets slow for a minute:

<figure class="diagram">
<div class="flow">
<div class="node hot">Database<small>slow for a minute</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">All Web Servers<small>fail their check</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Load Balancer<small>removes them all</small></div>
</div>
<figcaption>A shared dependency makes all the servers look broken at the same moment</figcaption>
</figure>

All the servers fail the check together, and the load balancer removes the whole fleet, so users get errors from a site whose web servers were fine. A slow database turns into a full outage. Automation that removes servers helps with one bad server and does damage when the whole fleet looks bad.

The habits that follow:

- **Keep the load balancer's check local**: liveness and local health only
- **Watch dependencies another way**: run those checks in the background, report them to monitoring and alerts, and react to them gently
- **Report degraded, not dead**: for a dependency that is optional, serve what you can, as in [Load Shedding and Graceful Degradation](/system-design/load-shedding)
- **Fail open**: when every server fails its check, send traffic to all of them anyway. AWS's Application Load Balancer does this. It is a safety net, though, not a plan

## Probes Inside the Platform

Container platforms run health checks themselves. Kubernetes, which [Containers and Orchestration](/system-design/containers) covers, has three probes with different consequences:

- **Liveness**: if it fails, the container is killed and restarted
- **Readiness**: if it fails, the pod is taken out of the service's endpoints, with no restart
- **Startup**: holds the other two back until a slow starting app is up

```yaml
readinessProbe:
  httpGet: { path: /health/ready, port: 8000 }
  periodSeconds: 5
  failureThreshold: 3
livenessProbe:
  httpGet: { path: /health/live, port: 8000 }
  periodSeconds: 10
```

The split matters. A liveness probe that checks the database would restart each container whenever the database stumbles, which makes things worse. That is why a liveness probe stays shallow: a dependency outage shouldn't cause needless restarts.

## Watching Real Traffic

Probes only test what they ask. The requests users send are a second, free signal. This is **passive** checking, as opposed to the **active** probes above. nginx counts failures on real requests, and a server is marked unavailable for a while after a set number of them, with defaults of one failure and 10 seconds.

Envoy's outlier detection does it more carefully: a host that returns several 5xx errors in a row is ejected, each repeat ejection lasts longer, and a cap on the share of hosts that can be ejected at once keeps a bad day from emptying the pool.

Many systems use both kinds, probes to find a dead server quickly and real traffic to find a server that is up but failing.

## Details That Bite

- **Firewalls**: probes come from particular addresses. Allow those addresses explicitly, or the backends look unhealthy
- **Busy servers**: if a server is so loaded that it answers the check late, the balancer removes it, which pushes its work onto the rest, and they fall too. Reserve capacity so health checks get answered first
- **Cost**: many balancers probe each server, and several probers can run each check, so the load adds up and the endpoint should be cheap
- **Exposure**: a public `/health` should reveal little. Use a separate minimal endpoint for probes, and keep detailed diagnostics behind a login
- **Startup**: a new server should receive traffic only after it passes, as AWS requires, so it doesn't take requests while still loading

Health checks also drive failover beyond a single data center. DNS can take an unhealthy region's address out of its answers, which [Global Traffic Routing](/system-design/global-routing) covers next.

## Key Points

- A health check asks each server on a schedule whether it can take requests, and failing servers are skipped until they pass again
- The interval and thresholds set how fast failures are noticed: AWS's defaults take about a minute to remove a server, Google's about ten seconds
- Liveness checks the process, local health checks its own resources, and dependency checks look at other services
- <u>Keep the load balancer's check local</u>, because a check on a shared database can remove every server at once
- Fail open, watch real traffic as well, and keep checks cheap, protected and answered first even under load
- In Kubernetes, readiness removes a pod from traffic and liveness restarts it, so keep liveness shallow
