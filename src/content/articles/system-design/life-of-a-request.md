> Between a tap and a screen, a request passes through a chain of steps. Each step is a place where time goes and where things can break, so knowing the chain tells you where to look.

You have now met the steps one at a time: [How DNS Works](/system-design/dns), [TCP and UDP](/system-design/tcp-udp), [How HTTP Works](/system-design/http) and [TLS and HTTPS](/system-design/tls-https). This topic puts them in order and follows one request through the textbook app, where students post and browse used books. The phone asks for calculus books.

## The Trip in Order

Before any of it, the browser checks its own cache. A fresh saved copy, as described in [How HTTP Works](/system-design/http), skips the trip completely. If there isn't one, the request goes out in two stages:

<figure class="diagram">
<p class="rowname">Getting Connected</p>
<div class="flow">
<div class="node">DNS Lookup<small>name to address</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">TCP Handshake<small>open the connection</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">TLS Handshake<small>make it private</small></div>
</div>
<p class="rowname">Inside Our System</p>
<div class="flow">
<div class="node">CDN</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Cache</div>
<div class="node">Database</div>
</div>
</div>
<figcaption>The path of one request, left to right</figcaption>
</figure>

The first stage happens once per connection, and a kept connection and a cached DNS answer let later requests skip it. The second stage happens for every request, and each stop can answer it or pass it on:

1. **The CDN** answers right away if it holds a fresh copy of a photo or a page, and passes the request on if not. See [Content Delivery Networks (CDNs)](/system-design/cdn)
2. **The load balancer** picks a healthy web server. It is often where the TLS connection ends, as in [TLS and HTTPS](/system-design/tls-https). See [Load Balancers](/system-design/load-balancers)
3. **The web server** runs our code. It finds who is asking from the session cookie and asks the cache for the data
4. **The cache** answers if it has the data, and asks the database if not. See [Where to Put a Cache](/system-design/where-to-cache)
5. **The database** is the source of truth, read from the primary or from a replica, as in [From One Server to Many](/system-design/one-server-to-many)

The response then travels back along the same path, and the CDN or the cache may keep a copy for next time.

## Where the Time Goes

Here is the first visit to the app from a phone whose server is 60 ms away, drawn the way a browser's network panel draws it:

<figure class="chart">
<div class="waterfall">
<div class="wf"><span>DNS lookup</span><span class="track"><span class="bar" style="--s: 0%; --w: 13.3%"></span></span><span class="value">40 ms</span></div>
<div class="wf"><span>TCP handshake</span><span class="track"><span class="bar" style="--s: 13.3%; --w: 20%"></span></span><span class="value">60 ms</span></div>
<div class="wf"><span>TLS handshake</span><span class="track"><span class="bar" style="--s: 33.3%; --w: 20%"></span></span><span class="value">60 ms</span></div>
<div class="wf"><span>Request travels</span><span class="track"><span class="bar" style="--s: 53.3%; --w: 10%"></span></span><span class="value">30 ms</span></div>
<div class="wf peak"><span>Server works</span><span class="track"><span class="bar" style="--s: 63.3%; --w: 16.7%"></span></span><span class="value">50 ms</span></div>
<div class="wf"><span>Response travels</span><span class="track"><span class="bar" style="--s: 80%; --w: 10%"></span></span><span class="value">30 ms</span></div>
<div class="wf"><span>Download</span><span class="track"><span class="bar" style="--s: 90%; --w: 10%"></span></span><span class="value">30 ms</span></div>
</div>
<figcaption>One first visit, 300 ms in total (example numbers)</figcaption>
</figure>

Only 50 ms of the 300 is our code. Most of the rest is waiting on the distance: the TCP and TLS handshakes each cost a round trip, and so does the request itself. That is why the cheapest speed ups are often not in the code.

Skip the setup: a kept connection and a cached DNS answer remove the first three rows, which makes this visit 140 ms instead of 300. Move closer, since a CDN near the user cuts the length of each round trip. Cut round trips, since HTTP/3 does the connection and the encryption setup together. Or skip the trip entirely, with a cache, in the browser or at the CDN, that answers without reaching the server.

Browsers report the time until the first reply byte arrives as **TTFB**, time to first byte. For a page's first response, web.dev's guideline is that 0.8 seconds or less is good. Your own browser's network panel draws a waterfall like this for every request, so you can measure a real one.

## When a Request Goes Wrong

Because the steps come in a fixed order, a symptom often points at one of them:

| What You See | Likely Stop | First Check |
| --- | --- | --- |
| The server can't be found | DNS | Look the name up with `dig` |
| The connection times out | The network, a firewall or a server that is down | Try opening a connection to the port |
| A certificate warning | TLS | The certificate's dates and names |
| 502, 503 or 504 | The load balancer or the server behind it | Which of the two reports the error |
| 500 | The web server's code | The application logs |
| Slow, but a 200 | Server work, a cache miss or the database | The time spent at each stop |

The last row is the hard one, because nothing is broken and every stop only holds a piece of the answer. A common fix is to give each request an ID at the edge, pass it along at every stop and put it in every log line, often in a header named `X-Request-ID`. Then one search finds that request's whole trip. See [Logs, Metrics and Traces](/system-design/observability).

## Key Points

- A request goes through DNS, TCP and TLS setup, then a CDN, a load balancer, a web server, a cache and a database, and each stop can answer it or pass it on
- Setup happens once per connection, and the stops happen on every request
- In the example, only 50 ms of 300 ms was server code: most time goes to round trips
- <u>Skip the setup, move closer, cut round trips or skip the trip</u> to make requests faster
- Walk the path to debug: each symptom points at a stop, and a request ID lets you follow one request through the logs
