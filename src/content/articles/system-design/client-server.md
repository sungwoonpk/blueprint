> In the **client-server model**, one side asks and the other answers. Most of the web, and most apps you use, are built on this one exchange.

In [What is System Design?](/system-design/what-is-system-design), a phone asked for "calculus books" and got a list back. This topic looks at that single exchange: who the two sides are, what they say to each other, and what can go wrong.

## Who is the Client

The client is whoever starts the conversation. The server is whoever waits and answers. A role belongs to one conversation, not to a machine.

<figure class="diagram">
<div class="flow">
<div class="node">Phone<small>client</small></div>
<div class="arrow" data-label="asks" aria-hidden="true"></div>
<div class="node">Web Server<small>server, then client</small></div>
<div class="arrow" data-label="asks" aria-hidden="true"></div>
<div class="node">Payment Service<small>server</small></div>
</div>
<figcaption>The web server answers the phone, then asks the payment service for something itself</figcaption>
</figure>

So when someone says "client", ask: client of what? Your web server is a server to the phone and a client of the database, the cache and the payment service.

Some systems drop the roles completely. In peer-to-peer systems like BitTorrent, every machine both asks and answers. The web and most apps you will build use clear roles.

## The Conversation

The client sends a **request**. The server sends back a **response**. Here is the phone's request for calculus books, written out as HTTP:

```http
GET /listings?subject=calculus HTTP/1.1
Host: textbooks.example.com
Accept: application/json
```

And the response:

```http
HTTP/1.1 200 OK
Content-Type: application/json

[{"title": "Calculus, Early Transcendentals", "price": 45}]
```

A request says what the client wants (a method and a path, with extra details in headers). A response says how it went (a status code) and carries the result. The first digit of the status code usually tells you who to look at:

| Code | Meaning | Who Should Look |
| --- | --- | --- |
| 2xx | It worked | Nobody |
| 3xx | Look somewhere else | The client follows the redirect |
| 4xx | The request was wrong | The client's developer |
| 5xx | The server failed | Us, the server's developer |

On call, a spike of 5xx means we have a problem. A spike of 4xx usually means a client or a bad release is sending something wrong. HTTP gets its own topic, [How HTTP Works](/system-design/http).

## Finding the Server

That request names a host, but the phone still has to reach that machine. It needs four things:

| It Needs | Example | Covered In |
| --- | --- | --- |
| A name | textbooks.example.com | [How DNS Works](/system-design/dns) |
| An address | 203.0.113.80, from looking up the name | [How DNS Works](/system-design/dns) |
| A port | 443, which the browser assumes for https | [TCP and UDP](/system-design/tcp-udp) |
| A protocol | HTTPS | [TLS and HTTPS](/system-design/tls-https) |

The port is what lets one machine run many services: web traffic arrives on 443, SSH on 22. It also lets many clients use one server port. Each connection is told apart by the client's address and port as well as the server's, so thousands of phones can talk to port 443 at once.

You can follow a single request through all of these steps in [The Life of a Request](/system-design/life-of-a-request).

## The Rules of the Conversation

The last row of that table, the protocol, is what makes the rest work. Both sides have to agree on how to talk: how a message is laid out, who speaks first, and what happens on an error. That agreement is a **protocol**. The web uses HTTP and HTTPS, live chat uses WebSocket, services inside a system often use gRPC, and SSH is for logging in to a server remotely.

If the protocol is the agreement, the **API** is what the server offers under it: the requests it accepts and the responses it returns. More in [REST APIs](/system-design/rest) and [RPC and gRPC](/system-design/rpc-grpc).

## Each Request Stands Alone

One rule of HTTP matters a lot for system design: it has no memory of its own. The server treats every request as if it were the first one from that client. Engineers call this **stateless**. That's why, in [From One Server to Many](/system-design/one-server-to-many), any web server could take any request once sessions moved to a shared store.

But the app needs to know who you are. So the client sends proof with each request, usually a **cookie** holding a session ID. The server looks that ID up in a shared store and finds you.

## When the Server Has News

This model has a limit: the server only answers. So how does it tell the phone "your book sold"? The client has to ask, or keep a connection open. There are four common ways:

| Technique | How It Works | Fits |
| --- | --- | --- |
| Polling | Ask every few seconds | Updates that are rare or can be late |
| Long polling | Ask, and the server holds the request open until it has news | Near live updates without special support |
| Server-Sent Events | One open connection, the server streams news down it | One way live updates: notifications, feeds |
| WebSockets | One open connection, both sides send any time | Two way live updates: chat, games |

Start with the simplest one that meets the need. Each has its own topic: [Polling and Long Polling](/system-design/polling), [Server-Sent Events](/system-design/server-sent-events) and [WebSockets](/system-design/websockets).

## The Client is Outside Your Control

The model has another consequence. The client runs on someone else's device, so a user can change it, or skip it and send requests directly. Treat what it sends as unchecked input, and verify anything that affects security or correctness on the server.

In the textbook app, the phone hides the Delete button on listings that aren't yours. That only tidies the screen. Anyone can send `DELETE /listings/42` directly, so the server checks that listing 42 really belongs to the person asking.

The same goes for numbers the client sends. If a request says a $45 book costs $0.01, the server ignores that and uses the price saved in its own database. Checks on the phone are still worth having, because they give users quick feedback. They just can't be the only check.

## When Something Goes Wrong

Last, the exchange itself can fail. A request can fail at three points: it never reaches the server, the server stalls, or the response gets lost on the way back. From the client's side all three look the same: silence.

So every network call needs a **timeout**, a limit on how long to wait. Without one, a silent server can leave the client waiting indefinitely, and stuck waits pile up and use up threads and connections. The number matters: too long and waits pile up, too short and slow but healthy responses get thrown away and retried.

After a timeout the client can try again. But the first try may have worked, with only the response lost. A retry is only safe if repeating the request does no harm. Paying twice is not harmless. Reading a list is. See [Idempotency and Safe Retries](/system-design/idempotency) and [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

## Key Points

- The client starts the conversation and the server answers. A role belongs to one conversation, not to a machine
- A request asks for something and a response says how it went. 4xx means the request was wrong, 5xx means the server failed
- To reach a server, the client needs a name, an address, a port and a protocol
- HTTP is stateless: each request stands alone, and cookies and session IDs add the memory
- The server only answers, so clients poll or keep a connection open
- <u>The client is outside your control</u>, so check what it sends on the server
- Silence is how failure looks, so give network calls a sensible timeout
