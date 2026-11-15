> **HTTP** is the common language of the web. A client sends a request with a **method** (what to do), a URL (to what) and some details, and the server answers with a status code and a result.

In [How Clients and Servers Talk](/system-design/client-server), we wrote one exchange out in full: the phone asks `GET /listings?subject=calculus` and the server answers `200 OK` with a list. This topic opens up each part, with the details that matter when you build or run a system. HTTP rides on top of TCP, from [TCP and UDP](/system-design/tcp-udp), or on QUIC in its newest version.

## Anatomy of a Request

A request starts with a URL, and each piece has a job:

<figure class="diagram">
<div class="flow packets">
<div class="node">https<small>protocol</small></div>
<div class="node">textbooks.example.com<small>which machine</small></div>
<div class="node">:443<small>which program</small></div>
<div class="node">/listings<small>which thing</small></div>
<div class="node">?subject=calculus<small>filters</small></div>
<div class="node">#reviews<small>stays in the browser</small></div>
</div>
<figcaption>A URL, split into the parts a browser uses</figcaption>
</figure>

The browser keeps the part after the # to itself, so the server never sees it. The port is usually left out, because 443 is the default for https.

Here is a request that creates a listing, with the extra parts a GET doesn't need:

```http
POST /listings HTTP/1.1
Host: textbooks.example.com
Content-Type: application/json
Authorization: Bearer <token>

{"title": "Calculus, Early Transcendentals", "price": 45}
```

The first line holds the method and the path. The lines below it are **headers**, small labeled details about the request. After a blank line comes the body, here the new listing. The server's answer has the same shape:

```http
HTTP/1.1 201 Created
Location: /listings/42
Content-Type: application/json

{"id": 42}
```

A status code, headers, then a body. The `Location` header tells the client where the new listing lives.

## Methods Say What You Want

The method says what to do. Two properties of each matter for system design: whether it only reads, and whether it's safe to repeat. A method is **idempotent**, the word from [From One Server to Many](/system-design/one-server-to-many), if sending it twice has the same effect as sending it once. That decides whether a client can retry after a timeout, the problem from [How Clients and Servers Talk](/system-design/client-server).

| Method | What It Means | Only Reads | Safe to Repeat |
| --- | --- | --- | --- |
| GET | Read something | Yes | Yes |
| POST | Create something or run an action | No | No |
| PUT | Replace something with what you send | No | Yes |
| PATCH | Change part of something | No | Not always |
| DELETE | Remove something | No | Yes |

Repeating a PUT writes the same thing again. Repeating a DELETE leaves it just as deleted, though the second call may answer 404. Repeating a POST can create a second listing or charge a card twice, so a client that has to retry a POST, like a payment, sends a unique key that the server uses to spot repeats. More in [Idempotency and Safe Retries](/system-design/idempotency).

These are conventions that each server has to keep. A badly built GET can still change data, so the method alone isn't a guarantee. See also [REST APIs](/system-design/rest).

## Status Codes You Will See

The first digit already told you who to look at: 4xx is the request, 5xx is the server side. These are the codes you'll meet most:

| Code | Name | Usually Means |
| --- | --- | --- |
| 200 | OK | It worked |
| 201 | Created | Something new was made, and Location says where |
| 401 | Unauthorized | Not logged in, or the login isn't valid |
| 403 | Forbidden | Logged in, but not allowed to do this |
| 404 | Not Found | Nothing exists at that URL |
| 429 | Too Many Requests | Slow down, and the response may say how long to wait |

The 5xx errors point at the part of the path that failed. With a load balancer in front, the load balancer and the web server can each be the one reporting:

<figure class="diagram">
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer<small>502, 503, 504</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Server<small>500, 503</small></div>
</div>
<figcaption>Which part of the path reports each server error</figcaption>
</figure>

- **500**: the web server's own code failed
- **502**: the load balancer got a bad reply from the server behind it
- **503**: nothing is ready to answer, because of overload or maintenance
- **504**: the server behind it took too long

A 4xx other than 429 usually means the request itself needs fixing, so repeating it won't help. The codes 429, 502, 503 and 504 are often temporary, so clients retry them with growing waits and follow a `Retry-After` header when one is sent. A 500 is only worth retrying if the request is safe to repeat. See [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

One classic cause of random 502s comes from connection reuse, covered in [TCP and UDP](/system-design/tcp-udp). The load balancer keeps connections to the server open and reuses them. If the server closes an idle connection first, the load balancer's next request on it fails. The usual fix is to keep the server's idle timeout longer than the load balancer's.

## Headers Carry the Details

Headers are labeled details on a request or a response. A handful matter most:

- **Host**: which site the request is for, because one server can host many
- **Content-Type**: the format of the body, such as `application/json`
- **Authorization**: credentials, such as a token that proves who is asking
- **Cookie** and **Set-Cookie**: how a server hands out a session ID and the client sends it back, the memory from [How Clients and Servers Talk](/system-design/client-server). Flags like `HttpOnly`, `Secure` and `SameSite` limit who can read or send it
- **Cache-Control**: how long a response may be reused, covered next
- **X-Forwarded-For**: the original client's address, added by proxies so the server sees more than the proxy. Clients can fake it, so trust it only when your own proxy set it

## Reusing Answers

The cheapest request is the one you don't send. A server marks a response as reusable with `Cache-Control`. For example, `max-age=60` lets any cache reuse it for 60 seconds without asking again. It is the same idea as the cache in [From One Server to Many](/system-design/one-server-to-many), spread across browsers and CDNs (see [Content Delivery Networks (CDNs)](/system-design/cdn)).

When the copy gets old, the client can ask "has it changed?" instead of downloading it again. The server tags each version of a response with an **ETag**, and the client sends that tag back in an `If-None-Match` header:

<figure class="diagram">
<p class="rowname">Copy Still Good</p>
<div class="flow">
<div class="node">Browser<small>has version v7</small></div>
<div class="arrow" data-label="v7 ok?" aria-hidden="true"></div>
<div class="node">Server<small>still v7</small></div>
<div class="arrow" data-label="304" aria-hidden="true"></div>
<div class="node">Browser<small>keeps its copy</small></div>
</div>
<p class="rowname">Copy Out of Date</p>
<div class="flow">
<div class="node">Browser<small>has version v7</small></div>
<div class="arrow" data-label="v7 ok?" aria-hidden="true"></div>
<div class="node">Server<small>now at v8</small></div>
<div class="arrow" data-label="200 + v8" aria-hidden="true"></div>
<div class="node">Browser<small>saves v8</small></div>
</div>
<figcaption>Asking before downloading again: a 304 reply carries no body</figcaption>
</figure>

A 304 has no body, so a small reply replaces a full download. Two `Cache-Control` values are often mixed up: `no-cache` means "check with the server before reusing", and `no-store` means "don't keep a copy at all". A common pattern is a long `max-age` for files whose names change when their content does, and `no-cache` for the HTML page, so it is checked on each visit. More in [Where to Put a Cache](/system-design/where-to-cache).

## Three Versions of HTTP

Methods, headers and status codes mean the same in every version. What changed is how the bytes travel, and each version fixed the bottleneck of the one before:

| Version | How It Sends Requests | Weak Spot |
| --- | --- | --- |
| HTTP/1.1 | One at a time per connection, so browsers open several connections | A slow response holds up the ones behind it |
| HTTP/2 | Many at once over one TCP connection, with compressed headers | One lost TCP packet pauses all of them |
| HTTP/3 | Over QUIC, with each stream recovering on its own | UDP is sometimes blocked, so browsers fall back to TCP |

Sending many requests at once over one connection is called **multiplexing**. The weak spots are the head-of-line blocking from [TCP and UDP](/system-design/tcp-udp). Most browsers and large sites already use HTTP/2 or HTTP/3, and a good server or CDN picks the version for you, so your own code rarely changes.

## Key Points

- A request is a method, a URL, headers and an optional body, and a response is a status code, headers and a body
- The method tells you whether a request only reads and whether it's safe to repeat, which decides whether a client can retry
- Status codes say where to look: 4xx the request, 5xx the server side. Retry 429 and 502 to 504 with backoff, and 500 only when repeating is safe
- <u>Cache-Control and ETag let clients reuse answers</u>, and `no-cache` means check first while `no-store` means keep nothing
- HTTP/1.1, 2 and 3 mean the same thing to your code, and each fixes the last one's bottleneck
