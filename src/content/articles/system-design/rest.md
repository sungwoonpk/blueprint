> **REST** is a style for building APIs around resources: things with URLs that clients read and change using the standard HTTP methods. Most people mean exactly that when they say "a REST API".

[What Makes a Good API](/system-design/good-apis) said to name things as nouns and let the method say the action, and [How HTTP Works](/system-design/http) gave the methods and status codes. REST is the most common way of putting the two together. The name comes from Roy Fielding's 2000 doctoral dissertation, which described the architecture of the web itself. This topic covers how the style looks day to day, why it scales well, and where it starts to hurt.

## Resources and Representations

A **resource** is a thing the API talks about, such as a listing, a user or a message. Each one has a URL. What travels over the network is not the thing itself but a **representation** of it, usually a JSON snapshot:

```http
GET /listings/42 HTTP/1.1
Host: textbooks.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"id": 42, "title": "Calculus, Early Transcendentals",
 "price": 45, "status": "available"}
```

The client holds a snapshot. To change the listing it sends a request, and the next snapshot shows the result. A few habits keep the URLs predictable.

Use plural nouns for collections: `/listings` is the collection and `/listings/42` is one member. Nest for ownership, so `/listings/42/messages` holds the messages about one listing, but keep nesting shallow. One or two levels is readable, and `/users/7/listings/42/messages/9/replies` is a sign to give `/messages/9` its own URL. And put ids, not meanings, in the path, since `/listings/42` stays valid even if the title changes.

## One Listing From Start to Finish

Following a listing through its life shows how the methods fit. These are the replies a client should expect:

| Request | Success | Common Failure |
| --- | --- | --- |
| POST /listings | 201 Created, with a Location header | 400 for a bad price, 401 if not logged in |
| GET /listings/42 | 200 with the listing | 404 if it doesn't exist |
| PATCH /listings/42 | 200 with the updated listing | 403 if it belongs to someone else |
| DELETE /listings/42 | 204 No Content | 404 if it is already gone |
| GET /listings | 200 with a list | 400 for a bad filter |

Creating returns 201 and a `Location: /listings/42` header pointing at the new resource, as in [How HTTP Works](/system-design/http). For changes there are two choices. **PUT** sends the whole listing and replaces what is stored, so repeating it is harmless. **PATCH** sends only the fields that change, which is lighter and fits when most of a resource stays the same:

```http
PATCH /listings/42 HTTP/1.1
Content-Type: application/json

{"price": 40}
```

Lists take their options in the query string, after the question mark. A single URL can filter, sort and limit at once:

```text
GET /listings?subject=calculus&sort=price&limit=20
```

Anything that returns a long list needs paging, which gets its own topic: [Pagination](/system-design/pagination).

## When the Action Isn't a Noun

"Mark as sold" has no obvious noun. There are two common answers. If the action only flips a field, change the field: `PATCH /listings/42` with `{"status": "sold"}`. If the action produces something new, make that a resource: sending a message is `POST /listings/42/messages`, and the message that comes back is a thing with its own URL.

A third option, an endpoint named for the action such as `POST /listings/42/mark-sold`, is acceptable when neither fits. What matters is picking one style and holding to it, as [What Makes a Good API](/system-design/good-apis) asked.

## What the Style Gives You

REST isn't a random set of habits. Fielding described a handful of rules, each of which buys something a growing system wants:

| Rule | What It Means | What You Get |
| --- | --- | --- |
| Client and Server Are Separate | The phone and the servers only meet through the API | Each side can change on its own |
| Stateless | Each request carries what the server needs to answer it | Any server can take any request, so servers can be added freely |
| Cacheable | Responses say whether they may be reused | Browsers and CDNs answer repeat reads |
| Uniform Interface | Every resource uses the same few methods and formats | Any HTTP tool or new developer can use the API |
| Layered | The client can't tell if it reaches the server directly | Load balancers, gateways and CDNs can sit in between |

Each line connects to something earlier in the roadmap. Stateless is the property from [Stateless and Stateful Services](/system-design/stateless-stateful), which is what lets a load balancer send any request to any server. Cacheable is the `Cache-Control` and `ETag` machinery from [How HTTP Works](/system-design/http), which a CDN builds on. Reads are plain GET requests, so they cache well, while writes go through. That fit with the web's existing machinery is the main reason REST became the default.

## REST in Practice, and in Theory

Fielding's original description includes one more rule that most APIs skip: **hypermedia**, where each response includes links to what the client can do next, so the client follows links the way a browser does and needn't build URLs itself.

```json
{"id": 42, "status": "available",
 "links": {"self": "/listings/42",
           "messages": "/listings/42/messages"}}
```

A popular way to describe how far an API goes is the Richardson maturity model, developed by Leonard Richardson:

- **Level 0**: one URL, with everything tunneled through it
- **Level 1**: separate URLs for separate resources
- **Level 2**: the right HTTP methods and status codes on those resources
- **Level 3**: hypermedia links in the responses

Most APIs called REST stop at level 2, and they work well there. Roy Fielding, who defined REST, holds that an API without hypermedia shouldn't be called REST, so some people call the rest "HTTP APIs with JSON". It isn't worth arguing over the name. The useful part is the resources, the methods and the status codes, which are the parts clients actually benefit from.

## Where REST Hurts

The fixed shape of each URL is both a strength and a weakness. The phone's listings screen needs a list of listings, each with its seller's name. With plain REST, that takes one request for the list and then one per seller:

<figure class="diagram">
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" data-label="1 request" aria-hidden="true"></div>
<div class="node">GET /listings<small>20 listings</small></div>
<div class="arrow wide" data-label="20 requests" aria-hidden="true"></div>
<div class="node hot">GET /users/7<small>one per seller</small></div>
</div>
<figcaption>One screen, 21 requests: each round trip adds its own wait</figcaption>
</figure>

This is often called the **N+1** problem, one request plus one per item. Remember from [The Life of a Request](/system-design/life-of-a-request) that each round trip costs time. Done one after another, 21 calls at 60 ms each take over a second. Its opposite is just as common: **over-fetching**, where the response holds 30 fields and the screen shows two. Common fixes, from smallest to largest:

- **Embed what's usually needed**: `GET /listings?include=seller` returns each seller inside its listing
- **Let the client pick fields**: `?fields=title,price` trims the response
- **Add an endpoint shaped for the screen**: a backend built for one client, sometimes called a backend for frontend
- **Change the style**: let the client describe exactly what it wants, as [GraphQL](/system-design/graphql) does, or use a leaner binary protocol, as in [RPC and gRPC](/system-design/rpc-grpc)

[Choosing Between REST, RPC and GraphQL](/system-design/api-style-choice) puts these side by side.

## Describing the API

A REST API needs a contract anyone can read. The usual standard is the OpenAPI specification: a file listing each URL, method, parameter and response. Tools turn it into documentation pages, test clients and generated code, so the docs and the code stay close.

One caution is that the file describes what the server should do, and nothing in it forces the server to do it, so tests have to check that the two still agree. Changes to the contract are covered in [API Versioning](/system-design/api-versioning).

## Key Points

- A REST API models things as resources with URLs, and clients read and change them with the HTTP methods
- Use plural nouns, shallow nesting, the right status codes, and query parameters for filter, sort and limit
- PUT replaces the whole resource and PATCH changes part of it, and POST creates and is the method that needs a plan for repeats
- <u>The style fits the web's machinery</u>: stateless requests scale out, GET responses cache, and layers like CDNs slot in
- Most "REST" APIs are JSON over HTTP without hypermedia, and that is fine
- Plain REST can be chatty or wasteful, so embed related data, trim fields, shape endpoints, or consider GraphQL
