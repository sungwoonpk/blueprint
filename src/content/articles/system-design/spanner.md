> **Spanner** is Google's globally distributed database. It keeps the scale of a Bigtable like store and adds what that store left out: SQL style tables and transactions across any rows, with a strong promise called external consistency. A transaction that finishes before another one starts gets an earlier commit timestamp. The promise rests on **TrueTime**, a clock that reports how wrong it might be and makes the database wait that long.

[Bigtable](/system-design/bigtable) gave the textbook app a table that scales, with one hard limit: a transaction can't touch more than one row. [Cassandra](/system-design/cassandra) kept the scale and let the newest timestamp win. Neither can do what the payments need.

Picture the checkout. A student in Seoul and a student in Frankfurt both try to buy the last copy of a book. Two rows change, the stock and the order, and in two places.

The system has to guarantee that one of them gets the book and the other is told no, and it can't do that by comparing timestamps from clocks that disagree.

Spanner is the answer to a question that most systems avoid: can a database spread over continents give the answer a single machine would give? It does, and the price is paid in a few milliseconds and some unusual hardware.

This topic follows the design from the tablet up to the clock, measures the part about waiting on our own model, and ends with what to borrow. It builds on [Consensus and Leader Election](/system-design/consensus-leader-election), [Two-Phase Commit](/system-design/two-phase-commit) and [Physical and Logical Clocks](/system-design/clocks).

## Bigtable's Layout With Paxos on Top

Spanner runs as a set of zones, and a zone is roughly a Bigtable deployment: a zone master that assigns data, and between a hundred and several thousand spanservers that serve it.

A spanserver holds between 100 and 1,000 tablets, and a tablet maps a key and a timestamp to a value, so each value keeps its versions. This is the first difference from Bigtable: timestamps are assigned by the system and mean something, which makes Spanner a database with versions and not just a key value store.

A tablet's files live on a distributed file system, the successor to [GFS and HDFS](/system-design/gfs-hdfs), but replication is Spanner's own. Each tablet has a Paxos state machine on top, with replicas in several zones forming a **Paxos group**.

A write goes through the group's leader, which replicates it by Paxos and commits when a majority agrees, as [Consensus and Leader Election](/system-design/consensus-leader-election) describes.

Leadership is long lived, held by time based leases of 10 seconds by default, which keeps the work of electing a leader off the path of each write. A read can go to any replica that is up to date enough.

The data is grouped in **directories**, sets of rows that share a key prefix and move together between groups. A directory is also the smallest unit with its own placement rules: one student's data can have three replicas in Europe while another's has five in North America.

Developers describe the locality in the schema. A table can be interleaved inside a parent, so a child row is stored next to the row it belongs to. For the textbook app:

| Row Key | Table | Stored |
| --- | --- | --- |
| student 17 | Students | The student's row, which starts a directory |
| student 17, order 1 | Orders | Next to the student |
| student 17, order 1, line 1 | OrderLines | Next to the order |
| student 18 | Students | The next student, which starts another directory |

A student's orders live in one place, so loading a student with the orders takes one group. A transaction that stays inside one student's directory is cheap, and one that touches two students may involve two groups, which is the next problem.

## Transactions Across Groups

Spanner supports read write transactions with two phase locking, so there is a lock table at each leader. Most transactions touch one group, and for those the lock table and Paxos together already give a transaction.

If a transaction spans groups, their leaders run two phase commit, with the key difference from the classic version that each participant and the coordinator is itself a Paxos group. The coordinator can't be lost and take the decision with it, since the state is replicated.

Two phase commit has a reputation for hurting availability and speed, and Spanner's authors argued that it is better to give programmers transactions and let them fix the bottleneck where it appears than to make each team code around the lack of them. The cost is real, though: a transaction waits for the slowest participant, twice.

We simulated it with each Paxos commit taking a median of 10 ms and a long tail, and counted a distributed commit as a prepare round and a commit round, each as slow as the slowest group:

| Groups in the Transaction | Median Latency | 99th Percentile |
| --- | --- | --- |
| 1, No Two-Phase Commit | 10 ms | 32 ms |
| 2 | 27 ms | 57 ms |
| 10 | 44 ms | 77 ms |
| 100 | 70 ms | 109 ms |

The jump from one group to two is the price of the second round. After that, latency creeps up slowly, because it is the maximum of many draws, and the tail grows more than the median.

The published measurements for a real deployment tell the same story: 2PC held up well to 50 participants and started to climb noticeably at 100. The lesson is to design keys so that most transactions touch one group, as the interleaving does.

## Why Time Is the Hard Part

Transactions have an order, and the order is the whole point. Spanner gives the strongest one: if transaction T1 commits before T2 starts, then T1's commit timestamp is smaller than T2's. This is **external consistency**, or linearizability, and it means that the database behaves as if it were on one machine, whatever the distance.

The obvious way to get timestamps is to read each machine's clock. That fails for a reason [Physical and Logical Clocks](/system-design/clocks) explains: clocks on different machines disagree, and no rule says which one is right.

A server whose clock runs fast stamps its commit with a time in the future, and a later transaction on a slow clock can get an earlier stamp. The database then shows a history where the second transaction came first, though a person who watched both would disagree.

Logical clocks fix ordering inside one system and don't help here, because external consistency is about real time, as seen by people outside the database. Spanner's answer is to measure the uncertainty, and then to wait it out.

## TrueTime: A Clock That Admits Its Error

The TrueTime API returns not a time but an interval. A call to `TT.now()` returns an earliest and a latest time, with a guarantee that the true time lies between them.

Two helper calls say whether a time has definitely passed or definitely not arrived. The width of the interval is the uncertainty, and half of it is called epsilon.

The interval is narrow because of the hardware. Each data center has time master machines, most with GPS receivers and the rest with atomic clocks, which fail in different ways. GPS can be spoofed, jammed or mishandle a leap second, and atomic clocks drift slowly over long periods.

Every machine polls several masters, throws out the ones that disagree, and between polls it advertises an uncertainty that grows at an assumed worst case drift of 200 microseconds a second.

The result is a sawtooth: the uncertainty rises from about 1 ms to about 7 ms between polls, which are 30 seconds apart, and averages about 4 ms. An atomic clock master costs about as much as a GPS one, so the exotic part of the design is cheap.

## Commit Wait

Now the two rules that deliver external consistency. First, a transaction's commit timestamp is at least `TT.now().latest`, computed when the commit request arrives. Second, the system doesn't let anyone see the commit until `TT.after` of that timestamp is true, which means the timestamp is certainly in the past. That pause is **commit wait**.

The reasoning is short. The commit timestamp is in the future of each clock when it is chosen, and the transaction becomes visible just after real time has passed it.

Any transaction that starts after that, anywhere, picks a timestamp at least as large as its own `TT.now().latest`, which is later still. So the later transaction gets the larger timestamp each time, with no communication between the two.

The wait is about twice the uncertainty, and it overlaps with the Paxos round, so it often costs no extra time. We tested this on a model. Two transactions run on servers whose clocks are off by up to epsilon from the true time.

The first commits in 9 ms of Paxos work, which is close to the published figure, and the second starts 1 ms after the first is acknowledged. We counted the cases where the second got an earlier timestamp. The first column plain local clock timestamps with no wait, and the second TrueTime with commit wait:

| Epsilon | Anomalies, Plain Clocks | Anomalies, Commit Wait | Write Latency With Commit Wait |
| --- | --- | --- | --- |
| 1 ms | 0% | 0% | 9 ms |
| 4 ms | 0% | 0% | 9 ms |
| 7 ms | 4.1% | 0% | 14 ms |
| 10 ms | 12.5% | 0% | 20 ms |
| 50 ms | 40.5% | 0% | 100 ms |
| 100 ms | 45.2% | 0% | 200 ms |

Three things come out of the table. With a small epsilon, the Paxos round is already longer than the wait, so the guarantee is free.

With clocks as loose as an ordinary time service gives, tens of milliseconds, nearly half of back to back transactions were ordered wrongly without the wait, and the wait would cost 100 to 200 ms per write.

And commit wait didn't fail at any epsilon. The design makes the cost of bad clocks visible as latency, and doesn't let it turn into wrong answers, which is the point of exposing the uncertainty instead of hiding it.

## Reads Without Locks

The same timestamps make reads cheap. A transaction that does no writes picks a timestamp and reads the data as of that time, without taking locks, so it doesn't block a writer and a writer doesn't block it.

A replica can serve it if the replica is up to date to that timestamp, which each replica tracks as its safe time.

The safe time is the minimum of two things: the timestamp of the last Paxos write the replica applied, and a lower bound on any transaction that is prepared and not yet committed, since the fate of those isn't known.

If the group is idle, a leader promises a minimum timestamp for its next write, advanced by default at 8 second intervals, so a replica can answer a read at a time up to a few seconds old even when no write arrives.

A snapshot read at a stated time or with a stated staleness bound goes to any up to date replica, including a nearby one. That is the stale read of [PACELC](/system-design/pacelc): ask for data from 15 seconds ago, and a local replica answers without a trip to the leader.

A report over the whole database, run at one timestamp, sees exactly the transactions committed by then, which is what makes consistent backups possible while writes continue.

The same machinery gives atomic schema changes. A schema change is assigned a timestamp in the future, and transactions with earlier timestamps carry on with the old schema while later ones wait for the new one, with no lock across the millions of groups.

## What It Costs

The first cost is complexity and hardware. Spanner needs the clock infrastructure, and any deployment that has a looser bound than a few milliseconds pays for it with commit wait. A managed service takes that away from the user, at a price, and a self run copy has to take it on.

The second is leaders. Each group has a leader that handles its writes and its locks, and a lease of 10 seconds.

In the original tests, killing the zone that held the leaders dropped read throughput to almost zero, and it recovered over about 10 seconds as the leases expired and new leaders were elected. Shorter leases would cut the recovery time, at the price of more lease renewal traffic.

The third is that multi group transactions are slower, as our table shows. And the strongest consistency is more than much of the data needs. Spanner is the sound choice where a wrong answer is expensive, such as money, stock and identity, and the textbook app's carts and search suggestions don't need it.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Payments and Stock | A database with external consistency, so two buyers can't get the last copy |
| Keys | A student id first, with orders and lines interleaved under it, so most transactions touch one group |
| Reports | Snapshot reads at a timestamp, run against nearby replicas, with a staleness bound of 15 seconds |
| Clocks | Measure the uncertainty, and see what commit wait costs before choosing a deployment |
| Carts and Suggestions | Stay in the cheaper store, which doesn't need the wait |
| Schema Changes | Timestamped, so they are atomic without a lock on each group |

## Pitfalls

- **Timestamps from plain local clocks**: a fast clock stamps a later commit with an earlier time
- **A hot directory**: one group's leader takes the whole load
- **Transactions that span many groups**: each extra group makes the slowest one the speed
- **Loose clocks without commit wait**: back to back transactions are ordered wrongly
- **Strong consistency for the whole data set**: the wait and the extra round are paid where they don't matter
- **A lease that is too long**: a dead leader takes the lease time to replace
- **Reading from the leader for a report**: a snapshot read on a nearby replica is cheaper

## Key Points

- Spanner combines Bigtable like tablets, Paxos groups for replication, two phase commit across groups, and timestamps that mean something, to give SQL transactions at global scale
- External consistency means that if T1 commits before T2 starts, T1 gets the smaller timestamp, and plain clocks can't promise it: in our model, with an uncertainty of 10 ms, 12.5 percent of back to back transactions were ordered wrongly
- <u>TrueTime exposes the clock's error and commit wait pays for it</u>: a commit timestamp is at least the latest possible now, and the commit isn't visible until it is certainly past, which is about twice epsilon and often hidden in the Paxos round
- Reads without locks use timestamps and safe time, so snapshot reads at a stated staleness run on a nearby replica
- Cross group transactions cost two rounds and the slowest participant, so design the keys so that most transactions stay in one group
