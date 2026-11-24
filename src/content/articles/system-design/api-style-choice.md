> No API style is best everywhere. The right one fits who calls it and what they need, and most real systems use more than one.

The last three topics each made a case for one style. [REST APIs](/system-design/rest) organize an API around resources and the HTTP methods. [RPC and gRPC](/system-design/rpc-grpc) call functions on other machines through a strict contract. [GraphQL](/system-design/graphql) lets the client ask for exactly the fields it wants. This topic puts them side by side, so you can choose on purpose instead of by habit.

## One Question, Three Answers

Take one request: "get listing 42, with its seller's name". Here it is in each style:

```text
REST
GET /listings/42?include=seller

gRPC
rpc GetListing (GetListingRequest) returns (Listing);
  with a request holding id = 42 and include_seller = true

GraphQL
query { listing(id: 42) { title price seller { name } } }
```

All three get the job done. The differences show up in what surrounds the call: who can use it, what it costs to run, and how it holds up as more clients and screens arrive.

## Side by Side

| | REST | gRPC | GraphQL |
| --- | --- | --- | --- |
| Shape | Resources with URLs | Functions in a contract | A typed graph behind one URL |
| Message Format | Usually JSON | Protocol Buffers, binary | JSON |
| Contract | Optional, often OpenAPI | Required, a .proto file | Required, the schema |
| Who Picks the Fields | The server, with some options | The server | The client |
| Browsers | Work natively | Need a proxy and gRPC-Web | Work natively |
| HTTP Caching | Strong, GET responses cache | Not used | Weak, needs persisted queries |
| Live Updates | Added separately | Streaming built in | Subscriptions |
| Trying It by Hand | Easiest, with a browser or curl | Needs special tools | Needs a tool, and some practice |

No column wins every row, which is the usual sign of a tradeoff, in the sense of [Thinking in Tradeoffs](/system-design/trade-offs). The deciding factor is rarely a row. It is who sits on the other side of the call.

## Who is Calling

Start with the caller, because it settles most of the choice:

| The Caller | A Common Pick | Why |
| --- | --- | --- |
| Outside developers, such as a bookstore partner | REST | Easy to try with curl, cacheable at a CDN, and nearly every language can call it |
| Our own phone and web apps, with many screens | GraphQL, or REST with endpoints shaped for each screen | The client controls the fields, so fewer round trips and less waste |
| Our own services, calling each other | gRPC | A strict contract, generated clients, streaming and low overhead |

Notice how often an answer in one row is wrong for the next. A partner with a script can't easily use a binary protocol, and a service making a thousand calls a second gains little from a URL per field. That is why the usual outcome is a combination, with each style where it fits best:

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Partner<small>REST</small></div>
<div class="node">Phone App<small>GraphQL</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Edge API<small>one front door</small></div>
<div class="arrow" data-label="gRPC" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listing Service</div>
<div class="node">User Service</div>
<div class="node">Message Service</div>
</div>
</div>
<figcaption>A common combination: friendly styles at the edge, gRPC inside</figcaption>
</figure>

The edge part is often handled by an API gateway, from [API Gateways](/system-design/api-gateways). Each extra style adds tools and skills the team has to maintain, so use more than one only when the callers differ, as they do here.

## Don't Choose on Speed Alone

Binary protocols are faster in benchmarks, and that makes them tempting. Take the numbers with care. In Ian Gorton's rerun of a REST and gRPC study, the Protocol Buffers payload was about a third the size of the same data in JSON, and the gap in throughput grew with message size. Google's gRPC team measured serializing about three times faster on mobile devices. Many such tests run on one machine, though, and say little about a real network.

In a real request, the time often goes elsewhere. Remember the waterfall from [The Life of a Request](/system-design/life-of-a-request), where only 50 ms of 300 ms was our code. Compared with a database query or a trip across the country, the cost of reading JSON is often small. Before changing styles for speed, measure with your own message sizes and your own network, and use [Numbers Every Engineer Should Know](/system-design/numbers) to see whether the encoding is even the slow part.

## Questions to Ask

Walk through these in order, and stop at the first one that points somewhere:

1. **Who calls it?** Outsiders and browsers point to REST. Your own services point to gRPC
2. **Do clients need different slices of the data?** Many screens or many client types point to GraphQL, or to endpoints shaped for each
3. **Is it high volume between services, or streaming?** That points to gRPC
4. **Does it need to be cached at a CDN?** That favors REST
5. **What can the team run and debug at 2 AM?** A tool the team knows well beats a better tool no one on the team understands

With no strong signal, start with REST and JSON. It has the most tools, the most people who know it, and the easiest debugging, and you can add another style where a real need appears, as with any step in [From One Server to Many](/system-design/one-server-to-many).

## Changing Your Mind Later

Not every choice is equally hard to undo. In [Thinking in Tradeoffs](/system-design/trade-offs), a public API was one of the one way doors, because outside clients depend on it. The style of the edge is therefore the choice to make carefully.

The calls between your own services are a two way door: you control both sides, so you can move one service at a time. A new style can be added next to the old one, and the old one retired once no one calls it. See [API Versioning](/system-design/api-versioning) for how to move callers over.

## Key Points

- REST, gRPC and GraphQL each fit a different caller, and most systems combine them
- REST suits public APIs, since it is easy to try, cache and debug
- GraphQL suits front ends with many screens, since the client picks the fields
- gRPC suits calls between your own services, with strict contracts and streaming
- <u>Choose by who is calling</u>, not by benchmark speed, since the encoding is rarely the slowest part
- With no strong signal, start with REST and JSON, and treat the public edge as the choice that is hardest to undo
