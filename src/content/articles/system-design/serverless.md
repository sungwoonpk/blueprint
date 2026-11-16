> **Serverless computing** lets you run code without managing servers: the provider starts instances when work arrives, scales them with demand and bills for what runs. **Functions as a Service** (FaaS) is its best known form.

The name is misleading, since servers still exist. What disappears is your work with them. In [Containers and Orchestration](/system-design/containers), you still decide how many copies to run and keep a cluster healthy. Serverless takes that decision away: you hand over a function, say when it should run, and the provider handles the rest.

## How a Function Runs

A function is a small piece of code that runs in response to an **event**, such as an HTTP request, a message in a queue, a file landing in storage or a timer. In the textbook app, the clearest fit is photo resizing. A student uploads a photo, and a function makes the thumbnails:

<figure class="diagram">
<div class="flow">
<div class="node">Photo Upload</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Object Storage</div>
<div class="arrow" data-label="event" aria-hidden="true"></div>
<div class="stack">
<div class="node">Function</div>
<div class="node">Function</div>
<div class="node">Function</div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Thumbnails</div>
</div>
<figcaption>Each upload triggers its own function, and a rush of uploads simply runs more of them at once</figcaption>
</figure>

The code is only the handler:

```python
def handler(event, context):
    for record in event["Records"]:
        key = record["s3"]["object"]["key"]
        photo = storage.read(key)
        storage.write("thumbs/" + key, shrink(photo, width=300))
```

Amazon's documentation describes Lambda this way: you provide the handler and a trigger, and each invocation runs on its own, with no state shared between them. That fits the stateless idea from [Stateless and Stateful Services](/system-design/stateless-stateful) taken as far as it goes. Anything that must last goes to a database or storage, and the function's own memory isn't safe to rely on.

## Scaling Without Asking

No one sets a server count. For each request that is in flight, the platform gives the function an execution environment of its own, and in Lambda's model an environment handles one request at a time.

AWS gives a formula for how many that makes: concurrency equals requests per second times the average duration in seconds. It is the same relation as in [Latency and Throughput](/system-design/latency-throughput), and with the numbers from [Estimating Capacity](/system-design/estimation) it says what to expect:

```text
3,000 requests a second x 0.1 seconds = 300 environments running at once
```

Lambda's default limit is 1,000 concurrent executions per Region, so that fits, and a quota increase raises it. Scaling isn't instant, though. Lambda can add 1,000 new environments every 10 seconds per function. A sudden jump, like registration at 9:00 AM, can outrun that, and requests beyond the limits are dropped.

Different platforms make different choices here, and the differences matter:

- **AWS Lambda**: one request per environment, which is simple and scales out widely
- **Google Cloud Run**: runs a container, and one instance serves many requests at once, 80 by default and up to 1,000, so it needs fewer instances. It scales to zero when idle
- **Azure Functions**: its newer Flex Consumption plan scales to zero and offers "always ready" instances to avoid slow starts

Every platform sets limits that shape what you can build there. These are AWS Lambda's:

| Limit | Value |
| --- | --- |
| Run Time per Invocation | 15 minutes |
| Memory | 128 MB to 10,240 MB, with CPU growing alongside |
| Request and Response Size | 6 MB each, for a direct call |
| Code Package | 50 MB zipped, or a container image up to 10 GB |
| Concurrent Executions | 1,000 per Region by default |

## Cold Starts

When no environment is free, a new one has to be built: the code is downloaded, the runtime starts and your startup code runs. This delay is a **cold start**, and the first request on that environment pays for it. Later requests reuse the environment, a warm start, and skip all of it.

<figure class="diagram">
<p class="rowname">Cold Start</p>
<div class="flow packets">
<div class="node wait">Create<small>environment</small></div>
<div class="node wait">Init<small>your startup code</small></div>
<div class="node">Run<small>the handler</small></div>
</div>
<p class="rowname">Warm Start</p>
<div class="flow packets">
<div class="node">Run<small>the handler</small></div>
</div>
<figcaption>A warm environment skips straight to the handler</figcaption>
</figure>

AWS says cold starts happen in under 1% of invocations in production workloads, and last from under 100 ms to over a second. They are more common for rarely used functions and during sudden growth, since each new environment starts cold. The tools to reduce them:

- **Provisioned concurrency**: keeps a set number of environments initialized and ready, and it is billed
- **SnapStart**: starts new environments from a saved snapshot of an already initialized one. It is available for Java, Python and .NET, with some restrictions
- **Minimum instances**: Cloud Run keeps a chosen number of instances warm, so the service doesn't scale all the way to zero
- **A light startup**: less code to load and less work before the handler

The warm environment is also where a common bug comes from. Anything set up outside the handler stays alive between calls, which is useful and risky at once:

```python
db = connect()                    # runs once per environment

def handler(event, context):
    return db.query("SELECT 1")   # reused while the environment stays warm
```

AWS warns not to count on an environment lasting. It is recycled every few hours, so code should check that a cached connection still works before using it.

And since each environment holds its own connection, 300 busy environments mean 300 database connections, which a database sized for a few web servers may not tolerate. The pooling idea from [TCP and UDP](/system-design/tcp-udp) applies, usually with a pooling proxy in front of the database.

## What It Costs

Serverless is billed by use. For Lambda, that is a small price per request and a price per GB-second, which is memory times running time. Using the rates on AWS's pricing page for x86 functions in US East, $0.20 per million requests and $0.0000166667 per GB-second, and ignoring the free allowance, here are two workloads of the textbook app:

| | Photo Resizing | The Main API |
| --- | --- | --- |
| Traffic | 90,000 photos a day | 300 requests a second, on average |
| Per Request | 0.5 GB for 0.8 s, so 0.4 GB-seconds | 0.5 GB for 0.1 s, so 0.05 GB-seconds |
| Requests per Month | 2.7 million | 777.6 million |
| Compute Cost | $18.00 | $648 |
| Request Cost | $0.54 | $155.52 |
| Monthly Total | About $18.54 | About $803.52 |

The first is a bargain. It is bursty, it sits idle most of the day, and it would waste a server. The second adds up fast, because it is busy around the clock, and a server costs the same busy or idle. That is the pattern: serverless wins for spiky, rare or unpredictable work, and an always-on fleet often wins for steady heavy load. The comparison needs your own numbers.

## The Limits of the Model

Researchers at Berkeley, in a paper from 2018 titled "Serverless Computing: One Step Forward, Two Steps Back", listed weaknesses of the first generation of these services, and some still shape designs:

- **Limited lifetimes**: a function can't run forever, so long jobs have to be split up or run elsewhere
- **Slow data access**: functions can't be reached directly, so they pass data through storage. They measured about 108 ms to read 1 KB from S3, against about 290 microseconds for direct messaging, the gap from [Numbers Every Engineer Should Know](/system-design/numbers)
- **Code goes to the data**: the model moves data to the code, which is costly for heavy data work

Other cautions come from Martin Fowler's overview: the provider's limits and prices are not yours to control, local testing doesn't match the cloud exactly, and a function that runs rarely pays startup latency on each call. Azure adds a detail worth knowing: an HTTP triggered function must answer within 230 seconds, whatever its own timeout says.

## Where It Fits

| A Good Fit | A Poor Fit |
| --- | --- |
| Event driven glue, such as resizing photos or sending emails | Steady, high traffic that keeps servers busy anyway |
| Handling [webhooks](/system-design/webhooks) and scheduled jobs | Long running work |
| Rare or spiky traffic, and prototypes | Tight loops that need microsecond access to data |
| Consuming queues, as in [Task Queues](/system-design/task-queues) | Work that needs special hardware, or heavy state held in memory |

Most systems mix styles. The textbook app's main API might run in containers, with functions around the edges for photo resizing, webhooks and nightly clean ups. The next topics move on to protecting all of this from too much traffic, starting with [Rate Limiting Algorithms](/system-design/rate-limiting-algorithms).

## Key Points

- Serverless runs functions on demand, scaling and billing by use, and you manage no servers
- Functions are stateless and event triggered, and state lives in databases and storage
- Platforms scale by concurrency, which is requests per second times duration, within limits on concurrency, scaling speed, run time and size
- Cold starts delay the first request on a new environment, and provisioned concurrency, snapshots or minimum instances reduce them
- <u>Billing by use favors spiky work</u>, while a steady heavy load can cost more than always-on servers
- Use it for event driven glue and uneven traffic, and keep long, data heavy or steady work on regular servers
