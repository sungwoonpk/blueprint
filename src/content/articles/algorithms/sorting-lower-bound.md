> A **comparison sort** learns about its input only by asking whether one item is smaller than another. Any comparison sort needs at least log₂(n!) comparisons in the worst case, which grows like n log n, so merge sort can't be beaten by more than a small constant factor.

Merge sort and quick sort both take about n log n steps. A natural question is whether a cleverer algorithm could sort in about n steps. For sorts that work by comparing items, the answer is no, and the proof is short. It works like a game of twenty questions.

## Sorting as Twenty Questions

Think of a sorting algorithm as a player who has to find out which of the possible orderings the input is in. The only questions allowed are comparisons, "is a less than b?", and each has two answers. Whatever the algorithm does, its behavior can be drawn as a **decision tree**: each internal node is a comparison, the two branches are the two answers, and each leaf is the ordering the algorithm announces.

Here is a decision tree for sorting three items a, b and c. Each row holds the nodes at one depth, from left to right.

<figure class="diagram">
<div class="flow packets tree">
<div class="node">a &lt; b?</div>
</div>
<div class="flow packets tree">
<div class="node">b &lt; c?</div>
<div class="node">a &lt; c?</div>
</div>
<div class="flow packets tree">
<div class="node hl">abc</div>
<div class="node">a &lt; c?</div>
<div class="node hl">bac</div>
<div class="node">b &lt; c?</div>
</div>
<div class="flow packets tree">
<div class="node hl">acb</div>
<div class="node hl">cab</div>
<div class="node hl">bca</div>
<div class="node hl">cba</div>
</div>
<figcaption>Left branches mean yes, and right branches mean no. The six outlined leaves are the six orderings of three items. Sorting three items takes at most three comparisons</figcaption>
</figure>

An input follows one path from the root to a leaf, and the number of comparisons it costs is the length of that path. The worst case is the longest path, the height of the tree.

## Counting Leaves

The tree has to be able to announce every ordering the input might be in. If one ordering had no leaf, then an input in that ordering would get the wrong answer. For n distinct items there are n! orderings, so the tree needs at least n! leaves.

A binary tree of height h has at most 2ʰ leaves, because each level can at most double the count. So 2ʰ ≥ n!, which means h ≥ log₂(n!). That is the lower bound: some input forces at least log₂(n!) comparisons, rounded up.

| Items | Possible Orderings | Worst Case Needs at Least |
| --- | --- | --- |
| 3 | 6 | 3 |
| 4 | 24 | 5 |
| 5 | 120 | 7 |
| 8 | 40,320 | 16 |
| 10 | 3,628,800 | 22 |

For 1,000 items the bound is 8,530 comparisons, and for a million it is 18,488,885. We also checked the small cases the other way. A search over every possible comparison strategy for 2, 3, 4 and 5 items found that the best algorithm needs 1, 3, 5 and 7 comparisons in the worst case, exactly the ceiling of log₂(n!). The bound can be reached for small n.

## From log₂(n!) to n log n

The factorial is awkward to work with, but it is easy to bound from below. Half of the factors in n! are at least n/2, so n! ≥ (n/2)^(n/2), and taking logs gives log₂(n!) ≥ (n/2) log₂(n/2), which is on the order of n log n. A sharper estimate is log₂(n!) ≈ n log₂ n − 1.44n. For 1,000 items, n log₂ n is 9,966 and the estimate gives 8,523, close to the exact 8,530.

So every comparison sort takes Ω(n log n) comparisons in the worst case, and the same is true on average over random orderings. It also holds for randomized algorithms. The argument doesn't look at how the algorithm decides what to compare, only that it can learn nothing else about the input.

## How Close Merge Sort Gets

The bound would be a curiosity if no algorithm came near it. Merge sort does. We counted its comparisons on random lists and set them beside the lower bound.

| Items | Merge Sort | Lower Bound |
| --- | --- | --- |
| 100 | 547 | 525 |
| 1,000 | 8,708 | 8,530 |
| 10,000 | 120,488 | 118,459 |

At 10,000 items merge sort used about 1.7% more comparisons than the minimum any comparison sort could use. So the n log n barrier is real, and merge sort sits just above it. Python's built-in sort, which takes more care with the merge order, reports staying about 1% above the bound on random data.

## What the Bound Does and Doesn't Say

The same counting argument shows that binary search is optimal. Searching a sorted list of n items has n + 1 possible answers, an index or "not found", so a decision tree needs at least that many leaves and a height of at least log₂(n + 1). Binary search makes about that many comparisons, which is the subject of [Binary Search](/algorithms/binary-search).

The bound applies to a particular kind of algorithm. It says nothing about sorts that look inside the keys, such as counting items by their value, which [Counting, Radix and Bucket Sort](/algorithms/linear-time-sorting) shows can run in linear time when the keys are small integers. Breaking a lower bound means leaving the model, not finding a better comparison sort.

The same style of argument shows up whenever we want to say that a problem can't be solved faster. It describes the problem and not any one algorithm, which is how we know that effort spent looking for an O(n) comparison sort is wasted.

## Key Points

- A comparison sort can be drawn as a decision tree, where each node is a comparison and each leaf is an ordering
- The tree needs n! leaves and has at most 2ʰ leaves at height h, so the worst case takes at least log₂(n!) comparisons
- log₂(n!) is about n log₂ n − 1.44n, so every comparison sort is Ω(n log n)
- Merge sort uses within a few percent of the minimum number of comparisons on random data
- The bound applies only to sorts that compare items, and sorts that read key values can beat it
