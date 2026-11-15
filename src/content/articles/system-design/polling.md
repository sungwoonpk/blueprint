> **Polling** means the client asks the server "anything new?" again and again. **Long polling** is a patient version: the server holds each question open until it has news, or until a timeout.

[How Clients and Servers Talk](/system-design/client-server) left a problem: a server only answers, so how does it tell the phone "your book sold"? The client has to ask, and the simplest way to ask is to keep asking. This topic covers the two oldest answers, which need nothing beyond the ordinary HTTP requests from [How HTTP Works](/system-design/http). The next topics, [Server-Sent Events](/system-design/server-sent-events) and [WebSockets](/system-design/websockets), cover what to use when these two aren't enough.

## Just Ask Again

With **short polling**, often just called polling, the client sends the same request on a timer and the server answers right away, with news or without. In the textbook app, the phone checks for notifications every 10 seconds:

```javascript
async function poll() {
  const res = await fetch("/notifications?after=" + lastSeenId);
  const items = await res.json();
  if (items.length > 0) show(items);
}
setInterval(poll, 10000);
```

It needs no special server support, it works through nearly any proxy and firewall, and it is easy to test, since each poll is a plain GET request that is safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency). For a progress bar on an upload, or a dashboard that is allowed to be a few seconds old, this is often all you need.

## The Price of Asking

The cost has two sides, and they pull against each other. A shorter interval means news arrives sooner, and it also means many more requests. With 100,000 students holding the app open, here is what different intervals cost, assuming the news is random, so the average wait is half the interval:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Every 60 Seconds<br><small>news is 30 s late on average</small></span><span class="track"><span class="fill" style="--w: 3.3%"></span></span><span class="value">1,667</span></div>
<div class="hbar"><span>Every 10 Seconds<br><small>news is 5 s late on average</small></span><span class="track"><span class="fill" style="--w: 20%"></span></span><span class="value">10,000</span></div>
<div class="hbar peak"><span>Every 2 Seconds<br><small>news is 1 s late on average</small></span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">50,000</span></div>
</div>
<figcaption>Requests per second for 100,000 users, and how late news arrives (example numbers)</figcaption>
</figure>

The second half of the cost is waste. Suppose each student gets about one notification an hour, which is roughly 28 a second across all users.

At the 10 second interval, 10,000 polls a second go out and 28 of them carry news, so over 99% come back empty. Each of those empty polls still costs a request to parse and a response to send, and it adds to the load figures from [Estimating Capacity](/system-design/estimation). So the interval is a tradeoff, in the sense of [Thinking in Tradeoffs](/system-design/trade-offs): lower delay, higher load.

## Making Polls Cheaper

Before reaching for something more complicated, a few habits take most of the waste out of polling:

- **Ask for what's new, not everything**: the `after=` in the code above is a cursor, like the one in [Pagination](/system-design/pagination). The server returns only items past that point, so a poll with nothing new is tiny
- **Use conditional requests**: the server tags each response with an ETag, the version tag from [How HTTP Works](/system-design/http), and the client sends it back in `If-None-Match`. If nothing changed, the answer is a short 304 with no body
- **Let the server set the pace**: a server can tell clients how often to ask, and slow them down when it is busy
- **Spread the clients out**: if all the phones poll at the same instant, the server sees a spike. A little random delay on each timer avoids it

The conditional request looks like this:

```http
GET /notifications HTTP/1.1
If-None-Match: "v42"

HTTP/1.1 304 Not Modified
```

In HTTP's standard, a 304 tells the client to reuse the copy it already has, and it can't carry a body.

GitHub's REST API shows the whole idea in a real service. Its events endpoints are built for polling with ETags, and a 304 doesn't count against the caller's rate limit when the request is authenticated.

Each response also includes an `X-Poll-Interval` header, such as 60 seconds, which clients are expected to obey and which can grow when GitHub is under load. GitHub's own advice is still to use webhooks instead of polling where it can, covered in [Webhooks](/system-design/webhooks).

## Long Polling: Ask Once and Wait

Long polling attacks the waste directly. The client sends a request, and the server doesn't answer until there is something to say, or until a timeout. When the answer comes, the client immediately asks again:

<figure class="diagram">
<p class="rowname">Short Polling</p>
<div class="flow packets">
<div class="node wait">Ask<small>nothing new</small></div>
<div class="node wait">Ask<small>nothing new</small></div>
<div class="node wait">Ask<small>nothing new</small></div>
<div class="node">Ask<small>news, late</small></div>
</div>
<p class="rowname">Long Polling</p>
<div class="flow packets">
<div class="node">Ask<small>server holds it</small></div>
<div class="node">Answer<small>news, at once</small></div>
<div class="node">Ask Again<small>server holds it</small></div>
</div>
<figcaption>Three empty trips and a late answer, against one held request and an instant one</figcaption>
</figure>

Both styles are described in [RFC 6202](https://www.rfc-editor.org/rfc/rfc6202), an Internet Engineering Task Force document on the known issues and good habits for pushing data over HTTP. The client side is a loop:

```javascript
async function listen() {
  while (true) {
    try {
      const res = await fetch("/notifications?after=" + lastSeenId);
      if (res.status === 200) {
        const items = await res.json();
        show(items);
        lastSeenId = items[items.length - 1].id;
      }
      // 204 means the wait timed out, so just ask again
    } catch (err) {
      await sleep(2000);   // network error: pause, then ask again
    }
  }
}
```

On the server, the handler sleeps until there is news or a timeout:

```python
def get_notifications(user, after):
    items = db.notifications_after(user, after)
    if items:
        return items                      # news already waiting
    event = wait_for_event(user, timeout=25)
    if event:
        return db.notifications_after(user, after)
    return no_content()                   # timed out, 204
```

Two details keep it from losing news. The `after` cursor covers the short gap between one answer and the next question: anything that happened in between is returned straight away by the first line. And the timeout keeps each request ending cleanly, so a client doesn't wait forever on a connection that has quietly died.

## What Long Polling Costs

Waiting isn't free, because every waiting client holds an open connection on the server, and that connection takes memory. RFC 6202 lists this among the main issues, and notes that some proxies and servers limit how many requests can be outstanding at once. A server that gives each waiting request its own thread runs out quickly, so long polling usually runs on a server built for many idle connections at once. Further costs and limits:

- **Timeouts**: the hold time must stay below the idle timeout of the load balancers and proxies in the path, the same problem as the random 502s in [How HTTP Works](/system-design/http). Real services pick tens of seconds. Amazon SQS caps its long poll at 20 seconds, and Socket.IO's default heartbeat interval is 25 seconds
- **Per-request overhead**: each answer is a full HTTP message with headers, which RFC 6202 points out matters when messages are small and frequent
- **Connection limits**: browsers allow about 6 parallel connections to a host over HTTP/1.1, according to MDN, so a page with several long polls can use them up. One shared long poll per page is a common answer. HTTP/2 lets requests share a connection, as in [How HTTP Works](/system-design/http)
- **Delay is small but not zero**: after each answer there is a gap before the next request lands, so the worst case is longer than one trip

Some message queues use the same idea. Amazon SQS, for example, calls it long polling, and a worker asks for messages and says how long it is willing to wait:

```python
messages = sqs.receive_message(
    QueueUrl=queue_url,
    MaxNumberOfMessages=10,
    WaitTimeSeconds=20,   # wait up to 20 s for a message
)
```

With the wait set to 0, SQS answers right away even when the queue is empty, which is its short polling. AWS's documentation says the long version can cut down empty responses and so lower the cost of asking. See [Message Queues and Pub/Sub](/system-design/message-queues).

## Which One, and What Comes Next

| | Short Polling | Long Polling |
| --- | --- | --- |
| Delay for News | Up to one interval | Close to instant |
| Server Load | Steady, mostly empty requests | Open connections, fewer requests |
| Complexity | Very low | Medium: timeouts, cursor, many idle connections |
| Through Proxies | Works nearly everywhere | Usually works, but held requests can be cut |
| Fits | Rare or late-tolerant updates, such as job progress | Near live updates, with no special protocol |

Neither is the end of the road. Long polling is also a fallback: Socket.IO's documentation explains that it starts with long polling and then upgrades to WebSocket when it can, because WebSocket is sometimes blocked by corporate proxies, firewalls or antivirus software.

When the server needs to send a steady stream one way, [Server-Sent Events](/system-design/server-sent-events) is a better fit, and when both sides talk freely, [WebSockets](/system-design/websockets) are. When the receiver is another server and not a person's app, [Webhooks](/system-design/webhooks) let the sender make the call instead.

## Key Points

- Polling asks again and again, so news is up to one interval late, and a short interval means many requests
- Most polls find nothing, so ask for only what is new, use ETag and 304, and let the server set the interval
- <u>Long polling</u> holds each request until there is news or a timeout, then the client asks again right away
- Use a cursor so nothing is lost between answers, and keep the hold time below proxy and load balancer timeouts
- Held requests cost connections and memory, so long polling needs a server built for many idle connections
- Pick polling for simple or late-tolerant updates, long polling for near live ones, and move to SSE or WebSockets when a steady stream is needed
