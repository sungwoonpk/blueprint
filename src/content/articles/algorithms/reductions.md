> A **reduction** from problem A to problem B is a fast conversion that turns each instance of A into an instance of B with the same answer. Then any algorithm for B also solves A, so A is no harder than B, written A ≤ B (with a polynomial-time conversion, A ≤<sub>p</sub> B). Reductions carry fast algorithms from easy problems to new ones, and in the other direction they carry hardness from known hard problems to new ones.

Two earlier problems were solved by turning them into something else. [Bipartite Matching](/algorithms/bipartite-matching), pairing students with labs, was rewritten as a network and handed to [Maximum Flow and Minimum Cut](/algorithms/maximum-flow). The longest path in a project's job graph became a shortest path by negating the weights, as in [Shortest Paths in a DAG](/algorithms/dag-shortest-paths). In both cases we didn't invent a new method. We found an old problem that hides inside the new one.

That same move, run in the other direction, is how problems are shown to be hard.

## Using Another Problem's Solver

<figure class="diagram">
<div class="flow">
<div class="node">Instance of A</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Convert</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Instance of B</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Solve B</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Answer for A</div>
</div>
<figcaption>A reduction from A to B. The converter runs in polynomial time and keeps the answer, so any solver for B becomes a solver for A</figcaption>
</figure>

The picture shows the shape of any reduction. The converter takes an instance of A and builds an instance of B, the solver for B answers it, and the answer is reported for A. Nothing about B's solver is touched, which is why it is called a black box. All the work of the idea is in the converter, and it has to meet two requirements:

- It must be fast, polynomial in the size of the instance
- It must keep the answer: the instance of A is a yes exactly when the instance it builds is a yes

If both hold, the whole pipeline takes the converter's time plus B's time.

## Which Way the Arrow Points

Suppose A reduces to B. Two conclusions follow, and they point in opposite directions.

| If This Is True | Then This Follows |
| --- | --- |
| B has a fast algorithm | A has one too, by converting and solving |
| A has no fast algorithm | B has none either, since one would solve A |

So the arrow points from the problem that is no harder to the one that is at least as hard. To show that a new problem B is hard, we reduce a known hard problem A to B. Doing it the other way, reducing the new problem to a known hard one, shows only that the new problem is no harder than that one, which says nothing about whether it is hard.

It is a common mistake with reductions, and a quick test is to ask which problem is used as the black box. It has to be the one you want to prove hard.

## A First Hard-to-Hard Reduction

Take two questions about the campus map, where the nine paths are the edges and the minutes on them play no part. The first is a **Hamiltonian cycle**: is there a loop that follows paths, visits each of the seven buildings exactly once and returns to the start?

The second is the tour question from [P and NP](/algorithms/p-and-np): is there a tour of the buildings that takes at most T minutes, where every pair of buildings has a walking time?

A Hamiltonian cycle reduces to the tour question. Build a table of times for every pair of buildings: 1 minute where a path exists, and 2 minutes where there is none. A loop that follows paths only costs exactly n, one for each step, and any loop that uses a missing path costs at least n + 1. So ask whether a tour of at most n exists.

```python
def has_hamiltonian_cycle(n, paths):
    joined = {frozenset(p) for p in paths}
    walk = [[0 if a == b else 1 if frozenset((a, b)) in joined else 2
             for b in range(n)] for a in range(n)]
    return shortest_tour(walk) <= n              # any tour solver will do, such as Bitmask DP
```

Both directions of the "same answer" claim are visible in the table. A cycle in the graph gives a tour of cost n, and a tour of cost n has to take only steps of 1, which are paths, so it is a cycle.

We tested the function against a search of every order on 400 random graphs with 3 to 8 vertices, with different densities, and the two agreed every time, with 157 of them having a cycle. On the campus map the answer is yes, the tour costing 7: Dorm, Gym, Cafe, Lab, Hall, Library, Quad, with each step along a real path.

The converter writes n² numbers, so it is fast. Since the Hamiltonian cycle problem is known to be hard, as [NP-Completeness](/algorithms/np-completeness) explains, the tour question is at least as hard. The times of 1 and 2 even satisfy the triangle inequality, since 2 is not more than 1 + 1, so going straight between two buildings is never longer than a detour through a third.

Even tours of that tidy kind are hard, a fact that matters for [Approximation Algorithms](/algorithms/approximation).

## Carts, Cameras and Cliques

A second family of reductions needs only the map. Three questions about a set of buildings:

- **Independent set**: carts that sell coffee, placed so that no two carts are joined by a path, since neighbors would split their customers. The aim is as many carts as possible
- **Vertex cover**: cameras, placed so that every path has a camera at one end at least. The aim is as few cameras as possible
- **Clique**: buildings that are all joined to one another by paths

<figure class="diagram graph">
<svg viewBox="0 0 360 210" role="img" aria-label="The campus map with carts at the Dorm, the Library and the Cafe, and cameras at the other four buildings">
<line class="e" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<line class="e" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<line class="e" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<line class="e" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<line class="e" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<line class="e" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<line class="e" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<line class="e" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<rect class="n hl" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t hl" x="40" y="108">Dorm</text>
<rect class="n" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t " x="118" y="52">Quad</text>
<rect class="n hl" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t hl" x="222" y="38">Library</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n hl" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t hl" x="140" y="150">Cafe</text>
<rect class="n" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t " x="66" y="188">Gym</text>
</svg>
<figcaption>Carts at the outlined buildings, the Dorm, the Library and the Cafe, so that no two are joined by a path. The other four buildings, Quad, Hall, Lab and Gym, get cameras, and they touch every path</figcaption>
</figure>

On the campus, the most carts we can place is 3, and the Dorm, Library and Cafe are one choice. Look at the buildings left out, the Quad, Hall, Lab and Gym. They touch every path, because a path with neither end among them would have both ends among the carts, and the carts have no paths between them.

So the remaining 4 buildings are a vertex cover, and 4 is also the fewest cameras that can work. Carts and cameras add up to the 7 buildings.

That is the general fact: a set is independent exactly when everything outside it is a vertex cover. A solver for either question solves the other with a subtraction, so independent set reduces to vertex cover in time proportional to the number of vertices.

Cliques are close relatives. Draw the **complement** of the graph, with a path wherever the original had none. Buildings with no paths among them in the map have paths between each other in the complement, so an independent set of the map is a clique of the complement, and a reduction from independent set to clique builds that graph in n² steps.

The largest clique on the campus map is 3, the Library, Lab and Hall.

We checked both facts by brute force on 300 random graphs with 3 to 11 vertices. The largest independent set plus the smallest vertex cover was the number of vertices every time, and the largest independent set matched the largest clique of the complement every time. The three problems are tied together: a fast algorithm for any one would give fast algorithms for the others.

## Putting Reductions Together

Reductions can be chained. If A reduces to B and B reduces to C, then converting twice gives a reduction from A to C. The converters are polynomial, and a polynomial applied to a polynomial is still a polynomial, so the chain is fast. That is how hardness spreads from one problem to the next in [NP-Completeness](/algorithms/np-completeness).

Two ways a reduction can be wrong are worth watching for.

- A slow converter. One that solves A by brute force and then outputs a fixed yes or no instance of B satisfies the second requirement but breaks the first, and would "reduce" anything to anything
- A conversion that keeps only one direction of the answer. A yes instance of A must become a yes instance of B, and a no instance must become a no instance. The cycle reduction needed both halves of its argument

## Key Points

- A reduction converts each instance of A into an instance of B with the same answer, in polynomial time, so a solver for B solves A
- If B is fast then A is fast, and if A is hard then B is hard, so hardness is shown by reducing a known hard problem to the new one, never the other way round
- A Hamiltonian cycle reduces to the tour question with times of 1 for paths and 2 for the rest and a limit of n, and it matched an exhaustive search on 400 random graphs
- On the campus, 3 carts, 4 cameras and a clique of 3 follow the rule that carts plus cameras equal the buildings, which held on 300 random graphs
- Reductions compose, and the converter itself has to run in polynomial time
