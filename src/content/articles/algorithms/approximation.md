> An **approximation algorithm** runs in polynomial time on every input and returns a solution whose value is within a guaranteed factor of the best one. A ρ-approximation for a minimization problem never returns more than ρ times the optimum. The guarantee is proved by comparing with a bound on the optimum that is easy to compute, since the optimum itself is the thing we can't find.

The city wants cameras at junctions so that every road is watched. The map has 100,000 junctions and 300,000 roads, and the fewest cameras is an NP-hard question from [Reductions](/algorithms/reductions). A search with a small budget, as in [Exact Algorithms for Hard Problems](/algorithms/exact-algorithms), needs the budget to be small, and here it isn't. What would a fast method that is usually good, and provably never terrible, look like?

## A Guarantee Without Knowing the Optimum

The odd part of an approximation guarantee is that we can't compare with the optimum, since we can't compute it. The trick is to compare with something smaller that we can compute, a **lower bound**. If our solution costs at most twice the bound, and the optimum is at least the bound, then our solution costs at most twice the optimum.

Each proof in this article has that shape: find a bound, then show the algorithm stays within a factor of it.

## Cameras Within a Factor of 2

Go through the roads. When a road has no camera at either end, put cameras at both ends. Skip the roads that are already watched.

```python
def watch_roads(roads):
    cameras = set()
    for a, b in roads:
        if a not in cameras and b not in cameras:       # this road is not watched yet
            cameras.update((a, b))                      # put a camera at each end
    return cameras
```

Every road ends up watched, since a road is either skipped because it was watched, or it gets cameras. Now the bound. The roads that triggered cameras share no junction, because after the first one is handled, its junctions are cameras and any road touching them is skipped. Call them the picked roads.

A set of cameras that watches everything needs one at an end of each picked road, and these ends are different junctions, so the optimum is at least the number of picked roads. We placed two cameras for each picked road, so we used at most twice the optimum.

On the campus map, taking the roads in the order the map lists them, the picked roads are Dorm–Quad, Cafe–Gym and Library–Lab, so we place 6 cameras, against the best of 4 that we found in [Reductions](/algorithms/reductions). The bound says the best is at least 3.

We checked on 475 random graphs of 4 to 12 junctions that the answer always watched every road and never used more than twice the optimum, which we found by trying all sets. The average was 1.67 times the optimum, the worst 2.0, and the answer was optimal in 5% of the graphs.

The factor 2 is also reached: on 5 junctions joined to 5 others by every possible road, the method places 10 cameras where 5 would do.

On a graph with 100,000 junctions and 300,000 roads, it took 0.06 s, and placed 85,824 cameras. The picked roads number 42,912, so the best is at least that many, and we know our answer is within 2.0 times the optimum, though it could be closer. Nobody can do much better in general: a guarantee below about 1.36 for vertex cover would imply that P equals NP.

## The Courier Within a Factor of 2

For the courier's tour, the picture is different, and it begins with bad news. For tours in general, no constant factor is possible unless P equals NP. To see why, reuse the reduction from [Reductions](/algorithms/reductions) but make the missing paths cost 3n minutes instead of 2. A loop along real paths costs n. Any other loop uses a missing path, and costs at least n − 1 + 3n.

A method that promised a tour within twice the optimum would return at most 2n exactly when a Hamiltonian cycle exists, and so decide the Hamiltonian cycle problem. A bigger cost for the missing paths rules out any other constant in the same way. We checked the cost claim on 300 random graphs of 4 to 8 vertices, 176 of which had a cycle.

The cost was n in each of those, and at least 4n − 1 in the rest.

The reduction works by making some detours absurdly expensive. Real walking times don't behave like that: going straight from one building to another is never longer than a detour through a third. This **triangle inequality** is the **metric** case, and the news is much better there.

The bound comes from the minimum spanning tree of [Minimum Spanning Trees](/algorithms/minimum-spanning-trees). Take the best tour and drop one path. What remains connects all the buildings with no loop, so it is a spanning tree, and costs at most the tour. The minimum spanning tree costs even less, so it is a lower bound on the best tour.

<figure class="diagram graph">
<svg viewBox="0 0 360 210" role="img" aria-label="The campus map with its minimum spanning tree highlighted">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e dim" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e hl" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e dim" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dim" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e hl" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
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
<figcaption>The minimum spanning tree of the campus map, 19 minutes in all. Any tour of the buildings, with one path dropped, becomes a spanning tree, so no tour can cost less than this</figcaption>
</figure>

Now build a tour from the tree. Walk once around it, going down each branch and back, which crosses every tree path twice for a total of twice the tree's cost. That walk revisits buildings, so cut it short: go to each building the first time you reach it, and go straight to the next new one. By the triangle inequality, skipping a stretch can't cost more than walking it. That is the **double-tree** method.

```python
def double_tree_tour(walk):
    n = len(walk)
    neighbors = [[] for _ in range(n)]
    for a, b in prim_tree(walk):                        # the minimum spanning tree, from Prim's algorithm
        neighbors[a].append(b)
        neighbors[b].append(a)
    order, seen, stack = [], [False] * n, [0]
    while stack:                                        # a depth-first walk around the tree
        u = stack.pop()
        if not seen[u]:
            seen[u] = True
            order.append(u)                             # skipping repeated visits is the shortcut
            stack.extend(reversed(neighbors[u]))
    return order + [0]
```

Here `prim_tree` is [Prim’s Algorithm](/algorithms/prim), returning the tree as pairs, and the walk is a [Depth-First Search](/algorithms/depth-first-search). The tour costs at most twice the tree, which is at most twice the best tour.

For the campus, with the walking times between all pairs, the tree costs 19, the tour comes out at 38 minutes and the best is 33, so we are 15% above the best. We checked the method on 300 random sets of 5 to 12 points in a square, against the table of [Bitmask DP](/algorithms/bitmask-dp).

The tours were valid, never shorter than the best and never longer than twice it, and the tree never cost more than the best. On average the tour was 1.12 times the best, and in the worst case 1.46.

For sizes where the best can't be found, the tree gives the yardstick. On a random set of 1,000 points the tour took 0.06 s and cost 1.52 times the tree, and on 2,000 points 0.25 s and 1.55 times. So each was within 1.55 times the best, though we couldn't say how much closer.

The idea can be improved. Some buildings in the tree have an odd number of paths meeting there. Pair those buildings up in the cheapest way and add the pairing's paths to the tree, and every building has an even number of paths, so a single walk can use each path once, as in [Eulerian Paths and Circuits](/algorithms/eulerian-paths).

Shortcutting that walk is the method of Christofides, with a guarantee of 1.5 times the best. A slight improvement, below 1.5 by a tiny amount, was published in 2021 by Karlin, Klein and Oveis Gharan. Whether a factor close to 1 is possible is open, and it can't go below about 1.004 unless P equals NP.

## Knapsack as Close as We Like

A few problems allow any precision we ask for, for a price. In [Knapsack Problems](/algorithms/knapsack), the table over weights took 4.52 s for 100 items and a capacity of a million, and grows with the capacity. For 100 items with weights between 10⁸ and 10⁹ and a capacity of a third of their total, the same table would take about a day, by our estimate, scaling from that run.

There is another table, over values: for each total value, the least weight that reaches it. It is as slow when the values are large, but the values can be rounded.

Round every value down to a multiple of θ, where θ is ε times the largest value divided by n. Each item loses less than θ, so a choice of items loses less than nθ, which is ε times the largest value, and that is at most ε times the optimum.

So the best choice for the rounded values is within a factor 1 − ε. The rounded values are at most n/ε, so the table is small.

```python
def knapsack_within(items, capacity, eps):              # items are (weight, value) pairs
    items = [(w, v) for w, v in items if w <= capacity]
    if not items:
        return 0
    theta = eps * max(v for w, v in items) / len(items) # values are rounded down to multiples of theta
    scaled = [int(v // theta) for w, v in items]
    total = sum(scaled)
    least_weight = [0] + [float("inf")] * total         # least weight that reaches each scaled value
    real_value = [0] * (total + 1)                      # the true value of that choice of items
    for (w, v), s in zip(items, scaled):
        for t in range(total, s - 1, -1):               # downward, so each item is used once
            if least_weight[t - s] + w < least_weight[t]:
                least_weight[t] = least_weight[t - s] + w
                real_value[t] = real_value[t - s] + v
    return max(real_value[t] for t in range(total + 1) if least_weight[t] <= capacity)
```

The time is about n × n²/ε. We tested the guarantee on 200 random instances of 8 to 20 items, against the exact answer found by meeting in the middle. The result was never below 1 − ε of the best, and was much closer in practice.

| ε | Promised Fraction of the Best | Worst Seen | Average |
| --- | --- | --- | --- |
| 0.5 | 0.50 | 0.986 | 0.9997 |
| 0.2 | 0.80 | 0.995 | 0.9999 |
| 0.1 | 0.90 | 0.9987 | 1.0000 |
| 0.01 | 0.99 | 0.9998 | 1.0000 |

For those 100 items with weights and values between 10⁸ and 10⁹, it took 0.06 s with ε = 0.5 and 0.28 s with ε = 0.1, and came within 0.06% of an upper bound on the best. A method with this behavior, a guarantee of 1 − ε for any ε we choose and a time that grows polynomially in 1/ε as well as n, is a **fully polynomial-time approximation scheme**.

## What Can Be Promised

| Problem | Method | Guarantee | Limit |
| --- | --- | --- | --- |
| Vertex cover | Cameras at both ends of unwatched roads | 2 | Not below 1.36 unless P = NP |
| Metric tour | Double tree | 2 | |
| Metric tour | Christofides | 1.5 | Not below about 1.004 unless P = NP |
| Any tour | None | No constant | Unless P = NP |
| Knapsack | Rounded values | 1 + ε for any ε | |

The guarantee is a worst case, and the averages in the knapsack table show how far a typical instance can be from it. A method with no guarantee at all might do as well or better, which is the topic of [Heuristics and Local Search](/algorithms/local-search).

## Key Points

- An approximation algorithm runs in polynomial time and returns a solution within a proved factor of the optimum, shown by comparing with a lower bound that is easy to compute
- Cameras at both ends of each unwatched road use at most twice the optimum, because the picked roads share no junction, and the factor 2 is reached on 5 junctions joined to 5 others
- For tours in general no constant factor is possible unless P = NP, but with walking times obeying the triangle inequality, a walk around the minimum spanning tree with shortcuts is within a factor of 2, and 38 minutes for the campus against the best 33
- Rounding the values in the knapsack table gives a result within 1 − ε of the best, at 0.28 s for 100 items with numbers up to 10⁹ for ε = 0.1, and in tests it was far closer than promised
- A guarantee is a worst case, and the average instance is usually much better
