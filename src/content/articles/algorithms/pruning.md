> **Pruning** cuts off a branch of a search when it can be shown that no completion of the partial solution is valid, or none can beat the best answer found so far. A prune is safe when it can't discard the answer, and it is strong when the test is cheap and close to the truth.

Back to the courier. With 12 stops, a [Brute Force](/algorithms/brute-force) over all routes takes about 17 seconds by our estimate, and [Backtracking](/algorithms/backtracking) builds each route one stop at a time but still visits every partial route. The search can be much faster if it gives up on a partial route the moment that route can't lead to a winner.

This article is about how to make that decision, and how to be sure it doesn't throw away the best route.

## Two Reasons to Cut a Branch

A branch can be dropped for two different reasons.

- **It is infeasible**: the partial solution already breaks a rule, like two queens attacking each other, so no completion can be valid
- **It is hopeless**: the partial solution is valid so far, but every completion costs at least as much as a complete solution already found

The first kind appears in backtracking searches like N-Queens. The second needs an optimization problem and a **bound**: a number computed from the partial solution that no completion can go below. Comparing the bound with the best complete answer so far is the idea of branch and bound.

The same view works for both: look at a partial solution and quickly decide among three outcomes, a dead end, a finished answer, or "can't tell yet", and expand only in the last case.

## Prune on the Cost So Far

Start with the cheapest bound there is: the length of the partial route. Distances aren't negative, so adding stops can only make a route longer. If the partial route is already as long as the best complete route, nothing that extends it can win.

```python
def shortest(d):
    n = len(d)
    best = [float("inf")]
    def go(path, used, cost):
        if cost >= best[0]:
            return                              # no extension can beat the best route
        last = path[-1]
        if len(path) == n:
            best[0] = min(best[0], cost + d[last][0])
            return
        for c in range(1, n):
            if not used >> c & 1:
                path.append(c)
                go(path, used | 1 << c, cost + d[last][c])
                path.pop()
    go([0], 1, 0.0)
    return best[0]
```

The invariant behind the prune is that every complete route starting with this path costs at least `cost`. If that is no better than `best`, the whole subtree below can be skipped. We checked the answers against full enumeration on random instances of 8, 9 and 10 stops, and then counted the calls. The numbers are averages over 10 random instances for each size.

| Stops | Full Search | Pruned | Nearest First |
| --- | --- | --- | --- |
| 8 | 13,700 | 7,700 | 7,100 |
| 10 | 986,000 | 181,000 | 152,000 |
| 12 | 108.5 million | 3.56 million | 2.68 million |

At 8 stops the prune removes less than half of the calls. At 12 it removes 97%, and the saving grows with the size because a bigger tree has more room to cut.

## Find a Good Answer Early

The prune is only as strong as the best route found so far. At the start there is none, so nothing is cut. Finding a good route early makes the cut sharper for the rest of the search.

The last column of the table tries the nearest unvisited stop first at each step. The first complete route is then the greedy nearest neighbor route, which is decent, and later branches are compared against it. That took the 12 stop search from 3.56 million calls to 2.68 million, 25% fewer, with the same answers. Seeding `best` with the nearest neighbor length in advance gave exactly the same counts, because the ordered search already finds that route first.

The general lesson is that the order of the options is a free choice. A prune compares against what you have, so try the most promising options first.

## Bound the Rest, Too

The cost so far ignores the stops that remain, and each of them has to be left by some road. A road out of stop u costs at least the cheapest road that leaves u, so a better bound adds up those cheapest roads. For the current stop and each stop not yet visited, take its cheapest outgoing road. Every complete route extending this path has one outgoing road for each of those stops, so no route can be shorter than the cost so far plus that sum.

```python
min_out = [min(d[u][v] for v in range(n) if v != u) for u in range(n)]
# bound = cost + min_out[last] + sum(min_out[u] for u not yet visited)
if bound >= best:
    return
```

A running total makes the sum cost O(1) per call: start with the sum for all stops except the depot, and subtract a stop's value when the path reaches it. We verified the answers against full enumeration on 90 random instances of 7, 8 and 9 stops.

| Stops | Cost Only | With Bound | Time Saved |
| --- | --- | --- | --- |
| 10 | 152,000 | 16,100 | 9 times |
| 12 | 2.68 million | 150,000 | 16 times |
| 13 | 12.1 million | 412,000 | 26 times |

The columns show calls, with nearest first ordering in both. The larger the instance, the more the stronger bound pays. It can also cost more per call, and a bound that takes a lot of time to compute can lose to a weaker one. Textbooks build the bound for this problem from a minimum spanning tree of the unvisited stops, which takes more work per call than our sum of cheapest roads.

How far does it go? On five random instances of 18 stops, the search took between 0.9 and 41 seconds. Brute force would need about five years at our measured speed. The spread is wide, about 44 times between the easiest and hardest of five, because the saving depends on how early a good route shows up. The worst case is still exponential, so this is a faster exhaustive search, not a different class of problem.

## Choose the Most Constrained Decision First

Pruning can also come from the order of decisions. In Sudoku, any empty cell can be filled next. If the search always takes the first empty cell, it might pick one with six possible digits. If it takes the cell with the fewest possible digits, there are fewer branches, and a cell with no possible digit shows up as a dead end immediately.

We built eight random puzzles with 55 blank cells each and solved them both ways, counting calls. Filling cells in board order took between 212 and 72,097 calls, 84,071 in total. Choosing the cell with the fewest options took between 56 and 406 calls, 920 in total, about 90 times fewer. The rule of thumb is to fail early: make the choice most likely to run out of options first.

## A Prune Must Be Safe

A bound that is too eager turns an exact search into a guess. To see this, we pruned a route as soon as its cost reached 90% of the best, on the theory that such routes are unlikely to win. On 200 random instances of 9 stops, that returned a route longer than the true shortest on 12 of them, up to 4.9% longer. The search was faster, but it no longer answered the question asked.

Two habits keep a prune safe. State the claim it relies on, such as "distances aren't negative, so extending can't shorten a route". That claim fails if negative values are possible, and the prune then breaks silently. And compare the pruned search with a brute force on small random inputs, as in [Edge Cases and Testing](/algorithms/edge-cases).

## Symmetry

Equivalent branches can be cut too. A route and its reverse have the same length when distances are symmetric, which halves the routes. For N-Queens on an even board, a mirror image of a solution is also a solution, so the first queen only needs to try the left half of its row, and the count is doubled. That gave 46 solutions for n = 8 with 1,029 calls, against 92 solutions and 2,057 calls for the full search. For n = 10 and 12 it again halved the solutions and nearly halved the calls.

## Key Points

- Prune a branch when no completion can be valid, or none can beat the best known answer
- A bound is a number no completion can go below, such as the cost so far, and the prune needs it to be a true lower bound
- Find a good answer early, because the prune compares against it, which cut the 12 stop search by 25%
- A stronger bound removes more branches but costs more per call, and our cheapest-road bound made 12 stops 16 times faster
- Order decisions to fail early, as in Sudoku, and keep every prune safe by testing it against a brute force
