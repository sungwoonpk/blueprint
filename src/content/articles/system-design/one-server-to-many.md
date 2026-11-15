> Most big systems started on **one server**. They grew one step at a time, and each step fixed whatever was breaking at that moment.

Remember the textbook app from [What Is System Design?](/system-design/what-is-system-design) Here's how it might grow from one campus to every campus in the country.

## Day One: One Server

Our code, the database and the photos all live on one machine. That's usually the right way to start. It's cheap, simple and easy to change while you're still finding out what students want.

It has two limits:

- **A ceiling**: one machine only has so much CPU, memory and disk
- **A single point of failure**: a part whose failure stops everything. If this machine dies, the app is down

Hitting the ceiling doesn't feel gradual. Response time stays flat, then shoots up once the machine is full:

<figure class="chart">
<svg class="line" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Response time stays near 100 milliseconds as users grow, then jumps to over a second once the server is full">
<line class="grid" x1="0" y1="40" x2="100" y2="40"></line>
<path class="area" d="M0 37 C1.7 37 6.7 37.1 10 37 C13.3 37 16.7 36.7 20 36.7 C23.3 36.6 26.7 36.7 30 36.7 C33.3 36.6 36.7 36.4 40 36.3 C43.3 36.2 46.7 36.1 50 35.9 C53.3 35.7 56.7 35.6 60 35.2 C63.3 34.8 66.7 34.6 70 33.7 C73.3 32.8 76.7 31.8 80 29.6 C83.3 27.5 86.7 25.2 90 20.8 C93.3 16.3 98.3 6 100 3 L100 40 L0 40 Z"></path>
<path class="stroke" d="M0 37 C1.7 37 6.7 37.1 10 37 C13.3 37 16.7 36.7 20 36.7 C23.3 36.6 26.7 36.7 30 36.7 C33.3 36.6 36.7 36.4 40 36.3 C43.3 36.2 46.7 36.1 50 35.9 C53.3 35.7 56.7 35.6 60 35.2 C63.3 34.8 66.7 34.6 70 33.7 C73.3 32.8 76.7 31.8 80 29.6 C83.3 27.5 86.7 25.2 90 20.8 C93.3 16.3 98.3 6 100 3"></path>
</svg>
<div class="axis"><span>Few users</span><span>Server full</span></div>
<figcaption>Response time as users grow on one server (example numbers)</figcaption>
</figure>

That jump is the signal to take the next step. But which step?

## The Rule for Every Step

Whichever one fixes what is breaking right now. Don't add parts because big companies have them.

1. **Measure**: response times, errors, and how busy each machine is. See [Logs, Metrics and Traces](/system-design/observability)
2. **Find the bottleneck**: the one part that holds everything else back
3. **Fix that part**, then measure again

This goes a long way. Around 2016, Stack Overflow served millions of programmers from about 11 web servers and 4 database servers, and most of them were barely busy.

## The Usual Steps

Here is how that rule usually plays out for the textbook app. The exact order changes from system to system.

### 1. Make the Server Bigger

Registration week comes and our one server slows down. The easiest fix is a bigger machine with more CPU and memory (in the cloud, a bigger instance type). No code changes. This is **scaling up**, also called vertical scaling.

It buys time, but the ceiling is still there, big machines get expensive fast, switching to one usually means some downtime, and it's still one machine. See [Scaling Up and Scaling Out](/system-design/scaling).

### 2. Give the Database Its Own Server

The bigger machine still runs everything at once, so our code and the database fight over its CPU, memory and disk. On separate machines, each gets the hardware it needs and can be tuned and upgraded on its own.

The cost: one more machine, and every query now crosses the network.

### 3. Add Servers Behind a Load Balancer

With the database moved out, the web server is next: one can't keep up at peak, and if it dies, the app is down. So we run several identical web servers. This is **scaling out**, or horizontal scaling. A **load balancer** sits in front and sends each request to one of them. If a server dies, the others keep going. The load balancer itself usually runs as a pair, so it doesn't become the new single point of failure. Common ones are NGINX, HAProxy and the load balancers cloud providers sell.

<figure class="diagram">
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Web Server A</div>
<div class="node">Web Server B</div>
<div class="node">Web Server C</div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Session Store<small>who is logged in</small></div>
</div>
<figcaption>Any server can take any request</figcaption>
</figure>

The catch: the next request can land on any server. If your login lived in server A's memory and your next click goes to server B, you'd be logged out. So login **sessions** move to a shared store, and the web servers keep nothing between requests. They become **stateless**. In code, the change is where the sessions live:

```python
# One server: sessions live in this server's memory
sessions = {}

# Many servers: a shared store every server asks
sessions = redis.Redis(host="session-store")
```

See [Stateless and Stateful Services](/system-design/stateless-stateful) and [Load Balancers](/system-design/load-balancers).

### 4. Copy the Database

Web servers can now be added at will, so the load moves to the one thing they all share. The database is the busiest part, and still a single point of failure. Most requests only read: students browse far more than they post. So we keep copies called **replicas**. The **primary** database takes every write, and the replicas take the reads. If the primary dies, a replica can take over.

<figure class="diagram">
<p class="rowname">Write</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" data-label="writes" aria-hidden="true"></div>
<div class="node">Primary</div>
<div class="arrow" data-label="copies" aria-hidden="true"></div>
<div class="stack">
<div class="node">Replica</div>
<div class="node">Replica</div>
</div>
</div>
<p class="rowname">Read</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" data-label="reads" aria-hidden="true"></div>
<div class="node">Replica</div>
</div>
<figcaption>Every write goes to the primary; reads are spread over the replicas</figcaption>
</figure>

The cost: replicas run a little behind. A student posts a book and might not see it on the next page load. See [Single Leader Replication](/system-design/replication-one-leader) and [Replication Lag](/system-design/replication-lag).

### 5. Add a Cache

Replicas spread the reads, but the same popular listings are still read from the database thousands of times. A **cache** keeps a copy of them in memory, which is usually far faster than the database. Redis and Memcached are the usual picks.

<figure class="diagram">
<p class="rowname">Cache Hit</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" data-label="asks" aria-hidden="true"></div>
<div class="node">Cache<small>has it, fast</small></div>
</div>
<p class="rowname">Cache Miss</p>
<div class="flow">
<div class="node">Web Server</div>
<div class="arrow" data-label="asks" aria-hidden="true"></div>
<div class="node">Cache<small>doesn't have it</small></div>
<div class="arrow" data-label="then" aria-hidden="true"></div>
<div class="node">Database<small>result saved to cache</small></div>
</div>
<figcaption>Popular data is served from memory; the database sees only the misses</figcaption>
</figure>

The cost: cached data can go out of date, and knowing when to refresh it is hard. See [Where to Put a Cache](/system-design/where-to-cache).

### 6. Serve Photos From a CDN

Pages now come back fast, except the photos. They are usually the heaviest part of a page, and students far from our servers wait the longest. A **CDN** (content delivery network) keeps copies of files on servers around the world, so each photo comes from somewhere close. Cloudflare, Amazon CloudFront and Akamai are well known ones.

The cost: another service to pay for, and a changed photo takes time to update everywhere. See [Content Delivery Networks (CDNs)](/system-design/cdn).

### 7. Move Slow Work to a Queue

Reading is fast everywhere now. What's still slow are actions with heavy work behind them: resizing an uploaded photo or sending a "your book sold" email makes the student wait. Instead, the server drops a job on a **message queue** and answers right away. Separate **worker** servers pick up jobs and do them in the background. RabbitMQ and Amazon SQS are common queues.

<figure class="diagram">
<div class="flow">
<div class="node">Web Server<small>answers right away</small></div>
<div class="arrow" data-label="jobs" aria-hidden="true"></div>
<div class="node">Queue</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Worker</div>
<div class="node">Worker</div>
</div>
</div>
<figcaption>Workers resize photos and send emails while the student moves on</figcaption>
</figure>

The cost: more moving parts, and a job can fail or run twice, so workers need retries and jobs must be safe to repeat. Engineers call that **idempotent**. See [Message Queues and Pub/Sub](/system-design/message-queues).

### 8. Split the Database

Reads, photos and slow jobs are handled. The next bottleneck is writing: even with replicas, every write still goes to one primary. When writes or data outgrow it, we split the data across several databases, for example by campus. This is **sharding**. Each database holds only its part.

<figure class="diagram">
<div class="flow">
<div class="node">Web Servers</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Database 1<small>campuses A to H</small></div>
<div class="node">Database 2<small>campuses I to P</small></div>
<div class="node">Database 3<small>campuses Q to Z</small></div>
</div>
</div>
<figcaption>Each campus's data lives in exactly one database</figcaption>
</figure>

The cost: it's one of the hardest steps. Queries that need several parts get complicated, and moving data between parts later is painful. Teams put it off as long as they can. See [Sharding Strategies](/system-design/sharding).

### 9. Go to More Regions

Everything so far still lives in one place. If the app goes worldwide, students far away wait on every request, and one data center outage takes everyone down. So we run the system in several **regions**, each near its users, and send each user to the closest one.

The cost: keeping data in sync across regions is one of the hardest problems in the field. See [Serving Users Worldwide](/system-design/global-users).

## Where We End Up

Put together, steps 1 to 7 turn the single server into this:

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
<figcaption>Photos load straight from the CDN</figcaption>
</figure>

## What Every Step Has in Common

Look back over the nine steps and the same pattern repeats:

- Each step fixes one bottleneck, and the next one shows up somewhere else
- Each step adds parts to run, watch and pay for
- Each step brings new ways to fail: a replica that lags, a cache that's out of date, a job that runs twice

<u>So add a step only when the numbers say you need it.</u>

## Key Points

- Start on one server. It's cheap, simple and enough for longer than most people think
- Grow by measuring, finding the bottleneck and fixing just that
- A common order: bigger server, separate database, more servers behind a load balancer, database copies, cache, CDN, queue, then sharding and more regions
- Each step usually fixes one problem and brings new costs and new ways to fail
