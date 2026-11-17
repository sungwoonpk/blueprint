> A **distributed denial of service** (DDoS) attack uses many machines to flood a target until real users can't get through. The defense is layered, because the flood can exhaust bandwidth, connection tables or application code.

[Rate Limiting Algorithms](/system-design/rate-limiting-algorithms) deal with one client sending too much. A DDoS is the opposite shape: thousands or millions of sources, each sending a modest amount, adding up to more than the target can take.

A limit per client rarely triggers, so the defenses sit in other places, mostly at the edge, before the traffic reaches your servers.

## Three Kinds of Flood

The US government's CISA, in its guide for defenders, sorts attacks by what they try to use up:

| Kind | What It Exhausts | Example |
| --- | --- | --- |
| Volumetric | Bandwidth, by sheer volume | A UDP reflection flood |
| Protocol | The tables and state of network protocols | A TCP SYN flood |
| Application | The code and database behind the app | Thousands of expensive searches |

The first two are often called layer 3 and 4 attacks, after the network layers in [Load Balancers](/system-design/load-balancers), and the third a layer 7 attack. They need different defenses, which is why one tool is never the whole answer.

## Volumetric: Reflection and Amplification

The cheapest way to send a huge flood is to make someone else send it.

Many internet services run over UDP, which, as [TCP and UDP](/system-design/tcp-udp) said, simply sends. UDP doesn't check that the sender's address is real, so an attacker can send a small request with the victim's address forged as the sender. The server, called the amplifier, replies to the victim, and the reply is much bigger than the request:

<figure class="diagram">
<div class="flow">
<div class="node">Attacker<small>a botnet</small></div>
<div class="arrow wide" data-label="forged request" aria-hidden="true"></div>
<div class="node">Open UDP Server<small>the amplifier</small></div>
<div class="arrow wide" data-label="large reply" aria-hidden="true"></div>
<div class="node hot">Victim</div>
</div>
<figcaption>The attacker doesn't send the flood itself, and the victim sees it arrive from innocent servers</figcaption>
</figure>

The bandwidth amplification factor is the reply size divided by the request size. CISA's alert on these attacks lists the factors for common protocols:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>DNS</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">28 to 54</span></div>
<div class="hbar"><span>SSDP</span><span class="track"><span class="fill" style="--w: 0.06%"></span></span><span class="value">31</span></div>
<div class="hbar"><span>CharGEN</span><span class="track"><span class="fill" style="--w: 0.7%"></span></span><span class="value">359</span></div>
<div class="hbar"><span>NTP</span><span class="track"><span class="fill" style="--w: 1.1%"></span></span><span class="value">557</span></div>
<div class="hbar peak"><span>Memcached</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">up to 51,000</span></div>
</div>
<figcaption>How many times larger the reply is than the request, on a linear scale where memcached dwarfs the rest</figcaption>
</figure>

Memcached, a cache server from [Redis and Memcached](/system-design/redis-memcached), could be abused this way when exposed to the internet over UDP. At the top of that range, a flood of 1.35 Tbps needs only about 26 Mbit a second of requests, which is a home internet connection.

That is the best case for the attacker, and real floods are usually smaller, but the principle holds.

Two defenses work at the root. Networks can filter packets whose source address doesn't belong to them, which is the recommendation of BCP 38, RFC 2827, though it works best when many providers do it and does nothing against floods from real addresses.

And services shouldn't expose UDP to the internet unless they must. Turn off what you don't need.

## Protocol: The SYN Flood

A TCP connection starts with a handshake, covered in [TCP and UDP](/system-design/tcp-udp). RFC 4987 describes how it is abused.

A server that receives a SYN message sets aside memory for a half open connection and waits for the final reply. An attacker sends a flood of SYNs from forged or unresponsive addresses, so the replies don't come.

The server's table of half open connections fills, and real users are turned away. The target is the server's memory, not its bandwidth.

The main fix is **SYN cookies**: the server encodes the needed state into the reply it sends and keeps nothing until the final message returns, so a flood costs it almost nothing. Operating systems implement it, and on Linux it is a setting:

```text
sysctl -w net.ipv4.tcp_syncookies=1
```

Smaller measures help, such as a larger backlog or a shorter timeout, and they are weak compared with SYN cookies. Most managed load balancers and cloud edges already handle this for you.

## Application: Looks Like Real Users

The hardest flood to stop is made of valid requests. Ten thousand machines each asking for `GET /search?q=calculus` do nothing unusual individually, and together they exhaust the search service and its database. The attacker picks expensive endpoints: search, login, anything that skips the cache.

Defenses here use what the earlier topics built:

- **A CDN and caches**: a flood of cacheable requests is absorbed at the edge, as in [Content Delivery Networks (CDNs)](/system-design/cdn)
- **Limits on costly paths**: tighter rate limits and concurrency limits on search and login, as in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice)
- **A web application firewall**: rules that block known bad patterns
- **Challenges**: ask suspicious clients to prove they are human, with a CAPTCHA or a small proof of work

## Two Real Cases

Two attacks show the range. In October 2016, a botnet called Mirai, made of hacked internet connected cameras and similar devices, attacked Dyn, a company that ran DNS for many large sites.

Dyn's customers could not be reached for hours even though their own servers were fine, because nobody could look up their names. That is the single point of failure from [How DNS Works](/system-design/dns). At its peak, Mirai had infected about 600,000 devices.

In February 2018, GitHub was hit by a memcached amplification attack. Its incident report gives the numbers and the timeline:

| Time, UTC | What Happened |
| --- | --- |
| 17:21 | Monitoring flags an odd traffic pattern, and the site goes down |
| 17:26 | Traffic is moved to Akamai, which absorbs it |
| 17:30 | GitHub is fully available again |
| 17:34 | More routes are withdrawn to shift another 40 Gbit a second off GitHub's own edge |

The attack peaked at 1.35 Tbit a second and 126.9 million packets a second, from over a thousand networks. GitHub's response was to hand its traffic to a provider with far more capacity, for a few minutes of outage in total. A defense is mostly capacity and reach, which is why it is bought, not built.

## Defense in Layers

Cloud providers draw the same line: network layer attacks are handled at the provider's edge, automatically or always on, and the application layer needs rules you set up yourself.

<figure class="diagram">
<div class="flow">
<div class="node">Internet</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Edge Network<small>absorbs layers 3 and 4</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">WAF and Limits<small>filters layer 7</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Your Servers</div>
</div>
<figcaption>Each layer removes the kind of traffic it is built for, and what passes is small enough for the next layer</figcaption>
</figure>

- **Reduce the target**: let only the CDN reach your servers, hide their real addresses, and close unused ports and services, especially UDP ones
- **Absorb at the edge**: a CDN or anycast network spreads an attack across many locations, the idea in [Global Traffic Routing](/system-design/global-routing), and has more capacity than you do. AWS Shield Standard defends against common layer 3 and 4 attacks at no extra charge, and Google Cloud Armor and Azure DDoS Protection offer always on protection for those layers
- **Filter at layer 7**: a WAF plus rate limits, since layer 7 protection needs a WAF, and Google's Adaptive Protection and AWS's Shield Advanced add detection and automatic rules on top
- **Scale, with a ceiling**: [autoscaling](/system-design/autoscaling) can absorb some load, and an attack can drive the bill up, which is why Shield Advanced lists cost protection among its features. Set a maximum
- **Keep spare capacity and plans**: the headroom from [Redundancy and Failover](/system-design/redundancy-failover), and a plan written down before it's needed

## Attack or Just a Busy Day

Registration day is also a flood. Both bring far more traffic than usual, and treating real students as attackers is its own outage. Some signals help tell them apart:

| Signal | A Real Rush | An Attack |
| --- | --- | --- |
| Sources | Many ordinary networks, mostly campus | Odd networks or countries, hosting providers |
| Behavior | Logging in, browsing, buying | Hitting one expensive path, ignoring cookies |
| Shape | Rises toward a known time | Sudden, flat and relentless |
| Requests | Varied | Identical, or oddly regular |

Because the two overlap, response begins gently: tighten limits on the costly paths and add challenges for suspicious clients, before blocking whole regions.

## Preparing

When an attack lands, the questions are who decides, what to switch on and whom to call.

A written runbook answers them: how to confirm it is an attack, which stricter rules to enable, how to move traffic to a scrubbing provider, how to tell users.

Provider support contacts should be known in advance, dashboards ready, and the plan practiced in a drill, as in [Chaos Engineering](/system-design/chaos-engineering). The next phase moves from how requests reach the servers to what the servers keep: [The Relational Model](/system-design/relational-model).

## Key Points

- A DDoS floods a target from many sources, so limits for each client don't trigger and the defenses live at the edge
- Floods come in three kinds: volumetric, protocol and application, and each needs its own defense
- Reflection and amplification turn small forged requests into huge floods, and SYN cookies stop SYN floods from filling the connection table
- Application floods look like real users, so rely on caches, limits on expensive paths, a WAF and challenges
- <u>Absorb it at the edge</u>: capacity and reach decide the outcome, as GitHub did by moving to a provider with more of both
- Tell a rush from an attack by sources and behavior, scale with a ceiling and keep a written plan
