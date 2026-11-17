> A **container** is a program packaged with everything it needs and run in isolation on a shared machine. **Orchestration** is the software that starts, places, restarts and updates many containers across many machines.

[When to Split into Microservices](/system-design/monoliths-microservices) ended with a practical problem: many services, each needing to run the same way on a laptop, a test server and a fleet of production machines. The old answer, "install the right Python and libraries on each server", breaks as soon as two services want different versions.

Containers solve the packaging half, and an orchestrator solves the running half, which is the scaling out from [Scaling Up and Scaling Out](/system-design/scaling) made routine.

## A Box Around a Program

A container is an isolated process with all the files it needs to run. It is complete in itself, so it doesn't rely on anything installed in advance on the host, and it runs the same on a laptop, in a data center or in the cloud.

A **virtual machine** isolates by running a whole separate operating system. A container is lighter, because all the containers on a machine share one operating system kernel:

<figure class="diagram">
<p class="rowname">Virtual Machines</p>
<div class="flow">
<div class="stack">
<div class="node">App A<small>plus its own OS</small></div>
<div class="node">App B<small>plus its own OS</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hypervisor</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hardware</div>
</div>
<p class="rowname">Containers</p>
<div class="flow">
<div class="stack">
<div class="node">App A<small>and its files</small></div>
<div class="node">App B<small>and its files</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Host OS<small>one shared kernel</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hardware</div>
</div>
<figcaption>Each VM carries an operating system, and containers share the host's</figcaption>
</figure>

Because there is no second operating system to boot, a container starts in moments and uses far less memory. The price is weaker isolation, since a flaw in the shared kernel affects all the containers on the machine. The two are often combined, with containers running inside cloud VMs.

Two Linux features do the work. **Namespaces** give a process its own view of the system: its own process list, network, file mounts, hostname and users.

**Control groups**, or cgroups, limit and measure how much CPU, memory and disk traffic a group of processes may use. A container is an ordinary process with its own namespaces and limits, which is why the boundary is thinner than a VM's.

A standard from the Open Container Initiative defines the image format and how runtimes start them, so different tools can work together.

## Images and Dockerfiles

A container starts from an **image**, a packaged, read-only snapshot of the program and its files. Images are built in **layers**, each one a set of file changes on top of the last, and an image never changes once built. You describe the build in a `Dockerfile`. Here is one for the textbook app's listings service:

```dockerfile
FROM python:3.12-slim
WORKDIR /srv/textbooks
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY listings/ listings/
EXPOSE 8000
CMD ["gunicorn", "-b", "0.0.0.0:8000", "listings.wsgi"]
```

Each line has a job:

- **FROM**: the base image to start from
- **COPY** and **RUN**: copy files in and run commands at build time, each making a layer
- **EXPOSE**: documents the port, and doesn't open it by itself
- **CMD**: what runs when a container starts

The order matters. Docker reuses unchanged layers, so putting the slow dependency install before the code means that a code change rebuilds only the last layer.

Images are stored in a **registry**, such as Docker Hub, under a name and a tag, and `FROM python` with no tag means the `latest` tag. Pinning a specific version, as above, keeps builds from changing under you.

A container is a running copy of an image, with a writable layer on top that is thrown away when the container is removed. So anything that must survive, such as uploads or database files, lives outside it, the same rule as in [Stateless and Stateful Services](/system-design/stateless-stateful).

## Too Many Boxes

One container is easy to run by hand. Running 6 copies of 4 services across 10 machines is not: someone has to decide which machine runs what, restart what crashes, replace a dead machine's containers, roll out new versions and let services find each other. An **orchestrator** does that work.

Kubernetes is the most widely used one. Google open sourced it in 2014, and it grew out of Google's experience with Borg, the internal system its engineers describe in a 2015 paper as running hundreds of thousands of jobs across clusters of up to tens of thousands of machines. The vocabulary takes some getting used to:

| Term | What It is |
| --- | --- |
| Container | One packaged program, running |
| Pod | The smallest unit Kubernetes runs: one or more containers sharing a network address |
| Node | A machine that runs pods |
| Deployment | A rule saying "keep this many copies of this pod running" |
| Service | A stable name and address in front of a changing set of pods |

## Declaring What You Want

With Kubernetes you don't say "start container 1 on machine 3". You describe the **desired state**, and controllers keep working to make reality match it. For the listings service, using the six servers estimated in [Estimating Capacity](/system-design/estimation):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: listings
spec:
  replicas: 6
  selector:
    matchLabels: { app: listings }
  template:
    metadata:
      labels: { app: listings }
    spec:
      containers:
        - name: listings
          image: registry.example.com/listings:2.4.1
          ports:
            - containerPort: 8000
          readinessProbe:
            httpGet: { path: /health/ready, port: 8000 }
```

The readiness probe is the check from [Health Checks](/system-design/health-checks): a pod gets traffic only once it passes. The payoff is **automatic recovery**. If a machine dies, the controller sees that fewer than six pods exist and starts replacements elsewhere:

<figure class="diagram">
<p class="rowname">Desired: 6 Copies</p>
<div class="flow">
<div class="node">Node 1<small>3 pods</small></div>
<div class="node">Node 2<small>3 pods</small></div>
</div>
<p class="rowname">Node 2 Fails</p>
<div class="flow">
<div class="node">Node 1<small>3 pods</small></div>
<div class="node lost">Node 2<small>down, 3 pods gone</small></div>
</div>
<p class="rowname">Controller Catches Up</p>
<div class="flow">
<div class="node">Node 1<small>3 pods</small></div>
<div class="node">Node 3<small>3 new pods</small></div>
</div>
<figcaption>The system keeps comparing what exists with what was asked for, and closes the gap</figcaption>
</figure>

Behind this are a few control plane parts. The API server takes your declarations, a database called etcd stores them, a scheduler picks a node for each new pod, and a small agent on each node, the kubelet, makes sure the right containers are running.

## Updating Without Downtime

Changing the image tag in the file above starts a **rolling update**: new pods are started and old ones removed gradually, so some copies keep serving.

By default Kubernetes allows a quarter of the pods to be unavailable and a quarter extra to exist during the change, which for three pods means no pod is removed before its replacement is ready and at most four exist at once:

<figure class="diagram">
<p class="rowname">Start</p>
<div class="flow packets">
<div class="node">v1</div>
<div class="node">v1</div>
<div class="node">v1</div>
</div>
<p class="rowname">Add One New Pod</p>
<div class="flow packets">
<div class="node">v1</div>
<div class="node">v1</div>
<div class="node">v1</div>
<div class="node wait">v2<small>starting</small></div>
</div>
<p class="rowname">Once It Passes Its Check, Retire an Old One</p>
<div class="flow packets">
<div class="node">v1</div>
<div class="node">v1</div>
<div class="node">v2</div>
</div>
<p class="rowname">Repeat</p>
<div class="flow packets">
<div class="node">v2</div>
<div class="node">v2</div>
<div class="node">v2</div>
</div>
<figcaption>A rolling update with three pods, where each new pod must pass its readiness check before the next step</figcaption>
</figure>

If the new version misbehaves, `kubectl rollout undo` returns to the previous one, since Kubernetes keeps a history of revisions. This is the mechanism behind the deployment strategies in [Canary Releases and Other Deployment Strategies](/system-design/deployments). Removing a pod also gives its connections time to finish, the draining idea from [Load Balancers](/system-design/load-balancers).

## Finding Each Other

Pods come and go, and each new pod gets a new address, so no one can rely on one. A **Service** puts a fixed name and address in front of whichever pods currently match a label:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: listings
spec:
  selector:
    app: listings
  ports:
    - port: 80
      targetPort: 8000
```

Other services now reach this one at the name `listings`, and Kubernetes keeps the list of healthy pods behind it up to date.

The default type is reachable only inside the cluster, one type opens a port on each node, and another, `LoadBalancer`, asks the cloud for an external load balancer. [Service Discovery](/system-design/service-discovery) covers the general problem next.

## Requests and Limits

The scheduler needs to know how big each pod is, so you tell it. A **request** is the amount to reserve, and the scheduler only places a pod where the sum of requests fits on the node. A **limit** is the most the container may use:

```yaml
resources:
  requests: { cpu: 250m, memory: 128Mi }
  limits:   { cpu: 500m, memory: 256Mi }
```

The two limits behave differently. A container that wants more CPU than its limit is throttled, so it slows down. One that goes over its memory limit is killed by the kernel and restarted, which `kubectl describe pod` shows as `OOMKilled` with exit code 137.

Set the memory limit too low and you get surprise restarts, and set requests too high and nodes sit half empty, which makes this a [Capacity Planning](/system-design/capacity-planning) and cost question as much as a technical one.

## What It Costs

Kubernetes solves real problems and is a large system itself. It is not a complete platform: it leaves logging, monitoring and databases to other tools. Running your own cluster takes expertise, so most teams use a managed service from a cloud provider, or something simpler such as a platform that runs containers without exposing a cluster.

At the simplest end, [Serverless Computing](/system-design/serverless) goes further and removes the machines from view entirely. For one small team and one app, a single server or a few, as in [From One Server to Many](/system-design/one-server-to-many), is often enough, and containers can still help by making the build the same everywhere.

## Key Points

- A container is an isolated process with its own files, sharing the host's kernel, which makes it lighter than a VM and less strongly isolated
- Namespaces give a container its own view of the system, and cgroups limit what it can use
- An image is an immutable, layered package built from a Dockerfile, and containers are disposable copies, so state lives outside them
- An orchestrator places, restarts, scales and updates containers, and Kubernetes does it by <u>comparing desired state with reality</u> and closing the gap
- Rolling updates replace pods gradually and need readiness checks, and a Service gives changing pods a stable name
- Set requests and limits on purpose, and choose a managed or simpler option unless the scale justifies running a cluster
