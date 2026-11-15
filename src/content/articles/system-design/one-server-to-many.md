> Almost every big system started on **one server**. It grew one step at a time, and each step fixed whatever was breaking at that moment.

Remember the textbook app from [What Is System Design?](/system-design/what-is-system-design) Here's how it might grow from one campus to every campus in the country.

## Day One: One Server

<figure class="diagram">
<div class="flow">
<div class="node">Phone or Browser<small>client</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">One Server<small>our code, database, photos</small></div>
</div>
<figcaption>Everything on one machine</figcaption>
</figure>

Our code, the database and the photos all live on one machine. That's the right way to start. It's cheap, simple and easy to change while you're still finding out what students want.

It has two limits:

- **A ceiling**: one machine only has so much CPU, memory and disk.
- **A single point of failure**: a part whose failure stops everything. If this machine dies, the app is down.

Hitting the ceiling doesn't feel gradual. Response time stays flat, then shoots up once the machine is full:

<figure class="chart">
<div class="bars" role="img" aria-label="Response time stays near 100 milliseconds as users grow, then jumps to over a second once the server is full">
<div class="bar" style="--h: 8%"></div>
<div class="bar" style="--h: 8%"></div>
<div class="bar" style="--h: 9%"></div>
<div class="bar" style="--h: 9%"></div>
<div class="bar" style="--h: 10%"></div>
<div class="bar" style="--h: 11%"></div>
<div class="bar" style="--h: 13%"></div>
<div class="bar" style="--h: 17%"></div>
<div class="bar peak" style="--h: 28%"></div>
<div class="bar peak" style="--h: 52%"></div>
<div class="bar peak" style="--h: 100%"></div>
</div>
<div class="axis"><span>Few users</span><span>Server full</span></div>
<figcaption>Response time as users grow on one server (example numbers)</figcaption>
</figure>

That jump is the signal to take the next step.

## The Rule for Every Step

Don't add parts because big companies have them. Add one when something is actually slow or failing.

1. **Measure**: response times, errors, and how busy each machine is. See [Logs, Metrics and Traces](/system-design/observability).
2. **Find the bottleneck**: the one part that holds everything else back.
3. **Fix that part**, then measure again.

This goes a long way. Around 2016, Stack Overflow served millions of programmers from about 11 web servers and 4 database servers, and most of them were barely busy.

## The Usual Steps

The exact order changes from system to system, but most go roughly like this.

### 1. Make the Server Bigger

Registration week comes and pages slow down. The easiest fix is a bigger machine with more CPU and memory. No code changes. This is **scaling up**, also called vertical scaling.

It buys time, but the ceiling is still there, big machines get expensive fast, and it's still one machine. See [Scaling Up and Scaling Out](/system-design/scaling).

### 2. Give the Database Its Own Server

Our code and the database fight over the same CPU, memory and disk. On separate machines, each gets the hardware it needs, and the database no longer has to be reachable from the internet.

The cost: one more machine, and every query now crosses the network.

### 3. Add Servers Behind a Load Balancer

One web server can't keep up, and if it dies, the app is down. So we run several identical web servers. This is **scaling out**, or horizontal scaling. A **load balancer** sits in front and sends each request to one of them. If a server dies, the others keep going.

The catch: the next request can land on any server. If your login lived in server A's memory and your next click goes to server B, you'd be logged out. So login **sessions** move to a shared store, and the web servers keep nothing between requests. They become **stateless**. See [Stateless and Stateful Services](/system-design/stateless-stateful) and [Load Balancers](/system-design/load-balancers).

### 4. Copy the Database

Now the database is the busiest part, and still a single point of failure. Most requests only read: students browse far more than they post. So we keep copies called **replicas**. The **primary** database takes every write, and the replicas take the reads. If the primary dies, a replica can take over.

The cost: replicas run a little behind. A student posts a book and might not see it on the next page load. See [Single Leader Replication](/system-design/replication-one-leader) and [Replication Lag](/system-design/replication-lag).

### 5. Add a Cache

The same popular listings get read thousands of times. A **cache** keeps a copy of them in memory, which is far faster than the database. The server checks the cache first and goes to the database only when the cache doesn't have it.

The cost: cached data can go out of date, and knowing when to refresh it is hard. See [Where to Put a Cache](/system-design/where-to-cache).

### 6. Serve Photos From a CDN

Photos are the heaviest part of every page, and students far from our servers wait the longest. A **CDN** (content delivery network) keeps copies of files on servers around the world, so each photo comes from somewhere close.

The cost: another service to pay for, and a changed photo takes time to update everywhere. See [Content Delivery Networks (CDNs)](/system-design/cdn).

### 7. Move Slow Work to a Queue

Resizing an uploaded photo or sending a "your book sold" email makes the student wait. Instead, the server drops a job on a **message queue** and answers right away. Separate **worker** servers pick up jobs and do them in the background.

The cost: more moving parts, and a job can fail or run twice, so workers need retries and every job must be safe to run twice. Engineers call that **idempotent**. See [Message Queues and Pub/Sub](/system-design/message-queues).

### 8. Split the Database

Even with replicas, every write still goes to one primary. When writes or data outgrow it, we split the data across several databases, for example by campus. This is **sharding**. Each database holds only its part.

The cost: it's one of the hardest steps. Queries that need several parts get complicated, and moving data between parts later is painful. Teams put it off as long as they can. See [Sharding Strategies](/system-design/sharding).

### 9. Go to More Regions

If the app goes worldwide, students far away wait on every request, and one data center outage takes everyone down. So we run the system in several **regions**, each near its users, and send each user to the closest one.

The cost: keeping data in sync across regions is one of the hardest problems in the field. See [Serving Users Worldwide](/system-design/global-users).

## Where We End Up

<figure class="diagram">
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Servers<small>stateless</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Cache</div>
<div class="node">Database<small>primary, replicas</small></div>
<div class="node">Queue<small>slow jobs</small></div>
</div>
</div>
<figcaption>The textbook app after steps 1 to 7. Photos load straight from the CDN.</figcaption>
</figure>

## What Every Step Has in Common

- It fixes one bottleneck, and the next one shows up somewhere else.
- It adds parts to run, watch and pay for.
- It brings new ways to fail: a replica that lags, a cache that's out of date, a job that runs twice.

<u>So add a step only when the numbers say you need it.</u>

## Key Points

- Start on one server. It's cheap, simple and enough for longer than most people think.
- Grow by measuring, finding the bottleneck and fixing just that.
- A common order: bigger server, separate database, more servers behind a load balancer, database copies, cache, CDN, queue, then sharding and more regions.
- Every step fixes one problem and brings new costs and new ways to fail.
