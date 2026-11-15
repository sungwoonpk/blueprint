> A **proxy** is a server that sits between two sides and passes messages along. A **forward proxy** works for the clients, and a **reverse proxy** works for the servers.

Take another look at the path in [The Life of a Request](/system-design/life-of-a-request): a CDN, then a load balancer, then a web server. The first two don't run our application code. They receive each request, do something useful with it, and hand it on, so they are proxies. This topic is about the general idea, which the next few topics build on.

## A Middleman With a Job

Both kinds sit in the middle, and the difference is whose side they are on. A forward proxy belongs to the people making requests. A reverse proxy belongs to the people answering them:

<figure class="diagram">
<p class="rowname">Forward Proxy: Works for the Clients</p>
<div class="flow">
<div class="node">Campus Laptops</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Campus Proxy</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Websites<small>anywhere</small></div>
</div>
<p class="rowname">Reverse Proxy: Works for the Servers</p>
<div class="flow">
<div class="node">Phones<small>anywhere</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Reverse Proxy</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Our Servers</div>
</div>
<figcaption>The same middle position, working for opposite sides</figcaption>
</figure>

The HTTP standard, [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html), draws the line the same way. A proxy is something the client chooses, usually through its settings. A gateway, also called a reverse proxy, looks like the real server to the client and forwards requests inward.

| | Forward Proxy | Reverse Proxy |
| --- | --- | --- |
| Works For | The clients | The servers |
| Set Up By | The client or its network | The site's operators |
| Client Knows It Is There | Yes, it is configured | No, it looks like the site |
| Hides | Who the clients are | What the servers are |
| Typical Home | A school, company or home network | In front of an app, API or website |

## Forward Proxies

A campus network might send all web traffic through one proxy. That gives the network a place to do things no single laptop can:

- **Filter and log**: block sites, and record who asked for what
- **Cache for everyone**: when 500 students download the same file, the proxy fetches it once. Squid, a long-running open source caching proxy, is built for this
- **Hide the client**: the website sees the proxy's address and not the student's
- **Control outbound traffic from servers**: a production server in a private network can be allowed to reach only a short list of hosts, through a proxy that enforces the list. It also helps against the server side request forgery from [Webhooks](/system-design/webhooks)

HTTPS raises a question: if everything is encrypted, how does a proxy pass it along? The client asks the proxy to open a tunnel, with a request called CONNECT. After that the proxy just relays bytes:

```http
CONNECT textbooks.example.com:443 HTTP/1.1
Host: textbooks.example.com:443

HTTP/1.1 200 Connection Established
```

The TLS handshake from [TLS and HTTPS](/system-design/tls-https) then happens inside the tunnel, so the proxy knows which host and port you reached, but can't read the content. Some company proxies read the traffic anyway, by having their own certificate installed on each managed device. That works, and it is a deliberate trade of privacy for inspection.

## Reverse Proxies

For a system we build, the reverse proxy matters more. It is the one public front door, and everything behind it can stay private. A single front door can do many jobs, which is why most real deployments have one:

- **End TLS**: keep certificates in one place, as in "Where the Encryption Ends" in [TLS and HTTPS](/system-design/tls-https)
- **Spread load**: pick one of several servers, which [Load Balancers](/system-design/load-balancers) covers in depth
- **Route by path or host**: send `/api/` to one group of servers and `/photos/` to another
- **Cache**: answer popular requests without bothering the servers, using the headers from [How HTTP Works](/system-design/http)
- **Compress and buffer**: shrink responses, and soak up slow clients. A phone on a weak connection can take seconds to send a request, and the proxy absorbs that wait so an application server isn't tied up
- **Protect**: limit request rates, drop malformed requests and hide the servers' real addresses, as in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) and [DDoS Protection](/system-design/ddos)

<figure class="diagram">
<div class="flow">
<div class="node">Phone</div>
<div class="arrow wide" data-label="HTTPS" aria-hidden="true"></div>
<div class="node">Reverse Proxy<small>TLS ends here</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">App Servers<small>/api/</small></div>
<div class="node">Photo Service<small>/photos/</small></div>
<div class="node">Static Files<small>everything else</small></div>
</div>
</div>
<figcaption>One public address, with the proxy deciding which backend answers</figcaption>
</figure>

In nginx, a popular web server and proxy, that picture is a short configuration. It lists the backends, ends TLS, and sends each path where it belongs:

```nginx
upstream app_servers {
    server 10.0.1.11:8000;
    server 10.0.1.12:8000;
}

server {
    listen 443 ssl;
    server_name textbooks.example.com;
    ssl_certificate     textbooks.crt;
    ssl_certificate_key textbooks.key;

    location /api/ {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /photos/ {
        proxy_pass http://10.0.2.11:9000;
    }
    location / {
        root /var/www/site;
    }
}
```

`proxy_pass` is the forwarding line. `proxy_set_header` matters because, by default, nginx replaces the `Host` header with the backend's address, so the first one puts the original back. The next two pass the client's address and protocol along, and `$proxy_add_x_forwarded_for` adds the connecting address to the end of any `X-Forwarded-For` the client already sent, which matters in a moment. HAProxy, Envoy and the load balancers sold by cloud providers do the same job. A CDN, from [Content Delivery Networks (CDNs)](/system-design/cdn), is in effect a reverse proxy spread across many locations.

## What the Server Loses

A proxy changes what the application sees. The server's connection now comes from the proxy, so the client's address is gone. And if TLS ended at the proxy, the server sees plain HTTP even though the user typed https. The fix is for the proxy to pass this information along in headers:

```http
GET /listings HTTP/1.1
Host: app.internal
X-Forwarded-For: 203.0.113.9
X-Forwarded-Proto: https
X-Forwarded-Host: textbooks.example.com
```

`X-Forwarded-For` holds the client's address, `X-Forwarded-Proto` the protocol the client used and `X-Forwarded-Host` the host it asked for. The first is a convention that grew up on its own. The standard version is a single `Forwarded` header from [RFC 7239](https://www.rfc-editor.org/rfc/rfc7239), which carries `for`, `by`, `host` and `proto` in one place, and the `Via` header from RFC 9110 names each proxy a message passed through.

These matter in practice. An app that doesn't know the user was on HTTPS may build `http://` links or redirect forever. A rate limiter that sees only the proxy's address would treat all users as one.

## Trust Only What Your Proxies Added

RFC 7239 warns that any node, including the client, can alter these headers. A client can send its own `X-Forwarded-For`, and a proxy then adds the real address after it:

```text
Client sends:    X-Forwarded-For: 1.2.3.4
Proxy forwards:  X-Forwarded-For: 1.2.3.4, 203.0.113.9
```

The first entry is made up, and only the last one was added by our own proxy. A rate limit that reads the first entry can be dodged by anyone, with a made up address on each request. So count from the right, by the number of proxies you run:

```python
def client_ip(xff, my_proxies=1):
    ips = [ip.strip() for ip in xff.split(",")]
    return ips[-my_proxies]    # the entry our outermost proxy added
```

With a CDN and then a load balancer, `my_proxies` is 2. Anything to the left of those entries is only a claim.

## What a Proxy Costs

A proxy is useful, and it is also one more part, with its own costs:

- **An extra hop**: usually well under a millisecond inside a data center, as in [Numbers Every Engineer Should Know](/system-design/numbers), though it adds up across layers
- **A single point of failure**: a lone proxy brings everything down with it, so real setups run a pair, as in [Redundancy and Failover](/system-design/redundancy-failover)
- **Settings that can disagree**: timeouts and size limits at each layer must fit together. A proxy that closes idle connections before the app does is behind the random 502s in [How HTTP Works](/system-design/http), and default buffering delays [Server-Sent Events](/system-design/server-sent-events)
- **Special cases**: WebSockets need the `Upgrade` headers passed on explicitly, as in [WebSockets](/system-design/websockets)

## Where This Leads

Many named parts in this phase are reverse proxies with a particular specialty. A [load balancer](/system-design/load-balancers) is one whose main job is spreading requests. An [API gateway](/system-design/api-gateways) adds login checks, rate limits and routing for APIs, and a [service mesh](/system-design/service-mesh) puts a small proxy beside every service. The next topic takes the first of these, [Load Balancers](/system-design/load-balancers).

## Key Points

- A proxy sits between clients and servers, a forward proxy for the clients and a reverse proxy for the servers
- Forward proxies filter, cache and hide clients, and CONNECT lets HTTPS pass through them as a tunnel
- A reverse proxy is the public front door: it ends TLS, spreads load, routes by path, caches, compresses and protects
- Behind a proxy, the server needs `X-Forwarded-For`, `X-Forwarded-Proto` and `Forwarded` to learn who the client was
- <u>Trust only the entries your own proxies added</u>, counting from the right
- A proxy adds a hop and a point of failure, and its timeouts and buffering have to agree with the rest
