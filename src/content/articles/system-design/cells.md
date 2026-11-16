> A **cell** is a complete, independent copy of a service, serving a fixed slice of the customers. **Cellular architecture** runs many cells side by side behind a thin router, so that a failure, a bad deploy or a poisonous request harms just the customers of one cell.

The textbook app has one image service for its listing photos. One afternoon a student uploads a corrupted photo, and the code that resizes it crashes the server.

The student retries, and the load balancer sends the retry to another server, which crashes too. After a few retries the whole fleet is down, and 3 million listings go dark because of one file.

[Bulkheads](/system-design/bulkheads) isolated one dependency from another inside a service. This topic applies the same idea to the whole stack: split the fleet into cells, and let a poisonous request take down one cell.

## What a Cell Is

The AWS whitepaper on cell based architecture defines it as multiple isolated instances of a workload, each called a cell. A cell shares no state with other cells and handles a subset of the requests. The model comes from the ship's hull again: a breach stays in one compartment.

The work is divided by a **partition key**, a value chosen to match the grain of the service, such as the customer or the resource. A customer is assigned to one cell, and each of that customer's requests goes there.

The Azure Architecture Center describes the same pattern under the name deployment stamp, and lists the other names for it: a service unit, a scale unit or a cell. Each stamp is a full copy of the components, including the data stores, serving a set number of tenants.

Three parts make up the design:

- **The cells**: Full copies of the service and its data, each handling a fixed share of the customers
- **The router**: One shared layer that maps a customer to a cell and sends the request there
- **The control plane**: Creates cells, places customers in them, and moves customers between cells

The AWS whitepaper wants the router to be the thinnest possible layer, doing routing and no other work. A cheap mapping such as a hash of the key followed by a remainder works, and the router keeps no business logic, so that it is simple, easy to test and easy to scale.

The whole set of cells shares it, so it can't be split into cells itself, and it has to keep serving the other cells when one is unreachable.

<figure class="diagram">
<div class="flow">
<div class="node">Request<small>customer 4412</small></div>
<div class="arrow" data-label="key" aria-hidden="true"></div>
<div class="node hot">Router<small>maps to cell 2</small></div>
<div class="arrow" data-label="forward" aria-hidden="true"></div>
<div class="node">Cell 2<small>own servers and data</small></div>
</div>
<figcaption>The router reads the partition key and sends the request to one cell, and the other cells don't see it</figcaption>
</figure>

## One Bad Customer

We simulated the image service failure. Twelve servers, 1,000 customers who each stay with one cell, and one customer who sends a poisonous request each second.

Each attempt, and up to 3 retries on other servers in the same cell, crashes a server, and a server takes 60 seconds to restart. We counted the requests of the other customers answered during 5 minutes:

| Layout | Other Customers Served |
| --- | --- |
| One Pool of 12 Servers | 1% |
| 2 Cells of 6 Servers | 48% |
| 4 Cells of 3 Servers | 74% |
| 6 Cells of 2 Servers | 82% |

With one pool, the poison customer kept the servers down. With cells, just the poison customer's cell was lost, and the results sit close to the share that arithmetic gives: with N cells, a failure confined to one cell leaves 1 minus 1 over N of the customers untouched, 75 percent for 4 cells and 83 percent for 6.

The AWS page puts it the same way: with 10 cells, a failure in one leaves 90 percent of requests unaffected, and with 100 cells, a failure reaches 1 percent.

The customer who sent the poison request still has a bad time, since their own cell goes down. A cell gives a limit, not a cure.

## Sizing a Cell

The whitepaper names three forces on the size of a cell:

- **Big enough**: A cell has to hold the largest customer, and be efficient enough to be worth its fixed costs
- **Small enough**: A cell should be small enough to be tested at its full load, so that its limits are known, and far from the limits of the account or the region
- **A known maximum**: A cap on the size of a cell, in requests a second, customers or data, turns it into a unit of scale: to grow, add cells and don't grow cells

Smaller cells reduce the damage of a failure and cost more to operate, with more cells to manage and more idle capacity in each. Larger cells are easier to run and use capacity better, and a failure reaches a larger share of the fleet.

The whitepaper says cells needn't be very large for any service, and that the right maximum depends on the service. It also warns against running a cell near its limit, since a cell needs headroom to absorb a failover.

Cost shows up early. The textbook app needs 6 servers at its peak. If each cell needs at least 2 servers so that one failure doesn't take the cell down, 3 cells use 6 servers, and 6 cells use 12.

That figure is our arithmetic, and it ignores the extra headroom, but it shows why the number of cells is a choice and not a goal in itself.

## Placing Customers

The router needs a map from each customer to a cell. A hash and a remainder is the cheapest, and it moves most customers whenever the number of cells changes, which is the problem [Consistent Hashing](/system-design/consistent-hashing) addresses.

Many cell systems keep an explicit table, which costs a lookup and makes it easy to place a large customer in a cell of their own, or to move one.

The AWS whitepaper gives these jobs to the control plane. It places new customers in cells with room, watches the use of each cell and of each customer in it, and moves customers when one grows to dominate.

Moving a customer takes care, since the data has to be copied and the router has to switch over at the right moment, which Azure calls hard and says needs custom logic. This is the same problem as in [Sharding Strategies](/system-design/sharding), and the same remedy of planning for the move before it is needed.

## Deploying One Cell at a Time

A change can be the cause of an outage as easily as a hardware fault. Cells give a deploy a natural order. The whitepaper deploys to one or more cells at a time, in waves, and rolls back at the first sign of a problem, which limits how many customers are exposed.

For the textbook app with 10 cells, a bad release that is noticed after 10 minutes of errors in the first cell reaches 10 percent of the customers, for those 10 minutes. Without cells it reaches the whole customer base. This is the foundation for the staged rollouts in [Canary Releases and Other Deployment Strategies](/system-design/deployments).

The same boundary helps testing. A cell has a known maximum, so a load test of one cell, covered in [Load Testing](/system-design/load-testing), predicts the others.

## Cells Along Zone Lines

The cell does not have to be a customer group. In some designs it is a data center zone, the unit that fails together.

Slack's engineers wrote about moving to this layout after an incident on 30 June 2021, when a faulty network link between availability zones degraded the service, though the design was meant to survive the loss of one zone.

They built a way to drain a zone, with the goals of moving most traffic away within 5 minutes, in steps as small as 1 percent, and without depending on anything in the zone being drained.

The idea they chose is siloing: a service accepts traffic from its own zone alone and calls upstream services in its own zone alone, so each zone behaves as a cell.

The edge load balancers drain a zone by changing the weights of the routes to it, and the change takes seconds to spread. The drain time of 5 minutes was a goal in the post, and not a measured result.

AWS describes the related idea of static stability in the Builders' Library. A system that is statically stable keeps working when a dependency is impaired, without needing to react.

For a fleet across three zones it overprovisions by 50 percent, so that each zone runs at about 66 percent of its tested level, and the loss of one zone leaves the other two able to carry the whole load without launching anything new.

[Autoscaling](/system-design/autoscaling) can't be relied on at the moment a zone fails, since the requests to launch instances may be what is impaired.

## Cells at Amazon

Amazon's paper on Physalia, the store that keeps the configuration of EBS volumes, is a case in which cells are the central design. Its history begins with an April 2011 outage in which a network configuration change made 13 percent of the volumes in one zone unavailable.

Each Physalia cell holds the data of one partition key, runs consensus over seven nodes, and doesn't coordinate with other cells, though each node takes part in many cells.

The paper calls the division into many cells its main tool for reducing blast radius.

Placement is part of the design too: the control plane gives each node a different mix of cells, so that a poisonous transition that crashes a node loses just the cell that triggered it, and puts a cell near the client it serves.

The paper also says why it kept cells separate. It could have let cells share data and coordinate, as in some elastic designs, but the added complexity and the dependencies between shards worked against blast radius, so cells stayed independent and the control plane became its own system.

## Shuffle Sharding

A cell has a fixed group of customers. [Bulkheads](/system-design/bulkheads) described shuffle sharding, which takes the other route: each customer gets a random small subset of the workers, so two customers rarely share the same set.

With 8 workers and 2 for each customer, there are 28 possible pairs, against 4 fixed groups in the cell layout. The cell is simpler to run and to explain, and shuffle sharding spreads the risk more finely. The choice is between those two strengths.

## The Costs

Cells are not free, and the Azure guidance says they aren't right for simple solutions:

- **Duplicated capacity**: Each cell carries its own minimum, and the total grows with the number of cells
- **Operations**: Many copies to deploy, monitor and keep identical, which needs automation, and Azure suggests at least two stamps from the start to avoid assumptions of a single copy
- **A shared router**: One component in front of the cells, so it has to be simpler and more reliable than anything behind it
- **Cross cell work**: A report across the customers needs data from each cell, and a customer who moves needs a migration
- **A region is one cell too**: Azure notes that stamps are not redundant across regions by themselves, so a regional failure takes down the tenants in that region, as covered in [Surviving a Region Outage](/system-design/region-outage)

Chaos experiments, as in [Chaos Engineering](/system-design/chaos-engineering), are the way to check that a cell really contains a failure.

## Key Points

- A cell is an independent copy of a service for a fixed slice of customers, with a thin shared router and a control plane that places and moves customers
- In our simulation, one poisonous customer left 1 percent of the others served with a single pool of 12 servers, and 82 percent with 6 cells, close to the 1 minus 1 over N the arithmetic gives
- <u>Cap the size of a cell</u>, so that it can be tested and grown by adding cells, and keep headroom for the loss of a server or a zone
- Deploy cell by cell, so a bad release reaches 10 percent of customers with 10 cells, and roll back at the first sign
- Cells cost duplicated capacity, operational work and a shared router, so use them when the scale or the risk justifies them
