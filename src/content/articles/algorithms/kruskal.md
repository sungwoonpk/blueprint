> **Kruskal’s algorithm** builds a minimum spanning tree by looking at the edges from cheapest to most expensive and keeping each one unless its two ends are already connected. A Union-Find structure answers that question, and the sort dominates the running time at O(E log E).

The IT office is out of budget meetings and just wants to start digging. The plan is to take the paths in order of cost, cheapest first. Before laying a cable, ask whether the two buildings are already connected through cables laid so far. If they are, the new cable would only make a loop, so skip it. If they aren't, lay it.

That plan is Kruskal's algorithm, and it is a minimum spanning tree, as [Minimum Spanning Trees](/algorithms/minimum-spanning-trees) explains.

## Cheapest First

Here are the campus paths sorted by cost, and what the plan does with each.

| Order | Path | Cost | Decision | Groups Afterwards |
| --- | --- | --- | --- | --- |
| 1 | Quad to Cafe | 2 | Lay | Quad and Cafe |
| 2 | Lab to Hall | 2 | Lay | Also Lab and Hall |
| 3 | Dorm to Quad | 3 | Lay | Dorm, Quad and Cafe |
| 4 | Library to Lab | 3 | Lay | Library, Lab and Hall |
| 5 | Quad to Library | 4 | Lay | Everything but the Gym |
| 6 | Cafe to Gym | 5 | Lay | All seven |
| 7 | Cafe to Lab | 6 | Skip | Unchanged |
| 8 | Dorm to Gym | 8 | Skip | Unchanged |
| 9 | Library to Hall | 8 | Skip | Unchanged |

After path 6, every building is connected, with 6 paths laid and a total cost of 2 + 2 + 3 + 3 + 4 + 5 = 19. The last three paths each connect two buildings that already had a route, so each would have closed a loop. A tree on 7 buildings has exactly 6 edges, so the algorithm can stop right after it lays the sixth.

Two paths cost 2, and two cost 3. Which of a tie comes first doesn't change the total here, since the tied paths don't compete for the same buildings. In general, ties can lead to different trees with the same total weight.

## The Code

The question "are these two already connected?" is the one [Union-Find](/algorithms/union-find) answers: `union` merges two groups and reports whether it did anything.

```python
def kruskal(n, edges):                       # edges is a list of (u, v, weight)
    groups = UnionFind(n)
    tree = []
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if groups.union(u, v):               # False means u and v were already connected
            tree.append((u, v, w))
            if len(tree) == n - 1:
                break                        # a spanning tree is complete
    return tree
```

The sort puts the edges in order, and the loop turns each `union` into the keep-or-skip decision. If the graph is in several pieces, the loop runs out of edges before it finds V − 1, and what it returns is a **spanning forest**, a minimum one for each piece. On a graph of 10 vertices in 4 pieces, it returned 6 edges, which is V minus the number of components.

We compared it with a brute force check, trying every set of V − 1 edges, on 300 small random graphs of up to 7 vertices, with weights from 1 to 6 so that ties were common. The totals matched on all of them.

## Why Skipping and Keeping Is Right

Take an edge e that the algorithm keeps. It joins two groups, A and B. Every edge cheaper than e has already been looked at, and each of them either was kept, so it is inside a group, or was skipped because its ends were already in one group.

So no edge leaving A is cheaper than e, which makes e the cheapest edge across the split of A from the rest. By the cut rule, it belongs to the minimum spanning tree.

An edge that's skipped has both ends in one group, so the groups' tree already connects them, and the edge is the heaviest on the loop it would close, as the cycle rule says. Both decisions are the rules from the MST article, applied in a good order.

## Maximum Spacing Clusters

Stopping early gives a second use. Say the campus is to be divided into 2 maintenance zones, so that buildings in different zones are as far apart as possible. Run Kruskal on the distances between every pair of buildings, but stop when 2 groups remain instead of 1. The cheapest links, the closest pairs, are merged first, and the leftover groups are separated by the largest gaps.

The map's distances split the campus into the Dorm, Quad, Cafe and Gym on one side, and the Library, Hall and Lab on the other. The two zones' closest buildings are 104.9 map units apart. We tried all 63 ways to split the 7 buildings into 2 groups, and none had a bigger smallest gap between its groups, which matches the 104.9 we got.

With 3 zones, the algorithm gave Dorm, Quad, Cafe and Gym, then the Library, then the Hall and Lab, with a spacing of 104.0, and again the best of all 301 splits.

For a check beyond the campus, we ran 200 random sets of 4 to 9 points with 2 to 4 groups, and compared with all partitions. The spacing from stopping Kruskal early equalled the best on all of them. This is called single link clustering, and it gives the same groups as deleting the longest edges of the MST.

## What It Costs

The sort takes O(E log E), which is O(E log V) since E ≤ V². The loop makes one `union` for each edge looked at, and with Union-Find that costs very little, so the sort sets the bound.

In Python, with the standard library sort running in C and the loop in Python, the loop took longer. We measured on random graphs with 5 edges for each vertex.

| Vertices | Edges | Sort | Loop | Edges Looked At |
| --- | --- | --- | --- | --- |
| 10,000 | 59,999 | 0.01 s | 0.03 s | 79% |
| 100,000 | 599,999 | 0.09 s | 0.24 s | 85% |
| 400,000 | 2,399,999 | 0.45 s | 1.24 s | 98% |

The stop at V − 1 edges saved a little on small graphs and almost nothing on large ones, because the last few buildings are connected only by the expensive edges at the end of the order. The asymptotics still put the sort first, since the loop's cost per edge is nearly constant, while the sort grows faster than the edge count.

The table is a reminder that constants decide which part is bigger at a given size.

Kruskal's algorithm needs all the edges up front to sort them, so it suits a graph held as an edge list. [Prim’s Algorithm](/algorithms/prim) grows one tree from an adjacency list instead, and it is the other standard choice.

## Key Points

- Kruskal's algorithm takes the edges cheapest first and keeps each one that joins two different groups, and Union-Find answers the question in nearly constant time
- A kept edge is the cheapest across the split of its group from the rest, and a skipped edge is the heaviest on the loop it would close
- On the campus it laid 6 paths for a total of 19 and skipped 3, and it matched brute force on 300 random graphs with many ties
- On a graph in several pieces it returns a spanning forest, with V minus the number of components edges
- Stopping with k groups left clusters points with the largest possible gap between groups, matching the best of all splits on 200 random point sets
