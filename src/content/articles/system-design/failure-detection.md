> A **failure detector** decides which nodes to treat as dead, usually from missing heartbeats and a timeout. **Gossip** is a way to spread information, such as who is alive, by having each node repeatedly tell a few random others, so that news reaches the whole cluster without a central coordinator.

[Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard) ended on an uncomfortable fact: when a machine stops answering, no one can tell whether it crashed, is slow or is cut off by the network.

The textbook app still has to act. With 6 web servers, a few cache nodes and a pool of workers, each part has to decide which others to send work to.

A failure detector is the component that makes that call, knowing it can be wrong. This topic covers how it works, what its mistakes cost, and how a cluster shares its conclusions.

## Heartbeats and Timeouts

The simplest detector is a heartbeat: each node sends a small message to its watcher at a fixed interval, say once a second, and the watcher suspects the node when no heartbeat arrives for a set time. The timeout is the whole design, and it is a trade between two mistakes.

A short timeout notices a real crash quickly and wrongly suspects slow but healthy nodes. A long timeout rarely accuses the innocent and leaves a dead node in service for longer.

The Chandra and Toueg framework describes these as two properties: **completeness**, that a crashed node is eventually suspected, and **accuracy**, that healthy nodes are not suspected. In an asynchronous network no detector gets both perfectly.

We measured the trade in a simulation of heartbeats sent once a second for 10 hours. In the quiet network, messages arrived about 20 ms after they were sent. In the noisy one, 3 percent were delayed by 1.5 seconds on average, as if from garbage collection pauses or congestion. These are assumptions of ours:

| Timeout | False Suspicions Each Hour, Quiet | False Suspicions Each Hour, Noisy | Mean Time to Detect a Crash |
| --- | --- | --- | --- |
| 1.5 seconds | 0.0 | 74.1 | 1.0 second |
| 2 seconds | 0.0 | 27.5 | 1.5 seconds |
| 3 seconds | 0.0 | 0.0 | 2.5 seconds |
| 5 seconds | 0.0 | 0.0 | 4.5 seconds |

No timeout is right for both networks. A setting of 1.5 seconds is fine in the quiet one and makes 74 false accusations an hour in the noisy one. A setting of 5 seconds is safe in both and slow in the quiet one, where a crash could have been noticed in about 1 second.

## Suspicion as a Number

The phi accrual failure detector, from a 2004 paper by Naohiro Hayashibara and colleagues, changes the question. Instead of answering yes or no, it outputs a **suspicion level** on a continuous scale, and each application picks the level at which it acts.

A scheduler might stop sending new jobs to a node at a low level and move its work away at a high one.

The detector keeps a sliding window of recent heartbeat intervals and fits a normal distribution to them. Phi is then the negative base 10 logarithm of the chance, under that distribution, that a heartbeat would be this late. A phi of 8 means such a delay would happen about once in 100 million heartbeats.

The effect is that the timeout adapts to the network. In our simulation, with a threshold of 8, the detector's effective timeout was about 1.06 seconds in the quiet network and 2.02 seconds in the noisy one, without anyone changing a setting.

Apache Cassandra and Akka both use this detector. Cassandra's `phi_convict_threshold` defaults to 8, and most users should leave it. Akka's default is also 8, and 12 is the usual advice on cloud platforms such as Amazon EC2, where delays are less regular. Our noisy network shows why:

| Phi Threshold | False Suspicions Each Hour | Mean Timeout |
| --- | --- | --- |
| 8 | 22.4 | 2.02 seconds |
| 12 | 3.8 | 2.28 seconds |
| 16 | 1.6 | 2.50 seconds |

A normal distribution underestimates the long tail of our delays, so the default threshold still makes mistakes, and a higher one trades a little detection speed for far fewer. Akka also keeps an acceptable heartbeat pause as a margin, and suggests raising it if nodes keep flipping between unreachable and reachable.

## Who Watches Whom

If each of N nodes sent heartbeats to each other node, the cluster would send N times N minus 1 messages in each period. That is 90 for 10 nodes, 9,900 for 100 and 999,000 for 1,000, which is why large clusters use something cheaper.

SWIM, from a 2002 paper by Abhinandan Das, Indranil Gupta and Ashish Motivala at Cornell, gives each member a constant load. In each protocol period, a member picks one other member at random and pings it.

If no ack arrives in time, it asks k other members to ping the target for it, a step called a ping request. The target is suspected if none of these indirect probes succeeds either.

<figure class="diagram">
<div class="flow">
<div class="node">A pings B<small>no ack</small></div>
<div class="arrow wide" data-label="ping request" aria-hidden="true"></div>
<div class="stack">
<div class="node">C pings B</div>
<div class="node">D pings B</div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Ack Relayed<small>or B is suspected</small></div>
</div>
<figcaption>Other members probe the target, so a bad link between two nodes doesn't condemn a healthy one</figcaption>
</figure>

Several points explain its popularity:

- **Constant cost**: Each member sends a bounded number of messages in each period, whatever the group size, so with 1,000 members a period carries on the order of 2,000 messages, mostly pings and acks
- **Expected detection time is a small constant**: Analysis bounds it by e divided by e minus 1 protocol periods, about 1.6, for a crash anywhere in the group
- **News rides on probes**: Membership changes are piggybacked on the ping and ack messages, so there is no separate broadcast
- **Suspicion before a verdict**: A suspected member is announced as suspected, and is declared failed after a timeout in which it can announce that it is alive

The timeout comes from the round trip time, and the protocol period should be at least three times its estimate.

Consul and its Serf library use SWIM, and they add a set of changes called Lifeguard so that a node that is itself overloaded doesn't wrongly accuse others. Akka takes a different shape: each node is watched by up to 5 others, picked along a hashed ring.

## Gossip: Spreading the News

A detector's conclusions have to reach the other nodes. **Gossip**, also called epidemic spreading, does it the way a rumor travels. In each round, each node picks a random peer and exchanges what it knows.

A node that has heard the news tells one more node each round, so the number of informed nodes roughly doubles, and the news reaches the whole cluster in a number of rounds that grows with the logarithm of the cluster size.

We simulated it for clusters of different sizes, with one node starting a rumor and each node contacting one random peer a round:

| Nodes | Rounds When Informed Nodes Push | Rounds When Both Sides Exchange | Base 2 Logarithm of Nodes |
| --- | --- | --- | --- |
| 100 | 12.2 | 6.4 | 6.6 |
| 1,000 | 18.2 | 9.4 | 10.0 |
| 10,000 | 24.8 | 11.4 | 13.3 |
| 100,000 | 29.8 | 14.0 | 16.6 |

A cluster 1,000 times larger needs a few more rounds, and exchanging in both directions roughly halves the count. Gossip also tolerates loss: a dropped message is made up by the many other paths the rumor takes.

Real systems tune this. In Cassandra, each node gossips once a second with one random node, sometimes with an unreachable one to learn when it returns, and with a seed node when the first pick wasn't one.

The state is versioned with a generation and a counter, so newer information wins. Akka's gossip is push and pull with a one second period, runs three times a second when fewer than half of the nodes have the latest state, and favors nodes that haven't seen it yet.

## Seeds and Joining

A new node has to find the cluster first. Dynamo, Amazon's key-value store, uses **seeds**, nodes that others can start from, to avoid a state where parts of the ring fail to learn about each other.

In Cassandra any node can be a seed, a non seed must reach one to join, and several is the usual advice, often one for each rack or datacenter. In Akka the first seed in the list has to be up when the cluster is first formed.

Seeds are an entry point and not a coordinator. After a node has joined, it gossips with the rest, and a cluster keeps running with a seed down.

## Deciding Is Cheap, Acting Is Not

A detector's verdict starts an action, and the costs differ a lot. In Dynamo's design, failure detection is local: each node keeps its own view, used to skip unreachable nodes, and a purely local notion is enough for that purpose.

Writes meant for an unreachable node go to another node as hints and move back later, as in [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas).

Removing a node from the ring is a different matter. Dynamo observes that an outage rarely means a permanent departure, and uses explicit commands from an administrator to add or remove nodes. Cassandra likewise does not drop a node from its gossip state without an operator action.

Kubernetes shows the same caution. Its node controller checks each node at 5 second intervals and marks an unresponsive one Unknown, then waits 5 minutes before asking for its pods to be evicted, and limits how fast it evicts.

A false alarm that costs a few minutes of delay is cheaper than moving a whole node's data or pods for no reason.

The rule that follows is to pair a quick, cheap suspicion with a slow, expensive removal. Stop sending new requests to a suspect, and wait longer before copying its data elsewhere.

## Mistakes Have a Shape

Detectors fail in recognizable ways. A node that pauses for garbage collection stops answering and then resumes, which looks like a crash followed by a return, called flapping.

A network split can leave two groups that each believe the other is dead. A node that suspects another may be suspected itself, if its own clock or processing is starved.

Because no detector is certain, systems that must not have two leaders don't rely on it alone. They add agreement among a majority, as in [Consensus and Leader Election](/system-design/consensus-leader-election), and tokens that stop a node wrongly believed dead from doing harm, as in [Distributed Locks and Fencing Tokens](/system-design/distributed-locks).

## Key Points

- A failure detector has to guess, since a slow node and a dead one look alike, and its timeout trades false accusations against slow detection
- <u>Phi accrual outputs a suspicion level</u> that adapts to the network, and a higher threshold such as Akka's 12 on cloud platforms gives fewer mistakes for slightly slower detection
- SWIM probes one random member each period and asks others to probe for it before suspecting, which gives each member a constant load and detection within a few periods
- Gossip spreads news by random exchange in rounds that grow with the logarithm of the cluster size: about 9 rounds for 1,000 nodes in our simulation when both sides exchange
- Pair a cheap suspicion with a slow, deliberate removal, and don't depend on a detector alone where two leaders would do harm

