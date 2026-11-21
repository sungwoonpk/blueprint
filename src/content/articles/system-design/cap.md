> The **CAP theorem** says that when a network partition splits a replicated system, it can keep either consistency or availability, and not both. Consistency here means linearizability, and availability means each request to a working node gets an answer.

The textbook app now runs in two data centers, East and West, with copies of the data in both. A popular book has one copy left.

If the link between the data centers fails, a buyer in the East and a buyer in the West can both press Buy, and each data center has to answer on its own. Sell the copy twice, or refuse one buyer?

That decision is what the CAP theorem is about. Eric Brewer posed it as a conjecture in a 2000 talk, and Seth Gilbert and Nancy Lynch proved it in 2002. It is simple to state and easy to misuse.

## The Three Words

The proof pins down each term more narrowly than everyday usage:

| Letter | Meaning in the Proof | Not to Be Confused With |
| --- | --- | --- |
| Consistency | Linearizability: a total order on operations in which each looks as if it happened at a single instant | The C in ACID, which is about constraints |
| Availability | Each request received by a node that hasn't failed must get a response, with no time limit | High uptime as a percentage |
| Partition Tolerance | The network may drop or delay messages without limit | A property to give up: partitions happen |

Gilbert and Lynch's model is a single read and write register, and the lone fault is a partition. Martin Kleppmann, in a widely read critique, points out the consequences. The theorem is silent about latency and about transactions over several objects, and it doesn't apply to a node that has crashed.

## The Choice During a Partition

The argument is short. Suppose the East and West data centers can't talk. A write arrives in the West. The system can accept it, in which case an East reader may see the old value, so it isn't linearizable.

Or it can refuse the write, or make the East side refuse reads, in which case the system isn't available. No third choice exists, since the sides can't exchange a message to coordinate.

<figure class="diagram">
<p class="rowname">Choose Consistency</p>
<div class="flow">
<div class="node">West: Accepts</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">East: Refuses</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">One Copy Sold</div>
</div>
<p class="rowname">Choose Availability</p>
<div class="flow">
<div class="node">West: Accepts</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">East: Accepts</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Sold Twice</div>
</div>
<figcaption>With the link down, a side either refuses or accepts, and accepting lets the sides disagree</figcaption>
</figure>

We calculated what each choice costs for the last copy scenario at larger scale: 100 copies in stock when the partition starts, and 1 purchase a second arriving at each data center. In the consistent design the East side, the one without a majority, refuses its purchases. In the available design both sides keep selling:

| Partition Length | Consistent: Purchases Refused | Available: Copies Oversold |
| --- | --- | --- |
| 10 seconds | 10 | 0 |
| 60 seconds | 60 | 20 |
| 120 seconds | 140 | 100 |

Short partitions cost little either way, and longer ones make a hard choice: lose sales, or sell what isn't there and apologize later. Which is right depends on the item. A refunded order is cheaper than a lost customer for books, and unacceptable for a bank balance.

## "Two of Three" Is Misleading

Brewer corrected the folk reading, "pick two of three", in a 2012 follow up, "CAP Twelve Years Later". The corrections are worth keeping in mind:

- **Partitions are rare**, so there is little reason to give up consistency or availability while the network is healthy
- **The choice is local**: it can be made many times in one system, by subsystem, operation or data item, and not once for the whole database
- **The properties are continuous**: availability runs from 0 to 100 percent, there are many consistency levels, and partitions are murky, since two nodes can disagree about whether one exists
- **Latency matters most in practice**: a partition is effectively a time limit on communication. When a call times out, the program either cancels, which lowers availability, or proceeds, which risks consistency. Tighter timeouts enter partition mode more often, even when the network is just slow

Brewer recommends managing partitions in three steps: detect that one has started, enter an explicit partition mode that limits some operations, and at recovery restore consistency and compensate for mistakes made in between.

His examples are an airline that overbooks and compensates, and Facebook's use of a single master with a user's own reads and writes routed to it for about 20 seconds after an update, which is the stickiness from [Replication Lag](/system-design/replication-lag).

## What Real Systems Choose

The labels CP and AP are common, and the detail behind them is richer:

- **Cassandra** picks availability and partition tolerance, and settles for eventual consistency of ordinary writes. It adds lightweight transactions, built on Paxos, for linearizable compare and set, as in [Leaderless Replication and Quorums](/system-design/leaderless-replication)
- **etcd**'s key value operations were strictly serializable by default in independent testing in 2020, through partitions, crashes and clock skew, with no safety violation found. A cluster that loses its majority stops making progress, and three members tolerate 1 failure while five tolerate 2. The same testing found that etcd's locks failed to give mutual exclusion under pauses, with about 18 percent of acknowledged updates lost in one test, which is why fencing tokens matter, the subject of [Distributed Locks and Fencing Tokens](/system-design/distributed-locks)
- **CockroachDB**'s single keys looked linearizable under partitions in a 2016 test, but just while clock offset stayed under its 250 ms default, since above that nodes shut themselves down
- **Spanner** is technically a CP system, as Brewer himself has said, because in some partitions it chooses consistency and gives up availability, and effectively CA in practice, since real availability is high

Spanner's incident data is sobering. Its internal incidents came from user errors for 52.5 percent, software bugs 13.3 percent, cluster problems such as servers and power 12.1 percent, other causes 10.9 percent, the network 7.6 percent and operators 3.7 percent.

The two biggest outages were both software bugs that hit each replica of a database at once. Brewer argues that when partitions are far rarer than other faults, the label matters less than the engineering around the other faults.

Chubby shows the numbers: Google reported nine outages of 30 seconds or longer in 700 days, six of them from the network, and later geographically distributed cells averaged 99.99958 percent availability for such outages.

## Why Some Engineers Retire the Labels

Kleppmann's 2015 essay "Please stop calling databases CP or AP" argues that the buckets hide more than they show. A single leader database isn't available in the CAP sense, since a partitioned client can't write, and it isn't labeled AP either.

Reads from an asynchronous follower aren't linearizable, so the database isn't CP. Snapshot isolation is not linearizable, on purpose. MongoDB allows stale reads at its strongest setting, and ZooKeeper's reads aren't linearizable by default.

His academic critique adds that the proof of the first theorem holds when partitions last forever. When partitions end, the ABD algorithm for registers can be both linearizable and available, he notes, so the proof leans on partitions that last forever.

His conclusion is that the theorem has served its purpose and is a starting point, not a classification scheme.

## Outages That Weren't Partitions

Cloudflare's postmortem of its November 2023 control plane outage is a reminder. It was a power failure at one data center, not a partition. Cloudflare had built an active-active cluster across three data centers so that any one could go offline, and the cluster took years to build.

It failed because some services in the cluster depended on systems that lived in the failed facility alone, and testing had removed the other two sites and part of this one, but not the whole facility. Availability was lost through hidden dependencies, which no theorem predicted.

## Using CAP

CAP is most useful as a question to ask of each operation: if the link between my copies fails, what does this operation do?

| Operation | During a Partition | Why |
| --- | --- | --- |
| Reserve the Last Copy of a Book | Refuse on the side without a majority | Overselling costs more than a refusal |
| Post a Listing Draft | Accept on both sides, merge later | A draft can be reconciled |
| Show Search Results | Answer from the local copy, maybe stale | A slow page costs more than a stale one |
| Charge a Card | Refuse, or queue with a visible pending state | A double charge is hard to undo |

The theorem covers the moment of a partition. When the network is healthy, the choice is between latency and consistency, which [PACELC](/system-design/pacelc) covers next.

## Key Points

- CAP says that during a partition, a system can keep linearizability or availability, and not both, where availability means each request to a working node gets a response
- <u>Partitions happen, so the real choice is what to give up during one</u>, and in our last copy example 60 seconds meant 60 refused purchases or 20 oversold copies
- Brewer's later view is that two of three misleads: partitions are rare, the choice is made for each operation, and the properties are continuous
- Labels such as CP and AP hide detail, and many outages, like Spanner's incidents with 7.6 percent from the network, come from other faults
- Ask of each operation what it does when the copies can't talk, and plan the detect, limit and repair steps
