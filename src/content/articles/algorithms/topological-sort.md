> A **topological order** lists the vertices of a directed graph so that every edge points forward, from an earlier vertex to a later one. One exists exactly when the graph has no cycle, which makes it a directed acyclic graph, or **DAG**. Two methods build one in O(V + E): repeatedly take a vertex with no unmet prerequisites, or reverse the order in which a depth-first search finishes its vertices.

Course registration is a graph problem in disguise. Algorithms needs Discrete Math and Data Structures, Data Structures needs Intro, and so on, and you need to know which courses to take when. The question is how to line up the courses so that each one comes after everything it needs.

## Prerequisites as a Graph

Eight courses, with an arrow from each prerequisite to the course that needs it.

<figure class="diagram graph">
<svg viewBox="0 0 360 250" role="img" aria-label="Eight courses with arrows from each prerequisite to the course that needs it. Intro leads to Structures and Organization. Discrete and Structures lead to Algorithms. Structures leads to Databases and Systems. Organization leads to Systems. Algorithms and Systems lead to Compilers.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="216.5" y1="41.0" x2="172.2" y2="75.0" marker-end="url(#ah)"/>
<line class="e" x1="250.5" y1="41.0" x2="283.5" y2="75.0" marker-end="url(#ah)"/>
<line class="e" x1="60.2" y1="41.0" x2="61.7" y2="141.0" marker-end="url(#ah)"/>
<line class="e" x1="130.0" y1="107.0" x2="84.7" y2="141.0" marker-end="url(#ah)"/>
<line class="e" x1="155.0" y1="107.0" x2="166.3" y2="141.0" marker-end="url(#ah)"/>
<line class="e" x1="181.4" y1="107.0" x2="255.0" y2="142.2" marker-end="url(#ah)"/>
<line class="e" x1="297.3" y1="107.0" x2="291.1" y2="141.0" marker-end="url(#ah)"/>
<line class="e" x1="86.1" y1="173.0" x2="140.7" y2="207.0" marker-end="url(#ah)"/>
<line class="e" x1="260.7" y1="173.0" x2="198.9" y2="207.0" marker-end="url(#ah)"/>
<rect class="n" x="28" y="12" width="64" height="28" rx="14"/>
<text class="t " x="60" y="26">Discrete</text>
<rect class="n" x="212" y="12" width="48" height="28" rx="14"/>
<text class="t " x="236" y="26">Intro</text>
<rect class="n" x="114" y="78" width="72" height="28" rx="14"/>
<text class="t " x="150" y="92">Structures</text>
<rect class="n" x="256" y="78" width="88" height="28" rx="14"/>
<text class="t " x="300" y="92">Organization</text>
<rect class="n" x="26" y="144" width="72" height="28" rx="14"/>
<text class="t " x="62" y="158">Algorithms</text>
<rect class="n" x="136" y="144" width="72" height="28" rx="14"/>
<text class="t " x="172" y="158">Databases</text>
<rect class="n" x="258" y="144" width="60" height="28" rx="14"/>
<text class="t " x="288" y="158">Systems</text>
<rect class="n" x="132" y="210" width="72" height="28" rx="14"/>
<text class="t " x="168" y="224">Compilers</text>
</svg>
<figcaption>Course prerequisites as a directed graph. An arrow from A to B means A must be taken before B</figcaption>
</figure>

An arrow from A to B says that A comes first. A **topological order** is a line-up of all the courses where every arrow points to the right. It can exist only if there are no cycles, since a cycle of prerequisites would need each course before itself. A directed graph with no cycle is a **DAG**, and every DAG has at least one topological order.

There is usually more than one. We counted by brute force, trying each of the 40,320 ways to arrange 8 courses and keeping those where all 9 arrows point forward. There are 105 valid orders. Any of them is a legal way to take the courses, and the methods below find one.

## Take What Is Ready

The first method matches how you'd plan by hand. A course with no prerequisites can be taken now: Intro and Discrete here. Take one, cross it off, and see whether any other course has had all its prerequisites crossed off. Repeat until the list is empty.

To do that fast, store for each course the count of prerequisites not yet crossed off, its **indegree**. A course with indegree 0 is ready. Taking a course lowers the indegree of each course it points to by one, and any that reach 0 join the queue of ready courses. This is **Kahn's algorithm**.

```python
from collections import deque

def topological_order(g):                  # g maps a vertex to the vertices it points to
    indeg = {u: 0 for u in g}
    for u in g:
        for v in g[u]:
            indeg[v] += 1
    ready = deque(u for u in g if indeg[u] == 0)
    order = []
    while ready:
        u = ready.popleft()
        order.append(u)
        for v in g[u]:
            indeg[v] -= 1                  # one prerequisite of v is done
            if indeg[v] == 0:
                ready.append(v)
    return order if len(order) == len(g) else None      # None means a cycle
```

On the courses, it goes like this.

| Step | Take | Newly Ready | Ready Afterwards |
| --- | --- | --- | --- |
| 1 | Intro | Structures, Organization | Discrete, Structures, Organization |
| 2 | Discrete | None | Structures, Organization |
| 3 | Structures | Algorithms, Databases | Organization, Algorithms, Databases |
| 4 | Organization | Systems | Algorithms, Databases, Systems |
| 5 | Algorithms | None | Databases, Systems |
| 6 | Databases | None | Systems |
| 7 | Systems | Compilers | Compilers |
| 8 | Compilers | None | Empty |

The order is Intro, Discrete, Structures, Organization, Algorithms, Databases, Systems, Compilers. At step 2, Discrete leaves Algorithms still waiting for Structures, so it isn't ready yet. Each vertex enters the queue once and each arrow is used once, so the time is O(V + E).

## Reading the Rounds as Semesters

Group the courses by when they become ready, taking everything ready at once. Round 1 is Intro and Discrete. Round 2 is Structures and Organization, once Intro is done. Round 3 is Algorithms, Databases and Systems, and round 4 is Compilers.

| Semester | Courses |
| --- | --- |
| 1 | Intro, Discrete |
| 2 | Structures, Organization |
| 3 | Algorithms, Databases, Systems |
| 4 | Compilers |

With no limit on how many courses you can take at once, four semesters is the fewest possible, since Intro, Structures, Algorithms and Compilers form a chain of 4 courses that must be taken one after another.

The number of rounds equals the number of vertices on the longest chain of arrows, and that is the same idea as the critical path in project planning: the longest chain sets the minimum time, and courses off the chain have slack.

## Run a Search and Reverse It

The second method needs no counters. Run a depth-first search and record each vertex when it finishes, the finish times of [Depth-First Search](/algorithms/depth-first-search). Reverse that list.

```python
def topological_order_dfs(g):
    state, finished = {}, []
    for start in g:
        if start in state:
            continue
        state[start] = "active"
        stack = [(start, iter(g[start]))]
        while stack:
            u, neighbors = stack[-1]
            for v in neighbors:
                if v not in state:
                    state[v] = "active"
                    stack.append((v, iter(g[v])))
                    break
                if state[v] == "active":
                    return None            # an arrow back onto the path: a cycle
            else:
                state[u] = "done"
                finished.append(u)         # u finishes after all it points to
                stack.pop()
    return finished[::-1]
```

Why it works: when the search follows the arrow u to v, either v is new, and then v finishes before u does, since it's explored inside u's visit, or v had already finished. Either way v finishes first. In a DAG, no arrow points to an active vertex, because that would be a cycle. So for every arrow, the head finishes before the tail, and reversing the finish order puts the tail first.

On the courses it gives Discrete, Intro, Organization, Structures, Systems, Databases, Algorithms, Compilers. That differs from the first answer and is just as valid, and each arrow points to the right.

Both methods agreed with a direct check on 300 random DAGs of up to 30 vertices, where we confirmed that every arrow goes from an earlier to a later position. On 300 random directed graphs, both methods also reported a cycle exactly when a separate cycle check did, and 153 of them had one.

## When the Prerequisites Loop

Suppose the registrar adds a rule that Systems requires Compilers, while Compilers still requires Systems. Run the first method. It takes Intro, Discrete, Structures, Organization, Algorithms and Databases, and then the queue is empty with two courses left over, Systems and Compilers. Each is waiting for the other.

That is why the function checks the length of the order. If fewer than all the vertices came out, the rest lie on cycles or depend on one, and the method has found a cycle as a by-product, without a separate pass. The depth-first version signals the same case through its `active` check.

## Which to Use

| Need | Method |
| --- | --- |
| Rounds, or the earliest step for each vertex | Kahn's, which already works in rounds |
| An order with a rule for ties, such as alphabetical | Kahn's with a min-heap instead of a queue |
| The finish structure of a search, as in strongly connected components | The depth-first version |
| The simplest code when the graph is already known to be acyclic | The depth-first version |

For the tie rule, swapping the queue for a heap from [Heaps and Priority Queues](/algorithms/heaps) always takes the smallest ready vertex, at O((V + E) log V).

We timed both on a random DAG of 500,000 vertices and about 500,000 arrows. Kahn's took 0.57 s and the depth-first version 0.34 s. Both are linear, and which is faster in practice depends on the language and the graph.

The same task shows up beyond courses. A build tool compiles each file after the files it imports, a spreadsheet recalculates a cell after the cells in its formula, and a package manager installs a library after its dependencies. When these tools report a circular dependency, a cycle was found the way described here.

## Key Points

- A topological order puts every edge pointing forward, and it exists exactly when the directed graph has no cycle, usually in many versions, 105 for our eight courses
- Kahn's algorithm keeps the indegree of each vertex and a queue of ready vertices, and takes O(V + E)
- The rounds of Kahn's algorithm are the semesters, and their number equals the longest chain, which sets the minimum time
- Reversing the finish order of a depth-first search also works, since the head of every arrow finishes before its tail in a DAG
- If fewer vertices come out than exist, the rest are stuck on a cycle, so both methods double as cycle detectors
