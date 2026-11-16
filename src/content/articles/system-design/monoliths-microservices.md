> A **microservice** architecture builds an application from many small services, each owning one business job and deployed on its own. It buys independence and costs complexity, so it pays off past a certain size, and not before.

Everything in this phase so far treated the application as one program, copied across servers behind a load balancer. [From One Server to Many](/system-design/one-server-to-many) grew the textbook app by adding machines, and didn't split the code itself. This topic asks when it is worth splitting the code into separate services too. The honest answer, from the people who have studied it most, is later than most teams think.

## One Program or Many

A **monolith** is a single deployable program. The listings, search, messages and payments code all live in one codebase and call each other as ordinary function calls. **Microservices** split those into separate programs, each running in its own process, talking over the network, and usually owning its own data:

<figure class="diagram">
<p class="rowname">Monolith</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Textbook App<small>listings, search, messages, payments</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">One Database</div>
</div>
<p class="rowname">Microservices</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings Service</div>
<div class="node">Search Service</div>
<div class="node">Messages Service</div>
<div class="node">Payments Service</div>
</div>
<div class="arrow wide" data-label="own data" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings DB</div>
<div class="node">Search Index</div>
<div class="node">Messages DB</div>
<div class="node">Payments DB</div>
</div>
</div>
<figcaption>The same application, as one program and as four services that each keep their own data</figcaption>
</figure>

A monolith isn't the same as a mess. A well organized one has clear modules inside, and it is still simply one thing to build, deploy and run.

## What Splitting Buys

Martin Fowler's article with James Lewis, which popularized the style, and Microsoft's Azure Architecture Center list much the same benefits:

- **Independent deployment**: a team ships its service without waiting for the others, and a bug in one is less likely to take down all of them
- **Strong boundaries**: it is hard to reach into another service's internals, because there is a network between you
- **Independent scaling**: search may need twenty servers while payments need two, and you can run each as large as it needs to be
- **Team autonomy**: small teams own a service from start to finish, which fits Conway's law, the observation by Melvin Conway in the late 1960s that a system's design tends to copy the communication structure of the organization that builds it
- **Technology choice**: a service can use the language or database that suits it

Notice that nearly all of these are about people and organization, not about raw speed. A single monolith copied across many servers already handles a great deal of traffic, as the six servers in [Estimating Capacity](/system-design/estimation) showed.

## What Splitting Costs

Fowler names three costs, and each one connects to something earlier in this roadmap.

**Distribution.** A call between services is a network call. From [Numbers Every Engineer Should Know](/system-design/numbers), a call inside one data center takes around half a millisecond, thousands of times longer than a function call in memory, and it can fail, as in [Idempotency and Safe Retries](/system-design/idempotency). Calls also add up when a page needs many of them, one after another:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>1 Call</span><span class="track"><span class="fill" style="--w: 1%"></span></span><span class="value">0.5</span></div>
<div class="hbar"><span>10 Calls</span><span class="track"><span class="fill" style="--w: 10%"></span></span><span class="value">5</span></div>
<div class="hbar"><span>50 Calls</span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">25</span></div>
<div class="hbar peak"><span>100 Calls</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">50</span></div>
</div>
<figcaption>Milliseconds added by calls between services, at half a millisecond each and made one after another (example numbers)</figcaption>
</figure>

Microsoft's guidance on the chatty I/O antipattern puts it plainly: many small requests, each with its own overhead, drag down a system that one larger request would serve well. A bad split makes exactly that happen.

**Eventual consistency.** Each service owns its data, so there is no single transaction across them. In the monolith, selling a book is one database transaction:

```sql
BEGIN;
UPDATE listings SET status = 'sold' WHERE id = 42;
INSERT INTO orders (listing_id, buyer_id) VALUES (42, 7);
COMMIT;      -- both happen, or neither
```

With services, it becomes three calls to three owners:

```python
listings.mark_sold(42)            # Listings Service
payments.charge(buyer, 4500)      # Payments Service: what if this fails?
messages.notify(seller, 42)       # Messages Service
```

If the charge fails, the listing already says sold. Someone has to write the compensation, which is what the patterns in [Sagas](/system-design/sagas) are for.

**Operational complexity.** One program to deploy becomes many. Each needs its own pipeline, monitoring, versioning and on-call, and the interactions between them are where new failures live, the problem behind [Cascading Failures](/system-design/cascading-failures). Fowler is direct that this needs mature automation and a team culture that can run it.

## Start With a Monolith

Fowler's "MonolithFirst" essay makes an argument worth remembering. Almost all the successful microservice systems he knew of began as a monolith that grew too big and was split, and almost all the ones built as microservices from the start ran into serious trouble, by his account.

His reasoning is that you don't know the right boundaries early, and moving a boundary inside one program is a refactoring, while moving it between services is a project.

His follow up on the "microservice premium" gives the rule of thumb: the extra cost is only worth paying when the system is too complex to manage as one. For the textbook app, that is far off. The national scale in [Estimating Capacity](/system-design/estimation) needed about six identical servers, which is a monolith question, not a microservice one.

| Signs It May Be Time to Split | Signs to Wait |
| --- | --- |
| Many teams collide in one codebase and one release | One small team owns everything |
| One part needs very different scale or hardware | The boundaries aren't clear yet |
| One part has stricter rules, such as handling payments | Deployment and monitoring aren't automated |
| Builds and tests have grown too slow to work with | The main reason is that other companies do it |

## The Middle Path: A Modular Monolith

There is an option between the two. A **modular monolith** keeps one deployable program but enforces strict boundaries between its parts, so each part could be lifted out later.

Shopify describes doing this with its large Rails codebase: it reorganized about 6,000 classes into business components such as orders, shipping and billing, and added a tool that flags code reaching across a boundary except through a component's public interface. It said the isolation made it possible to replace its tax engine, which would have been nearly impossible before.

In our app, a rule could be as simple as this:

```python
# payments/api.py is the only file other modules may import
def charge(buyer_id: int, amount_cents: int) -> ChargeResult:
    ...

# listings/ may import payments.api, and never payments.internal
```

A lint check in the build enforces it. You get the clear boundaries without the network, and if payments does need to be pulled out one day, the cut is already marked.

## A Warning From Segment

Splitting can also go too far. Segment's engineers wrote in 2018 about a system with a separate service and queue for each of its over a hundred destinations. It solved a real problem, one slow destination blocking the rest, and then brought its own: shared code that drifted between copies, services that each had to be scaled by hand, and a growing on-call load. They merged it back into a single service.

It is one story, with its own context, and not a law. It does show that the same system can be right as many services at one moment and as one at another.

A related trap is the **distributed monolith**, services that are separate on paper but have to be deployed together or call each other constantly. Fowler's point is that coordinated deployments aren't really microservices. You pay the network cost and get none of the independence.

## Splitting When the Time Comes

If the signs say split, a few habits help:

- **Cut along business jobs**, not technical layers: listings, payments and messages, not "database service" and "web service"
- **Give each service its own data**: a shared database brings back the coupling the split was meant to remove
- **Talk through clear interfaces**: the APIs from [What Makes a Good API](/system-design/good-apis), or events as in [Event-Driven Architecture](/system-design/event-driven)
- **Match teams to services**: known as the inverse Conway maneuver, which shapes the organization to get the architecture you want

And do it a piece at a time. The **strangler fig** pattern, named by Fowler after vines that slowly replace the tree they grow on, puts a proxy in front of the monolith and moves one capability at a time:

<figure class="diagram">
<p class="rowname">Already Moved</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Proxy<small>routes by URL</small></div>
<div class="arrow wide" data-label="/search" aria-hidden="true"></div>
<div class="node">New Search Service</div>
</div>
<p class="rowname">Not Yet Moved</p>
<div class="flow">
<div class="node">Proxy<small>everything else</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">The Monolith<small>shrinks over time</small></div>
</div>
<figcaption>Requests move to the new service one URL at a time, and the monolith is retired when nothing is left in it</figcaption>
</figure>

AWS's guidance on the pattern adds two cautions: the proxy can become a bottleneck or single point of failure, and drawing the boundaries too early can put them in the wrong place. [Breaking Up a Monolith](/system-design/breaking-up-a-monolith) goes through a full migration. Running many services also needs a way to package and start them consistently, which is the subject of [Containers and Orchestration](/system-design/containers).

## Key Points

- A monolith is one deployable program, and microservices are many, each owning one business job and its own data
- Splitting buys independent deployment, strong boundaries, separate scaling and team autonomy
- <u>It costs distribution, eventual consistency and operational complexity</u>, and most of the benefits are about organization, not speed
- Start with a monolith, since boundaries are hard to place early, and split when the system or the organization is clearly too big
- A modular monolith gives clear boundaries without the network, and a bad split gives a distributed monolith
- Split along business jobs, give each service its own data, and move one piece at a time with a strangler fig proxy
