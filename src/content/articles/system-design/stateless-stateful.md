> A **stateless** service keeps nothing about a user between requests, so any copy of it can answer any request. A **stateful** service remembers things, so a request has to reach the right one.

You have seen the idea three times already: [How Clients and Servers Talk](/system-design/client-server) said HTTP has no memory of its own, [From One Server to Many](/system-design/one-server-to-many) moved login sessions into a shared store, and [Scaling Up and Scaling Out](/system-design/scaling) said servers must be stateless before copies help. This topic explains what that really means and what to do with the state that is left.

## The Random Logout

Here is what goes wrong with two web servers and a login kept in one server's memory:

<figure class="diagram">
<p class="rowname">First Click</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Server A<small>remembers your login</small></div>
</div>
<p class="rowname">Next Click</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Server B<small>never heard of you</small></div>
</div>
<figcaption>The load balancer sends the second click to a different server</figcaption>
</figure>

The user logs in, clicks a link and is asked to log in again. Click once more and they are logged in. The bug is hard to reproduce because it depends on which server each request happens to reach. The cause is **state**: something the server remembers between requests, kept in a place that only one copy can see.

## Where State Hides

State is more than logins. Anything a server remembers from one request to the next counts, and each kind breaks in its own way when the server is copied:

| Where It Hides | What Breaks | Where It Usually Goes |
| --- | --- | --- |
| A login in the server's memory | Random logouts | A shared store such as Redis, or a signed token |
| An upload saved on the server's disk | The file exists on one server only | Object storage, as in [What is System Design?](/system-design/what-is-system-design) |
| A cache in the server's memory | Each copy holds a different version | A shared cache, or treat it as disposable |
| A counter or ID the server makes up | Two servers hand out the same number | A database sequence, or an ID generator that doesn't depend on one machine |
| A scheduled job inside the app | Each server runs it | One scheduler, or a lock so only one runs it |

The rule of thumb is that a server's memory and disk should hold only what it can lose without anyone noticing, such as a cache it can rebuild.

## Three Ways to Handle Sessions

Sessions are the most common case, and there are three usual answers:

| Approach | How It Works | The Catch |
| --- | --- | --- |
| Shared store | The cookie holds an ID, and every server looks the session up in a shared store | One more lookup per request, and the store must stay up |
| Signed token | The client carries the session itself, signed so the server can trust it, as in a JWT | Hard to cancel before it expires, and it grows with what you put in it |
| Sticky sessions | The load balancer keeps sending a user to the same server | The load gets uneven, and a user loses the session if that server goes away |

A shared store lets you end a session instantly. A token needs no lookup, but cancelling one early means keeping a block list, which is state again. Sticky sessions need no code change, which makes them tempting, but the twelve-factor guidelines treat them as a violation and they get in the way of scaling in and out. Many teams combine the first two: a short lived token for fast checks and a longer lived one in a store on the server, so a session can still be revoked. See [OAuth and JWT](/system-design/oauth-jwt).

## Stateless Doesn't Mean No State

A user's cart still exists. A stateless web server hasn't removed the state, it has moved it to places built to hold it: the database, a session store, object storage. So "stateless" describes one tier, the web servers, and the system as a whole is very much stateful.

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Web Server<small>keeps nothing</small></div>
<div class="node">Web Server<small>keeps nothing</small></div>
<div class="node">Web Server<small>keeps nothing</small></div>
</div>
<div class="arrow wide" data-label="state lives here" aria-hidden="true"></div>
<div class="stack">
<div class="node">Session Store</div>
<div class="node">Database</div>
<div class="node">Object Storage</div>
</div>
</div>
<figcaption>Copy the stateless tier freely, and handle the few stateful places with care</figcaption>
</figure>

That is the point of the design. Copies of a stateless server are interchangeable, so you can add them, remove them and replace a failed one without a second thought. State is gathered into a few places that you handle with more care.

## Stateful Services Need Care

Those few places can't be copied freely. A database holds one particular set of data, a message queue remembers what has been delivered, and a WebSocket connection ties a user to the one server that holds it. Growing or replacing them means moving or copying data, and recovering a failed one is not as simple as starting another:

- A database copies its data to replicas and splits it into shards. See [Single Leader Replication](/system-design/replication-one-leader) and [Sharding Strategies](/system-design/sharding)
- A long lived connection needs the client to come back to the same server, or to reconnect and start over. See [WebSockets](/system-design/websockets)

So it pays to keep as little state as possible in the parts that scale out, and to give the state that remains a home built for it.

## Key Points

- A stateless service keeps nothing between requests, so any copy can answer any request
- State kept on one server, such as a login in memory, makes users see random logouts once there are two servers
- Move sessions to a shared store or a signed token, uploads to object storage, and treat local caches as disposable
- <u>Stateless doesn't remove state</u>, it moves it into places built to hold it
- Stateful services such as databases and queues can't be copied freely, so they need replication, splitting and recovery plans
