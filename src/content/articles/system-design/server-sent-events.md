> **Server-Sent Events** (SSE) let a server keep one HTTP response open and stream events down it as they happen. It is one way, from server to browser, and it reconnects on its own.

[Polling and Long Polling](/system-design/polling) worked by asking again: each answer ended the request, and the client had to send a new one with its full set of headers. That is fine for occasional news and wasteful for a busy stream.

SSE flips the arrangement. The client asks once, and the server doesn't finish its answer. It keeps writing new events onto the same open response, using the HTTP connection from [How HTTP Works](/system-design/http), with no new machinery underneath.

## One Request, Many Events

In the textbook app, a student watches a listing page, and the page should show "someone just offered $40" as it happens. The browser opens one request, and each event after that travels down the same connection:

<figure class="diagram">
<p class="rowname">Once</p>
<div class="flow">
<div class="node">Browser</div>
<div class="arrow wide" data-label="GET /events" aria-hidden="true"></div>
<div class="node">Server<small>keeps the response open</small></div>
</div>
<p class="rowname">Then, Whenever There is News</p>
<div class="flow packets">
<div class="node">Event 1</div>
<div class="node">Event 2</div>
<div class="node">Event 3</div>
<div class="node wait">more...<small>same connection</small></div>
</div>
<figcaption>The request is sent once and the response keeps going</figcaption>
</figure>

The difference shows up when events are frequent. Take a stream of one event a second for a minute, and count the requests each approach sends:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Polling Every 2 Seconds</span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">30</span></div>
<div class="hbar peak"><span>Long Polling</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">60</span></div>
<div class="hbar"><span>Server-Sent Events</span><span class="track"><span class="fill" style="--w: 1.7%"></span></span><span class="value">1</span></div>
</div>
<figcaption>Requests sent in one minute for one event a second (example numbers)</figcaption>
</figure>

Long polling is at its worst here, because each event ends a request and starts a new one. SSE sends one request for the whole minute.

## What It Looks Like

The browser side has a built in object, `EventSource`. It sends an ordinary GET and reads the response as it arrives:

```javascript
const events = new EventSource("/events");

events.addEventListener("offer", (e) => {
  const offer = JSON.parse(e.data);
  showBanner("Someone offered $" + offer.amount);
});
```

The response is plain text with a few simple rules. The server sets `Content-Type: text/event-stream`, and then writes events:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

retry: 5000

id: 41
event: offer
data: {"listing": 17, "amount": 40}

: keep-alive

id: 42
event: offer
data: {"listing": 17, "amount": 42}
```

Each event is a few lines of `field: value`, and a blank line ends it. The fields are few:

| Field | What It Does | Example |
| --- | --- | --- |
| data | The message itself, and several data lines are joined into one | data: {"amount": 40} |
| event | A name, so the page can listen for just that kind | event: offer |
| id | A marker for this event, used when reconnecting | id: 41 |
| retry | How long, in milliseconds, to wait before reconnecting | retry: 5000 |
| A Line Starting With a Colon | A comment that the page doesn't see, handy as a keep alive | : keep-alive |

Because it is text, it is easy to debug: you can watch a stream with `curl -N` and read it. On the server, an endpoint is a loop that writes and flushes:

```python
def events(user):
    last_id = request.headers.get("Last-Event-ID")
    for item in offers_after(user, last_id):       # catch up first
        yield f"id: {item.id}\nevent: offer\ndata: {item.json}\n\n"
    while True:
        item = wait_for_event(user, timeout=15)
        if item:
            yield f"id: {item.id}\nevent: offer\ndata: {item.json}\n\n"
        else:
            yield ": keep-alive\n\n"               # nothing new
```

The first lines read a header, `Last-Event-ID`, which brings us to the feature that makes SSE pleasant to use.

## Reconnecting Without Losing Anything

Connections drop. A phone moves from Wi-Fi to cellular, or a server restarts. With `EventSource` the browser reconnects by itself, waits a few seconds, or as long as the last `retry:` value said, and sends a `Last-Event-ID` header carrying the last `id` it saw. The server uses it to replay what was missed:

<figure class="diagram">
<p class="rowname">Connected</p>
<div class="flow packets">
<div class="node">41</div>
<div class="node">42</div>
</div>
<p class="rowname">Connection Drops, Events Keep Happening</p>
<div class="flow packets">
<div class="node wait">43<small>missed</small></div>
<div class="node wait">44<small>missed</small></div>
</div>
<p class="rowname">Browser Reconnects With Last-Event-ID: 42</p>
<div class="flow packets">
<div class="node">43</div>
<div class="node">44</div>
<div class="node">45</div>
</div>
<figcaption>The server replays the events after the id it was given</figcaption>
</figure>

It is the same cursor idea as the `after=` parameter in [Polling and Long Polling](/system-design/polling) and in [Pagination](/system-design/pagination), built into the protocol. The catch is on the server: to replay, it has to keep recent events somewhere, such as a database table or a short list in a cache.

How far back to keep them is a decision, and a client that was gone longer than that has to reload the page's data from scratch.

Two more details are worth knowing. Browsers also fire the `error` event on each reconnect attempt, not just when something is permanently wrong, so check the object's `readyState` to tell the two apart.

And a server can tell the browser to stop reconnecting by answering with HTTP 204. That is how an endpoint says "no more will come, stop asking".

## What SSE Can't Do

SSE is deliberately simple, and that comes with limits:

- **One way**: data flows from server to browser. If the browser needs to send something, it makes a normal request, such as a POST. For lots of two way chatter, [WebSockets](/system-design/websockets) fit better
- **Text, not binary**: events are UTF-8 text. Binary data has to be encoded first, usually as base64 inside JSON
- **A simple request**: the `EventSource` constructor takes just a URL and a flag for sending cookies across sites. You can't choose the method or add an `Authorization` header, so login usually rides on cookies. Putting a token in the URL works, but URLs end up in logs, so keep such tokens short lived
- **Few connections per browser**: over HTTP/1.1, browsers allow about 6 SSE connections per domain, shared across the tabs. With HTTP/2 the number of simultaneous streams is negotiated and defaults to 100. One `EventSource` per page, shared by the whole page, avoids the problem

## What Sits Between the Server and the Browser

An open response that trickles data behaves differently from the quick answers proxies were built for, and three things often go wrong:

<figure class="diagram">
<div class="flow">
<div class="node">Browser</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Proxy or CDN<small>may hold events back</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer<small>closes idle connections</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Server</div>
</div>
<figcaption>Each stop on the path can interfere with a stream</figcaption>
</figure>

- **Buffering**: a proxy may collect the response and pass it on in chunks, so events show up late and in bunches. nginx does this by default, and the usual fix is to turn buffering off for the stream, either in its config or with an `X-Accel-Buffering: no` response header
- **Idle timeouts**: a load balancer closes connections that go quiet. AWS's Application Load Balancer, for example, defaults to 60 seconds. A comment line sent at about 15 second intervals keeps the stream alive, which the server code above does. Keep the application's own idle timeout longer than the load balancer's, or the load balancer can hit a closed connection and return a 502, as in [How HTTP Works](/system-design/http)
- **Reconnect storms**: when a server restarts for a deploy, the clients it held reconnect at once. A random delay on each client, or closing connections gradually, spreads the load. See [Timeouts, Retries and Backoff](/system-design/timeouts-retries)

Every connected user also holds an open connection on a server, so at 100,000 users that is 100,000 connections. As with long polling, this calls for servers built to hold many idle connections, and it belongs in the estimate from [Estimating Capacity](/system-design/estimation).

## Where It Fits

| | Long Polling | Server-Sent Events |
| --- | --- | --- |
| Requests | A new one after each answer | One, kept open |
| Events per Request | Usually one | Many |
| Cost per Event | A full set of HTTP headers | A small block of text |
| Reconnect and Resume | You build it | Built in, with Last-Event-ID |
| Direction | Server to client | Server to client |

SSE suits anything where the server pushes and the client mostly listens: notifications such as "your book sold", live scores and prices, the progress of a long job, a dashboard, a log being tailed. Many APIs that stream a reply word by word, such as those of language models, use it too.

When the browser also has to send often and quickly, as in chat or a shared whiteboard, move on to [WebSockets](/system-design/websockets). And when the listener is another server and not a browser, [Webhooks](/system-design/webhooks) are the usual route.

## Key Points

- SSE keeps one HTTP response open and streams events down it, one way from server to browser
- The format is plain text: `data`, `event`, `id` and `retry` fields, with a blank line ending each event
- <u>`EventSource` reconnects on its own</u> and sends `Last-Event-ID`, so the server can replay what was missed, as long as it keeps recent events
- It carries text, not binary, and can't set headers, so login usually rides on cookies, and browsers limit connections per domain on HTTP/1.1
- Turn off proxy buffering, send a keep alive comment before idle timeouts, and spread reconnects after a deploy
- Choose SSE when the server pushes and the client listens, and WebSockets when both talk freely
