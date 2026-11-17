> **RPC**, remote procedure call, lets one program call a function that runs on another machine as if it were a local one. **gRPC** is the most widely used RPC framework today: it sends Protocol Buffers over HTTP/2.

[REST APIs](/system-design/rest) are built around things: you read and change resources with a few standard methods. RPC starts from the other end, with actions.

The caller wants `search_listings(subject)` or `reserve_book(id)`, and the framework takes care of carrying the call to the right machine and bringing back the answer. This style is common between the services inside a company, where both sides are code you control.

## A Function Call That Crosses the Network

Say the textbook app has grown, and searching has moved into its own **service**, a separate program with a single job. The web server now calls it. In code, the call can look like any other:

```python
books = search_service.search_listings(subject="calculus")
```

Behind that one line, generated code does the carrying. A **stub** is a small piece of client code with the same shape as the remote function. It packs the arguments into bytes, as in [Serialization and Schema Evolution](/system-design/serialization), sends them, waits, and unpacks the reply:

<figure class="diagram">
<div class="flow">
<div class="node">Your Code<small>calls a function</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Client Stub<small>packs the call</small></div>
<div class="arrow" data-label="network" aria-hidden="true"></div>
<div class="node">Server Stub<small>unpacks it</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Real Function<small>does the work</small></div>
</div>
<figcaption>The stubs hide the network, and the reply travels back the same way</figcaption>
</figure>

## It is Not a Local Call

The convenience hides a trap. In 1994, Jim Waldo and colleagues at Sun wrote "A Note on Distributed Computing", arguing that a remote call can't be treated like a local one. Several differences stay no matter how good the framework is:

- **Time**: a local call takes nanoseconds, while a call inside one data center takes about half a millisecond, thousands of times longer. From [Numbers Every Engineer Should Know](/system-design/numbers), a loop that makes 100 remote calls is no longer free
- **Partial failure**: the call can fail with no answer. The server may have done the work, with only the reply lost, which is the problem from [How Clients and Servers Talk](/system-design/client-server). A local call either returns or crashes the whole program
- **Data is copied, not shared**: the other machine gets a copy of the arguments, so a pointer or an open file means nothing there
- **Versions differ**: caller and callee are deployed separately, so they run different versions at times, the situation in [Serialization and Schema Evolution](/system-design/serialization)

Good RPC systems don't hide these. They give you deadlines, error codes and a contract, so that your code handles them on purpose.

## gRPC in Practice

gRPC starts with the contract, written once in a `.proto` file:

```proto
service Listings {
  rpc GetListing (GetListingRequest) returns (Listing);
  rpc SearchListings (SearchRequest) returns (stream Listing);
}
```

A tool reads this file and generates the client stub and the server skeleton in many languages, so a Python web server can call a Go search service with no hand written glue.

The messages are Protocol Buffers, small and quick to read and write, and the calls travel over HTTP/2, where many calls share one connection, the multiplexing from [How HTTP Works](/system-design/http). Because the contract is code, in most languages a call with a wrong field name fails to compile, not in production.

The word `stream` in the second line points at something REST doesn't have built in. gRPC supports four shapes of call:

| Call Type | What Happens | A Textbook App Example |
| --- | --- | --- |
| Unary | One request, one reply | Get listing 42 |
| Server Streaming | One request, many replies over time | Send search results as they are found |
| Client Streaming | Many requests, one reply | Upload a photo in chunks, then get its URL |
| Bidirectional Streaming | Both sides send whenever they like | A live chat between buyer and seller |

## Deadlines, Errors and Retries

A call that hangs ties up the caller, as in [How Clients and Servers Talk](/system-design/client-server), so gRPC makes the time limit a normal part of every call.

The caller sets a **deadline**, how long it will wait in total, and the server can see how much is left. gRPC sets none by default, so each call should get one.

The useful part is that the deadline travels along the chain. If the phone gives up after 300 ms, there is no point in a service three calls deep working for 2 seconds:

<figure class="diagram">
<div class="flow">
<div class="node">Web Server<small>300 ms left</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Search Service<small>220 ms left</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Ranking Service<small>150 ms left</small></div>
</div>
<figcaption>Each service passes along the time that remains (example numbers)</figcaption>
</figure>

Whether the deadline passes down the chain by itself depends on the language. Go and Java do it by default and C++ needs it switched on, so check yours. gRPC sends the time that remains, not a clock time, so machines with different clocks still agree.

When the deadline passes, the server cancels the call, but work your own code started has to stop too, or a slow call keeps burning resources after no one is waiting for the answer.

Errors use gRPC's own status codes, not the HTTP ones from [How HTTP Works](/system-design/http). Names such as `NOT_FOUND`, `INVALID_ARGUMENT`, `DEADLINE_EXCEEDED` and `UNAVAILABLE` carry the meaning. The outcome travels in a status sent after the response, and the HTTP status of the underlying message is normally 200 even when the call failed, as the protocol definition lays out.

`UNAVAILABLE` is the one meant for temporary trouble, worth retrying with backoff, and `INVALID_ARGUMENT` means the request itself is wrong, so retrying won't help. gRPC doesn't assume a call is safe to repeat.

Retries are off until you configure them for a method, with a number of attempts, a backoff and a list of codes, often just `UNAVAILABLE`, and they are only safe for calls that are safe to repeat. See [Timeouts, Retries and Backoff](/system-design/timeouts-retries) and [Idempotency and Safe Retries](/system-design/idempotency).

## Load Balancing Needs Care

One side effect of HTTP/2 catches teams out. A gRPC client opens a connection and keeps it, sending thousands of calls down it. A load balancer that spreads connections, not individual calls, sees one connection and sends all of it to one server:

<figure class="diagram">
<p class="rowname">Balancing Connections</p>
<div class="flow">
<div class="node">Client<small>one connection</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node hot">Server A<small>all calls</small></div>
<div class="node wait">Server B<small>idle</small></div>
<div class="node wait">Server C<small>idle</small></div>
</div>
</div>
<p class="rowname">Balancing Calls</p>
<div class="flow">
<div class="node">Client<small>one connection</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer<small>reads each call</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Server A<small>a third</small></div>
<div class="node">Server B<small>a third</small></div>
<div class="node">Server C<small>a third</small></div>
</div>
</div>
<figcaption>With long lived connections, the balancer has to look at individual calls</figcaption>
</figure>

The fixes, which gRPC's [own post on load balancing](https://grpc.io/blog/grpc-load-balancing/) describes, are a balancer that understands HTTP/2 and routes each call, a client that knows all the servers and picks one per call, or a service mesh doing the same job beside each service. See [Load Balancers](/system-design/load-balancers) and [Service Meshes and Sidecars](/system-design/service-mesh).

## Where gRPC Fits

gRPC suits calls between services you control:

- **Many services in different languages**: one contract, generated clients for each
- **High volume**: small messages and shared connections keep the cost per call low
- **Streaming**: it is built in, instead of added later with polling or WebSockets
- **Strict contracts**: the compiler catches many mistakes

It is a weaker fit in a few places. Browsers can't speak the full protocol, so a web app needs a proxy and a variant called gRPC-Web, which supports only plain calls and server streaming.

Third parties trying out a public API prefer something they can call with `curl` and read in a log, which favors REST and JSON. And binary messages need tools to inspect, where JSON can be read as is.

So many systems use both: REST and JSON at the edge for browsers and partners, and gRPC between the services inside, often with an [API Gateways](/system-design/api-gateways) translating between them. gRPC is also one choice among several RPC systems, such as Apache Thrift and JSON-RPC, which share the same idea.

[Choosing Between REST, RPC and GraphQL](/system-design/api-style-choice) puts the styles side by side.

## Key Points

- RPC calls a function on another machine as if it were local, using generated stubs that pack, send and unpack
- A remote call isn't a local one: it is slower, can fail halfway, copies its data and meets different versions
- gRPC defines the contract in a .proto file, uses Protocol Buffers over HTTP/2, and supports unary and streaming calls
- <u>Set a deadline on each call</u> and pass the remaining time down the chain
- Long lived HTTP/2 connections need a balancer that looks at individual calls
- Use gRPC between your own services and REST and JSON at the edge for browsers and partners
