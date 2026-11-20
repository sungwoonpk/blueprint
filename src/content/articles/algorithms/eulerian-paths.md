> An **Eulerian path** walks along every edge of a graph exactly once, and an **Eulerian circuit** does so and ends where it began. Such a walk exists exactly when the edges are all in one connected piece and the number of vertices with an odd degree is 0, for a circuit, or 2, for a path that starts at one of them and ends at the other. Hierholzer’s method builds the walk in O(E) time.

The groundskeeper has to inspect every path on campus once, no more and no less, and would like to do it in one walk without retracing a step. Can it be done?

Leonhard Euler asked the same kind of question in 1736 about the seven bridges of Königsberg, and his answer is often called the first theorem of graph theory. Euler showed that the degree condition is necessary, and the first complete proof that it is enough came from Hierholzer in 1873. It's also a rare case of a route question that is easy to settle.

## Counting at Each Building

Count the paths that meet at each building.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus map with each building's number of paths under its name: Dorm 2, Quad 3, Library 3, Hall 2, Lab 3, Cafe 3, Gym 2. The four buildings with 3 paths are marked.">
<line class="e" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<line class="e" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<line class="e" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<line class="e" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<line class="e" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<line class="e" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<line class="e" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<rect class="n" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t " x="40" y="103">Dorm</text>
<text class="s" x="40" y="115">2</text>
<rect class="n bad" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t bad" x="118" y="47">Quad</text>
<text class="s" x="118" y="59">3</text>
<rect class="n bad" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t bad" x="222" y="33">Library</text>
<text class="s" x="222" y="45">3</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="73">Hall</text>
<text class="s" x="318" y="85">2</text>
<rect class="n bad" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t bad" x="258" y="135">Lab</text>
<text class="s" x="258" y="147">3</text>
<rect class="n bad" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t bad" x="140" y="145">Cafe</text>
<text class="s" x="140" y="157">3</text>
<rect class="n" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t " x="66" y="183">Gym</text>
<text class="s" x="66" y="195">2</text>
</svg>
<figcaption>How many paths meet at each building. The four buildings with an odd number, marked in red, are the trouble for a walk that uses each path exactly once</figcaption>
</figure>

The Dorm, Hall and Gym have two paths, and the Quad, Library, Lab and Cafe have three. Take any walk that uses each path once. Each time it passes through a building, it arrives on one path and leaves on another, so passing through uses up the building's paths in pairs.

Only the first and last buildings of the walk can have a single path left over, one at the start and one at the end.

So in a walk through every edge, every building has an even degree, except the start and the end, which have an odd degree if they are different buildings. A walk that ends where it started leaves nobody odd.

The campus has four odd buildings, and a walk can have at most two. The groundskeeper can't do it, and no search is needed to know. We confirmed the claim another way, by trying all walks on 283 small random graphs. A graph had a walk through each edge exactly once if and only if its odd count was 0 or 2 and its edges were all connected, in all 283 cases.

## Fixing the Campus

The rule suggests the repair: change which buildings are odd. A new path from the Quad to the Lab makes both of them even, since each gains one path. That leaves the Library and the Cafe as the only odd buildings, so a walk exists, and it has to begin at one of them and end at the other.

A second new path, between the Library and the Cafe, makes all seven buildings even, and then the walk can be a circuit starting anywhere. Both claims worked in practice. With the first path added, the walk below runs from the Library to the Cafe, along 10 paths.

Library, Hall, Lab, Quad, Cafe, Lab, Library, Quad, Dorm, Gym, Cafe

With both added, a circuit of 11 paths from the Dorm back to the Dorm exists.

Dorm, Gym, Cafe, Library, Hall, Lab, Quad, Cafe, Lab, Library, Quad, Dorm

## Building the Walk

The rule says a walk exists, but not how to find it. The obvious attempt, to walk until stuck, fails by itself, since it might get stuck early with paths unused. Take an all-even graph. Whenever you enter a building other than the start, you used an odd number of its paths so far, so one is left to leave by.

So the walk can only get stuck back at the start, having completed a loop. If paths remain unused and the paths are all connected, some building on the loop still has some, and a second loop can start there, which can be spliced in.

Hierholzer’s method does the splicing with a stack. Walk along unused edges and push each building on the stack. When the current building has no unused path, it is final: move it to the answer, and back up one. The walk resumes from the previous building if it still has unused paths, which begins the next loop, and the loops fit together on their own.

```python
from collections import defaultdict

def euler_trail(edges):                       # edges is a list of (u, v), repeats allowed
    adj = defaultdict(list)
    for i, (u, v) in enumerate(edges):
        adj[u].append((v, i))
        adj[v].append((u, i))
    odd = [u for u in adj if len(adj[u]) % 2]
    if len(odd) not in (0, 2):
        return None                           # too many odd vertices
    start = odd[0] if odd else next(iter(adj))
    used = [False] * len(edges)
    stack, trail = [start], []
    while stack:
        u = stack[-1]
        while adj[u] and used[adj[u][-1][1]]:
            adj[u].pop()                      # forget edges used from the other end
        if adj[u]:
            v, i = adj[u].pop()
            used[i] = True
            stack.append(v)                   # keep walking
        else:
            trail.append(stack.pop())         # stuck: u is final
    if len(trail) != len(edges) + 1:
        return None                           # some edges were not connected to the walk
    return trail[::-1]
```

Each edge is used once and each adjacency entry is dropped once, so the time is O(E). The two edge checks at the end handle a graph in several pieces: if the walk used fewer than E edges, some of them were out of reach.

We compared it with a brute force search over all walks on 283 random multigraphs of up to 7 vertices and 9 edges. It found a walk exactly when one exists, and every walk it returned used each edge once, with consecutive edges meeting at a building.

## A Sequence Containing Every Code

A directed graph has the same rule with arrows. A walk using every arrow once exists when each vertex has as many arrows leaving as entering, and the arrows are connected. The same stack method works, following arrows.

Here is a neat use. Build a graph whose vertices are the (n − 1)-bit strings. For each (n − 1)-bit string s and each bit b, draw an arrow from s to the string you get by dropping the first bit of s and adding b. There are 2ⁿ arrows, one for each n-bit string, and each vertex has 2 in and 2 out.

A circuit through all arrows visits every n-bit string once, and reading the bits it adds gives a cyclic sequence of 2ⁿ bits in which every n-bit string appears exactly once. This is a **de Bruijn sequence**.

For n = 3 our code gives 11101000. Read it as a circle: 111, 110, 101, 010, 100, 000, 001, 011, all eight, once each. For n = 4 it gives 1111011001010000, sixteen bits for sixteen codes. We built them for n from 2 to 12 and checked that every one of the 2ⁿ strings appeared exactly once.

A sequence like this helps when you need to try every code of a lock or a test pattern in the shortest run.

## What It Costs

Counting odd degrees takes O(V + E) and the walk takes O(E). We timed it on random graphs, with the odd vertices paired up by extra edges.

| Vertices | Edges | Time |
| --- | --- | --- |
| 50,000 | 212,485 | 0.26 s |
| 800,000 | 3,399,969 | 8.84 s |

The time grew a little faster than the edge count in Python, from 1.2 to 2.6 microseconds for each edge, but stayed a matter of seconds for millions of edges.

The question is easy because of the degree test. The similar-sounding question of a walk through every vertex once, a Hamiltonian path, has no such test and is NP-complete, a class that [NP-Completeness](/algorithms/np-completeness) takes up. Visiting every edge once can be checked by counting. Visiting every vertex once seems to need a search.

## Key Points

- An Eulerian walk uses every edge once, and it exists exactly when the edges are connected and 0 or 2 vertices have an odd degree, for a circuit or a path between them
- The reason is pairing: passing through a vertex uses two of its edges, so only the start and end can have one left over, and the campus with 4 odd buildings fails
- A new path between two odd buildings makes both even, and two such paths made the campus circuit, 11 paths long
- Hierholzer's stack method walks until stuck, finalizes a vertex when stuck, and splices loops together, in O(E), and it agreed with brute force on 283 random graphs
- For directed graphs the test is in-degree equal to out-degree, and an Eulerian circuit of the bit string graph gives a sequence containing every n-bit code exactly once
