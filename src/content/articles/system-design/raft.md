> **Raft** is a consensus algorithm that keeps a log identical on several servers. One elected leader accepts commands, copies them to the followers, and counts an entry as committed once a majority holds it. It was designed to be easy to understand.

[Consensus and Leader Election](/system-design/consensus-leader-election) showed that a majority can agree and a randomized timeout can pick a leader. Raft joins the two into a complete design for a **replicated log**: a sequence of commands that each server applies in the same order, so that each server's state machine ends up the same.

The textbook app keeps its shard map, the leader of each shard and its feature flags in a five node group. Those facts change rarely, must not disagree, and must survive the loss of two machines. That is the use Raft was built for.

## Why Raft Exists

Diego Ongaro and John Ousterhout wrote Raft in 2014 because Paxos is exceptionally difficult to understand.

They found that few attendees at a systems conference were comfortable with it, and that there was no widely agreed algorithm for multi-Paxos, the version that decides a series of values. Real implementations ended up differing from Paxos and from each other.

Raft's answer is to split consensus into three separate pieces, which are easier to learn one by one: leader election, log replication and safety.

It also uses a strong leader, so that the log flows in one direction, from the leader to the followers. In a user study with 43 students, students learned Raft better than Paxos.

## Terms, Roles and Elections

At any moment a server is a **follower**, a **candidate** or the **leader**. Time is cut into **terms**, numbered with consecutive integers. Each term begins with an election, and at most one leader is chosen in a term. If an election splits, the term ends with no leader and a new term begins.

<figure class="diagram">
<div class="flow">
<div class="node">Follower<small>hears the leader</small></div>
<div class="arrow" data-label="timeout" aria-hidden="true"></div>
<div class="node">Candidate<small>asks for votes</small></div>
<div class="arrow" data-label="majority" aria-hidden="true"></div>
<div class="node hot">Leader<small>sends heartbeats</small></div>
</div>
<figcaption>A server that sees a higher term, in any message, returns to follower at once</figcaption>
</figure>

Servers exchange terms in each message. A server that sees a larger term than its own adopts it, and a candidate or leader that finds its term out of date steps down. A request with a stale term is refused, which is how an old leader that returns after a pause is stopped.

An election works as follows. A follower that hears no message during an election timeout increments its term, votes for itself and sends vote requests to the others. Each server votes for at most one candidate in a term, first come first served, so at most one candidate can win a majority.

Raft chooses timeouts at random from a fixed range, for example 150 to 300 ms, and the simulation in the previous topic showed why: with that range, 0.4 percent of first elections split in our test, and with identical timeouts they did not finish.

A vote has one more condition, which carries the safety argument. A server denies its vote to a candidate whose log is less up to date than its own. The log with the later last term is more up to date, and with equal last terms the longer log wins.

## Replicating the Log

Once elected, the leader serves clients. It appends each command to its log, sends AppendEntries requests to the followers in parallel, and, when the entry is safely replicated, applies it and replies to the client. It keeps retrying followers that are slow or unreachable, even after replying to the client.

The rule for **committed** is simple: an entry is committed once the leader that created it has copied it to a majority of servers, and that also commits the entries before it. The leader includes the highest committed index in later AppendEntries messages and heartbeats, so followers learn of it and apply entries in order.

Waiting for a majority, not for the full set of servers, keeps one slow follower from slowing the cluster. In a simulation in which a follower's round trip is 1 to 3 ms and 1 percent of replies take 100 to 200 ms, here is how long the leader waited:

| Servers | Majority: Mean and 99th Percentile | Full Set of Followers: Mean and 99th Percentile |
| --- | --- | --- |
| 3 | 1.7 ms and 2.8 ms | 5.3 ms and 150.1 ms |
| 5 | 1.8 ms and 2.7 ms | 8.3 ms and 174.7 ms |
| 7 | 1.9 ms and 2.7 ms | 11.4 ms and 183.9 ms |

The majority rule hides the slow follower. A rule that waits for the full set pays the slowest reply in the group, and the more servers, the more often one is slow.

## Keeping Logs Identical

Raft keeps two properties, which together are the Log Matching Property. If two logs have an entry with the same index and term, the entry holds the same command, and the logs are identical in the earlier entries.

The first holds because a leader creates at most one entry for an index in a term. The second comes from a check in AppendEntries: the leader sends the index and term of the entry just before the new ones, and a follower that doesn't have a matching entry refuses.

Leader crashes leave logs untidy. A follower may lack entries, or hold extra ones from an old term that did not get committed. Here is a small example, with each number the term in which the entry was created:

| Index | Leader S1 | S2 | S3 | S4 | S5 |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | 1 | 1 |
| 2 | 1 | 1 | 1 | 1 | 1 |
| 3 | 2 | 2 | 2 | 2 | 2 |
| 4 | 3 | 3 | 3 | empty | 2 |
| 5 | 3 | 3 | empty | empty | 2 |

Entry 4 is on S1, S2 and S3, a majority, so it is committed. Entry 5 is on two servers, so it is not. S5 holds entries from term 2 that the term 3 leader did not see.

The leader forces followers to match its log: it finds the latest index where they agree, deletes the follower's later entries and sends its own. S5's entries 4 and 5 are overwritten, and S4 is given the missing ones. Uncommitted entries are the ones overwritten.

## Why Committed Entries Survive

The safety property is that a committed entry is in the log of the later leaders. Two rules produce it. A committed entry is on a majority, and a candidate needs votes from a majority, so at least one voter holds each committed entry.

The vote rule means that this voter refuses a candidate with a less up to date log, so the winner has the entry.

We tested it with 5 servers and a leader that crashes at a random moment, counting committed entries missing from the new leader over 3,000 crashes:

| Rules | Average Committed Entries Lost | Crashes That Lose Any |
| --- | --- | --- |
| Majority commit, vote for an up to date log (Raft) | 0.00 | 0.0% |
| Majority commit, any survivor can lead | 24.24 | 41.8% |
| Commit on 2 servers, vote for an up to date log | 3.54 | 33.5% |
| Commit on 2 servers, any survivor can lead | 28.63 | 60.4% |

Both halves matter. Dropping the vote rule lost committed entries in 41.8 percent of crashes, and committing on fewer than a majority lost them in 33.5 percent, even with the rule.

There is a subtlety in the commit rule after a change of leader: a leader doesn't decide that an entry from an earlier term is committed by counting its copies, since such an entry can still be overwritten. It commits an entry from its own term on a majority, which commits the earlier entries too.

## Changing the Membership

Adding or removing servers is dangerous if two different majorities can exist during the switch.

Raft changes membership through a joint configuration that needs majorities of both the old and the new set, so no moment has two independent leaders. etcd adds a further step: a new member joins as a learner that gets the log, doesn't vote, and cannot become leader, and is promoted to a voter once it has caught up.

## Raft in Real Systems

Several systems you have met use it. etcd is built on it, with defaults of a 100 ms heartbeat and a 1,000 ms election timeout, and after a leader fails, a new one is elected in about one election timeout, during which writes wait.

Kafka's KRaft controllers use a quorum of 3 or 5 controllers. In CockroachDB, each range of data is a Raft group, which tolerates the loss of a minority of its replicas, and a three replica range survives one failure.

The limits are the ones from the previous topic. Raft tolerates crashes and not Byzantine faults, where nodes lie.

The leader is a bottleneck, since each write goes through it, so Raft groups hold small, important data, and large systems run many groups in parallel. Each write costs a round trip to a majority, which across regions is the price from [PACELC](/system-design/pacelc).

## Choosing

| Need | Use |
| --- | --- |
| A small, strongly consistent store for configuration | etcd or a similar Raft based service |
| A leader for each shard with automatic failover | A Raft group for each shard, as in CockroachDB |
| Larger data with a coordinator | Raft for the metadata, and a data path built on leaders and replication |
| Nodes that may be malicious | A Byzantine fault tolerant protocol, which Raft is not |

For the textbook app, a five node etcd group holds the shard map and feature flags, tolerates 2 failures, and elects a new leader in about a second, while the listings stay in the shard databases. Next, the topic on [Distributed Locks and Fencing Tokens](/system-design/distributed-locks) shows how to use such a group safely.

## Key Points

- Raft keeps a replicated log with a strong leader, split into leader election, log replication and safety, and was designed to be understood
- Terms number the leaders, each server votes once in a term, and randomized election timeouts, such as 150 to 300 ms, prevent split votes
- An entry is committed when a majority holds it, and waiting for a majority hid a slow follower in our test: 99th percentile 2.7 ms against 174.7 ms for waiting on the full set
- <u>The vote rule and the majority commit rule together</u> keep committed entries: dropping either lost entries in our crash test, and Raft's rules lost no entries
- Raft groups hold small, critical data such as configuration and shard maps, and tolerate crashes, not lying nodes
