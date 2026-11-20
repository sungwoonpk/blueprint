> A graph is **bipartite** if its vertices can be split into two groups so that every edge joins one group to the other, which is the same as coloring the vertices with two colors so that no edge has two ends of the same color. A graph is bipartite exactly when it has no cycle of odd length, and a breadth-first search decides it in O(V + E).

The registrar has six final exams to place in two sessions, morning and afternoon. Two exams can't share a session if some student takes both. That sentence is a graph problem: courses are vertices, a shared student is an edge, and a valid plan puts the ends of every edge in different sessions.

Sometimes two sessions are enough, and sometimes no schedule can work. The search that tells which is a small change to BFS.

## Two Groups

Our six courses and the shared students.

<figure class="diagram graph">
<svg viewBox="0 0 360 208" role="img" aria-label="Six courses with a line between two courses when a student takes both. Algorithms, Networks and Graphics are on the left, and Databases, Systems and Compilers are on the right, and every line joins a left course to a right one.">
<line class="e" x1="72.0" y1="34.0" x2="288.0" y2="34.0"/>
<line class="e" x1="72.0" y1="34.0" x2="288.0" y2="104.0"/>
<line class="e" x1="72.0" y1="104.0" x2="288.0" y2="34.0"/>
<line class="e" x1="72.0" y1="104.0" x2="288.0" y2="104.0"/>
<line class="e" x1="72.0" y1="174.0" x2="288.0" y2="104.0"/>
<line class="e" x1="72.0" y1="174.0" x2="288.0" y2="174.0"/>
<rect class="n done" x="34" y="20" width="76" height="28" rx="14"/>
<text class="t done" x="72" y="34">Algorithms</text>
<rect class="n done" x="38" y="90" width="68" height="28" rx="14"/>
<text class="t done" x="72" y="104">Networks</text>
<rect class="n done" x="38" y="160" width="68" height="28" rx="14"/>
<text class="t done" x="72" y="174">Graphics</text>
<rect class="n" x="252" y="20" width="72" height="28" rx="14"/>
<text class="t " x="288" y="34">Databases</text>
<rect class="n" x="256" y="90" width="64" height="28" rx="14"/>
<text class="t " x="288" y="104">Systems</text>
<rect class="n" x="252" y="160" width="72" height="28" rx="14"/>
<text class="t " x="288" y="174">Compilers</text>
</svg>
<figcaption>Courses joined when a student takes both. Every line crosses between the morning courses (filled) and the afternoon courses, so two sessions are enough</figcaption>
</figure>

Algorithms, Networks and Graphics can sit in the morning, and Databases, Systems and Compilers in the afternoon. Every line in the picture joins a morning course to an afternoon one, so no student has two exams in a session. A graph with such a split is **bipartite**, from the two groups, and the split is a **two coloring**.

Rather than guessing the split, start anywhere and put it in the morning. Everything it shares a student with must be in the afternoon. Everything that shares a student with those must be in the morning, and so on. Each choice is forced, which is why a breadth-first search fits: it moves outward ring by ring, and the rings alternate.

## Coloring by Rings

```python
from collections import deque

def two_color(adj):                         # adj maps a vertex to its neighbors
    color = {}
    for start in adj:
        if start in color:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in color:
                    color[v] = 1 - color[u]  # the other session
                    queue.append(v)
                elif color[v] == color[u]:
                    return None              # an edge inside one group: impossible
    return color
```

This is the search from [Breadth-First Search](/algorithms/breadth-first-search) with a color in place of the distance. The outer loop handles graphs in several pieces, one start for each component. Each vertex is colored once and each edge checked from both ends, so the time is O(V + E).

On the exam graph it returns Algorithms, Networks and Graphics as 0, and Databases, Systems and Compilers as 1. A color is just the parity of the distance from the start of its search, so the morning courses are the ones at even distances.

We tested it against brute force. For 300 random graphs of up to 12 vertices, we tried all 2ⁿ assignments of two colors and kept any where no edge had equal ends. The search said bipartite on the same 144 graphs that brute force did, and each coloring it returned had two colors on the ends of every edge.

## Where It Breaks

One more student turns up who takes Databases and Systems. They were in the same session, and now they can't be.

<figure class="diagram graph">
<svg viewBox="0 0 360 190" role="img" aria-label="Three courses that pairwise share students. Algorithms is in the morning session and Databases in the afternoon, and Systems shares students with both, so it has no session that works.">
<line class="e" x1="180.0" y1="34.0" x2="80.0" y2="150.0"/>
<line class="e" x1="180.0" y1="34.0" x2="280.0" y2="150.0"/>
<line class="e bad" x1="80.0" y1="150.0" x2="280.0" y2="150.0"/>
<rect class="n done" x="142" y="20" width="76" height="28" rx="14"/>
<text class="t done" x="180" y="34">Algorithms</text>
<rect class="n" x="44" y="136" width="72" height="28" rx="14"/>
<text class="t " x="80" y="150">Databases</text>
<rect class="n bad" x="248" y="136" width="64" height="28" rx="14"/>
<text class="t bad" x="280" y="150">Systems</text>
</svg>
<figcaption>A new student takes Databases and Systems. Algorithms is morning and Databases afternoon, and Systems conflicts with both, so no choice works</figcaption>
</figure>

Algorithms is in the morning, so Databases and Systems both have to be in the afternoon, and now they share a student. No session works for them. The search finds this when it reaches an edge whose two ends already hold the same color. That means the two chains of forced choices met in a contradiction.

The contradiction is a cycle with an odd number of edges, here the triangle of Algorithms, Databases and Systems. Going around an odd cycle, the colors alternate, and after an odd number of steps they would have to arrive back at the same color. They can't.

The reverse is true as well: **a graph is bipartite exactly when it has no odd cycle.** If the search never finds a clash, we have a coloring. If it does, the clash comes from an odd cycle.

The proof follows the rings of the breadth-first search: if an edge joins two vertices of the same ring, their paths back to the common ancestor, plus that edge, make a cycle of odd length, since the two paths have the same length.

We checked the ring rule on 175 random connected graphs: an edge inside a single ring existed exactly when brute force said the graph couldn't be colored.

## Returning the Culprit

A planner would rather be shown the conflict than just told that none exists. When the search finds an edge u to v with equal colors, the cycle is the edge itself plus the two parent chains from u and from v back to the vertex where they meet.

We added parent pointers to the search, and on the extended exam graph it returned the triangle Databases, Algorithms, Systems. On the 156 random graphs that couldn't be colored, each returned cycle had an odd length and used only edges of the graph.

## Familiar Bipartite Graphs

A checkerboard is a bipartite graph. Link each square to the four squares it shares a side with, and the colors are the parity of row plus column. We ran the search on an 8 by 8 grid from [Grids and Implicit Graphs](/algorithms/grids-implicit-graphs), and the colors matched the parity of row plus column on every square.

A knight's move always lands on the other color, and the knight graph of the 8 by 8 board, with 168 edges, also came out bipartite. Adding a single diagonal between two squares of a small grid broke it.

Trees are bipartite, since a tree has no cycles at all. Matching people to jobs, students to labs or riders to drivers, as in [Bipartite Matching](/algorithms/bipartite-matching), works on graphs that are bipartite by construction, with one kind of vertex on each side.

## How Common Is It?

Bipartite graphs get rare fast. We drew 400 random graphs on 1,000 vertices for each average degree and ran the coloring.

| Average Degree | Bipartite |
| --- | --- |
| 0.5 | 393 of 400 |
| 0.8 | 349 of 400 |
| 1.0 | 249 of 400 |
| 1.5 | 0 of 400 |
| 2.0 | 0 of 400 |

At one edge for every two vertices, almost all the graphs were bipartite, because they were mostly trees and tiny pieces. At 1.5 and above, none of the 400 was, since a graph that dense nearly always contains an odd cycle somewhere. A graph that does turn out bipartite is a structural fact about the data, and not something you can expect by chance.

## Key Points

- A graph is bipartite when its vertices split into two groups with every edge between them, which is a two coloring
- A breadth-first search colors by the parity of the distance and fails at an edge whose ends match, in O(V + E)
- A graph is bipartite exactly when it has no odd cycle, and the parent pointers of the search return one when it fails
- Grids and the knight's moves on a chessboard are bipartite, and our search agreed with brute force on 300 random graphs
- Random graphs stopped being bipartite once their average degree passed about 1, 62% bipartite at 1.0 and none of 400 at 1.5
