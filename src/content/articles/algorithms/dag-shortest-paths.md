> In a **directed acyclic graph** (DAG), shortest paths from a source take O(V + E) time with no priority queue: process the vertices in topological order and relax each one's outgoing edges once. Negative weights are no problem, and negating the weights turns it into a **longest path**, which is how the critical path of a project is found.

A team's build pipeline runs eight jobs, and each job waits for the jobs it depends on. Everything that can run at once does. How long does the whole pipeline take, and which jobs would make it slower if they slowed down?

Both questions are shortest-path questions in disguise, and the graph has no cycles, which makes them easier than the general case.

## A Pipeline of Jobs

An arrow from one job to another means the second waits for the first. Each job has a duration in minutes.

<figure class="diagram graph">
<svg viewBox="0 0 360 256" role="img" aria-label="A build pipeline of eight jobs with arrows from each job to the jobs that wait for it. Checkout takes 1 minute, lint 2, unit tests 6, build 5, integration tests 9, package 3, scan 4 and deploy 2. The slowest chain is checkout, build, integration, deploy.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e dim" x1="149.0" y1="39.0" x2="79.0" y2="72.9" marker-end="url(#ah)"/>
<line class="e hl" x1="177.6" y1="39.0" x2="172.7" y2="69.0" marker-end="url(#ah-hl)"/>
<line class="e dim" x1="210.5" y1="39.0" x2="281.0" y2="73.7" marker-end="url(#ah)"/>
<line class="e dim" x1="145.0" y1="101.0" x2="88.3" y2="135.0" marker-end="url(#ah)"/>
<line class="e hl" x1="171.8" y1="101.0" x2="175.9" y2="135.0" marker-end="url(#ah-hl)"/>
<line class="e dim" x1="197.0" y1="99.7" x2="273.0" y2="138.3" marker-end="url(#ah)"/>
<line class="e dim" x1="67.7" y1="101.0" x2="172.2" y2="201.0" marker-end="url(#ah)"/>
<line class="e dim" x1="292.8" y1="101.0" x2="204.9" y2="201.0" marker-end="url(#ah)"/>
<line class="e dim" x1="89.5" y1="167.0" x2="157.0" y2="201.2" marker-end="url(#ah)"/>
<line class="e hl" x1="180.7" y1="167.0" x2="186.9" y2="201.0" marker-end="url(#ah-hl)"/>
<line class="e dim" x1="275.0" y1="167.0" x2="218.3" y2="201.0" marker-end="url(#ah)"/>
<rect class="n hl" x="142" y="10" width="76" height="28" rx="14"/>
<text class="t hl" x="180" y="19">checkout</text>
<text class="s" x="180" y="31">1 min</text>
<rect class="n" x="28" y="72" width="48" height="28" rx="14"/>
<text class="t " x="52" y="81">unit</text>
<text class="s" x="52" y="93">6 min</text>
<rect class="n hl" x="144" y="72" width="52" height="28" rx="14"/>
<text class="t hl" x="170" y="81">build</text>
<text class="s" x="170" y="93">5 min</text>
<rect class="n" x="284" y="72" width="44" height="28" rx="14"/>
<text class="t " x="306" y="81">lint</text>
<text class="s" x="306" y="93">2 min</text>
<rect class="n" x="28" y="138" width="64" height="28" rx="14"/>
<text class="t " x="60" y="147">package</text>
<text class="s" x="60" y="159">3 min</text>
<rect class="n hl" x="138" y="138" width="80" height="28" rx="14"/>
<text class="t hl" x="178" y="147">integration</text>
<text class="s" x="178" y="159">9 min</text>
<rect class="n" x="276" y="138" width="48" height="28" rx="14"/>
<text class="t " x="300" y="147">scan</text>
<text class="s" x="300" y="159">4 min</text>
<rect class="n hl" x="160" y="204" width="60" height="28" rx="14"/>
<text class="t hl" x="190" y="213">deploy</text>
<text class="s" x="190" y="225">2 min</text>
</svg>
<figcaption>A CI pipeline. An arrow means the job at its tip waits for the job at its start, and the number is each job’s duration. The outlined chain is the slowest one, 17 minutes long</figcaption>
</figure>

Run one job at a time and the pipeline takes 1 + 2 + 6 + 5 + 9 + 3 + 4 + 2 = 32 minutes. Run jobs in parallel as soon as their prerequisites are done, and the wait is only along the slowest chain. A job can start when all its prerequisites have finished, so its earliest start is the largest finish time among them.

Checkout starts at 0 and finishes at 1. Lint, unit tests and build all start at 1. Integration, package and scan wait for the build, which finishes at 1 + 5 = 6. Deploy waits for five jobs: unit tests finish at 7, lint at 3, package at 9, scan at 10 and integration at 15. The slowest decides, so deploy starts at 15 and finishes at 17.

The pipeline takes 17 minutes, and the chain checkout, build, integration, deploy is the one that sets it.

## Longest Path in Order

Put a weight on each arrow equal to the duration of the job it leaves. Then a job's earliest start is the weight of the longest path from the beginning to it. That is a longest path problem, which is hard on graphs in general but easy here, because the work can be done in topological order, from [Topological Sort](/algorithms/topological-sort).

When a job's turn comes, every arrow into it has been processed, so its value is final.

```python
def longest_paths(g, source):                # g maps a vertex to (neighbor, weight) pairs
    dist = {u: float("-inf") for u in g}
    parent = {u: None for u in g}
    dist[source] = 0
    for u in topological_order(g):           # from the topological sort article
        if dist[u] == float("-inf"):
            continue                         # not reachable from the source
        for v, w in g[u]:
            if dist[u] + w > dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
    return dist, parent
```

The version for shortest paths changes two things: `-inf` becomes `inf`, and the comparison turns around. The loops do O(V) work for the vertices and O(E) for the edges, and the topological order costs O(V + E), so the total is O(V + E).

With a virtual start before the jobs that need nothing and an end after deploy, the function reports 17 for the end, and the parent pointers give the chain Start, Checkout, Build, Integration, Deploy, End. We also ran both versions on 300 random DAGs of up to 9 vertices, with weights from −5 to 9, and compared the answers with the best of all paths found by listing them.

They matched on every vertex, and unreachable vertices stayed at infinity.

## How Much Can Each Job Slip?

Work backward from the end to find, for each job, the latest it can start without delaying the pipeline. The difference from the earliest start is its **slack**.

| Job | Duration | Earliest Start | Slack |
| --- | --- | --- | --- |
| Checkout | 1 | 0 | 0 |
| Lint | 2 | 1 | 12 |
| Unit tests | 6 | 1 | 8 |
| Build | 5 | 1 | 0 |
| Integration | 9 | 6 | 0 |
| Package | 3 | 6 | 6 |
| Scan | 4 | 6 | 5 |
| Deploy | 2 | 15 | 0 |

The four jobs with no slack are the **critical path**: any delay there delays the pipeline by the same amount. Lint can slip by 12 minutes, and the unit tests by 8, before anyone notices. If the team wants a faster pipeline, speeding up lint would do nothing, and every minute saved from integration tests is a minute saved overall, until another chain becomes the slowest.

This is the critical path method from project planning. Software uses it for build systems, task scheduling and the dependencies of data pipelines.

## Why No Priority Queue

[Dijkstra’s Algorithm](/algorithms/dijkstra) picks the closest vertex next because it can't know the order in which distances become final. A DAG tells us the order in advance: a vertex's distance depends only on vertices that come before it in a topological order. Process them in that order and each relaxation is the last word on its target by the time the target's turn arrives.

That's also why negative weights are harmless. They broke Dijkstra by arriving after a vertex had been settled, and here nothing is settled before all its incoming arrows were relaxed. We checked the shortest path version against Bellman-Ford on a random DAG of 20,000 vertices and 100,000 edges with weights from −5 to 50, and the distances agreed.

[Bellman-Ford and Negative Edges](/algorithms/bellman-ford) needed 9 passes and 0.09 s, and the DAG method took 0.02 s. The gap is larger when the edge list is in an unlucky order. On the path of 4,000 vertices with the edges listed backwards, Bellman-Ford needed 3,999 passes and 457 ms, and the DAG method took 2 ms. It also scaled to a graph of 100,000 vertices and 500,000 edges in 0.22 s.

## When to Use It

Use this method when the graph is known to have no cycles: dependencies, schedules, versions, and any problem whose states only move forward in some order. If the graph might have a cycle, the topological sort will fail on it, and that failure is a useful check.

The method also shows up wherever a table is filled in an order. A dynamic programming recurrence over states that depend on earlier states is a shortest or longest path over a DAG of states, and the order of the table is a topological order. [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp) builds on this view.

## Key Points

- In a DAG, processing the vertices in topological order and relaxing each outgoing edge once gives shortest paths in O(V + E), with no priority queue
- Negative weights are safe, since a vertex's turn comes only after every arrow into it has been relaxed, and negating weights gives longest paths
- The longest path in our pipeline was 17 minutes against 32 for running jobs one at a time, and the jobs on it have no slack
- The method matched a listing of all paths on 300 random DAGs and Bellman-Ford on a graph of 20,000 vertices
- On a path of 4,000 vertices listed backwards, the DAG method took 2 ms and Bellman-Ford 457 ms, since the order is known and not guessed
