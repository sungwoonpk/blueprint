> The **Bellman-Ford algorithm** computes shortest paths from one source even when some edges have negative weights. It relaxes every edge, V − 1 times over, and if an edge can still be relaxed after that, the graph has a **negative cycle** reachable from the source, so no shortest path exists. It takes O(V × E) time.

Dijkstra’s algorithm settles a vertex the moment it is the closest one left, and that is safe only because a later edge can never make a route shorter. On the small graph we gave it with one negative edge, it settled a vertex too early and reported 3 for a distance that was 2.

Negative edges aren't a trick of the textbook. A refund is a negative cost, a rebate is a negative price, and a currency trade that earns money is a negative step in a graph of exchanges. We need an algorithm that doesn't rely on the closest-first rule.

## A Graph With a Negative Edge

A source S, four vertices, and one edge, B to C, with weight −3.

<figure class="diagram graph">
<svg viewBox="0 0 360 190" role="img" aria-label="A directed graph with source S. S to A costs 5, A to B 4, B to C minus 3, C to D 2, and S to D 12.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="59.0" y1="79.5" x2="101.0" y2="51.8" marker-end="url(#ah)"/>
<text class="w" x="80.0" y="65.7">5</text>
<line class="e" x1="141.0" y1="38.0" x2="201.0" y2="38.0" marker-end="url(#ah)"/>
<text class="w" x="171.0" y="38.0">4</text>
<line class="e hl" x1="241.0" y1="48.3" x2="301.0" y2="80.7" marker-end="url(#ah-hl)"/>
<text class="w" x="271.0" y="64.5">-3</text>
<line class="e" x1="303.0" y1="103.4" x2="243.0" y2="139.4" marker-end="url(#ah)"/>
<text class="w" x="273.0" y="121.4">2</text>
<line class="e" x1="59.0" y1="98.3" x2="201.0" y2="145.1" marker-end="url(#ah)"/>
<text class="w" x="130.0" y="121.7">12</text>
<rect class="n" x="22" y="78" width="36" height="28" rx="14"/>
<text class="t " x="40" y="92">S</text>
<rect class="n" x="104" y="24" width="36" height="28" rx="14"/>
<text class="t " x="122" y="38">A</text>
<rect class="n" x="204" y="24" width="36" height="28" rx="14"/>
<text class="t " x="222" y="38">B</text>
<rect class="n" x="304" y="78" width="36" height="28" rx="14"/>
<text class="t " x="322" y="92">C</text>
<rect class="n" x="204" y="138" width="36" height="28" rx="14"/>
<text class="t " x="222" y="152">D</text>
</svg>
<figcaption>A graph with one negative edge, B to C, drawn bright. The fastest route to D is S, A, B, C, D, with total 5 + 4 − 3 + 2 = 8, and the direct edge costs 12</figcaption>
</figure>

The route S, A, B, C, D costs 5 + 4 − 3 + 2 = 8, while the direct edge from S to D costs 12. The long way is cheaper because of the refund in the middle. Notice that C looks expensive until you have reached B, and B is only reached by the route through A. Information has to travel along the whole chain before the answer for D is right.

## Relax Everything, Over and Over

Start with distance 0 for S and ∞ for the others. A pass goes through every edge once and **relaxes** it: if the edge u to v with weight w gives dist(u) + w < dist(v), lower dist(v). Do a pass, then another, and keep going.

The key fact is that after k passes, every vertex has a distance at least as good as the best route that uses at most k edges. A pass can only extend a route by edges it relaxes, and each pass gives every route one more edge. A shortest path with no repeated vertex has at most V − 1 edges, so V − 1 passes are enough.

```python
INF = float("inf")

def bellman_ford(n, edges, source):          # edges is a list of (u, v, weight)
    dist = [INF] * n
    parent = [None] * n
    dist[source] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                changed = True
        if not changed:
            break                            # nothing moved, so nothing will
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            return None, parent, (u, v)      # still improvable: a negative cycle
    return dist, parent, None
```

Here are the distances after each pass, with the edges listed in the unlucky order C to D, B to C, A to B, S to A, S to D.

| Pass | A | B | C | D |
| --- | --- | --- | --- | --- |
| Start | ∞ | ∞ | ∞ | ∞ |
| 1 | 5 | ∞ | ∞ | 12 |
| 2 | 5 | 9 | ∞ | 12 |
| 3 | 5 | 9 | 6 | 12 |
| 4 | 5 | 9 | 6 | 8 |

Each pass moved the answer forward by one vertex, because the list went against the direction of the path: the edge from C to D was looked at before C had a distance. D reaches 8 on pass 4, which is V − 1.

The order of the edges matters a great deal. We built a path of n vertices with every edge weighing 1, and listed the edges in reverse. The number of passes was n − 1 every time: 3,999 passes, taking 457 ms, for 4,000 vertices. With the edges listed along the path, the same graph finished in 2 passes, 0.5 ms, the second pass only to see that nothing changed.

## When a Cycle Pays

Suppose a new road goes from D back to B at weight 0.

<figure class="diagram graph">
<svg viewBox="0 0 360 190" role="img" aria-label="The same graph with a new edge from D back to B of weight 0. B to C to D to B is a cycle with total weight minus 1.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="59.0" y1="79.5" x2="101.0" y2="51.8" marker-end="url(#ah)"/>
<text class="w" x="80.0" y="65.7">5</text>
<line class="e" x1="141.0" y1="38.0" x2="201.0" y2="38.0" marker-end="url(#ah)"/>
<text class="w" x="171.0" y="38.0">4</text>
<line class="e bad" x1="241.0" y1="48.3" x2="301.0" y2="80.7" marker-end="url(#ah-bad)"/>
<text class="w" x="271.0" y="64.5">-3</text>
<line class="e bad" x1="303.0" y1="103.4" x2="243.0" y2="139.4" marker-end="url(#ah-bad)"/>
<text class="w" x="273.0" y="121.4">2</text>
<line class="e" x1="59.0" y1="98.3" x2="201.0" y2="145.1" marker-end="url(#ah)"/>
<text class="w" x="130.0" y="121.7">12</text>
<line class="e bad" x1="222.0" y1="137.0" x2="222.0" y2="55.0" marker-end="url(#ah-bad)"/>
<text class="w" x="222.0" y="96.0">0</text>
<rect class="n" x="22" y="78" width="36" height="28" rx="14"/>
<text class="t " x="40" y="92">S</text>
<rect class="n" x="104" y="24" width="36" height="28" rx="14"/>
<text class="t " x="122" y="38">A</text>
<rect class="n bad" x="204" y="24" width="36" height="28" rx="14"/>
<text class="t bad" x="222" y="38">B</text>
<rect class="n bad" x="304" y="78" width="36" height="28" rx="14"/>
<text class="t bad" x="322" y="92">C</text>
<rect class="n bad" x="204" y="138" width="36" height="28" rx="14"/>
<text class="t bad" x="222" y="152">D</text>
</svg>
<figcaption>With a new edge D to B of weight 0, the loop B, C, D costs −3 + 2 + 0 = −1 each time around, so no cheapest route to D or anything after it exists</figcaption>
</figure>

The loop B, C, D costs −3 + 2 + 0 = −1, so each lap makes the route one cheaper. There's no shortest route to D, or to any vertex that can be reached from the loop, because another lap is always better. Passes would keep improving the distances forever.

That is the test. If a graph has no negative cycle, V − 1 passes finish the job, and a V-th pass changes nothing. If some edge can still be relaxed on that extra pass, a negative cycle is reachable from the source. The last lines of the function above do this check. On this graph they report the edge, and `bellman_ford` returns `None`.

To show the cycle itself, follow the parent pointers back from the edge that still relaxes. After n steps, the walk is certainly inside the loop, and one more trip around reads off its vertices.

```python
def negative_cycle(n, parent, last_edge):
    u, v = last_edge
    parent[v] = u
    x = v
    for _ in range(n):
        x = parent[x]                         # n steps back lands inside the cycle
    cycle, y = [x], parent[x]
    while y != x:
        cycle.append(y)
        y = parent[y]
    return cycle[::-1]
```

On our graph it returns B, C, D. We checked both the distances and the detection against an independent method, Floyd-Warshall, on 300 random graphs of up to 12 vertices with weights from −4 to 10. The distances matched whenever no negative cycle was reachable. In 53 graphs a reachable negative cycle existed, and the algorithm reported it every time, and each cycle it returned really had a negative total.

## A Loop That Pays

Currency exchange is the classic negative cycle. A made-up table of rates, the amount received for one unit of the currency on the left.

| From | USD | EUR | GBP | JPY |
| --- | --- | --- | --- | --- |
| USD | · | 0.91 | 0.77 | 150 |
| EUR | 1.09 | · | 0.87 | 165 |
| GBP | 1.29 | 1.14 | · | 190 |
| JPY | 0.0066 | 0.0059 | 0.0051 | · |

A trade sequence earns money if the product of its rates is above 1, and shortest paths add weights. Taking the logarithm turns products into sums, and the minus sign turns a gain into a negative cost: an edge of weight −ln(rate) for each rate. A cycle with a product above 1 has a negative total.

Bellman-Ford on those weights reports a negative cycle, and the cycle it returned is USD to EUR to GBP and back to USD, with the product 0.91 × 0.87 × 1.29 = 1.0213. One dollar becomes about $1.021 after three trades. We went through every loop of up to 4 currencies by brute force, and this is the only loop that gains.

Real quotes change by the second and carry fees, so treat this table as a teaching example. The point is the shape: an arbitrage is a negative cycle, and it can be found in time proportional to V × E.

## What It Costs

Each pass is O(E) and there are at most V passes, so the time is O(V × E), whatever the weights. That is the price of not trusting any ordering.

When the weights are non-negative, Dijkstra is the better choice. We compared them on a random graph of 20,000 vertices and 100,000 undirected edges, with weights from 1 to 100 and the edges in random order. Bellman-Ford needed 14 passes and 0.31 s, and Dijkstra needed 0.05 s, with identical distances. The early exit when a pass changes nothing saved most of the V − 1 passes, but each pass still reads every edge.

## Skipping the Quiet Edges

A pass spends most of its time on edges whose start vertex didn't change in the last pass, which can't produce an improvement. Moore's version keeps a queue of vertices whose distance changed, and relaxes only their edges, putting a vertex in the queue only if it isn't already there. It is breadth-first search with weights added.

On the same graph it made 90,182 improvements against 139,751 and took 0.05 s instead of 0.31 s, with the same distances. The worst case is still O(V × E), and with a negative cycle the queue never empties, so it has to be modified to report the cycle, for example by counting how often each vertex enters the queue.

## Choosing a Shortest Path Method

| Situation | Method |
| --- | --- |
| Non-negative weights, one source | [Dijkstra’s Algorithm](/algorithms/dijkstra) |
| Negative weights, or a check for a negative cycle | Bellman-Ford |
| No cycles at all | [Shortest Paths in a DAG](/algorithms/dag-shortest-paths), faster than both |
| Every pair of vertices | [Floyd-Warshall for All Pairs](/algorithms/floyd-warshall) |

## Key Points

- Bellman-Ford relaxes every edge V − 1 times, since after k passes each vertex is at least as good as its best route of at most k edges, and a shortest simple path has at most V − 1 edges
- If an edge can still be relaxed on a V-th pass, a negative cycle is reachable, and the parent pointers give the cycle itself
- The order of the edges decides how many passes are needed, 3,999 for a path of 4,000 vertices listed backwards and 2 listed forwards
- An arbitrage in currency exchange is a negative cycle under weights of −ln(rate), and the algorithm found the one 2.1% loop in our table
- The cost is O(V × E), which is 6 times slower than Dijkstra on our graph of 20,000 vertices, and a queue of changed vertices made it as fast on that input
