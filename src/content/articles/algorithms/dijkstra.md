> **Dijkstra’s algorithm** finds the cheapest route from one source to every other vertex when no edge has a negative weight. It works like breadth-first search with a priority queue in place of the plain queue, always settling the closest unsettled vertex next, and with a binary heap it takes O(E log V) time.

The breadth-first search earlier gave the Dorm to the Hall in 3 edges and 15 minutes, while a route of 4 edges took 12. People asking for directions want minutes, not edges, and every path on the campus map has a weight, the walking time. We need the fastest route to every building, computed in a way that still works when the campus has a million of them.

## Settling the Closest First

Think of a wavefront spreading from the Dorm, but moving at walking speed. It reaches the Quad after 3 minutes, so the Quad's time is final: nothing can beat the first arrival of the wave. Then the Cafe after 5, the Library after 7, and so on, in increasing time.

That gives the method. Keep a **tentative distance** for each building, the best route found so far. Repeatedly take the unsettled building with the smallest tentative distance and **settle** it, so its distance is final, and then look at its neighbors. For each neighbor, check whether going through the settled building is faster than the best route known, and if so update it. Checking a single edge this way is called **relaxing** it.

Taking the closest next calls for a structure that gives the smallest value fast: a min-heap, from [Heaps and Priority Queues](/algorithms/heaps).

```python
import heapq

def dijkstra(adj, source):                  # adj maps a vertex to (neighbor, weight) pairs
    dist = {source: 0}
    parent = {source: None}
    heap = [(0, source)]
    done = set()
    while heap:
        d, u = heapq.heappop(heap)
        if u in done:
            continue                        # a stale entry: u settled earlier with a smaller d
        done.add(u)
        for v, w in adj[u]:
            nd = d + w
            if v not in dist or nd < dist[v]:
                dist[v] = nd
                parent[v] = u
                heapq.heappush(heap, (nd, v))
    return dist, parent
```

Python's heap can't lower the key of an entry already inside it, so the code pushes a new, better entry and skips the old one when it comes out. That is why the check `u in done` is there.

## A Walk Across Campus

From the Dorm, using the weights of the campus map:

| Step | Settle | Distance | Updates |
| --- | --- | --- | --- |
| 1 | Dorm | 0 | Quad 3, Gym 8 |
| 2 | Quad | 3 | Library 7, Cafe 5 |
| 3 | Cafe | 5 | Lab 11 (Gym would be 10, no better than 8) |
| 4 | Library | 7 | Lab 10 (was 11), Hall 15 |
| 5 | Gym | 8 | None |
| 6 | Lab | 10 | Hall 12 (was 15) |
| 7 | Hall | 12 | None |

Two entries show why tentative distances can change. At step 3 the Lab is first reached through the Cafe, in 11 minutes. At step 4 the Library offers 10, so the Lab drops, and at step 6 the Lab improves the Hall from 15 to 12. Each vertex is settled once, in order of its distance from the Dorm.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus with the fastest walking time from the Dorm under each name: Dorm 0, Quad 3, Cafe 5, Library 7, Gym 8, Lab 10, Hall 12. The bright edges are the fastest routes.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e hl" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e hl" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e dim" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e dim" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dim" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e hl" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n hl" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t hl" x="40" y="103">Dorm</text>
<text class="s" x="40" y="115">0</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="47">Quad</text>
<text class="s" x="118" y="59">3</text>
<rect class="n done" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t done" x="222" y="33">Library</text>
<text class="s" x="222" y="45">7</text>
<rect class="n done" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t done" x="318" y="73">Hall</text>
<text class="s" x="318" y="85">12</text>
<rect class="n done" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t done" x="258" y="135">Lab</text>
<text class="s" x="258" y="147">10</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="145">Cafe</text>
<text class="s" x="140" y="157">5</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="183">Gym</text>
<text class="s" x="66" y="195">8</text>
</svg>
<figcaption>The fastest routes from the Dorm. The small number is the walking time in minutes, and the bright edges are the last step of each fastest route</figcaption>
</figure>

The tree of last steps gives every fastest route: the Hall is reached from the Lab, which is reached from the Library, from the Quad, from the Dorm, in 12 minutes. The breadth-first tree had the Hall at 3 edges, and this route has 4.

## Why Settling Early Is Safe

Suppose the closest unsettled building is v, with tentative distance d. Could some other route reach v in less than d? That route starts inside the settled set and must leave it at some point, by an edge to a building y outside.

The tentative distance of y is at most the length of the route up to y, and v was chosen as the smallest tentative distance, so the route is already at least d by the time it reaches y. The rest of the route can only add weight, because no edge has a negative weight. So no route is shorter than d.

That reasoning breaks on a negative edge: a later, cheap-looking road could be the shortcut that the earlier decision missed. We checked the algorithm on 300 random directed graphs with weights from 1 to 20 against a method that relaxes every edge repeatedly until nothing changes, and the distances agreed, with the settled distances in nondecreasing order each time.

## When Weights Go Negative

Add a negative weight and the guarantee fails. In a small example, S has edges to A of weight 2 and to B of weight 3, B has an edge to A of weight −2, and A has an edge to C of weight 1.

The true distance to C is 2: S to B to A to C costs 3 − 2 + 1. Dijkstra settles A at 2, before B's shortcut can be seen, and reports 3 for C.

On 244 small random graphs with some negative edges, no negative cycles, this code returned a wrong distance for at least one vertex in 8 of them. The error isn't common, and it's silent, which makes it worse. For graphs with negative edges, [Bellman-Ford and Negative Edges](/algorithms/bellman-ford) is the tool.

## What It Costs

Each reachable vertex is settled once. The heap gets a new entry only when a distance improves, and each edge is relaxed at most once from its settled end, so the number of pushes is at most one for each entry in the adjacency lists plus one for the source, and each costs O(log E), which is O(log V) since E ≤ V². The total is O(E log V).

We counted on random graphs with weights from 1 to 100. With 100,000 vertices and 500,000 edges, whose lists hold 1,000,000 entries, there were 195,192 pushes, about 2 for each vertex, and 95,195 stale entries were skipped. Most edges relaxed nothing, because the route through them was no better, so the bound on pushes was far from tight.

| Vertices | Edges | Time |
| --- | --- | --- |
| 100,000 | 500,000 | 0.62 s |
| 200,000 | 1,000,000 | 1.40 s |
| 400,000 | 2,000,000 | 3.31 s |

The time grew a bit faster than the size, as O(E log V) predicts. With other priority queues, the bound changes. A plain array scanned for the minimum on every step gives O(V²), which the textbooks recommend when the graph is dense. A Fibonacci heap gives O(E + V log V), a better bound on paper, though its constants make it uncommon in practice.

We compared the array and the heap on complete graphs, 1,500 vertices and 1,124,250 edges, and they took about the same time, 0.13 s and 0.12 s, with identical distances. So the heap didn't lose even on a dense graph, at this size.

## Stopping Early

When the question is the route to a single destination, stop as soon as it is settled, since its distance is final from then on. On the campus, asking for the Lab finishes after 6 steps and never touches the Hall. That works for any target, though in the worst case the target is settled last.

The search settles vertices in a ring around the source, in every direction, even directions that lead away from the target. The next article, [A* Search](/algorithms/a-star), adds a guess about the remaining distance to steer the ring toward the goal.

## Key Points

- Dijkstra’s algorithm settles the closest unsettled vertex, relaxes its edges, and repeats, using a min-heap, and it requires non-negative weights
- A settled distance is final because any other route has to leave the settled set through a vertex that is at least as far, and the rest of the route can't be negative
- On the campus the fastest route to the Hall took 4 edges and 12 minutes, while the fewest edge route took 3 edges and 15 minutes
- With a binary heap it takes O(E log V), and on our graphs with 5 edges for each vertex the heap took only about 2 pushes for each vertex
- With a negative edge it can return a wrong distance, silently, as in 8 of 244 test graphs, which is the job of Bellman-Ford
