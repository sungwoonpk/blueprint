> A **region outage** is the loss, or serious degradation, of a whole cloud region, the group of data centers in one geographic area. **Surviving** one means that users can still reach the service, with their data, from somewhere else within the recovery time and recovery point the business accepts.

On 19 October 2025, one of the largest cloud regions had a bad night and a long morning.

Amazon's own summary of the event says that a latent race condition in the DNS management system for DynamoDB left an empty DNS record for the service's regional endpoint in us-east-1. Services that needed DynamoDB couldn't find it, and the failure spread to the layers above.

The textbook app doesn't run in that region, but the story is a useful test for any design.

The question it asks is not whether a machine can fail, or a zone, which [Cellular Architecture](/system-design/cells) and the multi zone designs of this phase handle, but what happens when something that the zones in a region rely on stops working.

## What Happened, Step by Step

AWS published the sequence, and the times show how one fault became several:

| Period | What Failed | Duration |
| --- | --- | --- |
| 11:48 PM to 2:40 AM | DynamoDB API calls, from the DNS fault | About 2 hours 52 minutes |
| 11:48 PM to 1:50 PM | EC2, as launches and new instance networking failed | About 14 hours |
| 5:30 AM to 2:09 PM | Network load balancers, with connection errors | About 8 hours 39 minutes |

The whole event ran about 14.5 hours, from 11:48 PM to 2:20 PM. The root cause was fixed in under three hours, and the rest was recovery of the systems that had fallen behind while it was broken:

- **The trigger**: Two automation components raced. A delayed one applied an old plan over a newer one, and a cleanup step then deleted the old plan, which removed the addresses of the regional endpoint. The state blocked later automated updates, and AWS says it required manual operator intervention to correct
- **The first knock on**: The EC2 system that manages the physical servers depended on DynamoDB for its state checks. Leases timed out, and when the database came back, the work of establishing them again congested the system, which AWS describes as a state of congestive collapse. The page says there was no established procedure for that recovery, and engineers throttled incoming work and restarted hosts by hand
- **The second knock on**: New instances were added to load balancer health checks before their network state had spread. The checks flapped between pass and fail, and the health check system's automatic failover removed capacity from load balancers. AWS disabled the automatic failover at 9:36 AM, and the connection errors cleared
- **The long tail**: Lambda, STS, the support center and other services each had a window of impairment, some into the next day

Instances that were already running were not affected. The damage fell on things that needed a control action: launching, registering, looking up and failing over. That is the lesson to take to a design review.

## What Each Boundary Protects

Cloud providers build in layers, and each layer fails differently. AWS's article on static stability shows what the layers buy at the zone level: a service across three zones that overprovisions by 50 percent runs each zone at about 66 percent of its tested level, so the loss of a zone leaves the other two able to carry the load without launching anything.

It also shows what a zone boundary doesn't do. If the zones share a dependency, such as the regional DNS in the event above, or a regional control plane, the zones fail together.

A region boundary protects against that class of fault, and it costs a second set of the whole stack. The capacity arithmetic is the first bill.

If each region must carry the whole load when another is lost, and we plan to keep any region at 80 percent or less in use, then the normal load per region has to be lower:

| Regions | Highest Normal Utilization | Extra Load on Each Survivor |
| --- | --- | --- |
| 2 | 40% | 100% |
| 3 | 53% | 50% |
| 4 | 60% | 33% |
| 5 | 64% | 25% |

These are our arithmetic from the 80 percent planning figure in [Capacity Planning](/system-design/capacity-planning). Two regions waste the most idle capacity, and more regions waste less and cost more to operate.

Azure's guidance adds a warning: deploying resources to a region in a pair doesn't automatically make them more resilient, and the documentation says not to rely on the provider's own failover between paired regions as the primary disaster recovery approach.

A provider decides to fail over after repeated failed recovery attempts, in catastrophic cases, which is later than most businesses can wait.

## Choosing a Strategy

[Backups and Disaster Recovery](/system-design/backup-dr) described the four strategies from the AWS whitepaper: backup and restore, pilot light, warm standby and active/active. A region outage is the case that decides between them, and the decision depends on the targets.

For the textbook app, we set a recovery point of 5 minutes and a recovery time of 1 hour in registration week, and 1 hour and 8 hours the rest of the year. Registration week needs a warm standby, and the quiet months can use backup and restore.

AWS's whitepaper says a warm standby decreases the time to recovery because the workload is already running in the other region, and that active/active is the most complex and costly approach, with near zero recovery time for most disasters.

For the data, it notes that asynchronous replication enables a near zero recovery point, and that corruption still needs backups, since corruption replicates.

## Moving the Traffic

Detection and the switch of traffic take time, and the time adds up. The pieces are a health check that decides a region is down, from [Health Checks](/system-design/health-checks), and a way to send users elsewhere, from [Global Traffic Routing](/system-design/global-routing).

Azure's multi region reference design uses a global front end that routes the traffic to the remaining healthy regions and selects the origin by health and latency.

When the switch is done through DNS, the time to live of the cached answers sets a floor, as explained in [How DNS Works](/system-design/dns). We simulated 20,000 clients that honor the TTL, 3,000 requests a second, and a region that dies at time zero. The health check is declared failed after a number of consecutive failures:

| Setting | Failure Detected | 99% of Clients Moved | Requests Sent to the Dead Region |
| --- | --- | --- | --- |
| TTL 300 s, Check 30 s, 3 Failures | 90 s | 387 s | About 719,000 |
| TTL 60 s, Check 30 s, 3 Failures | 90 s | 149 s | About 360,000 |
| TTL 60 s, Check 10 s, 3 Failures | 30 s | 89 s | About 181,000 |
| TTL 30 s, Check 5 s, 2 Failures | 10 s | 40 s | About 75,000 |

The time to move nearly the whole set of clients is the detection time plus the TTL. Shorter settings cut the damage by 10 times, and they cost more queries and a higher risk of a false alarm: a flaky health check that flips a region out of service for a blip can start an outage of its own.

Our model assumes that clients honor the TTL. Clients that hold an answer longer than the TTL lengthen the tail, and the model doesn't include them.

The AWS event shows the risk from the other side. A health check system that degraded triggered automatic failover, which pulled capacity from the load balancers and made the impact worse.

AWS's response was to limit how much capacity a single load balancer can remove in this way. A failover rule needs a brake, so that a wrong decision can't remove too much, and the decision of who can override it must be clear.

## Keeping the Data

Moving traffic is the easy part. The data has to be somewhere useful when it arrives:

- **Single leader copied across regions**: Promoting the follower in the surviving region loses whatever hadn't replicated yet, the lag from [Replication Lag](/system-design/replication-lag), and it risks two leaders if the old one comes back
- **Multiple leaders**: Each region accepts writes and conflicts are resolved later, as in [Replication with Multiple Leaders](/system-design/replication-many-leaders) and [Detecting and Resolving Conflicts](/system-design/conflicts), a good fit for data that merges and a poor one for balances
- **Consensus across regions**: No data loss, and each write pays the delay between regions, from [Consensus and Leader Election](/system-design/consensus-leader-election)

These are the trade of [The CAP Theorem](/system-design/cap) and [PACELC](/system-design/pacelc) in concrete form. In the AWS event, DynamoDB's global table replicas in other regions kept working while the replication lag grew, which shows the pattern: the data was available elsewhere and slightly behind.

## Don't Count on the Thing That Broke

A failover plan can fail on its own assumptions. Four traps stand out:

| Assumption | The Question to Ask |
| --- | --- |
| Launch Servers in the Other Region | Does the launch path work during a regional event? In the AWS event, launches failed for about 8 hours. A statically stable design has the capacity running already |
| The Dashboard Shows the Problem | Does monitoring live in the failed region? |
| The Team Signs In to Fix It | Is identity, and the secret store, reachable from outside the region? |
| The Deploy Pipeline Pushes the Fix | Does it run in the region that is down? |

AWS's static stability article states the principle: separate the control plane, which makes changes, from the data plane, which keeps running, and design so that what worked before an impairment continues to work during it.

A failover that needs a control plane to act is exposed to the same event it is meant to survive. The AWS summary also notes that the DNS automation was built with minimal dependencies so that it could recover in any scenario, and still got into a state that needed an operator.

## Practicing It

A plan that has not been run won't work the first time. The routine that makes it real:

- **A regional evacuation drill**: Move real traffic to the other region on a schedule, and measure the time, using the approach of [Chaos Engineering](/system-design/chaos-engineering). Slack's engineers built a way to drain a zone in steps as small as 1 percent, with a goal of 5 minutes, because a routine action is one that works under stress
- **Failback**: Plan the return, which is a second migration with its own data reconciliation
- **Capacity check**: Confirm that the surviving region has the headroom of the table above, and that quotas there are raised
- **A decision rule**: Who declares a regional disaster, on what evidence, and by what time

## For the Textbook App

| Item | Decision |
| --- | --- |
| Registration Week | Warm standby in a second region, with capacity for the full peak already running |
| Rest of the Year | Backups copied to a second region, with the stack rebuilt from code |
| Data | Asynchronous replication to the standby, with an alert on lag above 1 minute |
| Traffic | Health checks from outside, DNS with a 60 second TTL, and a manual switch with a written rule |
| Tools | Monitoring, identity and the runbook hosted outside the primary region |
| Practice | An evacuation drill each quarter, and one before registration week |

## Pitfalls

- **Zones counted as regions**: A shared regional dependency fails the zones together
- **A standby with no capacity**: Traffic arrives and the standby falls over
- **A failover that needs a launch**: The launch path can be the broken part
- **A hair trigger**: A false alarm moves the whole service
- **Forgetting the tools**: The dashboard, the login and the pipeline sit in the failed region
- **No failback plan**: The service stays on the standby for weeks

## Key Points

- A region outage is a correlated failure: in the October 2025 event, a DNS fault in one service in us-east-1 led to about 14.5 hours of impairment across several layers, while running instances kept working
- Surviving it needs a second region with real capacity: with 2 regions, normal utilization has to stay at 40 percent to survive a loss at an 80 percent limit
- Failover time is detection plus the DNS TTL: in our simulation, 90 seconds of detection and a 300 second TTL left 99 percent of clients moved after 387 seconds, and 10 second checks with a 30 second TTL cut it to 40 seconds
- <u>Avoid depending on control planes during failover</u>, keep capacity already running, and host the monitoring, identity and runbooks outside the region they are meant to rescue
- Pick the strategy from written recovery targets, brake automatic failover, and rehearse the evacuation and the return
