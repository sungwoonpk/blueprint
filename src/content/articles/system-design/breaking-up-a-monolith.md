> **Breaking up a monolith** means moving parts of one deployed application into separate, independently deployed services, step by step, along boundaries chosen from the business, while the system keeps running. It is a means, not a goal: the point is to gain something specific, such as independent releases or independent scaling, at a price that has to be worth paying.

The textbook app is one program. Listings, search, messages, payments and the admin pages share a codebase, a deploy and a database. It has served well for years. Now it hurts in four places. A fix to the message page waits for the same release train as a change to payments.

Search needs ten times the memory of the rest of the app, so each server is sized for it. Three teams edit the same files, and an out of memory crash in the photo code takes the checkout down with it.

A split looks like the cure. Whether it is depends on what hurts, how the pieces connect, and how the move is made. A split done wrongly keeps the coupling and adds the network.

## First Ask Whether

Martin Fowler's writing on the subject is cautious. His MonolithFirst note makes two claims: most of the successful microservice stories started with a monolith that grew too big and was broken up, and systems built as microservices from scratch have mostly ended in serious trouble. He gives three reasons.

Teams don't yet know what users want, a microservice setup carries a productivity cost that he calls the microservice premium, and boundaries are hard to get right early, while moving code across a service boundary is far harder than across a module boundary.

He calls the evidence sparse and his advice tentative, and notes that the view is by no means unanimous.

His trade-offs article lists what a split buys and costs:

| Benefit | Cost |
| --- | --- |
| Strong Module Boundaries | Distribution: remote calls are slow and can fail |
| Independent Deployment | Eventual Consistency: no transaction across services |
| Technology Diversity | Operational Complexity: many things to run and watch |

The first benefit is less clear than it looks. A monolith can keep strong boundaries with discipline, and Fowler says that a service boundary makes the workaround harder to sneak in, which is a matter of habit and not of physics.

The second benefit is real, with a condition he states in a footnote: a set of services that must be deployed in coordination isn't a microservice architecture. The third matters most as the freedom to use different versions of a library in each part.

He also lists prerequisites: a new server in hours, basic monitoring of technical and business signals with quick rollback, and a deployment pipeline that finishes in a couple of hours. A team without them will pay the premium and get little. His rule is that a monolith that can manage its own complexity should stay a monolith.

An intermediate step exists and is often the right one: a **modular monolith**, one deployable with enforced module boundaries, which gains most of the clarity with no network cost, and keeps the option of splitting later.

Fowler's note on sacrificial architecture adds the mindset: the best design now may be one you replace in a few years, and a modular start makes that cheaper.

## What the Network Costs

We put numbers on the distribution cost. A request makes k sequential calls to other services. Each call takes a median of 4 ms with a 99th percentile of about 40 ms, a lognormal shape that is our assumption, and each service is available 99.9 percent of the time:

| Calls for a Request | Median | 95th Percentile | 99th Percentile | Success Rate |
| --- | --- | --- | --- | --- |
| 1 | 4.0 ms | 20.4 ms | 40.1 ms | 99.90% |
| 3 | 15.7 ms | 45.6 ms | 73.9 ms | 99.70% |
| 6 | 34.5 ms | 77.0 ms | 111.5 ms | 99.40% |
| 10 | 60.1 ms | 114.4 ms | 154.6 ms | 99.00% |
| 20 | 124.9 ms | 199.0 ms | 248.3 ms | 98.02% |

The same ten steps inside one process take about 0.01 ms and share the availability of that process.

The table is the reason Fowler lists distribution among the costs: remote calls are slow and can fail, and he says most microservice stories he has heard needed asynchrony to get acceptable performance. A boundary should be placed where few calls cross it.

## Find the Seams

A **seam** is a place where the code can be separated with little damage. Three sources of boundaries are in common use:

- **Business capabilities**: What the business does to create value, such as catalog management, order management and delivery. The microservices.io pattern lists benefits: a stable architecture, since capabilities change slowly, autonomous teams, and services that are cohesive and loosely coupled
- **Subdomains**: The domain driven design view, with core subdomains that differentiate the business, supporting ones that you could outsource, and generic ones that you should buy. Eric Evans's bounded context is the unit: a model with one consistent meaning of its words, since, as he put it, a single unified model for a large system isn't feasible or cost effective. Fowler's example is a utility where the word meter means three different things to three groups
- **Evidence from the code**: Zhamak Dehghani's guide to breaking up a monolith suggests analyzing code churn, which parts change most, and overlaying it with the product roadmap, so the first services are the ones that change often. Scaling needs matter too: search with ten times the memory is a candidate by itself

The cost of a seam shows in the number of calls across it. We built a made up dependency graph of 30 modules in 5 groups of 6, where modules in a group call each other much more than the rest, 1,440 calls between modules for each 100 requests.

Splitting off a group that matches the structure put between 131 and 280 calls across the new boundary, 179 on average.

Splitting off 6 modules chosen at random put 477 across on average, and even the best of 2,000 random tries was 209 and the worst 731. The graph is invented, and the lesson is general: find the boundary where the traffic is lowest, which is usually the boundary the business already draws.

## Move Gradually

A rewrite of the whole system in parallel tends to fail. Fowler's description of the strangler fig, taken from the vine that grows around a host tree, says wholesale replacement goes down in flames most of the time, since existing behavior is hard to specify and much of it isn't wanted.

The pattern is to build new functionality around the old and move behavior across a piece at a time. The Azure description gives four phases:

1. **Put a facade in front**: A proxy or gateway, such as [API Gateways](/system-design/api-gateways), receives the requests. At first it sends nearly the whole load to the legacy code
2. **Shift gradually**: Route one capability, then another, to the new service, with a way to switch back
3. **Retire the legacy**: Remove the old code once no caller depends on it
4. **Remove the facade**: Clients talk to the new system directly, if that suits

The Azure page lists the problems: shared services and data stores have to be reachable from both systems while they coexist, the facade must keep pace and shouldn't become a bottleneck or a single point of failure, and the pattern doesn't fit when requests can't be intercepted or the system is small.

Two companion techniques help. **Branch by abstraction**, which Fowler describes, creates a layer that captures how the client code uses the old supplier, moves the clients to it, builds the new supplier behind the same layer, switches over gradually and removes the old one, with the system buildable and releasable throughout.

An **anti-corruption layer** translates between the models of the old and the new, so the legacy design doesn't leak into the new service. The Azure page notes its costs, added latency and another component to run, and advises keeping it to translation with no business rules.

Dehghani's advice on order is practical:

- **Start with an edge**: A simple capability with few dependencies, such as authentication or a profile facade, to learn to run services before touching the core
- **Minimize calls back into the monolith**: Pick capabilities whose logic doesn't depend on the code still in the monolith, and expose a monolith API through an anti-corruption layer when a call back can't be avoided
- **Split the sticky parts early**: The web session is her example, broken into domain concepts, not turned into a session service
- **Release the data**: Decoupling the facade alone or the backend alone, and leaving the data coupled, is the anti-pattern
- **Go macro, then micro**: Start with larger services around a logical concept, and avoid anemic services that wrap one table
- **Finish each step**: Decouple the new service, send the consumers to it and retire the old path. The anti-pattern is to use the new service for new consumers and leave the old one in place

## The Hard Part Is the Data

Services that share a database are still coupled, and moving the data is the part that takes longest.

The microservices.io pattern of database per service says each service's persistent data is private and reachable through its API alone.

The private store can be tables, a schema or a server, and the page recommends separate database users and grants so that developers don't bypass the API. The benefits are loose coupling and the choice of a database that fits.

The drawbacks are the ones from [Sagas](/system-design/sagas): no transaction across services, and queries across databases are hard, with remedies in the saga, in composing results in an API layer, and in the materialized views of [CQRS](/system-design/cqrs).

The migration itself uses tools from earlier topics:

- **Expand and contract**: The steps of [Schema Migrations Without Downtime](/system-design/schema-migrations) apply, since old and new run together
- **Change data capture**: The Azure page's database example extracts the domain's tables with a bulk copy and change data capture, validates consistency, and cuts over, and a rollback stays possible until the legacy objects are removed, which is a deliberate last step. [Change Data Capture](/system-design/cdc) covers the mechanism
- **Avoid dual writes**: [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync) explains why, and the outbox is the safer path
- **Flags for the switch**: A flag, as in [Feature Flags](/system-design/feature-flags), moves reads and then writes to the new store a step at a time

## Living With the Result

A system of services needs the practices of Phase 6, which a monolith could postpone: timeouts and retries with budgets, circuit breakers and bulkheads, observability that follows a request across services, versioned APIs with tests of the contracts between them, and releases of each service on its own schedule.

Teams need to own services end to end, and Conway's law, which Fowler's strangler article cites, means the organization has to change along with the code, or the new system takes on the old mess.

## A Plan for the Textbook App

| Step | Move | Gate |
| --- | --- | --- |
| 1 | Make the monolith modular: enforce module boundaries and stop modules sharing tables | Dependency checks in the build |
| 2 | Put a gateway in front, routing the whole load to the monolith | No change in behavior |
| 3 | Extract search first: it needs 10 times the memory and has few calls back | Its own scaling, with a flag to switch back |
| 4 | Extract photo processing behind a queue | Crashes no longer reach checkout |
| 5 | Leave listings, messages and payments together until the data and the traffic say otherwise | The call count across the boundary |
| 6 | Retire each old path after its service has run a full cycle | Old code deleted |

## Pitfalls

- **A split without a reason**: The costs arrive and the benefit doesn't
- **Boundaries chosen by technology layers**: Many calls cross each one
- **A shared database**: The coupling remains, with a network added
- **A big bang rewrite**: Old behavior is hard to specify, and the project can't ship until it is done
- **Leaving the old path in place**: Two systems to run
- **Starting with the core**: The team learns operations on the most important code
- **No prerequisites**: Slow provisioning, weak monitoring and long deploys multiply the premium

## Key Points

- Ask what hurts before splitting: most of the success stories started with a monolith, and a modular monolith gives much of the structure without the network
- Distribution costs latency and reliability: in our model, 10 sequential calls had a median of 60 ms against about 0.01 ms in one process, and a success rate of 99.0 percent from services that are each 99.9 percent available
- <u>Cut where few calls cross</u>: in our made up graph, a split along the structure put 179 calls across the boundary on average, against 477 for a random split
- Move gradually with a facade, branch by abstraction and an anti-corruption layer, starting with a loosely coupled edge, and finish each step by retiring the old path
- The data is the hard part: give each service its own, migrate with expand and contract and change data capture, avoid dual writes, and keep the practices of Phase 6 ready
