> **DNS** is the internet's phone book. It turns a name like textbooks.example.com into the address a computer actually connects to.

In [How Clients and Servers Talk](/system-design/client-server), the phone needed an address before it could ask for anything. DNS is where that address comes from. It runs before the very first request, and it quietly decides a lot about how a system behaves.

## A Name Is Not an Address

People remember names. Computers connect to addresses like 203.0.113.80. DNS sits between the two.

It also gives us room to change things. When the textbook app grows from one server to a load balancer in front of many, the address changes and the name stays the same. Nobody has to update a bookmark.

## How a Lookup Works

Read a name from right to left and you see how DNS is organized: textbooks.example.com is a name inside example.com, which is inside .com. No single server knows every name. Each level only knows who to ask next.

The phone doesn't do the asking itself. It hands the question to a **resolver**, usually run by your internet provider or a public one like 8.8.8.8 or 1.1.1.1. The resolver does the walking:

<figure class="diagram">
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" data-label="asks" aria-hidden="true"></div>
<div class="node">Resolver</div>
<div class="arrow" data-label="then asks" aria-hidden="true"></div>
<div class="stack">
<div class="node">Root Server<small>try the .com servers</small></div>
<div class="node">.com Server<small>try example.com's server</small></div>
<div class="node">example.com's Server<small>203.0.113.80</small></div>
</div>
</div>
<figcaption>The resolver walks down the name, one step closer each time</figcaption>
</figure>

The **root servers** know who runs each ending, like .com. There are 13 named root servers, each run as many copies around the world. The .com servers know who runs example.com. That last server, the **authoritative** one, holds the real answer.

DNS messages are tiny, so they usually travel over UDP on port 53. More in [TCP and UDP](/system-design/tcp-udp).

## Remembering Answers

Walking three servers for every page would be slow, so answers are remembered. The answer comes with a **TTL**, a time to live in seconds, and the browser, the operating system and the resolver can all keep it for that long. Here is what asking looks like with the `dig` tool:

```text
$ dig textbooks.example.com

;; ANSWER SECTION:
textbooks.example.com.   300   IN   A   203.0.113.80
```

The 300 says any cache may reuse this answer for 300 seconds, and the A says the value is an IPv4 address. Ask the same resolver a minute later and the number has counted down to about 240. Even a "that name doesn't exist" answer is cached for a while.

TTL is a dial, like the ones in [Thinking in Tradeoffs](/system-design/trade-offs):

- A long TTL means fewer lookups and a faster app, but a change reaches people slowly
- A short TTL means changes spread fast, but there are more lookups and more load on the authoritative server

So before moving a site to a new address, plan around the TTL:

1. Lower the TTL, and wait at least as long as the old TTL
2. Switch the address
3. Raise the TTL again

## What DNS Stores

A name can point at more than an address. Each kind of answer is a **record**:

| Record | What It Holds | Example |
| --- | --- | --- |
| A | An IPv4 address | textbooks.example.com is 203.0.113.80 |
| AAAA | An IPv6 address | the same name, in the newer format |
| CNAME | Another name to follow | www.example.com is an alias of example.com |
| MX | Where to deliver email | mail for example.com goes to mail.example.com |
| TXT | Free text, such as proof you own the domain | verification codes, email rules |
| NS | Which servers answer for this domain | the authoritative servers |

A CNAME can't sit on the bare domain, only on names like www.

## Using DNS in a Design

Because DNS is consulted before a request reaches a server, it can steer traffic early:

| Technique | How It Works | The Catch |
| --- | --- | --- |
| Several addresses | One name returns many addresses, so clients spread out | It can't see how busy each server is |
| Nearest region | The answer depends on where the resolver is | The resolver may be far from the user |
| Failover | A health check removes a dead address from the answers | Caches can keep the old answer until the TTL runs out, and some keep it longer |

DNS is a coarse tool. It sends clients toward the right neighborhood, and a load balancer inside takes over from there. See [Load Balancers](/system-design/load-balancers) and [Global Traffic Routing](/system-design/global-routing).

## When DNS Fails

When DNS breaks, servers can be perfectly healthy and still unreachable, because nobody can find them. Engineers joke that when something is mysteriously broken, "it's always DNS". Two real cases:

- **Dyn, 2016**: an attack flooded Dyn, a company that ran DNS for many big sites. Twitter, Netflix, Reddit and GitHub were hard to reach for hours, though their own servers were fine
- **AWS, 2025**: a bug in the automation that manages DynamoDB's DNS records left its regional name with an empty record. Nothing could find DynamoDB, and many services in that region failed for hours

One lesson from Dyn is that a single DNS provider is a single point of failure. Teams that can't afford that run two, on separate networks, with identical records. It costs money and effort, so it is a tradeoff too. See [Redundancy and Failover](/system-design/redundancy-failover).

## Key Points

- DNS turns names into addresses, so the address can change while the name stays
- A resolver walks the name from the root, to .com, to the domain's own server, and answers are cached for their TTL
- TTL is a tradeoff: long means fewer lookups, short means faster changes
- DNS can spread, aim and fail over traffic, but only as fast as caches expire
- <u>Almost every request starts with DNS</u>, so a DNS failure can look like everything is down, and many big sites run a second provider
