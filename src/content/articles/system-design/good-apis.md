> A good **API** is easy to use correctly, hard to use wrongly, and stays that way as it changes. Its users are other developers, so it should be judged the way you judge any product: by how quickly someone gets it right.

In [How Clients and Servers Talk](/system-design/client-server), an API was what a server offers: the requests it accepts and the responses it returns. [How HTTP Works](/system-design/http) gave the pieces, a method, a URL, headers, a status code. This phase is about the design choices built on them, and the first question is what separates an API that people enjoy from one they work around.

## An API Is a Contract

Think about who calls the textbook app's API. Our own phone app does, and so does the website. Next semester a campus bookstore might call it too. All of them depend on the same requests and responses, while the servers behind the API keep changing:

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Phone App</div>
<div class="node">Website</div>
<div class="node">Bookstore Partner</div>
</div>
<div class="arrow" data-label="requests" aria-hidden="true"></div>
<div class="node">The API<small>the contract</small></div>
<div class="arrow" data-label="runs on" aria-hidden="true"></div>
<div class="node">Our Servers<small>free to change</small></div>
</div>
<figcaption>Clients depend on the API, and our side can change as long as the API holds</figcaption>
</figure>

That is a two way arrangement, and the tradeoff is easy to miss. The API lets our servers change freely, but once clients depend on it, the API itself is hard to change. In [Thinking in Tradeoffs](/system-design/trade-offs), a public API was one of the one way doors, which is why it deserves more care than most code. The habits below all follow from that.

## Name Things for What They Are

Compare two designs for "show me calculus books":

```text
POST /doStuff
{"action": "getBooks", "subj": "calc"}

GET /listings?subject=calculus
```

The second one says what it is without a manual. The thing is a **resource**, a noun such as a listing, a user or a message, and the URL names it. The HTTP method, from [How HTTP Works](/system-design/http), says what to do with it. A small set of actions covers most needs: list, read one, create, change and delete. Google's API design guide builds on this idea and calls it resource oriented design.

| To Do This | Send This |
| --- | --- |
| List listings | GET /listings |
| Read one listing | GET /listings/42 |
| Create a listing | POST /listings |
| Change a listing | PATCH /listings/42 |
| Delete a listing | DELETE /listings/42 |
| List a listing's messages | GET /listings/42/messages |

Not every action fits a noun, such as "mark as sold", and an API can name those as actions where it makes things clearer. The next topics, [REST APIs](/system-design/rest), [RPC and gRPC](/system-design/rpc-grpc) and [GraphQL](/system-design/graphql), are different styles for this same job.

## Be Consistent

A developer who learns one corner of your API should be able to guess the rest. Inconsistency makes them read the docs for each endpoint and still get surprised:

| Inconsistent | Consistent |
| --- | --- |
| Listings use `price: 45.0`, orders use `total: "$45"` | Money is a whole number of cents, in a field named for what it is |
| Some dates are `2026-11-15`, others `11/15/26` | One date format everywhere, with the time zone included |
| Lists page with `page=2` here and `offset=20` there | One paging style on every list |
| Errors look different on each endpoint | One error shape everywhere |

The rule is boring on purpose. It is cheaper for one engineer to follow a convention than for a hundred clients to learn each exception.

## Make Errors Useful

Something will go wrong, and an error is the API's best chance to say what. A bad one forces the developer to guess:

```text
HTTP/1.1 200 OK
{"error": true}
```

That says "OK" and "error" at once, and gives no more. Use the status code from [How HTTP Works](/system-design/http) so tools and retries can act on it, and give the body enough to fix the problem:

```text
HTTP/1.1 400 Bad Request
{"code": "invalid_price",
 "message": "Price must be 0 or more.",
 "field": "price"}
```

The three parts have different readers. A program reads the code, which stays stable. A person reads the message, which can change. The field points to what to fix. A standard format for this exists, RFC 9457 "Problem Details for HTTP APIs", with fields such as type, title, status and detail, so teams don't each invent their own. Stripe's API shows the same idea at work, with an error type and a code on each failure. Two cautions: keep internal details such as stack traces out of errors, and don't confirm facts you would rather not reveal, such as whether an email is registered.

## Be Safe to Retry

From [How Clients and Servers Talk](/system-design/client-server), a client that times out can't tell whether its request arrived, so it tries again. Reads are harmless to repeat. A POST that creates something or charges a card isn't, unless the API plans for it. The usual plan is a client generated unique key sent with the request, which the server remembers so a repeat returns the first result. Stripe's API works this way, with an `Idempotency-Key` header on its POST requests. See [Idempotency and Safe Retries](/system-design/idempotency).

## Plan for Big Lists and Busy Days

An API that works with 20 listings can fall over with 2 million, because one request asks for everything:

- **Pagination**: lists come back a page at a time, with a way to ask for the next page. See [Pagination](/system-design/pagination)
- **Filters and limits**: the client asks for the subject it wants, and the server caps how much a single request can return
- **Rate limits**: one client can't use up everyone's share. See [Rate Limiting in Practice](/system-design/rate-limiting-in-practice)

These feel like limits, and they protect everyone, including the clients that hit them.

## Change Without Breaking

Sooner or later the API has to change, and the way to keep clients working is to know which changes are safe:

| Change | Breaks Clients? |
| --- | --- |
| Add a new endpoint | No |
| Add an optional field to a response | Usually not, if clients ignore fields they don't know |
| Add an optional parameter to a request | No |
| Rename or remove a field | Yes |
| Change a field's type or meaning | Yes |
| Make a request stricter, such as a new required field | Yes |

Adding is usually safe and removing or changing isn't. The catch is that clients depend on more than what you wrote down. This is known as Hyrum's Law, named for Hyrum Wright and popular through the book *Software Engineering at Google*: with enough users, someone will depend on any behavior they can observe. Say our list of listings happens to come back newest first, though the docs never promised it. A client that relies on it breaks the day you change the sort. So write down what you promise, and be careful with what you don't. When a breaking change can't be avoided, version it, as in [API Versioning](/system-design/api-versioning).

## Don't Hand Out More Than Needed

An API is also the front door. The server checks who is asking and what they may do, as in [Authentication and Authorization](/system-design/authn-authz), because the client is outside your control, as [How Clients and Servers Talk](/system-design/client-server) put it. Return only what the caller needs: a listing shown to a buyer includes the seller's first name and campus, not their email. Each extra field is one more thing to protect, and one more thing clients may come to depend on.

## Design It Before Building It

The cheapest time to fix an API is before anyone uses it. Write the contract first, as a short list of requests and responses, and let someone who will call it try it on paper. Then check it against a few questions:

- Can a new developer make a first successful call in a few minutes, from the docs alone?
- Can you guess the URL of an endpoint you haven't seen yet?
- Do errors say what to fix?
- Is each list paged, and each create safe to retry?
- Which changes would break existing clients?

## Key Points

- An API is a contract, and clients depend on it while the servers behind it keep changing
- Name resources as nouns, let the HTTP method say the action, and keep one style everywhere
- <u>Errors are part of the API</u>: use the right status code, a stable code for programs and a message for people
- Plan for retries with unique keys, and for scale with pagination, limits and rate limits
- Adding is usually safe and removing or changing isn't, and clients depend on behavior you never wrote down
- Return only what the caller needs, and design the API on paper before building it
