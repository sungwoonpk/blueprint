> **Depth-first search** (DFS) explores a graph by following one path as far as it goes, then backing up to the last place with an unvisited choice and trying that. Recursion, or a stack, remembers where to back up to. It takes O(V + E) time, and the order in which vertices start and finish exposes a graph's cycles and structure.

Explore a building with a ball of string tied to the front door. At each junction you take a hallway you haven't tried, unrolling string as you go. At a dead end, or at a junction whose hallways have all been tried, you roll the string back to the previous junction and take its next hallway. When the string is back at the door, every room you could reach has been seen.

That is depth-first search, and the string is the recursion stack.

## Going as Deep as You Can

Start at the Dorm, and take neighbors in the order of the adjacency list from [Representing Graphs](/algorithms/representing-graphs). The Dorm's first neighbor is the Quad. From the Quad the first unseen one is the Library, then the Lab, then the Cafe, then the Gym.

The Gym's neighbors are the Dorm and the Cafe, both seen, so the search backs up. The Cafe has nothing new, so it backs up again to the Lab, whose next neighbor, the Hall, is new. The order of discovery is Dorm, Quad, Library, Lab, Cafe, Gym, Hall.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus searched depth first from the Dorm. The visit order is Dorm 1, Quad 2, Library 3, Lab 4, Cafe 5, Gym 6, Hall 7. Six edges form the search tree, and three dashed edges are left out.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<line class="e dash" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<line class="e dash" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<line class="e dash" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<line class="e dash" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<line class="e hl" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<rect class="n hl" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t hl" x="40" y="105">Dorm</text>
<text class="s" x="40" y="117">1</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="49">Quad</text>
<text class="s" x="118" y="61">2</text>
<rect class="n done" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t done" x="222" y="35">Library</text>
<text class="s" x="222" y="47">3</text>
<rect class="n done" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t done" x="318" y="75">Hall</text>
<text class="s" x="318" y="87">7</text>
<rect class="n done" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t done" x="258" y="137">Lab</text>
<text class="s" x="258" y="149">4</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="147">Cafe</text>
<text class="s" x="140" y="159">5</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="185">Gym</text>
<text class="s" x="66" y="197">6</text>
</svg>
<figcaption>Depth-first search from the Dorm. The small number is the order of discovery, the bright edges are the search tree, and the dashed edges lead back to a building already seen</figcaption>
</figure>

The bright edges are the search tree, the edges by which each building was first reached. Compare it with the tree from [Breadth-First Search](/algorithms/breadth-first-search). That tree was short and wide, and this one is a long chain that forks only at the end. The Gym is next door to the Dorm, but the search reached it at depth 5, through the Cafe, because it dived deep first.

So the paths in a depth-first tree are valid but not short. DFS isn't the tool for fewest edges. It is the tool for what its order tells us.

## Recursion Does the Remembering

The method is a function that visits a vertex, calls itself on each unseen neighbor, and returns when none is left. The return is the string rolling back. To record the order, we add a clock that ticks when a visit starts and again when it finishes.

```python
def dfs_all(adj):
    pre, post, parent = {}, {}, {}
    clock = 0
    def visit(u):
        nonlocal clock
        clock += 1; pre[u] = clock            # the visit starts
        for v, _ in adj[u]:
            if v not in pre:
                parent[v] = u
                visit(v)
        clock += 1; post[u] = clock           # the visit finishes
    for u in list(adj):                       # restart for each unseen vertex
        if u not in pre:
            parent[u] = None
            visit(u)
    return pre, post, parent
```

The outer loop makes it work on a graph in several pieces: when one search ends, the next starts at any vertex not yet seen. The result is a forest, with one tree for each piece. Each vertex is visited once and each list is read once, so the time is O(V + E).

## Start and Finish Times

On the campus, the clock gives the Dorm the interval 1 to 14, the Quad 2 to 13, and so on down to the Gym at 6 to 7 and the Hall at 9 to 10.

<figure class="chart">
<div class="waterfall" role="img" aria-label="Each building is a bar from its start time to its finish time. The bar of a building lies inside the bar of the building that discovered it, from the Dorm, 1 to 14, down to the Gym, 6 to 7, and the Hall, 9 to 10.">
<div class="wf"><span>Dorm</span><span class="track"><span class="bar" style="--s: 0.0%; --w: 100.0%"></span></span><span class="value">1 to 14</span></div>
<div class="wf"><span>Quad</span><span class="track"><span class="bar" style="--s: 7.1%; --w: 85.7%"></span></span><span class="value">2 to 13</span></div>
<div class="wf"><span>Library</span><span class="track"><span class="bar" style="--s: 14.3%; --w: 71.4%"></span></span><span class="value">3 to 12</span></div>
<div class="wf"><span>Lab</span><span class="track"><span class="bar" style="--s: 21.4%; --w: 57.1%"></span></span><span class="value">4 to 11</span></div>
<div class="wf"><span>Cafe</span><span class="track"><span class="bar" style="--s: 28.6%; --w: 28.6%"></span></span><span class="value">5 to 8</span></div>
<div class="wf"><span>Gym</span><span class="track"><span class="bar" style="--s: 35.7%; --w: 14.3%"></span></span><span class="value">6 to 7</span></div>
<div class="wf"><span>Hall</span><span class="track"><span class="bar" style="--s: 57.1%; --w: 14.3%"></span></span><span class="value">9 to 10</span></div>
</div>
<figcaption>The active interval of each building, from the moment its visit starts to the moment it finishes. Each interval sits inside its parent's</figcaption>
</figure>

Look at the shape. Every interval sits inside its parent's, and two intervals that don't nest never overlap: the Gym finishes at 7, before the Hall starts at 9. A vertex is **active** between its start and its finish, and the active vertices at any moment are the chain from the root to the current vertex. That chain is the call stack, the string in the building.

We checked this on 300 random directed graphs. For every pair of vertices the two intervals were either nested or disjoint, never crossing. This nesting is what later lets DFS find cycles, order tasks and split a graph into strongly connected pieces.

## Four Kinds of Edges

Every edge u to v is looked at when u is being visited, and what it means depends on the state of v at that moment.

| State of v | Edge Type | What It Means |
| --- | --- | --- |
| New | Tree | v is found through u and joins the search tree |
| Active | Back | v is an ancestor of u, so the edge closes a cycle |
| Finished, started after u | Forward | v is a descendant of u, reached by another route |
| Finished, started before u | Cross | v is in a part of the search that is already complete |

```python
def classify_edges(g):                        # g maps a vertex to its out-neighbors
    status, kinds, pre, clock = {}, {}, {}, 0
    def visit(u):
        nonlocal clock
        status[u] = "active"; clock += 1; pre[u] = clock
        for v in g[u]:
            if v not in status:
                kinds[(u, v)] = "tree"; visit(v)
            elif status[v] == "active":
                kinds[(u, v)] = "back"
            else:
                kinds[(u, v)] = "forward" if pre[v] > pre[u] else "cross"
        status[u] = "finished"
    for u in g:
        if u not in status:
            visit(u)
    return kinds
```

On 300 random directed graphs, 8,988 edges in all, each kind matched its interval pattern: tree and forward edges have v inside u, back edges have u inside v, and cross edges have v finish before u starts. A fourth ordering, u finishing before v starts, is impossible, and none of our graphs showed one, which is why there are only four kinds.

In an undirected graph, the picture is simpler, because there are no cross edges. A vertex that finished before u started would have found u through their shared edge and made it a descendant. So each edge joins a vertex to one of its ancestors, and we verified that on 300 random undirected graphs. The edges that aren't in the tree are back edges, seen from their lower end.

On the campus, the three dashed edges are back edges: the Gym to the Dorm, the Cafe to the Quad, and the Hall to the Library. Each one closes a loop, such as Quad, Library, Lab, Cafe and back to the Quad.

A graph with V vertices in one piece has V − 1 tree edges, so the other E − V + 1 edges, three here, are all back edges, and each is a cycle. [Connected Components and Cycles](/algorithms/components-cycles) builds on this.

## How Deep Is Deep?

The depth of the string is the depth of the recursion, and that is where DFS can hurt. On a random graph with 100,000 vertices and 500,000 edges, the longest BFS path had 7 edges, while the depth-first tree went 83,423 levels deep. A search that dives follows long chains because it takes the first neighbor it sees.

Python allows a recursion depth of 1,000 by default. A graph that is one long path of 1,000 vertices crashed our recursive version with a `RecursionError`. Raising the limit helps for a while, since a path of 50,000 worked with a higher limit, but a deep recursion is still a risk, as [The Call Stack and Recursion Depth](/algorithms/call-stack) explains.

The fix is to hold the string yourself. Keep a stack of vertices together with an iterator over each one's neighbors, so that a vertex can pick up where it left off after the search backs up to it.

```python
def dfs_iter(adj, start):
    seen = {start}
    order = [start]
    stack = [(start, iter(adj[start]))]
    while stack:
        u, neighbors = stack[-1]
        for v, _ in neighbors:                # resumes after the last neighbor taken
            if v not in seen:
                seen.add(v)
                order.append(v)
                stack.append((v, iter(adj[v])))
                break
        else:                                 # no unseen neighbor is left: back up
            stack.pop()
    return order
```

It visits vertices in the same order as the recursion. We compared them on 300 random graphs and the orders were identical, and on the campus both give the order above. A simpler loop that pushes all neighbors of a vertex onto a stack at once also visits every reachable vertex, but it visits them in a different order, and it gives no finish times without extra bookkeeping, so it isn't a stand-in when the order matters.

## Picking BFS or DFS

Both take O(V + E) and both reach exactly the vertices that can be reached. They differ in what they report.

| Need | Reach for |
| --- | --- |
| Fewest edges to a target | BFS |
| Cycles, ordering, and nested structure | DFS |
| Memory on a wide graph | DFS, whose stack follows one path |
| Memory on a deep graph | BFS, whose queue holds one ring |

The memory rows are opposites: on the tree of 2 million vertices from the BFS article, the queue held a million entries and the stack 21, and on a long chain the stack holds the whole chain while a queue holds one vertex.

## Key Points

- DFS follows one path as far as it goes and then backs up, and recursion or a stack remembers where, in O(V + E) time
- A clock that ticks at each start and finish gives intervals that nest or are disjoint, and the active vertices are the call stack
- An edge to a new vertex is a tree edge, to an active vertex a back edge, and the rest are forward or cross edges, with only tree and back edges in an undirected graph
- Each back edge closes a cycle, and a connected graph has E − V + 1 of them, 3 on the campus
- Depth-first trees are deep, 83,423 levels against 7 for BFS on one random graph, so a recursive version hits Python's limit of 1,000, and an explicit stack of iterators avoids it
