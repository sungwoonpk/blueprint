> An **exact algorithm** for an NP-hard problem always returns the true answer, and it takes exponential time in the worst case. The aim is not polynomial time, but a much smaller exponent than brute force: dynamic programming over subsets, meeting in the middle, a search tree whose depth depends only on a small parameter, or a search that prunes with forced moves. Which one fits depends on what is small in the instance.

The club treasurer has n receipts and a grant that has to be matched to the cent: does some subset of the receipts add up to exactly the grant? Trying every subset is the obvious plan, and it is where we start. With 22 receipts it took 3.8 s on our machine, and each extra receipt about doubles that. At 44 receipts, by our estimate, it would take about six months.

Exponential time isn't one speed, though. A method that takes 2<sup>n/2</sup> steps instead of 2ⁿ turns the six months into seconds.

## Several Ways to Be Less Exponential

Some of the methods are in earlier articles, and the rest come in this one.

| Method | Idea | Example |
| --- | --- | --- |
| Pruning | Abandon a partial solution that can't win | The courier in [Pruning the Search Space](/algorithms/pruning) |
| Table over subsets | Remember the best result for each set of items | The tour in [Bitmask DP](/algorithms/bitmask-dp), n² × 2ⁿ instead of n! |
| Meeting in the middle | Solve two halves separately and join them | Subset sum |
| Bounded search tree | Let a small answer limit the depth | Vertex cover with few cameras |
| Forced moves | Let one choice settle others at once | Satisfiability |

## Meeting in the Middle

Split the receipts into two halves of n/2. Every subset is a piece from the first half plus a piece from the second, so the sum of a subset is a sum from the left list plus one from the right list.

Each half has only 2<sup>n/2</sup> subsets. List the sums of the right half in sorted order, and for each sum s on the left, look for target − s on the right with a binary search.

```python
from bisect import bisect_left

def all_sums(nums):
    sums = [0]
    for x in nums:
        sums += [s + x for s in sums]                # each receipt doubles the list
    return sums

def has_subset_sum(nums, target):
    half = len(nums) // 2
    left = all_sums(nums[:half])
    right = sorted(all_sums(nums[half:]))
    for s in left:
        i = bisect_left(right, target - s)
        if i < len(right) and right[i] == target - s:
            return True
    return False
```

The method matched a brute force over every subset on 400 random lists of up to 14 numbers, 212 of which had a subset that reached the target. Then we raced them, using even numbers of 7 to 9 digits and an odd target, which no subset can reach, so both had to run to the end.

| Receipts | Brute Force | Meeting in the Middle | Sums in Each Half |
| --- | --- | --- | --- |
| 16 | 0.04 s | 0.1 ms | 256 |
| 22 | 3.8 s | 0.5 ms | 2,048 |
| 30 | Not run | 11 ms | 32,768 |
| 40 | Not run | 0.76 s | 1,048,576 |
| 44 | Not run | 4.9 s | 4,194,304 |

Brute force at 44 receipts is the six months mentioned earlier, 3.8 s multiplied by 2²². Meeting in the middle did it in 4.9 s. The price is memory: the lists hold millions of numbers at 44 and would hold hundreds of millions at 56.

The time is also about 2<sup>n/2</sup> times n for sorting, so every four extra receipts is roughly four times the work and the memory. The measured time grew a little faster, 6.5 times from 40 to 44 receipts.

This also works when the receipts are large. The table in [Knapsack Problems](/algorithms/knapsack) grows with the size of the numbers and is hopeless for 10-digit amounts, while the sums here don't care how big the amounts are.

## A Small Answer Limits the Depth

A city map has 10,000 junctions and 30,000 roads. A budget of k cameras, placed at junctions, must watch every road. Trying every set of k junctions is hopeless: with k = 10, there are 2.7 × 10³³ sets. But k is small, and that can be used.

Take any road that isn't watched yet, from junction a to junction b. A camera must be at a or at b, so try both. Each choice uses up one camera and removes the roads it watches, then the search continues on what is left. When the budget reaches 0 with roads still unwatched, that branch fails.

```python
def cover_within(roads, k):                         # roads is a list of (a, b) pairs
    if not roads:
        return True                                 # every road is watched
    if k == 0:
        return False                                # out of cameras
    a, b = roads[0]
    for junction in (a, b):                         # one end of this road needs a camera
        unwatched = [r for r in roads if junction not in r]
        if cover_within(unwatched, k - 1):
            return True
    return False
```

The search tree branches in two at each level and has k levels, so it has at most 2<sup>k+1</sup> − 1 nodes, whatever the size of the map. Each node scans the roads, so the time is O(2<sup>k</sup> × n). Time like f(k) × poly(n), with the exponential part tied to a parameter k and not to the size n, is called **fixed-parameter tractable**.

The function matched a brute force over all sets of k junctions on 400 random graphs of up to 9 junctions, with 275 yes answers. For large maps, we planted a cover of k junctions, so that each road touches one of them, with three times as many roads as junctions, and ran 20 maps of each size with the roads in random order.

| Junctions | Cameras | Sets of k Junctions | Search Nodes, Average |
| --- | --- | --- | --- |
| 100 | 6 | 1.2 × 10⁹ | 69 |
| 1,000 | 8 | 2.4 × 10¹⁹ | 225 |
| 10,000 | 10 | 2.7 × 10³³ | 1,099 |

The largest case took 0.36 s. A budget one camera too small, which has to give a no, explores the whole tree, and it did exactly 63, 255 and 1,023 nodes.

The cost of the method is the exponent in k: with a budget of half the junctions the tree is as bad as brute force, so it is the tool for "is a few enough?" and not "what is the best possible?" Two refinements are standard.

A junction with more than k roads must have a camera, since otherwise each of its roads needs its own, and forced choices shrink the map before the search starts. Smarter branching lowers the base of the tree from 2 to about 1.27.

## Forced Moves Prune the Search

Satisfiability is the problem of [NP-Completeness](/algorithms/np-completeness): can the letters of a formula be set true or false to make every clause true? A search that tries both values for each letter has 2ⁿ leaves. The **DPLL** method, named for Davis, Putnam, Logemann and Loveland and from 1962, prunes it by looking at what a choice forces.

Setting a letter true removes every clause that contains it, and shortens every clause that contains its negation. If a clause shrinks to a single letter, a **unit clause**, that letter has to take the value that satisfies it, and no branching is needed. Setting it may create more unit clauses. This is **unit propagation**, and the search only branches when none is left. An empty clause means a contradiction, and the branch is abandoned.

```python
def simplify(clauses, lit):
    """Make lit true: drop clauses it satisfies, shorten the rest. None on a contradiction."""
    out = []
    for c in clauses:
        if lit in c:
            continue
        if -lit in c:
            c = [x for x in c if x != -lit]
            if not c:
                return None                         # an empty clause cannot be satisfied
        out.append(c)
    return out

def dpll(clauses):
    while True:                                     # unit propagation
        unit = next((c[0] for c in clauses if len(c) == 1), None)
        if unit is None:
            break
        clauses = simplify(clauses, unit)
        if clauses is None:
            return False
    if not clauses:
        return True                                 # every clause satisfied
    lit = clauses[0][0]                             # branch on a letter of the first clause
    for choice in (lit, -lit):
        rest = simplify(clauses, choice)
        if rest is not None and dpll(rest):
            return True
    return False
```

It matched a brute force over all settings on 500 random formulas of up to 10 letters, with 460 satisfiable. How much do the forced moves save? On random formulas of 30 letters and 129 clauses, the average over 100 formulas was 53 nodes with propagation and 5,015 without it, against 2³⁰, about a billion, settings.

The formulas were random 3-SAT, with three letters in each clause, and a surprise appeared when we changed the number of clauses. With 100 letters and 30 formulas at each ratio of clauses to letters, the average search looked like this.

<figure class="chart">
<div class="hbars" role="img" aria-label="Average search nodes for random 3-SAT with 100 letters at six ratios of clauses to letters. The count rises from 236 at 3.0 to a peak of 15,282 at 4.3 and falls to 1,782 at 6.0">
<div class="hbar"><span>3.0 · 100%</span><span class="track"><span class="fill" style="--w: 1.5%"></span></span><span class="value">236</span></div>
<div class="hbar"><span>4.0 · 93%</span><span class="track"><span class="fill" style="--w: 54.9%"></span></span><span class="value">8,385</span></div>
<div class="hbar peak"><span>4.3 · 53%</span><span class="track"><span class="fill" style="--w: 100.0%"></span></span><span class="value">15,282</span></div>
<div class="hbar"><span>4.6 · 13%</span><span class="track"><span class="fill" style="--w: 77.4%"></span></span><span class="value">11,829</span></div>
<div class="hbar"><span>5.0 · 0%</span><span class="track"><span class="fill" style="--w: 43.7%"></span></span><span class="value">6,685</span></div>
<div class="hbar"><span>6.0 · 0%</span><span class="track"><span class="fill" style="--w: 11.7%"></span></span><span class="value">1,782</span></div>
</div>
<figcaption>Average search nodes for random 3-SAT with 100 letters, by clauses per letter and the share of formulas that could be satisfied. The search is hardest where about half of them can</figcaption>
</figure>

The hardest formulas are in the middle, where about half of them can be satisfied, and a formula there took 2.3 s on average. With few clauses, nearly any choice works, and with many, contradictions show up quickly. Exact methods don't suffer on every instance the same way, so it pays to know what your instances look like.

The 15,282 nodes at the peak are tiny against 2¹⁰⁰, and the same frame, with an added memory of failed branches, is what modern SAT solvers are built on. Because every problem in NP reduces to SAT, a strong SAT solver is, in principle, an exact solver for all of them.

## Choosing a Method

| What Is Small or Helpful | Method |
| --- | --- |
| About 20 items, and a state that is a set | A table over subsets |
| About 40 to 50 numbers to add up | Meeting in the middle |
| The size of the answer | A bounded search tree |
| Many constraints that force each other | Propagation and pruning |
| The numbers themselves | A table over values, as in [Knapsack Problems](/algorithms/knapsack) |

When none of these fits, and the instance is too large to solve exactly, the next step is to give up the best answer and get a good one with a guarantee, as in [Approximation Algorithms](/algorithms/approximation).

## Key Points

- Exact algorithms for NP-hard problems stay exponential, so the goal is a smaller exponent, and which method fits depends on what is small
- Meeting in the middle solves subset sum in about 2<sup>n/2</sup> time, 4.9 s at 44 numbers where brute force would take about six months, with memory as the price
- A bounded search tree solves k-camera vertex cover in O(2<sup>k</sup> × n), and 10,000 junctions with k = 10 took 1,099 nodes on average where 2.7 × 10³³ sets exist
- DPLL branches on letters and lets unit propagation force the rest, cutting an average 5,015 nodes to 53 at 30 letters
- Random 3-SAT is hardest near the point where half the formulas are satisfiable, 4.3 clauses per letter in our runs
