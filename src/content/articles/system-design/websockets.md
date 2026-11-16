> A **WebSocket** is a two way connection between a browser and a server. It starts as an ordinary HTTP request, and then both sides can send messages whenever they like over the same long lived connection.

[Server-Sent Events](/system-design/server-sent-events) gave the server a way to push, and the browser still had to use a separate request whenever it wanted to say something. For a student reading a notification that is plenty. For two students bargaining over a calculus book, typing and replying in quick bursts, it starts to feel clumsy.

A WebSocket is built for this: one connection, open for as long as the page is, with messages flowing both ways. Chat, multiplayer games, shared documents and live trading screens use it for that reason.

## From HTTP to a Two Way Pipe

A WebSocket has to get through the same ports, proxies and firewalls as regular web traffic, so it starts by asking politely, with an HTTP request that says "I would like to switch protocols":

```http
GET /chat HTTP/1.1
Host: textbooks.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGV4dGJvb2tzLWFwcC0wMQ==
Sec-WebSocket-Version: 13
Origin: https://textbooks.example.com
```

If the server agrees, it answers with status 101 instead of 200:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: T/blRcNYuY9ujThK5IiLZvrhJBU=
```

From that moment, the same TCP connection stops speaking HTTP and speaks the WebSocket protocol, defined in RFC 6455. The `Accept` value is computed from the client's key plus a fixed string, using a hash, so the client can tell the server really speaks WebSocket and isn't an ordinary web server that ignored the upgrade request.

The address starts with `ws://` or, over TLS as in [TLS and HTTPS](/system-design/tls-https), `wss://`, and the defaults are port 80 and port 443, the same as HTTP and HTTPS. Real sites use `wss://`, since plain `ws://` can be read by anyone on the path.

<figure class="diagram">
<p class="rowname">First, Plain HTTP</p>
<div class="flow">
<div class="node">Browser</div>
<div class="arrow wide" data-label="GET + Upgrade" aria-hidden="true"></div>
<div class="node">Server</div>
<div class="arrow wide" data-label="101 Switching" aria-hidden="true"></div>
<div class="node">Browser<small>connection upgraded</small></div>
</div>
<p class="rowname">Then, Either Side at Any Time</p>
<div class="flow packets">
<div class="node">hello<small>browser</small></div>
<div class="node wait">welcome<small>server</small></div>
<div class="node wait">offer $40<small>server</small></div>
<div class="node">reply<small>browser</small></div>
<div class="node">typing...<small>browser</small></div>
</div>
<figcaption>After the upgrade there are no more requests and responses, only messages</figcaption>
</figure>

## Using It

The browser has a built in `WebSocket` object, with four events:

```javascript
const socket = new WebSocket("wss://textbooks.example.com/chat");

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "join", listing: 17 }));
});
socket.addEventListener("message", (e) => {
  showMessage(JSON.parse(e.data));
});
socket.addEventListener("close", () => {
  reconnectLater();   // WebSocket does not reconnect by itself
});
```

Notice what is missing compared with HTTP. There are no methods, URLs, status codes or per message headers, and no built in way to match a reply to a question. A WebSocket delivers messages, and what they mean is up to you.

Most apps add a small protocol of their own: a `type` field on every message, an `id` so an acknowledgement can point at a message, and a version. The server side is a loop that reads messages and acts on them:

```python
async def chat(ws, user):
    async for text in ws:   # each message from this client
        msg = json.loads(text)
        await save_message(user, msg)
        await publish(msg["listing"], msg)   # tell all watchers
```

Underneath, a message travels as one or more **frames**. The ones worth knowing are:

- **Text and binary**: carry your data, with text always UTF-8
- **Ping and pong**: small control frames, used to check the other side is alive
- **Close**: starts a polite shutdown, in which each side sends a close frame and then the connection ends

When a connection ends with no close frame at all, because a phone left coverage or a process crashed, browsers report close code 1006. A normal close is 1000, and 1001 means a side is going away, for example a server shutting down.

## Staying Connected

A connection can die without anyone being told. A phone drives into a tunnel, and neither side receives a goodbye. Proxies also close connections that stay quiet. nginx, for example, closes a proxied WebSocket after 60 seconds without data by default, and AWS's Application Load Balancer defaults to 60 seconds of idle time as well.

The standard answer is the ping frame: one side sends a ping every 25 seconds or so, and the other must reply with a pong. That keeps the connection from looking idle, and when the pongs stop coming, it tells you the connection is dead. Socket.IO, a popular library built on WebSockets, uses a 25 second ping interval by default.

When a connection drops, the client has to reconnect itself, and there are two details worth getting right. Wait a little longer after each failed attempt, with some randomness, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries), so a thousand clients don't hammer the server in step. And catch up on what was missed.

Unlike `EventSource` from the last topic, a WebSocket has no built in `Last-Event-ID`, so the client sends the id of the last message it saw, and the server replays the rest. It is the same cursor idea as in [Pagination](/system-design/pagination).

## Many Servers, One Chat

Here is where WebSockets stop being a front end topic. Back in [Stateless and Stateful Services](/system-design/stateless-stateful), web servers were made stateless so any one could answer any request. A WebSocket reverses that: each user is tied to one particular server for as long as the connection lasts.

Two students chatting about the same listing can easily be connected to different servers, so when one of them sends a message, the server that receives it isn't the server holding the other student:

<figure class="diagram">
<p class="rowname">Student 1 Sends</p>
<div class="flow">
<div class="node">Student 1</div>
<div class="arrow" data-label="sends" aria-hidden="true"></div>
<div class="node">Server A</div>
<div class="arrow" data-label="publishes" aria-hidden="true"></div>
<div class="node">Pub/Sub<small>channel for listing 17</small></div>
</div>
<p class="rowname">Student 2 Receives</p>
<div class="flow">
<div class="node">Pub/Sub<small>channel for listing 17</small></div>
<div class="arrow" data-label="delivers" aria-hidden="true"></div>
<div class="node">Server B</div>
<div class="arrow" data-label="pushes" aria-hidden="true"></div>
<div class="node">Student 2</div>
</div>
<figcaption>A publish and subscribe layer carries each message to whichever server holds the listener</figcaption>
</figure>

The usual fix is a **publish and subscribe** layer. Each server subscribes to the channels its connected users care about, and a message published to a channel reaches all the subscribed servers, which then write it to its own sockets. Redis and message brokers are common choices, and [Message Queues and Pub/Sub](/system-design/message-queues) covers the idea properly. Two large products describe the same shape in their engineering blogs.

Slack's account of its [real time messaging](https://slack.engineering/real-time-messaging/) has gateway servers that hold the WebSockets, and channel servers, chosen by hashing the channel id, that forward each message to each gateway that has a subscriber. Discord's post on [reaching 5 million concurrent users](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) describes one session process per WebSocket, with up to about 500,000 sessions on one Erlang virtual machine, and says most of the rest comes down to publish and subscribe.

Long lived connections create operational wrinkles too:

- **Capacity**: every connected user holds a connection and some memory, so 100,000 users means 100,000 connections. The estimate belongs in [Estimating Capacity](/system-design/estimation), and servers have to be built for many idle connections, as with long polling and SSE
- **Uneven load**: connections stay put, so after adding servers, the old ones keep their connections and the new ones start nearly empty until clients reconnect. A load balancer has to understand the upgrade, and AWS's Application Load Balancer supports WebSockets natively
- **Deploys**: restarting a server drops everyone on it at the same moment, and all of them reconnect at once. Discord's post and Slack's [Flannel post](https://slack.engineering/flannel-an-application-level-edge-cache-to-make-slack-scale/) both describe reconnect surges overloading parts of their systems, so spreading reconnects with random delays is part of the design, not an afterthought

## Locking It Down

A WebSocket is a door that stays open, so check who comes in, and what they say:

- **Check the Origin**: browsers send the page's origin during the handshake, and the server can refuse origins it doesn't trust, as RFC 6455 describes. It matters when login rides on cookies, since otherwise a script on another site could open a connection as the user. Other clients can send any Origin they like, so it isn't a login
- **Authenticate the connection**: use the cookie sent with the handshake, or a short lived token sent as the first message. Avoid tokens in the URL, since URLs end up in logs. See [Authentication and Authorization](/system-design/authn-authz)
- **Check each message**: a connection that was allowed to join one chat isn't allowed to write to another. The server decides on each message, because the client is outside your control, as in [How Clients and Servers Talk](/system-design/client-server)
- **Limit what arrives**: set a maximum message size and a message rate for each connection. MDN notes the browser's WebSocket has no way to push back on a flood of messages, so a busy sender can overwhelm a page, and a server needs its own limits for the same reason

## Choosing a Way to Stay Up to Date

| | Direction | News Arrives | Best For |
| --- | --- | --- | --- |
| Polling | Client asks | Up to one interval late | Rare or late tolerant updates |
| Long Polling | Client asks, answered when ready | Near instant | Simple, near live updates |
| SSE | Server to client | Instant | Notifications and feeds |
| WebSockets | Both ways | Instant | Chat, games, shared editing |

What each one costs differs too:

- **Polling**: many empty requests, and nothing to reconnect
- **Long polling and SSE**: one open connection per user, and SSE reconnects and resumes by itself
- **WebSockets**: one open connection per user, reconnect and catch up written by you, and a publish and subscribe layer once there are many servers

Start with the simplest one that meets the need. A notification feed rarely needs a WebSocket, and a chat that sends a message every few seconds can run on SSE plus ordinary POST requests. Reach for WebSockets when both directions are busy and delay matters, as in a multiplayer game or a shared whiteboard. When the listener is another server, not a browser, [Webhooks](/system-design/webhooks) are the next stop.

## Key Points

- A WebSocket starts as an HTTP upgrade request, and after a 101 reply it carries messages both ways over one long lived connection
- There are no URLs or status codes after the upgrade, so apps define their own message format, with types and ids
- Use ping and pong to keep idle connections open and spot dead ones, and reconnect with growing, random waits and a way to catch up
- <u>A WebSocket ties a user to one server</u>, so many servers need a publish and subscribe layer to deliver messages across them
- Plan for connection capacity, uneven load after scaling and reconnect surges after deploys
- Check the Origin, authenticate the connection, authorize each message and limit sizes and rates
- Choose the simplest option that works, and use WebSockets when both sides talk often and delay matters
