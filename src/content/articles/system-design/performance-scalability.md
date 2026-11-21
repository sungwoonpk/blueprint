> **Performance** is how fast a system is for one user. **Scalability** is whether it stays fast as more users, more data or more distance arrive. A system can be strong at one and weak at the other.

In [Latency and Throughput](/system-design/latency-throughput), you met the two numbers behind this: how long one request takes, and how many the system finishes each second. Performance is mostly about the first. Scalability is about what happens to both as the load grows, and whether adding machines, from [From One Server to Many](/system-design/one-server-to-many), pays off in proportion.

## Slow Alone or Slow in a Crowd

Test the system with one user, then with many. The two results tell you which kind of problem you have:

| Problem | With One User | With Many Users | A Typical Cause |
| --- | --- | --- | --- |
| Performance | Slow | Slow | A slow query, heavy code, too many round trips |
| Scalability | Fast | Slow | Something every request shares, such as one database or one lock |
| Healthy | Fast | Fast | |

The cures differ too. A performance problem calls for tuning what exists: a faster query, a cache, less work per request. A scalability problem calls for a change of design that spreads the load. And a scalable system isn't automatically fast. Ten copies of a slow request are ten slow requests.

## Growth Comes in Directions

"More load" can mean different things, and each one stretches a different part of the system:

- **More requests**: more people at once, as on registration day. See [Scaling Reads](/system-design/scaling-reads) and [Scaling Writes](/system-design/scaling-writes)
- **More data**: the listings and photos pile up until one database can't hold them. See [Sharding Strategies](/system-design/sharding)
- **More distance**: users spread across the country or the world. See [Serving Users Worldwide](/system-design/global-users)

## More Servers Don't Add Speed Evenly

If a system were perfectly scalable, doubling the servers would double the work it finishes. In practice, some part of each job can't be shared. It may be a lock that one request holds at a time, or a single database that every server waits on. That part limits everything, which is the idea behind **Amdahl's law**. Say 95% of the work can be split across servers and 5% can't:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>1 server</span><span class="track"><span class="fill" style="--w: 5%"></span></span><span class="value">1×</span></div>
<div class="hbar"><span>4 servers</span><span class="track"><span class="fill" style="--w: 17.4%"></span></span><span class="value">3.5×</span></div>
<div class="hbar"><span>16 servers</span><span class="track"><span class="fill" style="--w: 45.7%"></span></span><span class="value">9.1×</span></div>
<div class="hbar"><span>64 servers</span><span class="track"><span class="fill" style="--w: 77.2%"></span></span><span class="value">15.4×</span></div>
<div class="hbar peak"><span>Ceiling, any number</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">20×</span></div>
</div>
<figcaption>How much faster the work finishes, when 5% of it can't be shared (example)</figcaption>
</figure>

Going from 16 to 64 servers quadruples the cost and finishes the work about 1.7 times faster. The ceiling is 1 divided by the part that can't be shared: 1 divided by 5% is 20. Real systems often do worse than this model, because servers also spend time coordinating, and past some point more servers that must agree on shared data can even lower the throughput. The Universal Scalability Law models that effect.

So the useful question is rarely "how many servers?" It is "what is every request still waiting on?"

## Find the Bottleneck

A request passes through several stages, as in [The Life of a Request](/system-design/life-of-a-request), and each one can handle only so much. The system as a whole moves at the pace of the slowest:

<figure class="diagram">
<div class="flow">
<div class="node">Load Balancer<small>10,000 per second</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Servers<small>6,000 per second</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Database<small>1,500 per second</small></div>
</div>
<figcaption>This chain carries 1,500 requests per second, however fast the other stages are</figcaption>
</figure>

Doubling the web servers changes nothing here, and the database is where the limit sits.

This is the rule from [From One Server to Many](/system-design/one-server-to-many): measure, find the bottleneck, then fix that part.

Signs of a bottleneck are throughput that stops rising while response time keeps climbing, and one resource, such as a pool, a lock or a disk, running at its limit while the rest sit idle. Once you have found it, fix that stage, measure again, and expect the next bottleneck to show up. See [Load Testing](/system-design/load-testing).

The next topic looks at the two ways to add capacity, [Scaling Up and Scaling Out](/system-design/scaling).

## Key Points

- Performance is how fast the system is for one user, and scalability is whether it stays fast as load grows
- Slow with one user is a performance problem, and fast alone but slow in a crowd is a scalability problem
- Growth comes as more requests, more data and more distance
- <u>Whatever can't be shared limits everything</u>, so more servers give diminishing returns
- A chain runs at the speed of its slowest stage, so measure first and fix the bottleneck
