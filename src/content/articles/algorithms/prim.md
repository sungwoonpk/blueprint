> **Prim’s algorithm** builds a minimum spanning tree by growing a single tree from a start vertex. Each step takes the cheapest edge that leaves the tree and brings in one new vertex. With a binary heap it runs in O(E log V), and it is Dijkstra’s algorithm with a different priority.

Another way to dig. Instead of ranking every path in the campus, start at the Dorm, which already has the network connection, and extend outward. At each step, look at all the paths that lead from a connected building to one that isn't, pick the cheapest, and lay it. The network grows like a crystal, one building at a time.

## Growing From the Dorm

Take the Dorm, with no cables yet. Two paths leave it, to the Quad at 3 and the Gym at 8. The Quad is cheaper, so lay it. Now the network is the Dorm and the Quad, and the paths leaving it are Dorm to Gym at 8, Quad to Library at 4 and Quad to Cafe at 2. Take the Cafe. Keep going.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus after Prim's algorithm has taken the Quad, Cafe and Library into a tree that started at the Dorm. Five paths leave the tree, to the Gym, Lab and Hall, and the cheapest, Library to Lab at 3, is taken next.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e dash" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e hl" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e dash" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e dash" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl dash" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dash" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e dim" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n done" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t done" x="40" y="108">Dorm</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="52">Quad</text>
<rect class="n done" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t done" x="222" y="38">Library</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="150">Cafe</text>
<rect class="n" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t " x="66" y="188">Gym</text>
</svg>
<figcaption>Prim's algorithm after three steps. The filled buildings and bright edges are the tree, the dashed edges leave it, and the cheapest of those, Library to Lab at 3, is taken next</figcaption>
</figure>

The picture is the network after three steps. The dashed edges are the **frontier**, the paths that leave the tree. The cheapest is the Library to the Lab at 3, so the Lab joins next.

| Step | Path Taken | Cost | New Building | Total So Far |
| --- | --- | --- | --- | --- |
| 1 | Dorm to Quad | 3 | Quad | 3 |
| 2 | Quad to Cafe | 2 | Cafe | 5 |
| 3 | Quad to Library | 4 | Library | 9 |
| 4 | Library to Lab | 3 | Lab | 12 |
| 5 | Lab to Hall | 2 | Hall | 14 |
| 6 | Cafe to Gym | 5 | Gym | 19 |

The total is 19, the same as the tree [Kruskal’s Algorithm](/algorithms/kruskal) found, with the same six paths in a different order. At step 5, notice that the Cafe to Lab path at 6 had become useless since step 4: both its ends were in the tree. It stays in the candidates until it surfaces and is thrown away.

The rule is correct for the reason from [Minimum Spanning Trees](/algorithms/minimum-spanning-trees). Split the buildings into those in the tree and those outside. The cheapest path across that split belongs in the MST, and it is the edge that Prim's rule takes.

## The Code

The frontier needs a quick way to find its cheapest edge, which is a min-heap. When an edge leaves the heap, its far end might have joined the tree meanwhile through another edge, and then the edge is skipped.

```python
import heapq

def prim(adj, start):                        # adj maps a vertex to (neighbor, weight) pairs
    in_tree = {start}
    tree = []
    heap = [(w, start, v) for v, w in adj[start]]
    heapq.heapify(heap)
    while heap and len(in_tree) < len(adj):
        w, u, v = heapq.heappop(heap)
        if v in in_tree:
            continue                         # both ends are already in the tree
        in_tree.add(v)
        tree.append((u, v, w))
        for x, wx in adj[v]:
            if x not in in_tree:
                heapq.heappush(heap, (wx, v, x))
    return tree
```

On the campus it returns the six edges of the table above, in the same order, with a total of 19. The start building doesn't change the answer. We ran Prim from each of the 7 buildings and got 19 every time.

We also ran it from three random start vertices on each of 300 random graphs of up to 40 vertices, with weights from 1 to 30 and many ties, and its totals matched Kruskal's on all of them.

## Dijkstra With a Different Key

Put the code next to [Dijkstra’s Algorithm](/algorithms/dijkstra) and the resemblance is plain. Both keep a heap of candidates, take the smallest, add one vertex, and push the neighbors. The only difference is the priority. Dijkstra ranks a candidate by the length of the whole route from the source, `d + w`. Prim ranks it by the edge alone, `w`.

That small change gives a different tree. Dijkstra from the Dorm builds the tree of fastest routes, whose paths add up to 22. Prim builds the cheapest connected network, at 19. The first minimizes each building's trip from the Dorm, and the second minimizes the cost of the network, and each is bad at the other's job.

In the MST, the Library is 3 + 4 = 7 minutes from the Dorm, which happens to equal the fastest route, but the Gym is 5 + 2 + 3 = 10 away against a direct 8.

## What It Costs

With a binary heap, every edge is pushed at most once from each end, and each heap operation costs O(log E), so the total is O(E log V). Our counts on random graphs with 5 edges for each vertex show a good share of the pushes ending in a skip.

| Vertices | Edges | Pushes | Skipped on Removal | Prim | Kruskal |
| --- | --- | --- | --- | --- | --- |
| 10,000 | 59,999 | 59,987 | 37,643 | 0.08 s | 0.03 s |
| 100,000 | 599,999 | 599,987 | 411,800 | 1.08 s | 0.35 s |
| 400,000 | 2,399,999 | 2,399,991 | 1,949,942 | 5.83 s | 1.67 s |

Both ran in O(E log V) and found trees of the same total weight. In our Python test, Kruskal was about 3 times faster on these sparse graphs, since it sorts in C and the loop is short, while Prim does a heap operation for every edge.

Dense graphs reverse that. We built complete graphs with random weights and ran three versions on them. One is a version of Prim that keeps, for each outside vertex, the cheapest edge into the tree, and scans that array for the smallest, with no heap. It takes O(V²).

| Vertices | Edges | Prim With Array | Prim With Heap | Kruskal |
| --- | --- | --- | --- | --- |
| 500 | 124,750 | 0.01 s | 0.03 s | 0.04 s |
| 1,000 | 499,500 | 0.06 s | 0.15 s | 0.26 s |
| 1,500 | 1,124,250 | 0.16 s | 0.33 s | 0.62 s |

When the number of edges is close to V², the array version has the lowest cost, since it doesn't touch most edges more than once and has no heap to maintain. All three gave the same total.

## Kruskal or Prim

| Situation | Choice |
| --- | --- |
| Edges already in a list, sparse graph | Kruskal |
| Graph in adjacency lists, grown from a known start | Prim with a heap |
| Dense graph or a distance matrix | Prim with an array |
| Fewer groups than one wanted, as in clustering | Kruskal, stopped early |

Both produce a minimum spanning tree, so the choice is about the shape of the data and the constants, not the answer.

## Key Points

- Prim's algorithm grows one tree from a start vertex, taking the cheapest edge that leaves it, and the rule is the cut rule applied to the tree against the rest
- It is Dijkstra's algorithm with the edge weight as the priority instead of the route length, and on the campus that gave 19 against 22 for the tree of fastest routes
- Every start vertex gave the same total, 19 for the campus, and Prim matched Kruskal on 300 random graphs with many ties
- With a heap it takes O(E log V), and many pushes are skipped when removed, 411,800 of 599,987 on 100,000 vertices
- On sparse graphs Kruskal was about 3 times faster in Python, and on complete graphs Prim with an array and no heap was the fastest, taking O(V²)
