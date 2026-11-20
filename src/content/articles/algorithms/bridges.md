> A **bridge** is an edge whose removal disconnects a graph, and an **articulation point** (or cut vertex) is a vertex whose removal does. One depth-first search finds both in O(V + E), by recording for each vertex how far up the search tree it can climb using the tree below it and one back edge.

The campus network is a graph, and every edge is a cable and every vertex a building's switch. Cables get cut by construction crews, and switches fail. The question for the IT team is which single failure would cut part of the campus off.

An edge or a vertex that does that is a single point of failure. Finding them by removing each one and testing connectivity costs O(V + E) per test, and there are V + E things to remove, which is too much for a big network. One search can do it.

## Single Points of Failure

The original seven buildings have loops around them, so any one cable or building can fail and the rest stay connected. Now three new buildings join.

<figure class="diagram graph">
<svg viewBox="0 0 376 254" role="img" aria-label="The campus with three new buildings. Annex joins the Hall by one path, Pool and Field join Annex and each other, and Shed joins the Gym by one path. The Hall to Annex and Gym to Shed paths are bridges, and the Hall, Annex and Gym are articulation points.">
<line class="e" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<line class="e" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<line class="e" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<line class="e" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<line class="e" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<line class="e" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<line class="e" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<line class="e bad" x1="318.0" y1="78.0" x2="338.0" y2="150.0"/>
<line class="e" x1="338.0" y1="150.0" x2="290.0" y2="218.0"/>
<line class="e" x1="338.0" y1="150.0" x2="350.0" y2="218.0"/>
<line class="e" x1="290.0" y1="218.0" x2="350.0" y2="218.0"/>
<line class="e bad" x1="66.0" y1="188.0" x2="30.0" y2="226.0"/>
<rect class="n" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t " x="40" y="108">Dorm</text>
<rect class="n" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t " x="118" y="52">Quad</text>
<rect class="n" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t " x="222" y="38">Library</text>
<rect class="n bad" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t bad" x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t " x="140" y="150">Cafe</text>
<rect class="n bad" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t bad" x="66" y="188">Gym</text>
<rect class="n bad" x="312" y="136" width="52" height="28" rx="14"/>
<text class="t bad" x="338" y="150">Annex</text>
<rect class="n" x="268" y="204" width="44" height="28" rx="14"/>
<text class="t " x="290" y="218">Pool</text>
<rect class="n" x="328" y="204" width="44" height="28" rx="14"/>
<text class="t " x="350" y="218">Field</text>
<rect class="n" x="8" y="212" width="44" height="28" rx="14"/>
<text class="t " x="30" y="226">Shed</text>
</svg>
<figcaption>The campus network with three new buildings. The two red edges are bridges, and the three red-outlined buildings are articulation points: losing any of them cuts someone off</figcaption>
</figure>

The Annex hangs off the Hall by one cable, and the Pool and Field join it, a triangle of their own. The Shed hangs off the Gym by one cable. The Hall to Annex cable and the Gym to Shed cable are **bridges**: cut either, and the graph splits in two. The Hall, Annex and Gym are **articulation points**: if the building itself goes down, the part behind it is cut off.

Notice that the Annex is an articulation point but the Annex to Pool cable isn't a bridge, since the Pool still reaches the Annex through the Field. A network can have no bridges and still have articulation points, as we will see.

## Climbing Back Up the Tree

Run a depth-first search from the Dorm, as in [Depth-First Search](/algorithms/depth-first-search), recording the order in which vertices are discovered. In an undirected graph, every edge off the search tree is a back edge, joining a vertex to one of its ancestors.

Pick a tree edge from u down to its child v. The subtree below v is connected to everything else through the edge u to v and through back edges that leave the subtree. Those can only go to ancestors, so they land on u or above.

If there is any back edge from the subtree of v to a vertex above u, the subtree has a second way out, and u to v isn't a bridge.

Record for each vertex v the number **low(v)**: the smallest discovery number it can reach by going down the tree from v any distance, then taking at most one back edge. Then:

- The tree edge u to v is a **bridge** when low(v) > dsc(u), meaning nothing in the subtree gets above v
- A non-root vertex u is an **articulation point** when some child v has low(v) ≥ dsc(u), meaning nothing in that subtree gets above u
- The root is an articulation point when it has two or more children, since then its subtrees only meet through it

The two tests differ by one symbol, and the difference is real. The bridge test needs strictly greater, since a back edge landing on u itself still gives the subtree a second way to reach u. The articulation test accepts equal, because a back edge to u doesn't help if u itself is removed.

## The Numbers on Our Network

Discovery numbers and low values from a search that starts at the Dorm.

| Building | Discovered | Low | What It Tells |
| --- | --- | --- | --- |
| Dorm | 1 | 1 | The root has one child, so it isn't a cut point |
| Quad | 2 | 1 | Below it, the Gym has a back edge to the Dorm |
| Library | 3 | 1 | The same back edge, seen from below |
| Lab | 4 | 1 | The same back edge |
| Cafe | 5 | 1 | The same back edge, from the Gym just below |
| Gym | 6 | 1 | Its own back edge reaches the Dorm |
| Shed | 7 | 7 | No edge above it: the Gym to Shed cable is a bridge, and the Gym is a cut point |
| Hall | 8 | 3 | A back edge to the Library at 3 |
| Annex | 9 | 9 | No edge above it: the Hall to Annex cable is a bridge, and the Hall is a cut point |
| Pool | 10 | 9 | The Field below it has a back edge to the Annex, so the Annex to Pool cable is not a bridge, but the Annex is a cut point |
| Field | 11 | 9 | Its back edge goes to the Annex |

The Shed's low value, 7, is bigger than the Gym's number, 6, which makes the cable a bridge. The Pool's low value, 9, equals the Annex's number, so the Annex isn't a bridge, though it is a cut point.

## The Code

```python
def bridges_and_cut_points(adj):             # adj maps a vertex to its list of neighbors
    dsc, low, parent = {}, {}, {}
    bridges, cuts = [], set()
    clock = 0
    def visit(u):
        nonlocal clock
        clock += 1
        dsc[u] = low[u] = clock
        children = 0
        for v in adj[u]:
            if v not in dsc:                 # a tree edge
                parent[v] = u
                children += 1
                visit(v)
                low[u] = min(low[u], low[v])
                if low[v] > dsc[u]:
                    bridges.append((u, v))
                if parent[u] is not None and low[v] >= dsc[u]:
                    cuts.add(u)
            elif v != parent[u]:             # a back edge, but not the way we came
                low[u] = min(low[u], dsc[v])
        if parent[u] is None and children >= 2:
            cuts.add(u)
    for s in adj:
        if s not in dsc:
            parent[s] = None
            visit(s)
    return bridges, cuts
```

It assumes a simple graph, with no repeated cables between the same pair. For parallel cables, the check against `parent` has to compare cable identities, since a second cable is a way back.

On the network it returns the bridges Gym to Shed and Hall to Annex, and the cut points Gym, Hall and Annex. We checked it on 300 random graphs of up to 14 vertices, comparing with removing each edge and each vertex in turn and counting components.

The sets matched on every graph. The recursion is fine for small graphs, and for large ones the same logic needs an explicit stack, as in the depth-first article. Our large measurements below used an iterative version, which agreed with this one on 300 random graphs.

## What One Cable Can Fix

We tried the repairs. A new cable from the Annex to the Library removed the Hall to Annex bridge and made the Hall safe, but the Gym to Shed bridge and the Gym stayed, and so did the Annex as a cut point, since the Pool and Field still hang behind it. Adding a second cable from the Shed to the Dorm removed the last bridge, and the Annex stayed a cut point.

One cable between the two dead ends, the Shed and the Pool, did everything at once. It made a loop through the whole network, from the Gym through the Shed and Pool to the Annex, the Hall and back around the campus, and the search then reported no bridges and no cut points.

If we squeeze each group that stays connected without the bridges into a single point, the result is a tree, just as squeezing strongly connected components gave a DAG in [Strongly Connected Components](/algorithms/strongly-connected). Our network squeezes into three points, the campus, the Shed and the Annex group, with the two bridges as its two edges. A new cable between two leaves of that tree makes a loop and removes the bridges on the way.

## How Common Are They?

In big random graphs, weak points are mostly dead ends. We measured on 100,000 vertices at several average degrees.

| Average Degree | Bridges | Share of Edges | Cut Points | Share of Vertices |
| --- | --- | --- | --- | --- |
| 2 | 36,573 | 36.6% | 27,888 | 27.9% |
| 3 | 17,374 | 11.6% | 15,494 | 15.5% |
| 5 | 3,546 | 1.4% | 3,468 | 3.5% |
| 10 | 35 | 0.0% | 35 | 0.0% |

With an average of 10 connections for each vertex, only 35 bridges and 35 cut points remained, and also 35 vertices with exactly one edge. A vertex with one edge hangs off its neighbor by a bridge, and that neighbor is a cut point.

Dead ends explain nearly all the weak spots once the graph is well connected. At an average degree of 1, the graph we generated had no cycles at all, so each of its 50,000 edges was a bridge.

The search took 0.14 s for 500,000 edges in Python.

## Key Points

- A bridge is an edge, and an articulation point is a vertex, whose removal disconnects the graph, and one DFS finds all of them in O(V + E)
- For each vertex, low is the smallest discovery number reachable by going down the tree and then taking at most one back edge
- A tree edge from u to v is a bridge when low(v) > dsc(u), a non-root u is a cut point when some child has low(v) ≥ dsc(u), and a root is one when it has two or more children
- On our network the search found 2 bridges and 3 cut points, and matched removing each edge and vertex on 300 random graphs
- A network can have no bridges and still have a cut point, and in large random graphs the weak spots were mostly vertices with a single edge
