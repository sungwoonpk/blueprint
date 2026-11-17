> A **service mesh** is a layer of proxies, one beside each service instance, that handles the traffic between services: encryption, retries, timeouts, routing and metrics. The helper process that sits next to the application is called a **sidecar**.

An [API Gateways](/system-design/api-gateways) handles traffic coming in from outside. Once the textbook app is split into services, there is a second kind of traffic: calls from one service to another, which in [When to Split into Microservices](/system-design/monoliths-microservices) became network calls that can be slow and can fail. A mesh is about that inside traffic.

## Every Service Needs the Same Plumbing

Think of what the payments service needs when it calls the listings service:

- **Encryption and identity**: the call should be encrypted, and each side should know who the other is, as in [Service Identity and Mutual TLS (mTLS)](/system-design/service-identity)
- **Timeouts and retries**: give up after a sensible time, and try again when it is safe, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries)
- **Load balancing**: pick a healthy instance, using ideas from [Load Balancing Algorithms](/system-design/load-balancing-algorithms)
- **Metrics and traces**: record each call, so slow ones can be found, as in [Logs, Metrics and Traces](/system-design/observability)

One way is to build all of this into a library, and each service uses it. That works until the services use different languages, which needs one library per language, or until different services run different library versions.

Segment's story in [When to Split into Microservices](/system-design/monoliths-microservices) had this exact drift, with shared code updated in some places and not others.

## A Proxy Beside Each Service

The mesh approach moves the plumbing out of the application and into a separate process. In Microsoft's description of the sidecar pattern, it is a helper deployed next to the main application, with its own copy for each instance and a shared lifecycle.

The application talks to the proxy on its own machine, and the proxy deals with the network. The goal is to make the network transparent to applications, and running out of process has two benefits: it works with any application language, and the proxies can be upgraded across the whole system without touching application libraries.

<figure class="diagram">
<p class="rowname">Data Plane: The Proxies Carry the Traffic</p>
<div class="flow">
<div class="node">Payments App</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Sidecar</div>
<div class="arrow wide" data-label="encrypted call" aria-hidden="true"></div>
<div class="node">Sidecar</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Listings App</div>
</div>
<p class="rowname">Control Plane: One Place Tells Them What to Do</p>
<div class="flow">
<div class="node">Control Plane<small>rules, certificates, instance lists</small></div>
<div class="arrow wide" data-label="pushes to each sidecar" aria-hidden="true"></div>
<div class="node">All Sidecars</div>
</div>
<figcaption>Applications only talk to the proxy beside them, and the proxies are managed together</figcaption>
</figure>

The proxies that carry the traffic are the **data plane**. The part that configures them is the **control plane**. In Istio, the best known mesh, the data plane is Envoy proxies and the control plane is a program called istiod.

It handles service discovery, configuration and certificates, and it feeds each proxy the live list of instances, the discovery described in [Service Discovery](/system-design/service-discovery).

## What a Mesh Gives You

The benefits fall in three groups:

| Group | What It Covers | In the Textbook App |
| --- | --- | --- |
| Traffic Management | Load balancing, routing rules, retries, timeouts, failover | Send 5% of payments calls to a new version first |
| Security | Mutual TLS between services, with identity and access rules | Only the payments service may call the refunds service |
| Observability | Metrics, logs and traces for each call | See which calls to listings are slow, without code changes |

Security is often the first reason teams adopt one. Linkerd, a lighter mesh, turns on mutual TLS for traffic between its meshed pods by default.

Each proxy gets a certificate tied to its pod's service account, and the certificates expire after 24 hours and are replaced automatically. Istio's certificates come from istiod in a similar way, with strict mode available to refuse anything unencrypted once all workloads are in the mesh.

Settings live in configuration, not in code. In Linkerd, retries and timeouts are annotations on the Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments
  annotations:
    retry.linkerd.io/http: 5xx
    timeout.linkerd.io/request: 2s
```

A caution applies to any mesh: only retry calls that are safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency). A mesh can retry without any code asking it to, which is convenient and dangerous.

Retrying every failed charge would be a bug, and retries layered on retries can pile load onto a struggling service, as in [Cascading Failures](/system-design/cascading-failures).

## What It Costs

The extra proxies are not free. Several costs add up:

- **Resources**: Istio's published measurements for version 1.24 put a sidecar at about 0.20 of a CPU core and 60 MB of memory when handling 1,000 requests a second with mutual TLS. If 50 pods each did that, the proxies alone would use about 10 cores and 3 GB
- **Latency**: each call passes through two proxies, one on each side, so sidecars add overhead, especially latency
- **Operations**: the mesh is another system to install, upgrade, secure and debug, and a failure in it affects every service
- **Lifecycle friction**: in Istio's sidecar mode, adding a workload means labeling its namespace and restarting its pods

Those costs are why Istio built a second mode. In **ambient mode**, there is no sidecar in each pod. A small proxy on each machine, called ztunnel, handles encryption and basic rules for each pod on that machine, and heavier request level features go to optional shared proxies named waypoints.

Istio's own comparison rates the resource cost of sidecars as large and ambient as small, and says adopting ambient needs only a label, with no restarts.

<figure class="diagram">
<p class="rowname">Sidecar Mode: A Proxy in Every Pod</p>
<div class="flow">
<div class="node">Pod 1<small>app + proxy</small></div>
<div class="node">Pod 2<small>app + proxy</small></div>
<div class="node">Pod 3<small>app + proxy</small></div>
</div>
<p class="rowname">Ambient Mode: One Proxy per Machine</p>
<div class="flow">
<div class="stack">
<div class="node">Pod 1<small>app only</small></div>
<div class="node">Pod 2<small>app only</small></div>
<div class="node">Pod 3<small>app only</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Node Proxy<small>shared by all three</small></div>
</div>
<figcaption>Ambient mode trades proxies for each pod for shared ones, to cut the resource and operations cost</figcaption>
</figure>

## Do You Need One?

| A Mesh Helps When | A Mesh is Probably Too Much When |
| --- | --- |
| There are many services in several languages | There are a few services, or one language |
| Mutual TLS between every service is a requirement | A library or the platform already covers the need |
| You want the same retries, routing and metrics everywhere | The app is small, and the proxy's cost is large next to it |
| A platform team can run it for everyone | One small team would have to learn and operate it |

Microsoft's guidance on sidecars is blunt about the last two rows: when the application is small, or when components talk to each other so often that every bit of latency counts, the sidecar's cost can outweigh its benefit.

A library can be the better fit when you need tighter integration and less overhead. The gateway from the last topic, a load balancer and a few well chosen libraries cover many systems, and a mesh is the step beyond when those no longer do.

The next topic goes in the opposite direction, to platforms that hide the servers altogether: [Serverless Computing](/system-design/serverless).

## Key Points

- A service mesh puts a proxy beside each service instance, so encryption, retries, routing and metrics live outside the application code
- The proxies are the data plane, and a control plane configures them, gives them certificates and feeds them the list of instances
- Meshes provide traffic management, security with automatic mutual TLS, and observability, all through configuration
- Sidecars cost CPU, memory, latency and operational effort, and Istio's ambient mode shares proxies per machine to reduce that
- <u>Retries from the mesh are only safe for calls that are safe to repeat</u>
- Choose a mesh for many services and a platform team, and skip it for small systems where libraries are enough
