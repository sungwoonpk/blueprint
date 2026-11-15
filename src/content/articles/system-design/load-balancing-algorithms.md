> A **load balancing algorithm** is the rule a load balancer uses to pick a server for each request. Simple rules work when servers and requests are alike, smarter ones help when they aren't, and hashing keeps related requests together.

[Load Balancers](/system-design/load-balancers) showed where the choice gets made. This topic is about how, and the answer changes with the traffic. Take registration day again, with six servers and thousands of requests a second. If every request cost the same and every server were identical, almost any rule would do. Neither is true for long, and the rules differ in how they cope.

## Taking Turns: Round Robin and Weights

**Round robin** is the simplest rule: A, then B, then C, then A again. It needs no information about the servers, and it is the default in many places, including nginx and AWS's Application Load Balancer.

It assumes the servers are the same. When one machine is twice as large as another, **weights** fix that, by giving the bigger one a proportionally larger share:

```nginx
upstream web_servers {
    server 10.0.1.11:8000 weight=3;   # a larger machine
    server 10.0.1.12:8000;            # weight defaults to 1
}
```

Here the first server gets 3 of every 4 requests. AWS recommends plain round robin when requests cost about the same and the targets are alike.

The weakness is that round robin is blind. It deals requests out in turn without noticing that one server is stuck on a slow search while another is idle. When requests vary in cost, the unlucky server falls behind and a queue builds up, even though the others have room.

## Send It Where It Is Quiet

The next idea is to look before picking. **Least connections**, or in AWS's words **least outstanding requests**, sends each request to the server with the fewest requests in progress. A server stuck on slow work has a long list, so it gets fewer new ones. nginx calls it `least_conn`, and AWS recommends it when request cost or server capacity varies.

```nginx
upstream web_servers {
    least_conn;
    server 10.0.1.11:8000;
    server 10.0.1.12:8000;
}
```

It costs more, because the balancer has to count what is in flight for each server. And it has a trap: a server that is broken and answering with errors instantly has the fewest requests in flight, so it can attract more traffic, not less. Health checks, from [Health Checks](/system-design/health-checks), catch this, and AWS also watches each target's error rate against its peers and, with the right setting, eases traffic off outliers.

## Two Random Choices

Counting every server is more work than it sounds when there are many servers, or several balancers each with a partial view. There is a neat shortcut. Pick two servers at random, and send the request to whichever has fewer requests in flight:

```python
def pick(servers):
    a, b = random.sample(servers, 2)
    return a if a.in_flight <= b.in_flight else b
```

This is called the **power of two choices**. It costs the same however many servers there are.

Envoy, a widely used proxy, does exactly this by default in its least request mode when servers have equal weights, sampling two random hosts and taking the one with fewer active requests. A classic result in randomized load balancing says that this small amount of checking improves the worst case enormously compared with choosing one server blindly.

To see how much, we ran a simulation: 10 servers, each handling one request at a time, kept 90% busy overall, with requests whose length varies randomly around an average of 100 ms. Here is how long the slowest 1% of requests took, from arrival to finish, under four rules:

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>Random</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">4,350</span></div>
<div class="hbar"><span>Round Robin</span><span class="track"><span class="fill" style="--w: 59.5%"></span></span><span class="value">2,590</span></div>
<div class="hbar"><span>Two Random Choices</span><span class="track"><span class="fill" style="--w: 24.4%"></span></span><span class="value">1,060</span></div>
<div class="hbar"><span>Fewest In Flight</span><span class="track"><span class="fill" style="--w: 18.4%"></span></span><span class="value">800</span></div>
</div>
<figcaption>Milliseconds taken by the slowest 1% of requests, in a simulation of 10 servers at 90% load (our own example)</figcaption>
</figure>

Taking turns beats picking at random, and looking at the load beats taking turns by a wide margin. Two random choices come close to checking every server, with far less work.

The average request tells the same story: roughly 990 ms for random, 550 ms for round robin, 300 ms for two choices and 190 ms for fewest in flight. As in [Latency and Throughput](/system-design/latency-throughput), the tail suffers first when servers get busy, and a smarter rule is one way to push that point back.

## Same Client, Same Server

Sometimes the goal is the opposite of spreading evenly. A cache server holds recently used data, and a request lands better on the server that already has it. Per-user data in a server's memory has the same pull. The tool is **hashing**: compute a number from something in the request and use it to pick the server, so the same input lands in the same place.

- **By client address**: nginx's `ip_hash` uses the first three parts of an IPv4 address, so one office tends to reach one server
- **By URL**: send each file to the same cache, so it sits in one place and not in all of them
- **By user, cookie or header**: keep one user's requests together

```nginx
upstream cache_servers {
    hash $request_uri consistent;
    server 10.0.2.11:8000;
    server 10.0.2.12:8000;
    server 10.0.2.13:8000;
}
```

The naive version, the hash divided by the number of servers and the remainder picking the server, has a problem when servers come and go. Adding a fifth server to four changes the remainder for most keys, so most requests suddenly go to a different server and find a cold cache.

The `consistent` keyword switches to **consistent hashing**, which places servers and keys on a ring so that only the keys nearest the change move. We tried both on 200,000 keys, going from four servers to five:

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>Hash Divided by Server Count</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">80%</span></div>
<div class="hbar"><span>Consistent Hashing</span><span class="track"><span class="fill" style="--w: 21.3%"></span></span><span class="value">17%</span></div>
</div>
<figcaption>Share of keys that change server when a fifth server joins four (our own test)</figcaption>
</figure>

The ideal for consistent hashing is one in five, and the new server takes its share from the others. [Consistent Hashing](/system-design/consistent-hashing) returns to how the ring works.

It can create hot spots, with one server getting far more than its share, and a variant from Google called consistent hashing with bounded loads caps each server at a small margin above the average. Vimeo put it into HAProxy, and Google's post reports that it cut Vimeo's cache bandwidth by almost eight times.

## Easing a New Server In

A server that has just started has empty caches and unwarmed code, so handing it a full share at once can make it slow, and then it looks unhealthy. Many balancers can ramp a new server up gradually. AWS calls it slow start, and it is off by default, and nginx has a `slow_start` setting in its commercial edition. The same care applies in reverse when a server is removed, as with the draining in [Load Balancers](/system-design/load-balancers).

## Choosing a Rule

| Situation | A Good Fit |
| --- | --- |
| Similar servers and similar requests | Round robin |
| Servers of different sizes | Weights |
| Request cost varies, or many balancers share the work | Fewest in flight, or two random choices |
| Caches or per-user data | Hashing, preferably consistent |

Start with the default, which is usually round robin, and change it when measurements show a reason, as in [Load Testing](/system-design/load-testing). The best rule is no help to a server that is already broken, which is the next topic: [Health Checks](/system-design/health-checks).

## Key Points

- A load balancing algorithm picks the server for each request, and the right one depends on how alike the servers and requests are
- Round robin takes turns and is blind to load, and weights give bigger servers a bigger share
- Fewest in flight avoids busy servers, and <u>two random choices</u> gets most of the benefit for far less work
- In our simulation, looking at load cut the slowest 1% of requests from 4.4 seconds to about 1 second
- Hashing keeps a client or a URL on one server for caches, and consistent hashing moves far fewer keys when servers change
- Ramp new servers up gradually, and remember that no rule helps a broken server, so health checks come next
