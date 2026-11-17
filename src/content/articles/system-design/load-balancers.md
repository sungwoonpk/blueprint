> A **load balancer** sits in front of several servers, accepts each request and passes it to one that can handle it. It spreads the work, steers around failures and lets you add or remove servers without clients noticing.

The load balancer first appeared in [From One Server to Many](/system-design/one-server-to-many), as the step that let one web server become several. The last topic showed that it is a [Forward and Reverse Proxy Servers](/system-design/proxies) with a particular specialty.

In [Estimating Capacity](/system-design/estimation), registration day needed about six servers, and this is the part that makes six machines look like one address to every student.

## What It Does

Three jobs make up most of what a load balancer is for:

- **Spread the load**: so no single server takes all the traffic while others sit idle
- **Skip broken servers**: it checks each server regularly and stops sending requests to one that fails, as [Health Checks](/system-design/health-checks) explains
- **Hide the fleet**: clients see one address, so servers can be added, removed or replaced without anyone changing a setting

<figure class="diagram">
<div class="flow">
<div class="node">Phones</div>
<div class="arrow wide" data-label="one address" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Server A</div>
<div class="node">Server B</div>
<div class="node lost">Server C<small>failed its check</small></div>
</div>
</div>
<figcaption>Requests go to A and B, and C gets none until it is healthy again</figcaption>
</figure>

This only works smoothly when any server can answer any request, the property from [Stateless and Stateful Services](/system-design/stateless-stateful). That is why the web servers were made stateless before copies were added.

## Layer 4 and Layer 7

Load balancers come in two main kinds, named after the network layers you may remember from a networking course. A **layer 4** balancer works at the transport level and sees only addresses and ports, the same information as in [TCP and UDP](/system-design/tcp-udp). A **layer 7** balancer works at the application level and reads the HTTP request itself.

| | Layer 4 | Layer 7 |
| --- | --- | --- |
| Sees | IP addresses and ports | The full HTTP request |
| Can Route By | Which port, and a hash of the connection | Path, host, headers, method, query |
| TLS | Can pass it through untouched | Usually ends it |
| Speed | Very fast, little work per connection | More work per request |
| Protocols | Anything over TCP or UDP | HTTP and similar |
| Examples | AWS Network Load Balancer, Google passthrough Network Load Balancer | AWS Application Load Balancer, Google Application Load Balancer, nginx |

The practical difference is what you can decide. Sending `/api/` to one group of servers and `/photos/` to another needs layer 7, because only that one can read the path.

A UDP service, such as the metrics collector from [TCP and UDP](/system-design/tcp-udp), has no HTTP to read, so it uses layer 4. HAProxy shows the split inside a single tool, with a `tcp` mode and an `http` mode.

Here are the two in nginx, which does layer 7 in its `http` block and layer 4 in a `stream` block:

```nginx
# Layer 7: reads HTTP, balances requests
http {
    upstream web_servers {
        least_conn;
        server 10.0.1.11:8000;
        server 10.0.1.12:8000;
        server 10.0.1.13:8000 backup;   # used only if the others are down
    }
    server {
        location / { proxy_pass http://web_servers; }
    }
}

# Layer 4: moves UDP packets without looking inside
stream {
    upstream collectors { server 10.0.3.11:8125; server 10.0.3.12:8125; }
    server {
        listen 8125 udp;
        proxy_pass collectors;
    }
}
```

Some layer 4 balancers do not even sit in the middle of the conversation. Google's passthrough Network Load Balancer forwards packets with the client's original address intact, and the servers reply straight to the client, a design called direct server return. It is built on Google's Maglev software balancer.

Keeping the client's address intact is one reason to choose layer 4, since a layer 7 balancer has to pass the address along in a header, as in [Forward and Reverse Proxy Servers](/system-design/proxies).

## Who Balances the Balancer

If every request goes through the load balancer, it can become the weak spot. Two answers appear in real systems.

The first is to run several. Managed load balancers work this way. In AWS, turning on an availability zone creates a balancer node there, the Application Load Balancer needs at least two zones, and its DNS name returns the addresses of the nodes. A client picks one, and AWS adds and removes nodes as traffic changes.

A DNS answer is cached, as in [How DNS Works](/system-design/dns), so when a zone has no healthy servers and its address is taken out, clients that cached it can keep hitting it for up to the TTL, which AWS sets to 60 seconds.

The second is to spread packets across many balancers before they arrive. Google's Maglev is a software load balancer built from ordinary servers, with the network's routers sharing packets among them using equal cost multipath routing, and each machine then choosing a backend. Meta's open source Katran follows the same pattern.

## Spread Across Zones, Evenly

When there are several nodes, one more setting decides how fair the spread is. Say zone A has 2 servers and zone B has 4, and DNS splits the traffic evenly between the two zones' nodes. With **cross-zone** balancing off, each node sends only to servers in its own zone:

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>Zone A Server<br><small>cross-zone off</small></span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">25%</span></div>
<div class="hbar"><span>Zone B Server<br><small>cross-zone off</small></span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">12.5%</span></div>
<div class="hbar"><span>Any Server<br><small>cross-zone on</small></span><span class="track"><span class="fill" style="--w: 66.7%"></span></span><span class="value">16.7%</span></div>
</div>
<figcaption>Share of all traffic each server receives, with 2 servers in zone A and 4 in zone B</figcaption>
</figure>

The servers in the smaller zone carry twice the load of the others. With cross-zone on, any node can send to any server and each of the six gets a sixth.

AWS defaults to on for its Application Load Balancer and off for its Network Load Balancer. Turning it off keeps traffic inside a zone, which can save a little latency, and the price is this unevenness unless the zones are the same size.

## Sticky Sessions and Draining

Stateless servers make any request safe to send anywhere. When that isn't true, the load balancer can pin a user to one server.

With **sticky sessions** it sets a cookie on the first response and reads it on later requests. AWS offers a cookie the load balancer creates, which lasts one day by default, or one the application sets.

The costs are the ones from [Stateless and Stateful Services](/system-design/stateless-stateful): uneven load, and a user who loses the session if that server goes away.

A related feature matters on deploy day. When a server is removed from rotation, for an update or because the fleet shrank, the load balancer stops giving it new requests but lets the ones in flight finish.

This is **draining**, and AWS calls the wait the deregistration delay, 300 seconds by default and adjustable up to an hour:

<figure class="diagram">
<p class="rowname">Still Taking New Requests</p>
<div class="flow">
<div class="node">Load Balancer</div>
<div class="arrow wide" data-label="new requests" aria-hidden="true"></div>
<div class="stack">
<div class="node">Server B</div>
<div class="node">Server C</div>
</div>
</div>
<p class="rowname">Leaving</p>
<div class="flow">
<div class="node wait">Server A<small>draining: finishing what it has</small></div>
</div>
<figcaption>A draining server gets no new requests, and goes away once its current ones finish or the delay ends</figcaption>
</figure>

Long lived connections are the exception. A WebSocket or an event stream, from [WebSockets](/system-design/websockets) and [Server-Sent Events](/system-design/server-sent-events), can outlast the delay and gets cut when it ends, so those clients have to reconnect, ideally with a little randomness so they don't all return at once.

## Limits Worth Knowing

A load balancer has settings that can surprise you. A few come up often:

- **Idle timeouts**: connections that go quiet are closed, 60 seconds by default on AWS's Application Load Balancer. Keep the server's own timeout longer, or you get the random 502s from [How HTTP Works](/system-design/http)
- **Size limits**: the same balancer rejects requests with a request line or any single header over 16 KB, or request headers over 64 KB in total. Cookies and tokens that keep growing can reach it
- **Queues under overload**: a balancer that queues excess requests can turn a spike into slow responses for all users, and failing fast is often better. That is the idea behind [Load Shedding and Graceful Degradation](/system-design/load-shedding)
- **Retries**: a balancer may retry a failed request on another server, which is only safe when repeating it is harmless, as in [Idempotency and Safe Retries](/system-design/idempotency)

## Choosing One

Most teams start with the managed load balancer their cloud provides, because it scales, patches and replaces itself. Software such as nginx, HAProxy and Envoy suits cases where you want more control, or run your own machines.

For the choice of kind, ask what the traffic looks like. HTTP or HTTPS with routing by path or host points to layer 7. UDP, other protocols, fixed addresses, or very high connection rates point to layer 4. Many systems use both, with a layer 4 balancer in front of a layer 7 one.

The next two topics go inside the box: [Load Balancing Algorithms](/system-design/load-balancing-algorithms) covers how it picks a server, and [Health Checks](/system-design/health-checks) covers how it knows which servers are fit to pick.

## Key Points

- A load balancer spreads requests over servers, skips unhealthy ones and hides the fleet behind one address
- Layer 4 sees only addresses and ports and is fast and protocol neutral, while layer 7 reads HTTP and can route by path, host and headers
- The balancer itself must not be a single point of failure, so it runs as several nodes, or many behind routers that share the packets
- <u>Cross-zone balancing</u> evens out load across zones of different sizes
- Sticky sessions pin a user to a server, and draining lets a server finish its work before leaving
- Watch idle timeouts, header limits, queues under overload and retries
