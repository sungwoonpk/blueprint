> **Service discovery** is how one service finds the current addresses of the services it needs, when instances start, stop and move all the time. A registry keeps the list, and callers or routers read from it.

The nginx example in [Load Balancers](/system-design/load-balancers) listed its servers by address, `10.0.1.11` and `10.0.1.12`, typed into a file. That works for a fleet that changes a few times a year. In [Containers and Orchestration](/system-design/containers), a pod gets a new address every time it is replaced, which can be many times a day.

Once the textbook app is split into services, each one needs a way to ask "where is the payments service right now?" and get an answer that is still true.

## Why Addresses Change

Instances move for ordinary reasons: a deploy replaces them one by one, autoscaling adds and removes them with the load (see [Autoscaling](/system-design/autoscaling)), and a failure sends their work to new machines. Suppose the listings service has its payments address in a setting:

<figure class="diagram">
<p class="rowname">Monday</p>
<div class="flow">
<div class="node">Listings Service</div>
<div class="arrow wide" data-label="PAYMENTS_URL" aria-hidden="true"></div>
<div class="node">Payments<small>10.0.4.17</small></div>
</div>
<p class="rowname">After a Deploy</p>
<div class="flow">
<div class="node">Listings Service</div>
<div class="arrow wide" data-label="still 10.0.4.17" aria-hidden="true"></div>
<div class="node lost">Nothing There<small>payments now at .52 and .53</small></div>
</div>
<figcaption>A hard coded address goes stale the first time the instance is replaced</figcaption>
</figure>

The fix is a level of indirection, like the one DNS gave the web in [How DNS Works](/system-design/dns). Callers ask for a name, `payments`, and something maps the name to the addresses that are alive now.

## A Registry and How It Fills

That something is a **service registry**: a database of service names, with the address and port of each running instance.

Microservices.io, a pattern catalog by Chris Richardson, describes the cycle. Instances register when they start and deregister when they stop, and the registry may check each one's health before listing it. The registration can come from the instance itself, called self-registration, or from the platform on its behalf, called third party registration, which is what Kubernetes does.

<figure class="diagram">
<p class="rowname">An Instance Starts</p>
<div class="flow">
<div class="node">Payments Instance</div>
<div class="arrow wide" data-label="registers and renews" aria-hidden="true"></div>
<div class="node">Registry<small>payments: .52, .53</small></div>
</div>
<p class="rowname">A Caller Needs It</p>
<div class="flow">
<div class="node">Listings Service</div>
<div class="arrow wide" data-label="where is payments?" aria-hidden="true"></div>
<div class="node">Registry<small>payments: .52, .53</small></div>
</div>
<figcaption>Instances write to the registry, and callers read from it</figcaption>
</figure>

Many tools do this job. Kubernetes and AWS's load balancers keep a registry without you seeing it. Netflix's Eureka, HashiCorp's Consul, etcd and ZooKeeper are registries you run, and AWS Cloud Map is one you rent, with namespaces, services and instances, returning only the healthy ones when health checking is on.

## Client-Side or Server-Side

Once the list exists, someone has to pick an instance from it. There are two arrangements:

<figure class="diagram">
<p class="rowname">Client-Side Discovery</p>
<div class="flow">
<div class="node">Caller</div>
<div class="arrow" data-label="1. list?" aria-hidden="true"></div>
<div class="node">Registry</div>
<div class="arrow wide" data-label="2. picks one" aria-hidden="true"></div>
<div class="node">Instance</div>
</div>
<p class="rowname">Server-Side Discovery</p>
<div class="flow">
<div class="node">Caller</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Router<small>asks the registry</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Instance</div>
</div>
<figcaption>The caller does the choosing, or a router does it for the caller</figcaption>
</figure>

With **client-side discovery**, the caller asks the registry, picks an instance itself and calls it, so the load balancing from [Load Balancing Algorithms](/system-design/load-balancing-algorithms) happens inside the caller. There are fewer hops, but each client, in each language, needs the discovery code. Netflix's Eureka with its Ribbon library is the classic case, and gRPC can do it too.

With **server-side discovery**, the caller sends the request to a router at a well known address, and the router consults the registry.

Callers stay simple, and there is one more piece to run and one more hop. Kubernetes Services and AWS load balancers work this way, and the ones in [Load Balancers](/system-design/load-balancers) from earlier in this phase are exactly such routers.

## DNS as a Registry

The simplest registry already exists. A DNS name can return the addresses of an instance set, and nearly every language can resolve names. Kubernetes uses it throughout. Each Service gets a name, and a pod can refer to a service in its own namespace by the bare name, or to another namespace by adding it:

```python
payments_url = "http://payments/charge"           # same namespace
billing_url  = "http://payments.billing/charge"   # a different namespace
```

Kubernetes can also inject environment variables, such as `PAYMENTS_SERVICE_HOST`, but only for services that existed before the pod started, so DNS is the more dependable choice. A **headless** Service goes one step further and returns every pod's address, so the client can choose.

DNS has weaknesses as a registry, which come from [How DNS Works](/system-design/dns): answers are cached, and plain DNS knows nothing about health.

By default gRPC resolves a name once per connection, and a custom resolver can instead watch for changes and push new addresses as backends come and go. Envoy takes another route: with its strict DNS mode it keeps resolving the name in the background, every 5 seconds by default, and drains hosts that disappear from the answer.

## Keeping the List Honest

The hardest part of a registry is removing entries. An instance that crashes can't deregister itself, so the registry has to notice. The usual tools:

- **Heartbeats and leases**: an instance renews its entry every so often, and the entry expires if renewals stop. In Netflix's Eureka, instances renew every 30 seconds and one that stops is evicted after about 90. In etcd, a key attached to a lease with a time limit disappears when the instance stops renewing
- **Health checks**: the registry or platform probes each instance, as in [Health Checks](/system-design/health-checks), and leaves out failing ones
- **Readiness**: in Kubernetes, a pod is listed as ready only when its readiness check passes, and a pod that is shutting down is marked terminating and normally skipped

Even so, the list is never perfect, and callers should not trust it blindly. The rule is to treat discovery as best effort and combine it with active health checks, with health winning when they disagree:

| In the Registry | Health Check | What Envoy Does |
| --- | --- | --- |
| Listed | Passing | Sends traffic |
| Listed | Failing | Doesn't send traffic |
| Not listed | Passing | Still sends traffic |
| Not listed | Failing | Doesn't send, and removes the host |

The third row is the clever one. If the registry itself goes down and the list empties, hosts that still pass health checks keep getting traffic, so the system survives a registry outage.

Eureka adds a safeguard of its own, called self-preservation. If a large share of instances, more than 15%, stop renewing at once, the server assumes the network is at fault and not the instances, and it stops evicting anything until renewals recover.

Evicting everyone because of a network blip would turn a small problem into an outage, the same trap as the health checks in [Health Checks](/system-design/health-checks).

## The Registry is Critical Too

Every call depends on the registry being right, so it has to be highly available, and the usual choices appear again.

ZooKeeper, etcd and Consul are fully consistent, which is costly to run at large scale, and that is an argument for the best effort approach above.

Others, like Eureka, lean toward availability, keeping stale entries during a partition instead of evicting healthy instances, and expect clients to cope. That choice is the tradeoff from [The CAP Theorem](/system-design/cap), and consistent registries rely on [Consensus and Leader Election](/system-design/consensus-leader-election).

Clients help by caching. A Eureka client keeps its own copy of the list and refreshes it about every 30 seconds, so it can keep working even if every Eureka server is down, as long as it tolerates a few dead entries.

## Choosing

| Situation | A Good Fit |
| --- | --- |
| Everything runs on Kubernetes | Services and cluster DNS |
| One cloud, with load balancers in front | Target groups, or the cloud's registry such as Cloud Map |
| Many platforms, or VMs and containers together | A registry such as Consul |
| A service mesh or Envoy based proxies | A control plane pushing endpoint lists |

The last row leads into the next topics. [API Gateways](/system-design/api-gateways) use discovery to route outside requests to the right service, and [Service Meshes and Sidecars](/system-design/service-mesh) put a proxy beside each service, with the registry feeding those proxies a live list.

## Key Points

- Instances move constantly, so callers look up a name instead of using a fixed address
- A service registry maps names to healthy instances, filled by registration, leases or health checks
- With client-side discovery the caller picks an instance, and with server-side discovery a router does
- DNS is the simplest registry, though caching and missing health information limit it
- <u>Treat the registry as best effort</u>: combine it with health checks and let health win when they disagree
- The registry is a critical dependency, so keep it highly available and let clients cache the list
