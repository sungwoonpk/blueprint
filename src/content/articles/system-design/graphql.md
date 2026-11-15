> **GraphQL** is a query language for APIs. The client describes exactly which data it wants, in the shape it wants it, and the server returns that and no more, through a single endpoint.

In [REST APIs](/system-design/rest), the phone's listings screen needed 21 requests: one for the list and one per seller. It was also handed 30 fields to show two. GraphQL was built to fix that kind of mismatch. Facebook's engineers created it in 2012 so the native News Feed on phones could ask for exactly the data a screen needed. The GraphQL specification says development of an open standard began in 2015, the year Facebook described it publicly in [GraphQL: A Data Query Language](https://engineering.fb.com/2015/09/14/core-data/graphql-a-data-query-language/). This topic covers how it works, and what it costs in exchange.

## Ask for What You Need

Here is the same screen as one GraphQL request. The client lists the fields it wants, including the seller's, nested inside:

```graphql
query {
  listings(subject: "calculus", first: 20) {
    title
    price
    seller { name campus }
  }
}
```

The reply has the same shape as the question, and no extra fields:

```json
{"data": {"listings": [
  {"title": "Calculus, Early Transcendentals",
   "price": 45,
   "seller": {"name": "Dana", "campus": "North"}}
]}}
```

Twenty one round trips become one, and the response carries only what the screen shows. A web page that needs more fields, or a watch app that needs fewer, sends a different query to the same endpoint. The server doesn't need a new URL for each screen.

## The Schema Is the Contract

For that to work, the server publishes a **schema**: a typed description of everything a client may ask for, and how the pieces connect.

```graphql
type Listing {
  id: ID!
  title: String!
  price: Int!
  seller: User!
  messages: [Message!]!
}

type Query {
  listings(subject: String, first: Int): [Listing!]!
  listing(id: ID!): Listing
}
```

The `!` means the value can't be null, and square brackets mean a list. Because each field has a type, the server can check a query before running it and reject one that asks for a field that doesn't exist, and tools can offer autocomplete and generate documentation from the schema itself. Like the `.proto` file in [RPC and gRPC](/system-design/rpc-grpc), the schema is the contract. Requests come in three kinds:

| Operation | What It Does | Comparable To |
| --- | --- | --- |
| Query | Reads data | GET in REST |
| Mutation | Changes data, such as `createListing` | POST, PATCH and DELETE |
| Subscription | Pushes new data when it changes, over a long lived connection | [WebSockets](/system-design/websockets) |

## How the Server Answers

The server doesn't hold the data itself. A GraphQL server often sits in front of several systems, and a small function called a **resolver** fetches each field from the right one:

<figure class="diagram">
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" data-label="1 request" aria-hidden="true"></div>
<div class="node">GraphQL Server<small>one resolver per field</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings Database</div>
<div class="node">User Service</div>
<div class="node">Message Service</div>
</div>
</div>
<figcaption>The server gathers the pieces, so the phone doesn't have to</figcaption>
</figure>

The steps for each request are:

1. Read the query and check it against the schema
2. Run the resolver for each requested field, starting at the top and moving inward
3. Assemble the results in the shape that was asked for
4. Send them back as JSON

## The Cost: N+1 Moves to the Server

The 21 requests didn't vanish. They moved behind the API. A resolver for `seller` is called once per listing, so a naive server runs one query for the list and then one per seller, against the database or the user service. The calls are cheaper now, because they are inside one data center, around half a millisecond each as in [Numbers Every Engineer Should Know](/system-design/numbers), and not 60 ms across the phone's connection. But they still add up.

The standard fix is **batching**. The server collects all the seller ids the resolvers ask for during one request, and fetches them together. The pattern is often called DataLoader, after a library that popularized it:

| Approach | Database Queries for 20 Listings |
| --- | --- |
| One Lookup per Seller | 21 |
| Batched Lookups | 2 |

The second query looks like `SELECT * FROM users WHERE id IN (7, 12, 31, ...)`. Batching handles lookups by id well, but it doesn't make all queries cheap, which brings up the next cost.

## Other Costs

The flexibility that helps clients also removes some defaults that REST gives for free:

- **Caching is harder**: all requests go to one URL, usually as a POST, so the browser and CDN caching from [How HTTP Works](/system-design/http) don't apply on their own. Teams use persisted queries, where the client sends the id of a query the server already knows, which can be sent as a GET and cached, and they cache by field inside the server
- **Queries can be expensive**: nothing stops a client from asking for listings, each with its seller, each with that seller's other listings, several levels deep. Servers set limits on depth and give each field a cost, and they refuse a query over budget before running it. For the same reason, [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) counts query cost, not just requests
- **Errors can hide**: a response can carry both data and an `errors` list when only some fields fail, and the official guidance is to answer 2xx, usually 200, whenever the query ran and produced data. Only a request that can't run at all, such as an invalid query, gets a 4xx. A dashboard that watches status codes, as in [Logs, Metrics and Traces](/system-design/observability), will miss failures unless it also looks inside the body
- **Access checks per field**: any field can be requested from anywhere in the query, so each resolver has to check who is asking, as in [Authentication and Authorization](/system-design/authn-authz). Many teams also switch off the schema browsing feature, called introspection, in production

## When It Fits

GraphQL pays off when:

- **Several clients need different data**: a phone, a website and a watch app, each wanting a different slice
- **The data is richly connected**: listings, sellers, messages and reviews, read together in many combinations
- **Screens change often**: front end teams can adjust queries without waiting for a new endpoint
- **Many backends sit behind one API**: it presents them as one

It is less attractive for a small API with one client, where a few REST endpoints are simpler, for public APIs that outsiders want to try with `curl` and cache at a CDN, and for teams not ready to run the extra pieces: batching, cost limits and query monitoring. Plenty of systems keep REST or gRPC inside and add GraphQL as the layer that front ends talk to, often in an [API Gateway](/system-design/api-gateways). [Choosing Between REST, RPC and GraphQL](/system-design/api-style-choice) compares the three directly.

## Key Points

- GraphQL lets the client ask for exactly the fields it wants, from one endpoint, and the response has the same shape as the query
- A typed schema is the contract, with queries to read, mutations to write and subscriptions for live updates
- Resolvers fetch each field, and <u>the N+1 problem moves to the server</u>, where batching fixes it
- Caching, query cost, hidden errors and field level access checks need extra work
- It fits several clients with different needs over connected data, and is less useful for small or public APIs
