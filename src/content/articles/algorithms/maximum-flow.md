> A **flow network** is a directed graph whose edges have capacities, with a source s and a sink t. A **flow** sends material from s to t without exceeding any capacity and without losing any at the vertices in between. The **maximum flow** is the most that can get through, and it always equals the capacity of the **minimum cut**, the cheapest set of edges whose removal separates s from t. Repeatedly pushing flow along augmenting paths, chosen by breadth-first search, finds both.

A video from the server room must reach the Dorm over the campus network, and each link can carry a limited number of gigabits per second. How much can be sent at once? And if the IT office wanted to know which links to protect, which ones form the bottleneck?

The two questions look different, and the central result of this topic says they have the same answer.

## A Network With Capacities

A small network of four points: the Server, two buildings in between, and the Dorm. Each directed link has its capacity.

<figure class="diagram graph">
<svg viewBox="0 0 360 206" role="img" aria-label="A small network with capacities in gigabits per second: Server to Quad 2, Server to Library 2, Quad to Dorm 2, Library to Dorm 2, and Quad to Library 1.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="76.5" y1="87.0" x2="153.0" y2="49.3" marker-end="url(#ah)"/>
<text class="w" x="114.7" y="68.1">2</text>
<line class="e" x1="76.5" y1="117.0" x2="145.5" y2="151.0" marker-end="url(#ah)"/>
<text class="w" x="111.0" y="134.0">2</text>
<line class="e" x1="205.0" y1="48.3" x2="285.0" y2="87.7" marker-end="url(#ah)"/>
<text class="w" x="245.0" y="68.0">2</text>
<line class="e" x1="210.5" y1="153.0" x2="285.0" y2="116.3" marker-end="url(#ah)"/>
<text class="w" x="247.7" y="134.6">2</text>
<line class="e" x1="180.0" y1="51.0" x2="180.0" y2="151.0" marker-end="url(#ah)"/>
<text class="w" x="194.0" y="101.0">1</text>
<rect class="n" x="12" y="88" width="68" height="28" rx="14"/>
<text class="t " x="46" y="102">Server</text>
<rect class="n" x="156" y="22" width="48" height="28" rx="14"/>
<text class="t " x="180" y="36">Quad</text>
<rect class="n" x="148" y="154" width="64" height="28" rx="14"/>
<text class="t " x="180" y="168">Library</text>
<rect class="n" x="288" y="88" width="52" height="28" rx="14"/>
<text class="t " x="314" y="102">Dorm</text>
</svg>
<figcaption>A network with the capacity of each link. The most traffic that can go from the Server to the Dorm is what we want to know</figcaption>
</figure>

A **flow** assigns each link an amount, at most its capacity, such that at each building in between, as much comes in as goes out. The **value** of the flow is how much leaves the Server. We want the largest possible value.

An upper bound is easy to see. Split the points into a group containing the Server and a group containing the Dorm, and look at the links that leave the Server's group. Everything has to cross them, so the flow can't exceed their total capacity. If the Server's group is the Server alone, the links leaving it carry 2 + 2 = 4, so the flow can't exceed 4.

That count of the capacity going out of the Server's group is the capacity of a **cut**, and every cut limits the flow in the same way.

## The Greedy Trap

Can 4 be reached? Try the obvious method: find a path from the Server to the Dorm with room on every link, and push as much as fits.

Say the first path is Server, Quad, Library, Dorm. The Quad to Library link has capacity 1, so push 1. Then push 1 along Server, Quad, Dorm, and 1 along Server, Library, Dorm. The total is 3. Now look for another path with room: the Server to Quad link is full, and the Library to Dorm link is full. The method is stuck at 3, though the bound was 4.

The first path was a mistake, and the method has no way to undo it. The fix is to let later paths take flow back.

## Taking Flow Back

For the flow so far, the **residual graph** records what can still change. Each link with room left stays, with the room as its capacity. And for each link that carries flow, a new link points the other way, with capacity equal to that flow, which stands for undoing some of it.

<figure class="diagram graph">
<svg viewBox="0 0 360 206" role="img" aria-label="The residual graph after one unit was pushed along Server, Quad, Library, Dorm. Forward links show what capacity is left: Server to Quad 1, Server to Library 2, Quad to Dorm 2, Library to Dorm 1. Dashed links point backward and show flow that could be undone: Library to Quad 1, Quad to Server 1, Dorm to Library 1.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e dash" x1="76.5" y1="87.0" x2="153.0" y2="49.3" marker-end="url(#ah)"/>
<text class="w" x="124.7" y="60.1">1</text>
<line class="e" x1="76.5" y1="117.0" x2="145.5" y2="151.0" marker-end="url(#ah)"/>
<text class="w" x="121.0" y="142.0">2</text>
<line class="e" x1="205.0" y1="48.3" x2="285.0" y2="87.7" marker-end="url(#ah)"/>
<text class="w" x="255.0" y="60.0">2</text>
<line class="e dash" x1="210.5" y1="153.0" x2="285.0" y2="116.3" marker-end="url(#ah)"/>
<text class="w" x="257.7" y="142.6">1</text>
<path class="e hl dash" d="M185.5 153.0Q204.0 102.0 186.2 53.0" marker-end="url(#ah)"/>
<text class="w" x="180.9" y="102.5">1</text>
<path class="e dash" d="M155.0 39.7Q102.4 47.5 63.6 85.0" marker-end="url(#ah)"/>
<text class="w" x="97.8" y="48.9">1</text>
<path class="e dash" d="M287.0 106.0Q236.4 113.5 197.6 151.0" marker-end="url(#ah)"/>
<text class="w" x="247.3" y="129.0">1</text>
<rect class="n" x="12" y="88" width="68" height="28" rx="14"/>
<text class="t " x="46" y="102">Server</text>
<rect class="n" x="156" y="22" width="48" height="28" rx="14"/>
<text class="t " x="180" y="36">Quad</text>
<rect class="n" x="148" y="154" width="64" height="28" rx="14"/>
<text class="t " x="180" y="168">Library</text>
<rect class="n" x="288" y="88" width="52" height="28" rx="14"/>
<text class="t " x="314" y="102">Dorm</text>
</svg>
<figcaption>The residual graph after the first push. Solid links show room left, and dashed links point backward to show flow that can be undone. The bright dashed link, Library to Quad, opens a new route</figcaption>
</figure>

After the first push of 1 along Server, Quad, Library, Dorm, the residual graph has a new link from the Library to the Quad, for the flow on Quad to Library that could be cancelled. A path in the residual graph, from the Server to the Dorm, is called an **augmenting path**, and pushing along it increases the flow.

Now the new path exists: Server to Library, then back along the cancelling link to the Quad, then Quad to Dorm. Using the cancelling link removes the unit that went through Quad to Library, and the Library's other link takes over that unit's trip. The total goes up by 1, to 4, the bound.

## Ford and Fulkerson's Method

The method is: build the residual graph, find a path from the source to the sink, push the smallest capacity on the path, and repeat until no path remains. When none does, the flow is a maximum.

```python
from collections import deque, defaultdict

def max_flow(n, edges, s, t):                # edges is a list of (u, v, capacity)
    cap = [defaultdict(int) for _ in range(n)]
    for u, v, c in edges:
        cap[u][v] += c
        cap[v][u] += 0                       # make sure the reverse link exists
    flow = 0
    while True:
        parent = {s: None}                   # breadth-first search for a path with room
        queue = deque([s])
        while queue and t not in parent:
            u = queue.popleft()
            for v, c in cap[u].items():
                if c > 0 and v not in parent:
                    parent[v] = u
                    queue.append(v)
        if t not in parent:
            break                            # no augmenting path: done
        path, v = [], t
        while parent[v] is not None:
            path.append((parent[v], v))
            v = parent[v]
        push = min(cap[u][v] for u, v in path)
        for u, v in path:
            cap[u][v] -= push                # use up room on the link
            cap[v][u] += push                # and create room to undo it
        flow += push
    return flow, cap
```

On our network it returns 4, after 2 augmentations. When all capacities are whole numbers, every push is a whole number too, so the final flow on each link is a whole number.

## Which Path to Pick

The method doesn't say which path to take, and the choice can be disastrous. Take the network of the Server, two buildings, and a middle link with capacity 1 between them, with every other link at X, a large number.

The best flow is 2X. An unlucky choice goes through the middle link, then through its undoing, again and again: Server, Quad, Library, Dorm, then Server, Library, Quad, Dorm, each time with a bottleneck of 1.

We played that sequence out and checked that each step was a legal augmenting path. For X = 100,000 it takes 200,000 augmentations. The breadth-first search in the code finds the two direct paths, each carrying X, and is done in 2.

Choosing the path with the fewest links is the rule of Edmonds and Karp. With it, the number of augmentations is bounded by a polynomial in the number of vertices and edges, whatever the capacities are, for a total time of O(V × E²). Dinitz found a more elaborate way of using shortest paths that takes O(V² × E).

So with arbitrary choices the time can grow with the flow value, which can be huge even for a tiny network.

## The Bottleneck Falls Out

When the method stops, no path from the Server to the Dorm has room. Let S be the set of points the Server can still reach in the residual graph. The Dorm isn't in it. Every link from S to the outside must be full, or the search would have crossed it, and every link carrying flow in the other direction must be empty, or its undoing would have let the search cross back.

So the flow equals the capacity of the cut around S, and no flow can beat it: this is the **max-flow min-cut theorem**.

On the small network, S is the Server alone, and the cut is its two outgoing links, 2 + 2 = 4, the cheapest way to cut the Server off from the Dorm. For a bigger network, it names the bottleneck links, the ones to upgrade for more capacity or the ones to protect for reliability.

We verified both claims on 300 random networks of up to 8 vertices with capacities from 1 to 9. For every network, the flow equalled the smallest cut found by trying every way to split the vertices, and the cut read off the residual graph had exactly that capacity.

## At Scale

For larger networks we used random links with capacities from 1 to 100, plus a source tied to 50 random points and a sink tied to 50 others, at capacity 1,000.

| Vertices | Links | Flow | Paths | Time |
| --- | --- | --- | --- | --- |
| 1,000 | 5,096 | 12,092 | 603 | 0.25 s |
| 5,000 | 25,092 | 10,357 | 747 | 1.53 s |
| 20,000 | 100,092 | 11,908 | 1,002 | 10.42 s |

The flow values are in the thousands, and the number of augmentations is in the hundreds, far fewer than the flow itself, which is the point of choosing shortest paths. Each augmentation is a search of the whole residual graph, which is why the time per augmentation grows with the network. In each case the cut read from the residual graph, about 230 to 250 links, had a capacity equal to the flow.

## Where Flows Are Used

The origin of the problem was a rail network. In the mid 1950s, Harris and Ross studied how much could be shipped by rail from the Soviet Union into Eastern Europe, and how few links would cut it off. Their report was classified until 1999.

Flows also solve problems that don't look like shipping. The next article, [Bipartite Matching](/algorithms/bipartite-matching), turns the pairing of students with labs into a flow problem on a network of capacity 1 links, and the min-cut half of the theorem explains when no complete pairing exists.

## Key Points

- A flow respects each link's capacity and conserves what enters each point, and the cut around any group containing the source but not the sink bounds the flow
- Pushing along any path with room can get stuck, 3 against a true 4 on our network, so each push also creates a link to undo it, and the residual graph holds both
- Repeating augmenting paths until none exists gives a maximum flow, and choosing the path with the fewest links bounds the work by O(V × E²), against 200,000 pushes for an unlucky choice on a tiny network
- The points the source can still reach at the end give a cut equal to the flow, the max-flow min-cut theorem, and it matched brute force on 300 random networks
- It took 10.4 s on 20,000 vertices and 100,000 links in Python, with 1,002 augmentations
