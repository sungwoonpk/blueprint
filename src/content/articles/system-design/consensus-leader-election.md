> **Consensus** is the problem of getting several nodes to agree on one value even though some of them may crash and messages may be lost or late. **Leader election** is consensus about one thing: which node is in charge, with no two nodes believing they are.

The textbook app keeps running into the same question. Which node is the leader of this shard? Which worker owns the nightly job? Who is the coordinator of this transaction? In [Single Leader Replication](/system-design/replication-one-leader), GitHub's automation promoted a second primary during a 43 second partition and both sides accepted writes.

In [Two-Phase Commit](/system-design/two-phase-commit), a lone coordinator was a single point of failure.

The remedy for both is to let a group of nodes decide together, so that no single machine's failure, or a network split, can produce two answers.

## The Problem

Leslie Lamport's "Paxos Made Simple" states the consensus problem plainly. Some processes propose values, and the algorithm must make sure that one of them is chosen. The safety rules are:

- **Validity**: only a proposed value can be chosen
- **Agreement**: only one value is chosen
- **Integrity**: a process learns of a chosen value only if it really was chosen

The model is the asynchronous one from [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard): processes run at any speed, may stop and restart, and messages can take arbitrarily long, be duplicated or be lost.

A node can fail after a value is chosen and then restart, so no solution works unless nodes can remember something through a restart. In practice, nodes write their promises to disk before they answer.

## Why a Majority

The simplest design is a single acceptor that picks the first value it receives. It fails the moment that acceptor does. So use several acceptors, and say a value is chosen when a majority has accepted it.

Any two majorities share at least one member, so two different values can't both be chosen, as long as an acceptor accepts one value for a given round.

The quorum rule from [Leaderless Replication and Quorums](/system-design/leaderless-replication) is the same overlap argument. Majorities give a simple table:

| Nodes | Majority Needed | Failures Tolerated |
| --- | --- | --- |
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

Four nodes tolerate no more failures than three, so odd sizes are the norm. Tolerating N failures takes 2N + 1 nodes, which is why Kafka's controller group, for example, runs 3 or 5.

A 5 node cluster keeps running with 2 failures. With more, it stops making progress and doesn't return wrong results.

We calculated how often a majority is up if each node is down independently 1 percent or 5 percent of the time:

| Nodes | Majority Up, Node Down 1% | Majority Up, Node Down 5% |
| --- | --- | --- |
| 1 | 99.00000% | 95.00000% |
| 3 | 99.97020% | 99.27500% |
| 5 | 99.99901% | 99.88419% |
| 7 | 99.99997% | 99.98064% |

More nodes help, with falling returns, and each node adds messages and delay to each decision. Independence is an assumption: nodes in one rack or one data center fail together, so spread them.

## Paxos in Outline

Paxos has three roles, proposers, acceptors and learners, and a process can play more than one. It runs in two phases, using numbered proposals:

<figure class="diagram">
<p class="rowname">Phase 1: Prepare</p>
<div class="flow">
<div class="node">Proposer<small>picks number n</small></div>
<div class="arrow" data-label="prepare" aria-hidden="true"></div>
<div class="node">Acceptors<small>a majority</small></div>
<div class="arrow" data-label="promise" aria-hidden="true"></div>
<div class="node hot">Proposer</div>
</div>
<p class="rowname">Phase 2: Accept</p>
<div class="flow">
<div class="node">Proposer<small>value v</small></div>
<div class="arrow" data-label="accept" aria-hidden="true"></div>
<div class="node">Acceptors</div>
<div class="arrow" data-label="accepted" aria-hidden="true"></div>
<div class="node hot">Chosen</div>
</div>
<figcaption>A value is chosen once a majority of acceptors have accepted the same numbered proposal</figcaption>
</figure>

In phase 1, a proposer sends a prepare request with a number n to a majority. An acceptor that hasn't answered a higher number replies with a promise not to accept any proposal numbered less than n, together with the highest numbered proposal it has already accepted.

In phase 2, the proposer sends an accept request, and it must use the value of the highest numbered proposal reported in the promises, if there is one. That rule keeps a later proposer from overturning a value that may already have been chosen.

Paxos stays safe through crashes, delays and competing proposers. It can fail to make progress when two proposers keep interrupting each other, and the next result says some stalls like that can't be designed away.

## The Limit: FLP

Michael Fischer, Nancy Lynch and Michael Paterson proved in 1985 that in an asynchronous system, every deterministic consensus protocol has some execution that never ends, even if only one process may crash. This is the **FLP result**.

The reason is the one behind failure detection: a slow node can't be told from a dead one, and a protocol that waits forever for it may not decide, while one that gives up may decide wrongly.

The result is easy to misread. It doesn't mean consensus can't be reached. It means that in a fully asynchronous system, no deterministic algorithm can promise to finish.

Practical systems keep safety fixed and get progress from timeouts, which are the same guesses as in [Failure Detection and Gossip](/system-design/failure-detection), and from randomization.

## Electing a Leader

Running full consensus for each operation is costly, so most systems elect a leader and let it order the operations, with consensus used to choose and replace the leader.

Raft, in the next topic, is built this way: it splits the problem into leader election, log replication and safety.

Here is the mechanism in outline. Each follower waits for a message from the leader. If a randomly chosen election timeout passes with silence, it becomes a candidate and asks the others to vote for it. A node votes for the first candidate it hears from, and a candidate that gets a majority wins.

The randomness matters. We simulated 5 nodes with message delays between 1 and 10 ms, and election timeouts drawn from a range:

| Election Timeout Range | First Election Splits | Mean Time to a Leader |
| --- | --- | --- |
| 150 ms, the Same for Each Node | Each time | No leader in 40 rounds |
| 150 to 160 ms | 55.6% | 560 ms |
| 150 to 200 ms | 4.5% | 186 ms |
| 150 to 300 ms | 0.4% | 188 ms |

With identical timeouts the candidates start together and split the votes forever. A narrow range still splits half the time.

A wide range separates the candidates by more than a message delay, so the first candidate usually collects a majority before anyone else starts. etcd's defaults are a 100 ms heartbeat and a 1000 ms election timeout. Its guidance is a heartbeat of 0.5 to 1.5 times the round trip time between members, and an election timeout of at least 10 times that round trip.

ZooKeeper's leader election recipe shows another way, using a coordination service. Each candidate creates an ephemeral sequential znode, a small entry in ZooKeeper's tree that gets the next number and disappears when its creator's session ends. The candidate with the smallest number is leader. Each candidate watches the node just below its own, so a leader's failure wakes one watcher and not the whole group.

Disappearing with the session doubles as failure detection. The recipe adds a warning: holding the smallest number doesn't mean the node has noticed that it leads, so an application may have the new leader create a separate node to say it took over.

## Leases: The Leader That Doesn't Know

A leader that is paused, for example by a garbage collection, can wake up still believing it leads, after the others have elected a new one. Systems limit this with **leases**: the leader holds its role for a fixed time and must renew it.

Kubernetes' controller manager uses a lease stored in the cluster, with defaults of 15 seconds for the lease duration, 10 seconds for the renew deadline and 2 seconds between retries.

A lease reduces the window and doesn't remove it: a paused leader can still act after its lease has expired, because it doesn't know the time passed. Jepsen's etcd analysis found this with locks, since mutual exclusion failed under pauses and about 18 percent of acknowledged updates were lost in one test.

The fix is a **fencing token**, a number that grows with each leadership, which the storage checks so that an old leader's writes are refused, as in [Distributed Locks and Fencing Tokens](/system-design/distributed-locks). Raft carries the same idea inside its protocol as the term number.

## Using Consensus in Practice

Most applications should use a system that already solves this, and not write it:

| Need | Use |
| --- | --- |
| Elect one worker or owner among service instances | A lease in etcd, ZooKeeper or Kubernetes |
| Store small, critical configuration with strong guarantees | etcd or ZooKeeper, which replicate through consensus |
| Choose the leader of a database cluster | The database's own consensus, or a manager built on etcd, as in [Single Leader Replication](/system-design/replication-one-leader) |
| Order a large stream of writes | One leader with a replicated log, as in the next topic |

Consensus is costly for large data. Each decision needs a round trip to a majority, so across regions it costs the latency from [PACELC](/system-design/pacelc), and the replicated state is kept small. Use it to decide who leads and what the configuration is, and let the leaders move the bulk data.

For the textbook app, the shard leaders and the nightly job owner come from a three node etcd or ZooKeeper group, and the user data stays in the databases they coordinate.

## Key Points

- Consensus makes nodes agree on one value despite crashes, with safety rules that a chosen value is proposed, single and really chosen
- <u>Majorities overlap</u>, so two values can't both be chosen: 3 nodes tolerate 1 failure, 5 tolerate 2, and even sizes add little
- FLP shows that no deterministic protocol can guarantee termination in an asynchronous system, so practical systems stay safe and use timeouts and randomization for progress
- Leader election needs randomized timeouts: in our test, identical timeouts did not elect a leader, and a 150 to 300 ms range split 0.4 percent of the time
- Leases and fencing tokens limit the damage from a paused old leader, and applications should use etcd, ZooKeeper or Kubernetes leases, and keep the replicated data small
