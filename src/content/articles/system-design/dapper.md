> **Dapper** is Google's distributed tracing system. It follows one request through the many services that handle it, records each step as a timed span, links the spans into a tree with a shared trace id, and keeps a small sample of requests so that the cost stays low. Its main idea is to build the tracing into a few common libraries, so that application developers add no code.

A student opens a listing page in the textbook app and waits 270 ms. That is slow, and the dashboard says so: the 99th percentile latency of the web tier has doubled. It does not say why.

The page call fans out to a search service with 20 shards, a listing service and a price service, then renders. Any one of those, or the cache in front of them, could be at fault.

The web team says its servers are fine, since their own work takes 5 ms. The price team looks at their service and sees a good average.

Each team has data about its own part, and nobody has the data about the request. A request is a story that crosses many machines, and each machine's logs hold one page of it.

Google faced this with thousands of machines behind one search query. Its engineers wrote Dapper, a tracing system that has run in production for years and that they described in 2010.

The lessons in the paper are as useful as the system, because they explain why a tracing tool succeeds or fails: it must be on continuously, and it must cost very little.

This topic describes the data model, the trick of putting tracing in libraries, the role of sampling, and puts numbers on the two ideas that make it work, with our own simulations. It builds on [Logs, Metrics and Traces](/system-design/observability), and it is a good companion to [Service Meshes and Sidecars](/system-design/service-mesh).

## A Trace Is a Tree of Spans

Take the page request. It enters the front end, which calls the search service, then the listing and price services, and finally renders. The trace of that request is a tree.

Each node is a **span**: a unit of work with a name, a start and an end. An edge says that one span was started by another.

A span has an id, the id of its parent, and a trace id that is shared by the spans of the request. The ids are 64 bit random numbers, unique with high probability.

A span with no parent is the root. It holds timestamped records: its start and end, the timing of the RPC, and any notes that the application adds, such as "cache miss for this listing".

A subtle point is that a span for an RPC contains records from two machines, the client and the server. Their clocks differ, so the tool can't trust one timeline across the two.

It uses an ordering that holds each time: the client sends a request before the server receives it, and the server sends the response before the client receives it. That bounds where the server's span can sit inside the client's span, and the analysis works within the bounds.

The data model isn't tied to RPC either. Spans were used for the sessions of a mail service, for web requests from outside, and for queries sent to databases.

## Tracing Without Asking Developers

The system had two requirements: it must run everywhere, and it must run continuously. A tracing tool with holes in it is much less useful, since the missing hop is often where the problem is. And an unusual slow request is hard to reproduce, so the tool should already be watching when it happens.

Both requirements point at transparency. If a tracing tool needs each developer to add code, it breaks when one forgets, and it falls apart in an environment where teams ship each week. Dapper solved this by instrumenting a very small number of libraries that most code already used.

When a thread handles a traced request, the trace context, a small bundle of ids, is stored in thread local storage. When the code defers work with a common callback or thread pool library, the library stores the context with the callback and restores it when the callback runs, so the ids follow asynchronous paths.

And the RPC library creates spans around each call and sends the trace and span ids from client to server. With those three hooks, a complex system like web search could be traced without any change to the application code.

Where code uses its own communication, tracing breaks until someone propagates the context by hand. At the time of the paper, a few dozen applications of each language needed that, out of thousands.

Developers could add their own notes through a small API, with a limit on the volume per span so that no application could crowd out the structure.

The benefit is for the whole system, and it comes with a condition: it is easier when the environment is uniform, with one RPC framework and one threading model. A company with many frameworks needs a standard way to carry the context between them, as the trace context standard of OpenTelemetry and its predecessors do.

## Collecting Without Slowing Anyone Down

The collection path is out of band. Each process writes its span data to a local log file. A daemon on each machine reads those files and sends the data to central storage, where a trace is stored as one row, with one column per span, a good fit for a sparse table like those of [Bigtable](/system-design/bigtable).

The median time from a span being written to its being available was under 15 seconds. The tail was worse: the 98th percentile was under two minutes about three quarters of the time and could stretch to many hours the rest of the time.

Out of band was chosen for two reasons. Sending trace data back in the response headers would disturb the network behavior of the application, and in a big call tree the trace data could be larger than the answer itself.

It also fails when spans outlive their callers, as when a service replies before its backends are done, which a response header can't carry.

Privacy was handled by omission. Dapper stored the names of RPC methods and not the payloads, since a performance engineer shouldn't see user data. Developers who want data in a span add it as an annotation, which is an opt in.

## Sampling

Tracing each request costs too much, so Dapper traces a fraction. The decision is made once, at the start of a request, and is carried with the trace context, so a trace is complete or absent and has no missing middle spans.

A measurement on a web search cluster shows the cost. When each request was traced, average latency rose by 16.3 percent and throughput fell by 1.48 percent.

The cost fell as the sampling rate dropped: 9.40 percent at 1 in 2, 6.38 percent at 1 in 4, 4.12 percent at 1 in 8 and 2.12 percent at 1 in 16.

At 1 in 16 and below, the effects were within the experimental error, and at 1 in 1,024 the change in latency was 0.20 percent in the other direction.

The cost of an annotation on a request that isn't sampled is a thread local lookup of about 9 nanoseconds. The collection daemon used 0.125 to 0.267 percent of one core.

A rate that low sounds as though it would miss problems, and a rate as low as 1 in 1,024 turned out to be enough for services with high traffic.

We did the arithmetic for the textbook app at its peak of 3,000 requests a second, which is 10.8 million requests an hour. The table gives the expected number of traces captured in an hour for a problem that hits a given share of requests:

| Problem Hits | Sampled at 1 in 1 | Sampled at 1 in 16 | Sampled at 1 in 1,024 |
| --- | --- | --- | --- |
| 1 Request in 100 | 108,000 | 6,750 | 105 |
| 1 in 1,000 | 10,800 | 675 | 10.5 |
| 1 in 10,000 | 1,080 | 67.5 | 1.1 |
| 1 in 100,000 | 108 | 6.8 | 0.1 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Traces captured an hour for a problem hitting 1 request in 1,000, by sampling rate">
<div class="hbar peak"><span>Trace Each Request</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">10,800</span></div>
<div class="hbar"><span>1 in 16</span><span class="track"><span class="fill" style="--w: 6.3%"></span></span><span class="value">675</span></div>
<div class="hbar"><span>1 in 1,024</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">10.5</span></div>
</div>
<figcaption>Traces captured in an hour for a problem that hits 1 request in 1,000, at 3,000 requests a second, by sampling rate</figcaption>
</figure>

At peak traffic, a problem that touches 1 request in 1,000 still produces about 10 traces an hour at 1 in 1,024, enough to see its shape.

A problem that hits 1 in 100,000 is rare enough that a trace of it is a matter of luck, and for such events other tools, such as a log that records each case, serve better.

The same arithmetic shows the weak side. A small service with 5 requests a second, 18,000 an hour, gets about 0.2 traces an hour from a 1 in 1,024 sample of a problem that hits 1 request in 100.

It needs a higher rate, which is why adaptive sampling is the better plan: a target number of traces per unit of time and not a fixed fraction, so that busy services sample a small share and quiet ones a larger one.

## What a Trace Shows That a Metric Can't

We built a model of the textbook page request to see what tracing adds. The request spends about 5 ms in the front end, calls a search service that fans out to 20 shards and waits for the slowest, then calls the listing service and the price service in parallel, then renders.

All are modeled with a spread of latencies, and in 2 percent of calls the price service misses its cache and takes about 200 ms more.

Over 200,000 simulated requests, the median was 63 ms and the 99th percentile 271 ms. A metric of the whole request shows just that, a tail twice the median, and offers no direction.

The trace gives the breakdown for the slowest 1 percent of requests: in each one, the largest span was the parallel call to the listing and price services, and the price service was the slower of the two.

Spans from the search fan out, with 20 shards, which looks like the obvious culprit, didn't dominate the slowest requests, since the maximum over 20 shards varies little.

| Question | Answer From a Dashboard | Answer From Traces |
| --- | --- | --- |
| How Slow Is the Tail | 271 ms at the 99th percentile | The same |
| Where Is the Time | Unknown | The price service, in each slow request |
| Why | Unknown | A cache miss annotation on 2 percent of price calls |
| What to Fix | A guess | The price cache |

The 2 percent of cache misses is the part that no average of the price service shows. It explains almost exactly the 1 percent tail of the whole request, and it is invisible in a mean that is dominated by the fast 98 percent.

## Beyond the Single Trace

The system began as a tool for viewing a trace and became a platform.

Because traces are stored in a table with an API, other tools could be built on them: analysis of the shape of trace trees to find which services depend on which, the discovery of shared resources, and the grouping of traces by annotations, such as the name of a table being read.

Teams used it to find the services that call a storage system, to find out why a particular call is repeated, and to measure the effect of an upgrade across a whole fleet. It also showed a security benefit, since traces of authentication parameters can verify that services use encryption where they should.

The lesson in the paper is a lesson about adoption. The tool reached everywhere because it cost very little, asked no work of developers, and gave answers that mattered to people on call.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Instrumentation | The HTTP and RPC clients and servers, so the trace id travels on each call |
| Context | A trace id and span id in a standard header, copied across queues and callbacks |
| Sampling | 1 in 1,024 at peak and a higher rate for quiet services, decided at the entry point |
| Slow Requests | Keep each trace over a latency limit, such as 250 ms, in addition to the sample |
| Annotations | Cache hit or miss and the shard count, on the spans that matter |
| Privacy | Method names and ids, with no payloads and no personal data |
| Storage | Traces by id, searchable by service, latency and annotation |

## Pitfalls

- **Tracing added by hand in each service**: One missing hop hides the real problem
- **Tracing each request at peak**: The overhead is noticeable in latency
- **A fixed sampling rate for a small service**: It captures almost no traces of a rare problem
- **Context lost at a queue or a callback**: The trace splits in two
- **Payloads in spans**: Personal data reaches people who shouldn't see it
- **Reading averages for the tail**: The slow minority is hidden by the fast majority
- **Comparing timestamps across machines without bounds**: Clock skew makes a child seem to start before its parent

## Key Points

- A trace follows one request as a tree of spans that share a trace id, and each span is a timed unit of work with a parent, with client and server records combined and clock skew bounded by the order of send and receive
- Tracing in a few common libraries, for threads, callbacks and RPC, gives application level transparency and tracing everywhere, which was a requirement
- <u>Sampling keeps the cost small</u>: tracing each request raised average latency 16.3 percent in the original test, and a rate of 1 in 1,024 stayed within the experimental error, and still produced about 10 traces an hour for a problem that hits 1 request in 1,000 at 3,000 requests a second
- Traces explain what metrics can't: in our model, the slowest 1 percent of requests spent their time in the price service, because 2 percent of its calls missed a cache, and the 20 shard fan out wasn't the cause
- Collect out of band, keep payloads out of spans, and use an adaptive rate so that quiet services still get traces
