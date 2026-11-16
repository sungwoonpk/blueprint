> **Pushing live updates** means the server sends data to a client the moment something changes, without the client asking. The techniques form a ladder from polling to long polling, Server-Sent Events, WebSockets and the push services of mobile platforms. Each keeps a connection or a schedule alive, and each moves cost from the request path to the number of open connections.

A student lists a book and, an hour later, a buyer taps it. The seller's phone should buzz, and if the seller has the app open, the inbox should show the message at once.

The ordinary web has no way to do that: a client asks and the server answers, and a server that wants to speak first has nowhere to send.

Three questions shape the design. Who talks: the server alone, or both? How often: a message a day or ten a second? And what happens to an update when the client isn't listening? A seller's message can wait, and a live seat count that arrives a minute late is wrong.

## The Options

| Technique | How It Works | Direction |
| --- | --- | --- |
| Polling | The client asks at intervals, with a short timer | Client to server |
| Long Polling | The client asks, and the server holds the request until there is news | Server to client, one answer per request |
| Server-Sent Events | One long HTTP response that streams events | Server to client |
| WebSocket | An upgraded connection that carries messages both ways | Both |
| Mobile Push | The platform's service delivers a notification to the device | Server to device, even when the app is closed |

Polling is the baseline and has a cost that scales with the audience, not with the news. A million clients polling at 10 second intervals make 100,000 requests a second.

If a user gets news once an hour, about 99.7 percent of those requests return no data. Our arithmetic is simple and the result is the reason the other techniques exist: fewer wasted requests, and news that arrives when it happens.

Long polling improves on it: the server holds each request open until there is something to send or a timeout passes, and the client asks again at once. It works through any proxy and costs a request per message. The other three keep a connection open and send many messages over it.

## Server-Sent Events

Server-Sent Events are the plainest push mechanism. The client opens one HTTP request, the server answers with `Content-Type: text/event-stream` and keeps the response open, writing events as they happen. The WHATWG specification defines the format and the browser's `EventSource` API.

The wire format is a text stream, UTF-8, in lines:

- **Fields**: `data` carries the payload, and several data lines join with a line feed. `event` names the event, otherwise it is a `message`. `id` sets the last event id. `retry` sets the reconnection time in milliseconds
- **Dispatch**: A blank line ends an event and dispatches it. An event cut off at the end of the stream is discarded
- **Comments**: A line starting with a colon is ignored, and the specification advises sending one at about 15 second intervals to stop proxies from dropping the connection
- **Reconnection**: `EventSource` reconnects by itself, after a delay the specification calls implementation defined, probably a few seconds. A response with status 204 tells the client to stop
- **Resuming**: On reconnect the client sends a `Last-Event-ID` header with the last id it saw, so the server can replay what was missed. An event without an id inherits the previous one

The costs are the direction, since the client sends no data back on the stream and uses ordinary requests instead, and a browser limit. MDN says that over HTTP/1.1 a browser allows about 6 open connections per domain, shared across the tabs, and that Chrome and Firefox treat this as won't fix.

Over HTTP/2 the limit is negotiated and defaults to 100 simultaneous streams. For the textbook app's one stream for each user, that makes HTTP/2 the sensible baseline.

## WebSockets

A WebSocket carries messages in both directions over one connection. RFC 6455 defines it. The connection starts as an ordinary HTTP request that asks to upgrade: the client sends `Upgrade: websocket`, `Connection: Upgrade` and a random `Sec-WebSocket-Key`, and the server answers `101 Switching Protocols` with a `Sec-WebSocket-Accept`.

That header is the base64 of the SHA-1 of the client's key joined with a fixed GUID, which proves that the server understood the protocol and wasn't a confused HTTP server. After the 101, the connection carries frames, not HTTP.

From the specification and its summary: frames have types for text, binary, and the control frames close, ping and pong. A client masks each frame it sends, and a server doesn't. A ping must be answered with a pong, and a close frame is answered with a close, after which the connection ends.

WebSockets earn their place for two way, frequent traffic, such as chat or a live auction. They have costs that plain HTTP doesn't:

- **Proxies**: `Upgrade` and `Connection` are hop by hop headers, so a proxy such as NGINX has to be told to pass them. NGINX closes a proxied connection that carries no data for 60 seconds by default, so the server should send ping frames or the timeout should be raised
- **A different failure model**: No status codes per message, and no automatic reconnection or resumption in the protocol
- **Libraries fill the gaps**: Socket.IO starts with long polling and upgrades to a WebSocket when possible, with a heartbeat in which the server pings at an interval of 25 seconds in its example handshake and the client must answer within 20, and a reconnection and buffering layer on top

## Mobile Push

When the app is closed, the platform alone can reach the device: Apple's push notification service and Google's Firebase Cloud Messaging hold a connection to each phone and deliver notifications that your server sends them.

The pages that give their limits, such as message lifetime, priority and payload size, didn't render for us, so we don't state numbers.

The design consequences hold without them: delivery is best effort, a notification can arrive late or be lost, and it should carry just enough to prompt the user to open the app, which then fetches the real state.

## Scaling the Connections

A fleet of web servers is stateless, which makes it easy to scale, and a fleet that holds connections isn't. Each connected client costs memory and a file descriptor on one particular server, for as long as it stays.

We measured the memory in a small experiment: a Python server using asyncio, holding idle loopback connections, in a process that started at 22.2 MB. With 6,366 connections it held 62.9 MB, which is 6.5 KB for each connection.

That is user space memory in one runtime, without the kernel's socket buffers or TLS state, so real servers need more, and efficient runtimes need less.

At 6.5 KB, a million connections would need about 6.5 GB for the idle state alone, our arithmetic. The practical limits are the file descriptor limit, which must be raised, and the memory.

The usual design has three parts:

- **A gateway tier**: Servers that just hold connections, authenticate them and forward messages, sized by the number of connections
- **A publish and subscribe bus**: Services publish events by topic or user, and each gateway subscribes for the users it holds. Socket.IO's Redis adapter is an example. A message for several clients goes to the local ones and is published to a Redis channel that the other servers receive. The adapter stores no keys in Redis, and if the Redis connection drops, messages reach the clients on the same server and no others
- **A routing question**: To message one user, find which gateway holds them, or publish to a channel for that user. A table from user to gateway, with a time to live, does it, and a user with several devices has several entries

Load balancing has a wrinkle. Socket.IO's documentation says sticky sessions are still required with the Redis adapter, since a server that doesn't know a session answers HTTP 400.

A protocol with an upgrade step needs the requests of one session to reach one server. A pure WebSocket or Server-Sent Events setup avoids that, and the balancer needs a long idle timeout.

## Reliable Enough

A push channel is at most once by default: a message sent while the connection was down is gone. For the textbook app a lost new message notice is a real problem, so the design needs resumption:

- **Ids on events**: Each event has an increasing id, as in SSE's `id` field
- **A replay window**: The server keeps recent events for each user, and on reconnect the client says the last id it has
- **A fallback to state**: If the gap is larger than the window, the client fetches the current state from the API, such as the inbox, and not the individual events
- **Idempotent handling**: A replayed event may repeat one already shown, so clients ignore ids they have processed, as in [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work)
- **Liveness checks**: A dead connection can look open for a long time, so heartbeats, such as SSE comment lines or WebSocket pings, detect it

How much history to keep depends on how long clients are away. We simulated clients that disconnect for 2 seconds to 10 minutes, with 20 events a second:

| Replay Window | Average Events Missed Per Reconnect | Reconnects With a Gap |
| --- | --- | --- |
| No Replay | 2,780 | 100% |
| 30 Seconds | 2,363 | 50.3% |
| 5 Minutes | 730 | 12.2% |
| 15 Minutes | 0 | 0% |

A window as long as the longest absence removes the gap, at the price of memory for the events of each user. A window of 5 minutes covers most absences and leaves the rest to the state fallback, which is the common compromise.

## Reconnect Storms

When a gateway restarts or a network blip drops the connections, the clients reconnect at once. We simulated 50,000 clients that lose their connections together, against a fleet that accepts 2,000 new connections a second, and compared three retry policies:

| Client Retry Policy | Time Until Connected | Busiest Second | Attempts Made |
| --- | --- | --- | --- |
| Fixed 3 Seconds, No Jitter | 76 s | 50,000 | 650,000 |
| 3 Seconds Plus Up to 10 s of Jitter | 36 s | 7,439 | 101,251 |
| Exponential Backoff From 5 s, Full Jitter | 75 s | 13,544 | 120,680 |

The fixed retry hit the fleet with the full 50,000 clients at once and again at 3 second intervals with the crowd that was refused, and made 650,000 attempts. Jitter spread the same crowd over time and cut the attempts to a sixth.

The exponential policy sent fewer attempts than the fixed one and took longer, since a client that fails several times waits up to a minute. The floor is 25 seconds, the time for 2,000 a second to take 50,000.

The lessons are to add jitter, to choose the first window from the number of clients and the accept rate and not from a habit, and to let the server help: shed new connections quickly with a `Retry-After`, as in [Load Shedding and Graceful Degradation](/system-design/load-shedding), and drain gateways gradually during a deploy, as in [Canary Releases and Other Deployment Strategies](/system-design/deployments).

The SSE specification's own default of a few seconds, with no jitter, is the policy that makes the worst case.

## Security

A long lived connection has security questions of its own:

- **Authenticate on connect**: With a token that expires, and decide what happens when it expires during a long session, with a message that authenticates again or a forced reconnect, as in [OAuth and JWT](/system-design/oauth-jwt)
- **Check the origin**: A browser sends an `Origin` header on the WebSocket handshake, and the server should refuse origins it doesn't expect, since WebSockets aren't covered by the usual same origin rules for requests
- **Authorize each channel**: A subscription to a user's messages must be checked against the user, as in [Authentication and Authorization](/system-design/authn-authz)
- **Limit what a client can send**: Message size, rate and count of subscriptions, as in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice)
- **Trust the bus carefully**: The Socket.IO documentation notes that its adapter doesn't sign, encrypt or authenticate its Redis messages, which assumes a trusted network

## Choosing

| Need | Choice |
| --- | --- |
| News Now and Then, Simple Operation | Polling at a reasonable interval, or long polling |
| One Way Updates in a Browser | Server-Sent Events over HTTP/2 |
| Two Way, Frequent Messages | WebSocket, with a library for reconnection |
| The App Is Closed | The platform's push service, with a fetch on open |
| Rare Events for Millions of Users | Mobile push and an update at next open, in place of open connections |

## A Plan for the Textbook App

| Feature | Design |
| --- | --- |
| New Message Notice | Server-Sent Events while the app is open, mobile push when it is closed |
| Inbox | An event stream with ids, a replay window of 5 minutes, and a fetch of the inbox on a larger gap |
| Seat or Copy Count on a Listing | Polling at 30 second intervals, or an event for the listing page while it is open |
| Gateways | A separate tier, sized by connections, behind a long idle timeout, with a pub and sub bus |
| Reconnects | A first window of 10 seconds with full jitter, and a cap of 60 |
| Deploys | Drain a tenth of the gateways at a time |

## Pitfalls

- **Polling at a short interval**: Most requests return no data and the cost grows with the audience
- **Assuming delivery**: A message sent during a disconnect is lost unless the design replays it
- **A fixed reconnect delay**: The crowd returns at once
- **No heartbeat**: A dead connection looks alive for a long time
- **Idle timeouts in the path**: A proxy drops quiet connections after 60 seconds
- **Forgetting the connection limit**: Six streams per domain over HTTP/1.1
- **A token without an expiry on a long connection**: A revoked user stays connected

## Key Points

- Push replaces wasted polling with open connections: a million clients polling at 10 second intervals make 100,000 requests a second, and the large majority return no data
- Server-Sent Events are the simple one way option, with automatic reconnection and `Last-Event-ID` for resuming, and WebSockets add two way messages at the price of proxy, timeout and reconnection work
- Connections cost memory and descriptors on one server: about 6.5 KB for each idle connection in our measurement, so a gateway tier with a publish and subscribe bus and a user routing table is the usual shape
- <u>Plan for the gap</u>: ids on events, a replay window, and a fallback to fetching state, since a push channel is at most once, and 5 minutes of replay cut the reconnects with a gap to 12 percent in our model
- Reconnect with jitter and let servers shed and drain: in our simulation of 50,000 clients, fixed delays hit the fleet with the whole crowd at once, and jitter cut the attempts from 650,000 to 101,251
