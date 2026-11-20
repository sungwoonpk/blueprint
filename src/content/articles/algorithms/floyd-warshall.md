> The **Floyd-Warshall algorithm** computes the shortest distance between every pair of vertices. It builds the answer by allowing one more vertex at a time as a stopover: a route from i to j either skips the new vertex k, or goes from i to k and then from k to j. Three nested loops, with k outermost, take O(V³) time and O(V²) memory, and negative edges are fine.

The facilities office wants the chart you see in the back of a road atlas: for every pair of campus buildings, the fastest walking time. Seven buildings make 49 numbers, and a hundred buildings make ten thousand.

Single source methods give one row of the chart. Here is a method that fills the whole chart at once, from a short idea about stopovers.

## Allowing Stopovers One at a Time

Start with the chart of direct paths: the weight of the edge if there is one, 0 on the diagonal, and ∞ where two buildings aren't joined. The only routes this chart knows have no stopover.

Now allow the Dorm as a stopover. A route from i to j can now go through the Dorm. It's better than the old entry only if the trip i to Dorm plus Dorm to j is shorter. Then allow the Quad too, and the Library, and so on until all the buildings are allowed.

Each time a vertex k is added, there are two kinds of best route from i to j with the stopovers allowed so far: those that don't use k, which the chart already has, and those that do.

A route that uses k is a route from i to k followed by a route from k to j, and neither needs k as a stopover, since a shortest route doesn't repeat a vertex when there's no negative cycle. Both halves are already in the chart. So the update is one comparison:

dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])

Here is the chart for three pairs on the campus map as each building is allowed, in the order Dorm, Quad, Library, Hall, Lab, Cafe, Gym.

| Stopovers Allowed | Dorm to Hall | Gym to Hall | Dorm to Lab |
| --- | --- | --- | --- |
| None | ∞ | ∞ | ∞ |
| Up to Dorm | ∞ | ∞ | ∞ |
| Up to Quad | ∞ | ∞ | ∞ |
| Up to Library | 15 | 23 | 10 |
| Up to Hall | 15 | 23 | 10 |
| Up to Lab | 12 | 20 | 10 |
| Up to Cafe | 12 | 13 | 10 |
| Up to Gym | 12 | 13 | 10 |

Dorm to Hall has no route until the Library is a possible stopover, and then Dorm, Quad, Library, Hall costs 3 + 4 + 8 = 15. When the Lab is allowed, the route through the Lab at 12 takes over. Gym to Hall falls from 23 to 20 with the Lab and then to 13 with the Cafe, since Gym, Cafe, Lab, Hall costs 5 + 6 + 2.

The Gym is itself the last vertex allowed and changes nothing, since no shortest route needs it.

## The Code

```python
INF = float("inf")

def floyd_warshall(n, edges):                # edges is a list of (u, v, weight)
    dist = [[INF] * n for _ in range(n)]
    nxt = [[None] * n for _ in range(n)]     # first step of the best route from i to j
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        if w < dist[u][v]:
            dist[u][v] = w
            nxt[u][v] = v
    for k in range(n):                       # the stopover being added: the OUTER loop
        for i in range(n):
            if dist[i][k] == INF:
                continue                     # i can't reach k, so k can't help
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]
    return dist, nxt

def path(nxt, u, v):
    if u == v:
        return [u]
    if nxt[u][v] is None:
        return None                          # no route
    route = [u]
    while u != v:
        u = nxt[u][v]
        route.append(u)
    return route
```

The `nxt` table stores only the first step of each route. To list the route, take that first step and repeat from there, which is what `path` does. On the campus, the chart comes out as follows, with the buildings numbered as in [Representing Graphs](/algorithms/representing-graphs): Dorm 0, Quad 1, Library 2, Hall 3, Lab 4, Cafe 5 and Gym 6.

| From | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dorm | 0 | 3 | 7 | 12 | 10 | 5 | 8 |
| Quad | 3 | 0 | 4 | 9 | 7 | 2 | 7 |
| Library | 7 | 4 | 0 | 5 | 3 | 6 | 11 |
| Hall | 12 | 9 | 5 | 0 | 2 | 8 | 13 |
| Lab | 10 | 7 | 3 | 2 | 0 | 6 | 11 |
| Cafe | 5 | 2 | 6 | 8 | 6 | 0 | 5 |
| Gym | 8 | 7 | 11 | 13 | 11 | 5 | 0 |

The first row is the list of distances from the Dorm that Dijkstra gave us, and the chart is symmetric because the paths can be walked both ways. For the Dorm and the Hall, `path` gives Dorm, Quad, Library, Lab, Hall.

We tested it on 300 random directed graphs of up to 14 vertices with weights from 1 to 20, against Dijkstra from every source. All 300 charts matched, and each route that `path` returned was a real route with the weight in the chart.

## The Loop Order Is the Algorithm

The loops look interchangeable, and they are not. The stopover k has to be the outer loop, so that when k is added, the chart already holds the best routes with the earlier stopovers for every pair. We put k in the innermost loop, so each pair was handled in turn with k running through all values. On 300 random graphs, the results were wrong on 197.

With k innermost, a pair is settled in one go from entries that the other stopovers haven't improved yet, and it never gets another turn. The order in which the table is filled, k first, is the same idea as a dynamic programming table over subproblems, from [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp).

## Negative Edges and Cycles

Floyd-Warshall doesn't care about the sign of an edge. We ran it on 300 random graphs of up to 12 vertices with weights from −4 to 10 and compared with Bellman-Ford from each source. Wherever the graph had no negative cycle, all the distances matched.

A negative cycle shows up on the diagonal. The distance from a vertex to itself starts at 0, and if it can get below 0, some loop through that vertex has a negative total. In 67 of the 300 graphs, a negative cycle existed according to Bellman-Ford, and a negative number appeared on the diagonal of the chart in exactly those graphs.

When that happens, the other entries are no longer distances: a pair whose routes can pass through the loop has no cheapest route. The diagonal check is the signal to stop.

## What It Costs

The three loops each run V times, so V³ steps, whatever the number of edges. The chart takes V² memory. We timed it against running [Dijkstra’s Algorithm](/algorithms/dijkstra) from every vertex, on directed graphs with weights from 1 to 100.

| Vertices | Edges | Floyd-Warshall | Dijkstra from Each |
| --- | --- | --- | --- |
| 100 | 500 | 0.02 s | 0.00 s |
| 200 | 1,000 | 0.15 s | 0.02 s |
| 400 | 2,000 | 1.24 s | 0.08 s |
| 200 | 20,000 | 0.17 s | 0.12 s |
| 400 | 80,000 | 1.35 s | 1.06 s |

Doubling the vertices multiplied Floyd-Warshall's time by about 8, as V³ predicts. On sparse graphs, repeated Dijkstra won by 15 times at 400 vertices, since each run costs about E log V. On the dense graphs the two were close, and Dijkstra still won. Floyd-Warshall's case is simplicity and negative edges. It is a dozen lines, there's no priority queue, and it treats the weights without any rule.

For sparse graphs with negative edges, there's a method that reweights the edges so that Dijkstra can run from every vertex, known as Johnson’s algorithm, which is faster than Floyd-Warshall on sparse graphs by its running time, though we didn't measure it here.

## Just Who Can Reach Whom

If the chart only needs to say whether a route exists, the same loops work with true and false in place of distances, and each row can be a single integer with one bit for each vertex. Row i learns everything row k can reach whenever i can reach k, one OR instead of a loop over j.

```python
def reachability(n, edges):
    reach = [1 << i for i in range(n)]       # bit j of reach[i]: i can reach j
    for u, v, _ in edges:
        reach[u] |= 1 << v
    for k in range(n):
        for i in range(n):
            if (reach[i] >> k) & 1:
                reach[i] |= reach[k]
    return reach
```

It matched a breadth-first search from every vertex on 300 random directed graphs. On 2,000 vertices and 6,000 edges, it took 0.34 s and the searches took 1.28 s. This is the transitive closure of a graph.

## Choosing a Method

| Need | Method |
| --- | --- |
| One source, non-negative weights | Dijkstra’s algorithm |
| One source, negative weights | Bellman-Ford |
| Every pair, small or dense graph, or negative edges | Floyd-Warshall |
| Every pair, large sparse graph | Dijkstra from every vertex, or Johnson’s algorithm with negative edges |

## Key Points

- Floyd-Warshall allows one more stopover k at a time, and a route from i to j either skips k or is the route i to k followed by k to j, so one comparison updates each cell
- The stopover must be the outer loop, and with it innermost our charts were wrong on 197 of 300 graphs
- It takes O(V³) time and O(V²) memory, about 8 times longer for each doubling of the vertices, and it handles negative edges without change
- A negative number on the diagonal means a negative cycle, which matched Bellman-Ford in all 300 test graphs
- On sparse graphs, running Dijkstra from every vertex was 15 times faster at 400 vertices, while on dense graphs the two were close
