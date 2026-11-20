> A **connected component** is a group of vertices that can all reach one another, with no path to the rest of the graph. A **cycle** is a path that returns to where it started. One sweep of BFS or DFS finds the components in O(V + E), and counting edges against vertices and components tells how many independent cycles an undirected graph has.

On Friday the facilities office closes two paths for construction, the Quad to the Library and the Cafe to the Lab. A student at the Dorm wants the Lab. Can they still get there, and how would the answer be computed for a campus with ten thousand buildings?

Two questions hide in the closure: which buildings can still reach each other, and whether any loops are left to walk around.

## Which Buildings Can Still Reach Each Other

After the closure, the Dorm, Quad, Cafe and Gym still connect, and so do the Library, Lab and Hall. Nothing links the two groups.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus with the paths Quad to Library and Cafe to Lab closed. The Dorm, Quad, Cafe and Gym form one component, and the Library, Lab and Hall form another.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e hl" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e bad dash" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e hl" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e bad dash" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n done" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t done" x="40" y="108">Dorm</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="52">Quad</text>
<rect class="n" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t " x="222" y="38">Library</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="150">Cafe</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="188">Gym</text>
</svg>
<figcaption>With two paths closed (red, dashed), the campus falls into two components. The filled buildings can still reach each other, and so can the plain ones, but no path joins the two groups</figcaption>
</figure>

Each group is a **component**: a set of vertices that reach one another and can't reach anything outside the set. In an undirected graph, reaching is mutual, so components split the vertices cleanly, each vertex in exactly one. The graph is **connected** when there is just one component. The answer to the student's question is no, since the Dorm and the Lab are in different components.

The method is a sweep. Visit the vertices in any order, and when one hasn't been reached by an earlier search, start a new search from it and give everything it reaches the next label. The number of searches is the number of components.

```python
from collections import deque

def components(adj):                       # adj maps a vertex to its neighbors
    label = {}
    count = 0
    for start in adj:
        if start in label:
            continue                       # an earlier search already reached it
        label[start] = count
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in label:
                    label[v] = count
                    queue.append(v)
        count += 1
    return label, count
```

Each vertex is labeled once and each adjacency list is read once, so the total is O(V + E), even though there are many searches. A depth-first search labels the same groups.

On the closed campus the function returns 2 components. We also compared it with a method that gives each vertex the smallest label seen among its neighbors until nothing changes, on 300 random graphs of up to 50 vertices, and both produced the same groups every time.

Once the labels exist, "can u reach v?" is a comparison of two numbers, O(1) after one sweep. If paths open and close as time goes on, a structure built for that, like [Union-Find](/algorithms/union-find), keeps the answers up to date without redoing the sweep.

## How Connected Is a Random Graph?

A natural guess is that a graph with few edges falls into a crowd of tiny pieces, and a graph with many edges is one piece. The truth has a sharp turn in the middle.

We made random graphs with 100,000 vertices and a chosen average degree, the average number of edges at a vertex, and measured the share of vertices in the biggest component.

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of 100,000 vertices in the largest component, by average degree: 0.03% at 0.5, 0.09% at 0.8, 1.4% at 1.0, 31% at 1.2, 58% at 1.5, 80% at 2.0 and 94% at 3.0">
<div class="hbar"><span>Degree 0.5</span><span class="track"><span class="fill" style="--w: 0.03%"></span></span><span class="value">0.03%</span></div>
<div class="hbar"><span>Degree 0.8</span><span class="track"><span class="fill" style="--w: 0.09%"></span></span><span class="value">0.09%</span></div>
<div class="hbar"><span>Degree 1.0</span><span class="track"><span class="fill" style="--w: 1.4%"></span></span><span class="value">1.4%</span></div>
<div class="hbar peak"><span>Degree 1.2</span><span class="track"><span class="fill" style="--w: 31.2%"></span></span><span class="value">31.2%</span></div>
<div class="hbar"><span>Degree 1.5</span><span class="track"><span class="fill" style="--w: 57.8%"></span></span><span class="value">57.8%</span></div>
<div class="hbar"><span>Degree 2.0</span><span class="track"><span class="fill" style="--w: 79.5%"></span></span><span class="value">79.5%</span></div>
<div class="hbar"><span>Degree 3.0</span><span class="track"><span class="fill" style="--w: 94.0%"></span></span><span class="value">94%</span></div>
</div>
<figcaption>Share of the vertices in the largest component, in random graphs of 100,000 vertices with a given average degree</figcaption>
</figure>

At an average degree of 0.5 the largest piece held 26 vertices, 0.03% of the graph. At 1.0 it held 1.4% of them. Then it jumped: at 1.2, almost a third of all vertices were in one component, and at 3.0, 94%. Erdős and Rényi showed this turn in 1960. A **giant component** appears once the average degree passes 1, and its share S satisfies S = 1 − e<sup>−cS</sup> for average degree c.

We solved that equation for each c and compared. The values were 0.314 against our 0.312 at 1.2, 0.583 against 0.578 at 1.5, 0.797 against 0.795 at 2.0, and 0.940 against 0.940 at 3.0.

Real graphs aren't random, so their numbers differ, but the model shows a useful shape: a few more connections can join many small groups into one. A search from a vertex may reach very little of the graph or most of it, depending on which side of the turn the graph is on.

## Cycles in an Undirected Graph

Go back to the closed campus. The Dorm, Quad, Cafe and Gym form a loop of 4 paths, and the Library, Lab and Hall form a loop of 3. Each component has one cycle. A component with no loops, a tree, has exactly one fewer edge than vertices, since a tree on k vertices has k − 1 edges.

That gives a counting rule. A graph with no cycles, a **forest**, with V vertices and C components has V − C edges. Every edge beyond that closes a cycle. So the graph has a cycle exactly when E > V − C, and E − V + C counts how many independent loops it has.

The closed campus has 7 edges, 7 vertices and 2 components, so 7 − 7 + 2 = 2 loops, matching the picture. The full campus, with 9 edges and 1 component, has 9 − 7 + 1 = 3. That's the three back edges from the depth-first search in [Depth-First Search](/algorithms/depth-first-search).

A search finds a cycle without counting. In a depth-first search of an undirected graph, an edge to an already seen vertex, other than the one we came from, is a back edge, and every back edge closes a cycle.

```python
def has_cycle(adj):                          # simple undirected graph: no repeated edges
    seen = set()
    for start in adj:
        if start in seen:
            continue
        seen.add(start)
        stack = [(start, None, iter(adj[start]))]
        while stack:
            u, parent, neighbors = stack[-1]
            for v in neighbors:
                if v == parent:
                    continue                 # the edge we just came along
                if v in seen:
                    return True              # a back edge: a cycle
                seen.add(v)
                stack.append((v, u, iter(adj[v])))
                break
            else:
                stack.pop()
    return False
```

The skip over `parent` matters. Each undirected edge appears in both lists, so without it the search would see its own way back as a cycle. If two roads can join the same pair of buildings, the check needs the edge identity and not the vertex, because the second road is a cycle of length 2.

On 300 random graphs of up to 40 vertices, the counting rule and the search agreed every time, and 131 of the graphs had cycles. Counting needs the components first, which is another O(V + E) sweep.

## Cycles in a Directed Graph

With one way edges, the counting rule doesn't apply: two directed graphs with the same numbers of vertices and edges can differ on whether they have a cycle. And a back edge isn't just an edge to a seen vertex, since a vertex seen in an earlier branch isn't on the way back. The cycle must be a path of arrows that returns.

Think of threads and locks. T1 waits for the lock held by T2, T2 waits for T3, T3 for T4, and T4 for T2. An arrow from a thread to the thread it waits for makes a wait-for graph.

<figure class="diagram graph">
<svg viewBox="0 0 360 164" role="img" aria-label="Five threads, with an arrow from each thread to the one whose lock it waits for. T1 waits for T2 and T5, T2 waits for T3, T3 waits for T4, and T4 waits for T2, so T2, T3 and T4 wait for each other in a cycle.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="71.0" y1="67.0" x2="115.0" y2="76.6" marker-end="url(#ah)"/>
<line class="e" x1="48.0" y1="77.0" x2="48.0" y2="111.0" marker-end="url(#ah)"/>
<line class="e bad" x1="163.0" y1="72.0" x2="225.0" y2="44.9" marker-end="url(#ah-bad)"/>
<line class="e bad" x1="250.0" y1="49.0" x2="250.0" y2="113.0" marker-end="url(#ah-bad)"/>
<line class="e bad" x1="227.0" y1="120.0" x2="165.0" y2="92.9" marker-end="url(#ah-bad)"/>
<rect class="n" x="26" y="48" width="44" height="28" rx="14"/>
<text class="t " x="48" y="62">T1</text>
<rect class="n" x="26" y="114" width="44" height="28" rx="14"/>
<text class="t " x="48" y="128">T5</text>
<rect class="n bad" x="118" y="68" width="44" height="28" rx="14"/>
<text class="t bad" x="140" y="82">T2</text>
<rect class="n bad" x="228" y="20" width="44" height="28" rx="14"/>
<text class="t bad" x="250" y="34">T3</text>
<rect class="n bad" x="228" y="116" width="44" height="28" rx="14"/>
<text class="t bad" x="250" y="130">T4</text>
</svg>
<figcaption>A wait-for graph, with an arrow from a thread to the thread holding the lock it needs. The red cycle is a deadlock: none of T2, T3 and T4 can proceed</figcaption>
</figure>

A cycle in this graph is a **deadlock**: each thread in it waits for another in it, and none can proceed. Finding one is exactly cycle detection in a directed graph. The search keeps three states for a vertex, not seen, on the current path, and finished. An edge to a vertex on the current path closes a cycle.

```python
def find_cycle(g):                           # g maps a vertex to the vertices it points to
    WHITE, GRAY, BLACK = 0, 1, 2             # not seen, on the current path, finished
    color = {u: WHITE for u in g}
    parent = {}
    for start in g:
        if color[start] != WHITE:
            continue
        color[start] = GRAY
        stack = [(start, iter(g[start]))]
        while stack:
            u, neighbors = stack[-1]
            for v in neighbors:
                if color[v] == WHITE:
                    color[v] = GRAY
                    parent[v] = u
                    stack.append((v, iter(g[v])))
                    break
                if color[v] == GRAY:         # an arrow back onto the current path
                    cycle = [u]
                    while cycle[-1] != v:
                        cycle.append(parent[cycle[-1]])
                    return cycle[::-1]
            else:
                color[u] = BLACK
                stack.pop()
    return None
```

On the wait-for graph it returns T2, T3, T4. Without the arrow T4 to T2 it returns `None`, and the threads can run in some order. This is the active and finished distinction from the edge types in [Depth-First Search](/algorithms/depth-first-search): a back edge points to an active vertex, while an edge to a finished vertex only means that another branch explored it first, and it can't close a cycle.

We tested it on 300 random directed graphs of up to 30 vertices. It agreed with an independent check, which keeps removing vertices that have no outgoing arrows until none are left, on whether a cycle exists. Each of the 142 cycles it returned was a real chain of arrows closing on itself.

The time is O(V + E). The same three states also make a graph with no cycles into something useful, which [Topological Sort](/algorithms/topological-sort) turns into an order.

## Key Points

- A component is a set of vertices that reach each other and nothing else, and a sweep of searches finds all of them in O(V + E), one label per search
- In random graphs of 100,000 vertices the largest component held 1.4% at average degree 1.0 and 31% at 1.2, matching the Erdős and Rényi equation S = 1 − e<sup>−cS</sup>
- An undirected graph has E − V + C independent cycles, so it is a forest exactly when E = V − C, and a search finds one through an edge to a seen vertex other than the parent
- A directed graph needs three states, and an arrow to a vertex on the current path closes a cycle, as with threads that wait in a ring
- Both checks cost O(V + E), and each agreed with an independent method on 300 random graphs
