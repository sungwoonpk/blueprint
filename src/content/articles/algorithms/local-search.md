> A **heuristic** is a rule of thumb that finds a good answer quickly and promises nothing about how good. **Local search** is the most common kind: start with any solution, look at its **neighbors**, the solutions one small change away, and move to a better one until none is better. The end point is a **local optimum**, which can be far from the best, so the methods add restarts, or accept some worse moves, to get out of it.

The courier now has 500 stops. Exact methods stop at about 20 stops, and the double-tree tour of [Approximation Algorithms](/algorithms/approximation) is guaranteed to be within 2 times the best, which leaves room for a tour twice as long as needed. In practice, a few lines of code do much better than that promise, and we can measure how much, though we can't prove it.

## Start With Something Reasonable

A first tour is easy to build: stand at the first stop and keep walking to the nearest stop that hasn't been visited, the **nearest neighbor** rule.

```python
def nearest_neighbor(walk, start=0):
    tour, left = [start], set(range(len(walk))) - {start}
    while left:
        nxt = min(left, key=lambda j: walk[tour[-1]][j])        # the closest stop not yet visited
        tour.append(nxt)
        left.remove(nxt)
    return tour
```

On 100 random sets of 12 points, its tours were 1.14 times the best on average, and 1.43 times in the worst case, with the best found by the table of [Bitmask DP](/algorithms/bitmask-dp). On 500 random points, where the best isn't known, we compare with the cost of the minimum spanning tree, a lower bound on the best from [Approximation Algorithms](/algorithms/approximation): the nearest neighbor tour was 1.47 times that bound.

The rule is greedy, so the last stops are left far apart, and a long return trip closes the loop.

## Improve It by Small Changes

Look at the tour as a loop and pick two of its paths, say from a to b and from c to d. Replace them by the paths from a to c and from b to d, which means reversing the stretch from b to c.

The result is again one loop through all the stops. This is a **two-opt move**, and it is the neighbor relation of the tour: a neighbor is what one such change gives.

<figure class="diagram graph">
<p class="rowname">Before</p>
<svg viewBox="0 0 300 144" role="img" aria-label="A tour that crosses itself: A, B, D, C, E, F">
<line class="e" x1="100.0" y1="22.0" x2="200.0" y2="22.0"/>
<line class="e bad" x1="200.0" y1="22.0" x2="200.0" y2="122.0"/>
<line class="e" x1="200.0" y1="122.0" x2="262.0" y2="72.0"/>
<line class="e bad" x1="262.0" y1="72.0" x2="100.0" y2="122.0"/>
<line class="e" x1="100.0" y1="122.0" x2="38.0" y2="72.0"/>
<line class="e" x1="38.0" y1="72.0" x2="100.0" y2="22.0"/>
<rect class="n" x="87" y="8" width="26" height="28" rx="14"/>
<text class="t " x="100" y="22">A</text>
<rect class="n" x="187" y="8" width="26" height="28" rx="14"/>
<text class="t " x="200" y="22">B</text>
<rect class="n" x="249" y="58" width="26" height="28" rx="14"/>
<text class="t " x="262" y="72">C</text>
<rect class="n" x="187" y="108" width="26" height="28" rx="14"/>
<text class="t " x="200" y="122">D</text>
<rect class="n" x="87" y="108" width="26" height="28" rx="14"/>
<text class="t " x="100" y="122">E</text>
<rect class="n" x="25" y="58" width="26" height="28" rx="14"/>
<text class="t " x="38" y="72">F</text>
</svg>
<p class="rowname">After</p>
<svg viewBox="0 0 300 144" role="img" aria-label="The same stops after two-opt: A, B, C, D, E, F">
<line class="e" x1="100.0" y1="22.0" x2="200.0" y2="22.0"/>
<line class="e hl" x1="200.0" y1="22.0" x2="262.0" y2="72.0"/>
<line class="e" x1="262.0" y1="72.0" x2="200.0" y2="122.0"/>
<line class="e hl" x1="200.0" y1="122.0" x2="100.0" y2="122.0"/>
<line class="e" x1="100.0" y1="122.0" x2="38.0" y2="72.0"/>
<line class="e" x1="38.0" y1="72.0" x2="100.0" y2="22.0"/>
<rect class="n" x="87" y="8" width="26" height="28" rx="14"/>
<text class="t " x="100" y="22">A</text>
<rect class="n" x="187" y="8" width="26" height="28" rx="14"/>
<text class="t " x="200" y="22">B</text>
<rect class="n" x="249" y="58" width="26" height="28" rx="14"/>
<text class="t " x="262" y="72">C</text>
<rect class="n" x="187" y="108" width="26" height="28" rx="14"/>
<text class="t " x="200" y="122">D</text>
<rect class="n" x="87" y="108" width="26" height="28" rx="14"/>
<text class="t " x="100" y="122">E</text>
<rect class="n" x="25" y="58" width="26" height="28" rx="14"/>
<text class="t " x="38" y="72">F</text>
</svg>
<figcaption>One two-opt move. The tour A, B, D, C, E, F crosses itself where the red paths B–D and C–E meet. Replacing them by B–C and D–E, which reverses the stretch D, C, gives the loop A, B, C, D, E, F, and it is shorter</figcaption>
</figure>

If the new paths are shorter than the old ones, keep the change. For points in the plane, crossing paths always lose to the uncrossed pair, so the method untangles the tour.

```python
def two_opt(walk, tour):
    n, improved = len(tour), True
    while improved:
        improved = False
        for i in range(n - 1):
            for j in range(i + 2, n):
                a, b = tour[i], tour[i + 1]
                c, d = tour[j], tour[(j + 1) % n]
                if a == d:
                    continue
                if walk[a][c] + walk[b][d] < walk[a][b] + walk[c][d] - 1e-12:
                    tour[i + 1:j + 1] = reversed(tour[i + 1:j + 1])  # replace a-b, c-d by a-c, b-d
                    improved = True
    return tour
```

Every accepted move makes the tour shorter, so it can't loop forever, and when a full pass finds nothing to change, we are at a local optimum. A pass looks at about n²/2 pairs. We checked that every result was a valid tour.

Started from the nearest neighbor tour, two-opt gave tours 1.011 times the best on average for 12 points, with a worst case of 1.09 on these instances and 1.22 on another set, and found the best tour exactly in 62 of 100 instances. For 500 points it took 0.10 s and the tour came down from 1.47 to 1.21 times the tree bound.

## Stuck at a Local Optimum

A local optimum is a tour that no single move improves, and that isn't the same as the best tour. In the tour problem, from 12 points the method ended at the best only about two thirds of the time. How bad can it get in other problems? Take the cameras of [Approximation Algorithms](/algorithms/approximation), and a rule that starts with a camera everywhere and removes one at a time while every road stays watched.

On a star, with a hub joined to 100 leaves, try the hub first. Without a camera at the hub, every road is still watched by its leaf, so the removal is allowed. Now no leaf can be removed, since its own road would lose its watcher. The method stops at 100 cameras, where 1 would do. Tried in the other order, with leaves first, it finds the 1.

The standard fix for the tour is to start again from different places and keep the best. We started two-opt from 100 random orders of the 12 points, on 100 instances.

| Starts | Instances Solved Exactly | Average Excess Over the Best |
| --- | --- | --- |
| 1 | 62% | 1.34% |
| 5 | 92% | 0.07% |
| 20 | 100% | 0% |

Twenty starts solved all 100 instances of 12 points, and 99 of 100 on a second set of instances, which isn't a measure of larger problems. On 500 points, the best of 100 random starts took 10 s and was 1.22 times the tree bound, no better than the single run from the nearest neighbor tour at 0.10 s, since random starts end in poorer local optima than the nearest neighbor start does.

Restarting helps when local optima are few and cheap, and not so much when they are many.

## Accepting Worse Moves Sometimes

Another way out is to let the search go uphill now and then. **Simulated annealing**, borrowed from the physics of cooling metal, accepts a worse move with probability e<sup>−Δ/T</sup>, where Δ is how much longer the tour gets and T is a temperature. While T is high, almost anything is accepted, and the search wanders. As T falls, the search gets pickier, and at T near 0 it accepts only improvements.

```python
def anneal(walk, tour, steps, t_start, t_end):
    n, tour = len(tour), tour[:]
    cool = (t_end / t_start) ** (1 / steps)                      # temperature falls by this factor each step
    temp = t_start
    for _ in range(steps):
        i = random.randrange(n - 1)
        j = random.randrange(i + 2, n + 1)                       # reverse the stretch tour[i+1 .. j-1]
        a, b = tour[i], tour[i + 1]
        c, d = tour[j - 1], tour[j % n]
        delta = walk[a][c] + walk[b][d] - walk[a][b] - walk[c][d]
        if delta < 0 or random.random() < math.exp(-delta / temp):
            tour[i + 1:j] = reversed(tour[i + 1:j])
        temp *= cool
    return tour
```

Each step picks one random two-opt move and decides on it. For 12 points, 20,000 steps from a random order reached the best tour in 39 of 40 instances, and the worst was 0.4% above. On 500 points, the result depends on the time we give it.

The starting tour was the nearest neighbor one, the temperature fell from 0.01 to 0.0003 for points in the unit square, and the figures are times the tree bound, for one instance and one run each.

| Method | Time | Tour, Times the Tree Bound |
| --- | --- | --- |
| Nearest neighbor | 0.01 s | 1.47 |
| Two-opt | 0.10 s | 1.21 |
| Annealing, 1.6 million steps | 1.0 s | 1.21 |
| Annealing, 6.4 million steps | 4.5 s | 1.18 |
| Annealing, 25.6 million steps | 16 s | 1.16 |

With little time, two-opt is as good, and it is deterministic. With more time, annealing keeps improving, which two-opt can't do after it stops. The tree bound is below the best tour, so we can't say how close to the best 1.16 is. The numbers vary a little from run to run, since the search is random.

## The Same Idea on Other Problems

The recipe is the same for any problem: a way to make a small change, a measure of how good a solution is, and a loop.

| Problem | A Neighbor Is | Measure |
| --- | --- | --- |
| Tour | Reverse a stretch | Length |
| Cameras | Add or remove one | Number, with all roads watched |
| Satisfiability | Flip one letter | Number of clauses that fail |
| Job schedule | Swap two jobs | Finish time |

For satisfiability the method is called **WalkSAT**: pick a clause that fails, and flip one of its letters, the one that breaks the fewest other clauses, or, half of the time, a random one.

```python
def walksat(clauses, n, max_flips=200000, noise=0.5):
    value = [random.random() < 0.5 for _ in range(n + 1)]       # a random start, letters 1 to n
    holds = lambda lit: value[abs(lit)] == (lit > 0)
    uses = [[] for _ in range(n + 1)]                           # which clauses mention each letter
    for k, clause in enumerate(clauses):
        for lit in clause:
            uses[abs(lit)].append(k)
    true_count = [sum(holds(l) for l in c) for c in clauses]    # true literals in each clause
    broken = {k for k, t in enumerate(true_count) if t == 0}
    for flip in range(max_flips):
        if not broken:
            return value                                        # every clause holds
        clause = clauses[random.choice(tuple(broken))]
        def damage(v):                                          # clauses that would turn false if v flipped
            return sum(1 for k in uses[v] if true_count[k] == 1
                       and any(abs(l) == v and holds(l) for l in clauses[k]))
        if random.random() < noise:
            v = abs(random.choice(clause))                      # with probability noise, a random letter
        else:
            v = min((abs(l) for l in clause), key=damage)       # otherwise, the safest letter
        for k in uses[v]:
            for l in clauses[k]:
                if abs(l) == v:
                    true_count[k] += -1 if holds(l) else 1
        value[v] = not value[v]
        for k in uses[v]:
            (broken.add if true_count[k] == 0 else broken.discard)(k)
    return None                                                 # gave up, which proves nothing
```

We ran it against the DPLL search of [Exact Algorithms for Hard Problems](/algorithms/exact-algorithms) on random 3-SAT with 100 letters, 40 formulas at each ratio of clauses to letters, and checked that each assignment it returned satisfied the formula.

| Clauses per Letter | Satisfiable | WalkSAT Found | Time per Formula, DPLL and WalkSAT |
| --- | --- | --- | --- |
| 3.0 | 40 | 40 | 0.01 s and 0.00 s |
| 4.0 | 38 | 37 | 0.90 s and 0.12 s |
| 4.2 | 27 | 27 | 2.60 s and 0.47 s |

Near the hard region, WalkSAT was about 5 to 8 times faster. Both times include the unsatisfiable formulas, where DPLL had to finish its search and WalkSAT used up its flips. It also shows what a heuristic can't do. On an unsatisfiable formula, it flips until the budget runs out and returns nothing, so no answer isn't a no.

On one satisfiable formula at ratio 4.0, it ran out of flips, and DPLL found the assignment. Exact search can say "none exists", and local search can't.

## Which Tool to Use

| | Exact | Approximation | Heuristic |
| --- | --- | --- | --- |
| Answer | The best | Within a proved factor | Often good, no promise |
| Time | Exponential in the worst case | Polynomial | Whatever you allow |
| Can prove that no solution exists | Yes | No | No |
| Fits when | The instance is small, or has a small parameter | You need a guarantee | A good answer is enough and you can check it |

In practice they combine. A tour from a heuristic is a fine starting point for an exact search that prunes anything longer, and an approximation is a good first tour for local search. Whichever you choose, state which you used. "Optimal", "within 2 times the best" and "the best we found" are three very different claims, and this phase gave the means to make each of them honestly.

## Key Points

- A heuristic gives a good answer fast with no guarantee, and local search improves a solution by small changes until no neighbor is better, a local optimum
- Two-opt, which replaces two paths of the tour with two shorter ones by reversing a stretch, took a 500-stop tour from 1.47 to 1.21 times the tree bound in 0.10 s, and found the exact best for 62 of 100 tours of 12 points
- A local optimum can be far from the best: removing cameras from a star hub first stops at 100 cameras where 1 would do
- Restarts solved all 100 instances of 12 points with 20 starts, and simulated annealing, which accepts worse moves with probability e<sup>−Δ/T</sup>, kept improving with time, 1.21 to 1.16 times the bound on 500 stops
- WalkSAT found assignments 5 to 8 times faster than DPLL near the hard region, but it can't prove that none exists, and it missed one of the 38 satisfiable formulas at ratio 4.0
