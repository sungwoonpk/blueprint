> A **graph** is a set of **vertices** (the things) joined by **edges** (the connections between two things). A program stores one as an **adjacency list**, which keeps each vertex's neighbors, or as an **adjacency matrix**, a grid with a cell for every pair of vertices. The choice decides how much memory the graph takes and how fast each question about neighbors is.

A campus map is a graph. The buildings are vertices, the paths between them are edges, and the minutes it takes to walk a path are weights. Ask a graph question, such as how to get from the dorm to the lab, and the answer depends on how you wrote the map down.

This phase uses the same map again and again, so we start by learning to store it.

## What a Graph Holds

Our campus has seven buildings and nine paths. A path that can be walked both ways is an **undirected** edge. A one-way street would be a **directed** edge, drawn as an arrow, as with accounts that follow each other on a social app: A following B doesn't mean B follows A. A number on an edge, like the walking time, is its **weight**.

The **degree** of a vertex is how many edges touch it. The Dorm has degree 2, and the Quad has degree 3. Adding up the degrees of the whole campus gives 18, which is twice the 9 edges, since each edge has two ends. That holds for any undirected graph, and it matters later because it bounds the work of walking all edges.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="A map of seven campus buildings joined by nine paths, each labeled with its walking time in minutes">
<line class="e" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t " x="40" y="108">Dorm</text>
<rect class="n" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t " x="118" y="52">Quad</text>
<rect class="n" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t " x="222" y="38">Library</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t " x="140" y="150">Cafe</text>
<rect class="n" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t " x="66" y="188">Gym</text>
</svg>
<figcaption>The campus as a graph: seven vertices, nine edges, and the walking minutes as weights</figcaption>
</figure>

Seven vertices can have at most 21 edges, which is 7 × 6 / 2 pairs. Ours has 9. A graph with close to the largest possible number of edges, about V² / 2, is **dense**. One with a number of edges closer to V is **sparse**, and many graphs from real life are sparse, since a building doesn't have a path to every other building. The two ways of storing a graph differ most on that point.

## Three Ways to Store It

The plainest way is an **edge list**: one record for each edge.

```python
edges = [("Dorm", "Quad", 3), ("Dorm", "Gym", 8), ("Quad", "Library", 4),
         ("Quad", "Cafe", 2), ("Cafe", "Gym", 5), ("Cafe", "Lab", 6),
         ("Library", "Lab", 3), ("Library", "Hall", 8), ("Lab", "Hall", 2)]
```

It is compact, and it is what files and databases usually hold. But asking "which paths leave the Quad?" means reading every record. Algorithms ask that question over and over, so they use one of two other shapes.

An **adjacency list** keeps, for each vertex, the list of its neighbors and the weights to reach them.

```python
from collections import defaultdict

adj = defaultdict(list)
for u, v, w in edges:
    adj[u].append((v, w))
    adj[v].append((u, w))              # an undirected edge is stored from both ends
```

| Vertex | Neighbors and Minutes |
| --- | --- |
| Dorm | Quad 3, Gym 8 |
| Quad | Dorm 3, Library 4, Cafe 2 |
| Library | Quad 4, Lab 3, Hall 8 |
| Hall | Library 8, Lab 2 |
| Lab | Cafe 6, Library 3, Hall 2 |
| Cafe | Quad 2, Gym 5, Lab 6 |
| Gym | Dorm 8, Cafe 5 |

Eighteen entries are stored, one for each end of each edge. A directed edge is stored once, in the list of the vertex it leaves.

An **adjacency matrix** numbers the vertices from 0 and keeps a V × V grid, where the cell in row u and column v holds the weight of the edge from u to v.

```python
names = ["Dorm", "Quad", "Library", "Hall", "Lab", "Cafe", "Gym"]
index = {name: i for i, name in enumerate(names)}
n = len(names)
INF = float("inf")                     # "no edge" can't be 0 when a weight can be 0
matrix = [[INF] * n for _ in range(n)]
for u, v, w in edges:
    matrix[index[u]][index[v]] = w
    matrix[index[v]][index[u]] = w
```

| From | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dorm | · | 3 | · | · | · | · | 8 |
| Quad | 3 | · | 4 | · | · | 2 | · |
| Library | · | 4 | · | 8 | 3 | · | · |
| Hall | · | · | 8 | · | 2 | · | · |
| Lab | · | · | 3 | 2 | · | 6 | · |
| Cafe | · | 2 | · | · | 6 | · | 5 |
| Gym | 8 | · | · | · | · | 5 | · |

The dots are the empty cells, 31 of 49. We checked that the list and the matrix describe the same campus: for each building, the neighbors and weights read from one matched the other.

## What Each One Costs

Each shape makes a different question cheap. With V vertices and E edges, and deg(u) for the neighbors of u:

| Question | Edge List | Adjacency List | Adjacency Matrix |
| --- | --- | --- | --- |
| Memory | O(E) | O(V + E) | O(V²) |
| Is there an edge from u to v? | O(E) | O(deg(u)) | O(1) |
| Who are the neighbors of u? | O(E) | O(deg(u)) | O(V) |
| Add an edge | O(1) | O(1) | O(1) |
| Visit every edge | O(E) | O(V + E) | O(V²) |

Most graph algorithms spend their time on one question, the neighbors of u, repeated for each vertex. The list answers it in time proportional to the answer. The matrix has to scan a whole row of V cells even when only two of them hold an edge, and on a sparse graph the list wins by a wide margin. The matrix pays off on the other question, whether one given edge exists.

## Measuring the Trade

We built random graphs with 2,000 vertices and three edge counts, each in both shapes, and ran a breadth-first search from one vertex, the traversal of [Breadth-First Search](/algorithms/breadth-first-search). The matrix uses one byte per cell, which is about as small as Python allows.

| Edges | List Memory | Matrix Memory | Search on List | Search on Matrix |
| --- | --- | --- | --- | --- |
| 4,000 | 0.22 MB | 4.1 MB | 0.3 ms | 59 ms |
| 100,000 | 1.9 MB | 4.1 MB | 2.9 ms | 61 ms |
| 500,000 | 8.6 MB | 4.1 MB | 24 ms | 73 ms |

At 4,000 edges, an average of 4 neighbors for each vertex, the matrix takes 19 times the memory and the search runs about 200 times slower, since it checks 4 million cells to find 8,000 neighbor entries. The matrix's memory doesn't change with the number of edges, while the list's grows with it, and in this test the list took more space once the graph passed about a tenth of all possible edges.

Even then the matrix didn't win the search: on a complete graph of 2,000 vertices the list finished in 32 ms and the matrix in 73 ms, because the list holds only the entries that exist.

The matrix's strength showed up in the other question. We asked 200,000 random "is there an edge?" questions on the graph with 500,000 edges.

| Structure | Time for 200,000 Questions |
| --- | --- |
| Adjacency matrix | 8 ms |
| Set of neighbors for each vertex | 29 ms |
| List of neighbors for each vertex | 1,660 ms |

The list has to scan up to a vertex's 500 neighbors for each question. Storing each vertex's neighbors in a set, from [Hash Maps and Hash Sets](/algorithms/hash-maps-sets), keeps the list's behavior on the first question and answers this one in constant time. It costs memory: on the graph with 100,000 edges, sets took 16.8 MB against 1.9 MB for lists, about 9 times as much.

## Choosing One

- **Adjacency list**: the default. Memory grows with the graph itself, and the questions algorithms ask most come back in time proportional to their answers
- **Adjacency matrix**: when V is small enough for V² cells to fit, the graph is dense, or the algorithm asks about arbitrary pairs often, as [Floyd-Warshall for All Pairs](/algorithms/floyd-warshall) does
- **Sets for neighbors**: when the algorithm needs a fast "is there an edge?" and the memory is affordable
- **Edge list**: when the algorithm looks at edges in order, as [Kruskal’s Algorithm](/algorithms/kruskal) does when it sorts them by weight

Two practical notes. Vertex names are usually not the numbers 0 to V − 1, so a dictionary from a name to its neighbors, as above, is often easier than an array. And a matrix of Python lists, a list of lists of references, takes about eight times the memory of our byte rows.

A graph also doesn't have to be stored at all, if the neighbors of a vertex can be computed when needed, such as the squares around a square on a board. [Grids and Implicit Graphs](/algorithms/grids-implicit-graphs) takes that idea up.

## Key Points

- A graph is vertices joined by edges, and it can be directed, weighted, sparse or dense, with the degrees of an undirected graph adding up to twice the number of edges
- An adjacency list keeps each vertex's neighbors in O(V + E) memory, an adjacency matrix keeps a V × V grid in O(V²), and an edge list keeps one record for each edge
- Listing neighbors costs the vertex's degree in a list and V in a matrix, and a search on 2,000 vertices with 4,000 edges took 0.3 ms on the list and 59 ms on the matrix
- The matrix answers "is there an edge?" in constant time, 8 ms for 200,000 questions against 1,660 ms on lists, and a set for each vertex gets near that with 9 times the memory
- Use adjacency lists by default, and a matrix mostly for small, dense graphs or all pairs problems
