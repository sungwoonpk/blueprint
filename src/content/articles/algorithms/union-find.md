> **Union-Find**, also called a disjoint set union, keeps items split into groups and supports two operations: `find(x)` names the group x belongs to, and `union(a, b)` merges two groups. Each group is a tree of parent pointers, and two small changes, joining the smaller tree under the larger and flattening paths as they are walked, make a find cost a few steps in practice, however many items there are.

The campus is getting wired one cable at a time. Each time a cable goes in, someone asks whether the Dorm and the Hall can talk yet. Running a search over everything laid so far would answer correctly, but after thousands of cables and thousands of questions the searches add up. A better structure keeps the answer ready and updates it when a cable is added.

## A Group Is a Tree

Give each building a **parent**, starting with itself. A building that is its own parent is a **root**, and it names its group. To find a building's group, follow parents until a root appears. To merge two groups, make one root the child of the other.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))      # everyone starts alone, as its own root
        self.size = [1] * n               # group size, kept at roots

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]     # point to the grandparent
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                  # already in the same group
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra              # the smaller group hangs under the larger
        self.size[ra] += self.size[rb]
        return True
```

Two buildings are connected exactly when `find` gives the same root. The two lines inside `find` and the size comparison in `union` are the two improvements; we will see what each buys after a walk through the campus.

## Wiring the Campus

Number the buildings 0 to 6 as in [Representing Graphs](/algorithms/representing-graphs): Dorm 0, Quad 1, Library 2, Hall 3, Lab 4, Cafe 5, Gym 6. Install six cables in this order, writing down the parent array after each.

| Step | Cable | Parents of 0 to 6 | Groups |
| --- | --- | --- | --- |
| 0 | None | 0 1 2 3 4 5 6 | 7 |
| 1 | Cafe to Lab | 0 1 2 3 5 5 6 | 6 |
| 2 | Dorm to Quad | 0 0 2 3 5 5 6 | 5 |
| 3 | Library to Hall | 0 0 2 2 5 5 6 | 4 |
| 4 | Lab to Hall | 0 0 5 2 5 5 6 | 3 |
| 5 | Quad to Cafe | 5 0 5 2 5 5 6 | 2 |
| 6 | Gym to Dorm | 5 0 5 2 5 5 5 | 1 |

At step 4 the Lab's group, rooted at the Cafe, absorbs the Hall's group, rooted at the Library, and the Library now points to the Cafe. After step 6 there is one group, and the Cafe is its root.

<figure class="diagram graph">
<svg viewBox="0 0 360 190" role="img" aria-label="The forest after six cables, with an arrow from each building to its parent. Lab, Library, Dorm and Gym point to the Cafe, Hall points to Library, and Quad points to Dorm. The Cafe is the root.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="69.0" y1="81.5" x2="153.0" y2="39.5" marker-end="url(#ah)"/>
<line class="e" x1="149.1" y1="77.0" x2="169.7" y2="43.0" marker-end="url(#ah)"/>
<line class="e" x1="226.4" y1="77.0" x2="195.5" y2="43.0" marker-end="url(#ah)"/>
<line class="e" x1="297.0" y1="82.0" x2="207.0" y2="38.9" marker-end="url(#ah)"/>
<line class="e" x1="140.0" y1="143.0" x2="140.0" y2="109.0" marker-end="url(#ah)"/>
<line class="e" x1="240.0" y1="143.0" x2="240.0" y2="109.0" marker-end="url(#ah)"/>
<rect class="n hl" x="156" y="12" width="48" height="28" rx="14"/>
<text class="t hl" x="180" y="26">Cafe</text>
<rect class="n" x="28" y="78" width="40" height="28" rx="14"/>
<text class="t " x="48" y="92">Lab</text>
<rect class="n" x="110" y="78" width="60" height="28" rx="14"/>
<text class="t " x="140" y="92">Library</text>
<rect class="n" x="216" y="78" width="48" height="28" rx="14"/>
<text class="t " x="240" y="92">Dorm</text>
<rect class="n" x="298" y="78" width="40" height="28" rx="14"/>
<text class="t " x="318" y="92">Gym</text>
<rect class="n" x="118" y="144" width="44" height="28" rx="14"/>
<text class="t " x="140" y="158">Hall</text>
<rect class="n" x="218" y="144" width="44" height="28" rx="14"/>
<text class="t " x="240" y="158">Quad</text>
</svg>
<figcaption>The group after all six cables, with an arrow from each building to its parent. The Cafe, outlined, is the root and names the group</figcaption>
</figure>

The Dorm and the Hall became connected at step 5: `find(Dorm)` goes Dorm to Cafe, `find(Hall)` goes Hall to Library to Cafe, and the roots match. No search ran. The `find` for the Quad would walk Quad, Dorm, Cafe, and while it does, the line in `find` makes the Quad point at the Cafe directly, so the next walk is shorter.

## Why Two Small Changes Matter

The simplest version links `find(a)` under `find(b)` without looking at sizes and walks paths without changing them. It works, and one order of cables ruins it. We joined 10,000 buildings in a line, each new building attached on top of the whole chain so far. The tree became a chain of height 9,999, and finding every building once took 49,995,000 pointer steps, 1.8 s.

With the size rule alone, the same cables gave a tree of height 1, and finding every building took 9,999 steps, under a millisecond. The rule always hangs the smaller group under the larger, so a building's depth only grows when its group joins a group at least as big, which at least doubles the size of its group.

A group can double at most log₂ n times, so no tree is taller than log₂ n. We merged 65,536 buildings in equal pairs, the worst pattern for this rule, and the height was exactly 16.

Flattening the paths fixes the chain from the other side. With path halving alone, which points every other building on a walk at its grandparent, the same 10,000 finds took 24,701 steps.

## Counting Steps

We ran each variant on random work, half unions and half finds on random buildings, with twice as many operations as buildings, and counted the pointer steps taken per operation on average.

| Buildings | Naive | Size Only | Halving Only | Both |
| --- | --- | --- | --- | --- |
| 1,000 | 16.7 | 1.20 | 1.25 | 0.73 |
| 100,000 | 1,674 | 1.35 | 1.74 | 0.75 |
| 1,000,000 | Not run | 1.36 | 1.95 | 0.75 |

The naive version got worse in proportion to the number of buildings, even on random input. The cause is visible in a run on 20,000 buildings: of 16,747 unions, 5,702 hung the larger group under the smaller one, which pushes every member of the larger group one level down, and the final tree was 2,003 levels tall.

Each of the three fixes helped a lot. The combination stayed at about three quarters of a step per operation from a thousand buildings to a million.

That flat line has a name. With both changes, m operations on n items cost O(m α(n)), where α is the inverse of the Ackermann function, a function that grows so slowly that it stays below 5 for any size that arises in practice. So the cost is nearly constant for each operation, though not exactly. We counted about 0.75 steps per operation at every size we ran.

## What It Is Good For

**Connectivity as edges arrive.** On a random graph of 2,000 vertices, we added 4,000 edges one at a time and asked after each whether vertices 0 and 1999 were connected. Union-Find answered all 4,000 questions in 10.5 ms. A breadth-first search from scratch after each edge took 1,275 ms, about 120 times longer, and both agreed on the answer for every edge, first yes at edge 1,967.

**Counting components.** Start with n groups and subtract 1 each time `union` returns true. On a graph of 100,000 vertices and 120,000 edges this gave 10,321 components, the same as the breadth-first sweep in [Connected Components and Cycles](/algorithms/components-cycles). We also compared 6,236 connectivity answers during 300 random sequences of unions against a search over the edges so far, and none differed.

**Spotting cycles.** If `union(u, v)` returns false, u and v were already connected, so the edge u to v closes a cycle. This is the heart of [Kruskal’s Algorithm](/algorithms/kruskal), which adds the cheapest cable that doesn't close a loop.

## Limits

Union-Find only merges. It can't split a group when a cable is removed, and a different structure is needed if edges can be deleted. It also answers "same group?" and nothing about how to get from one building to the other: for the route, use the searches of [Breadth-First Search](/algorithms/breadth-first-search).

## Key Points

- Union-Find keeps items in groups as trees of parent pointers, with `find` walking to the root and `union` hanging one root under the other
- Joining the smaller group under the larger keeps every tree at most log₂ n tall, and flattening paths as they are walked makes later finds shorter
- Without either, 10,000 finds on a chain took 49,995,000 steps, and with both they took 9,999, and the average stayed near 0.75 steps per operation from 1,000 to 1,000,000 items
- The proven cost is O(α(n)) per operation, where the inverse Ackermann function stays below 5 for any practical size
- It answers connectivity as edges arrive, 10.5 ms against 1,275 ms for a search each time on our test, and it detects the edge that closes a cycle
