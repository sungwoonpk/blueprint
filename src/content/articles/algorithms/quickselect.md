> **Quickselect** finds the k-th smallest item of an unsorted list without sorting it. It partitions around a pivot like quick sort, then follows only the side that holds the answer, which gives O(n) expected time.

A professor wants the median of 1,000,000 exam scores. Another team wants the 95th percentile response time of a service. Sorting a list gives either answer, but it also gives the position of every other item, which nobody asked for. If only one item is needed, it should be possible to do less work.

## Find One Item, Not the Whole Order

The **selection problem** is to find the item that would sit at index k if the list were sorted. With k = 0 that is the minimum, with the last index it is the maximum, and with the middle index it is the median.

Sorting solves it in O(n log n). The minimum needs only one pass, O(n), and that can't be improved, because an algorithm that skips an item can't know whether the skipped item was the smallest. The same argument gives a lower bound of Ω(n) for any k. So the question is whether the median can be found in about n steps, closer to the minimum than to a sort.

It can, using the partitioning step from [Quick Sort](/algorithms/quick-sort). After a partition around a pivot, the pivot sits at its final index p. If p equals k, the pivot is the answer.

If k is smaller, the answer is somewhere on the left, and if k is larger, somewhere on the right. The other side doesn't need to be looked at again. It is binary search over an unsorted list, where the pivot plays the role of the midpoint.

## A Walkthrough

Take 9, 3, 7, 1, 8, 2, 6 and find the 5th smallest item, which is index 4 in sorted order. Items to ignore are faded, and the outlined item is the pivot for each round.

<figure class="diagram">
<p class="rowname">Start, pivot is 6</p>
<div class="cells">
<div class="cell">9</div>
<div class="cell">3</div>
<div class="cell">7</div>
<div class="cell">1</div>
<div class="cell">8</div>
<div class="cell">2</div>
<div class="cell hl">6</div>
</div>
<p class="rowname">6 lands at index 3, so look right. Pivot is 9</p>
<div class="cells">
<div class="cell dim">3</div>
<div class="cell dim">1</div>
<div class="cell dim">2</div>
<div class="cell dim">6</div>
<div class="cell">8</div>
<div class="cell">7</div>
<div class="cell hl">9</div>
</div>
<p class="rowname">9 lands at index 6, so look left. Pivot is 7</p>
<div class="cells">
<div class="cell dim">3</div>
<div class="cell dim">1</div>
<div class="cell dim">2</div>
<div class="cell dim">6</div>
<div class="cell">8</div>
<div class="cell hl">7</div>
<div class="cell dim">9</div>
</div>
<p class="rowname">7 lands at index 4, the answer</p>
<div class="cells ptrs">
<div class="cell dim">3</div>
<div class="cell dim">1</div>
<div class="cell dim">2</div>
<div class="cell dim">6</div>
<div class="cell hl" data-ptr="answer">7</div>
<div class="cell dim">8</div>
<div class="cell dim">9</div>
</div>
<figcaption>Three partitions found the 5th smallest item without sorting the list</figcaption>
</figure>

Each round discarded part of the list, and the rounds got shorter. No sorting of the discarded parts ever happened.

## The Code

The partition function is the one from quick sort. The loop keeps a window `lo` to `hi` that must contain index k, and shrinks it after each partition.

```python
def quickselect(a, k):
    """Return the item that would be at index k if a were sorted."""
    lo, hi = 0, len(a) - 1
    while True:
        if lo == hi:
            return a[lo]
        r = random.randint(lo, hi)        # a random pivot, moved to the end
        a[r], a[hi] = a[hi], a[r]
        p = partition(a, lo, hi)
        if p == k:
            return a[p]
        if k < p:
            hi = p - 1
        else:
            lo = p + 1
```

The loop has the invariant that the item we want is at index k when the list is sorted, and index k is inside `lo..hi`. Partitioning keeps that true: everything left of `p` is smaller and everything right is larger, so the target lies on the side that contains k.

It rearranges `a` as it goes, so pass a copy if the original order matters. We compared the result with `sorted(x)[k]` on 5,000 random lists with repeated values, and the two matched on all of them.

## Why It Is Linear on Average

Each round costs time proportional to the size of the window, and the window shrinks. With a random pivot, there is a good chance that the pivot lands in the middle half of the window, which leaves at most three quarters of it. The sizes behave like n, then about 3n/4, then 9n/16, and a geometric series like that adds up to a constant multiple of n, not n log n.

We counted comparisons on random lists, as the mean of 60 to 300 lists for each size. The minimum stayed near 2n, the 95th percentile near 2.4n, and the median was about 3.4n, close to the 2n(1 + ln 2) that the analysis of random pivots gives.

| Items | Minimum | 95th Percentile | Median |
| --- | --- | --- | --- |
| 1,000 | 2.0n | 2.4n | 3.5n |
| 10,000 | 2.0n | 2.4n | 3.4n |
| 100,000 | 1.9n | 2.4n | 3.6n |

The cost per item doesn't grow as the list grows, while sorting's does: n log₂ n is 13 comparisons for each item at 10,000 items and 17 at 100,000. On a list of a million random integers, our Python quickselect took 0.10 s, and `sorted(data)[k]` took 0.14 s, even though `sorted` is written in C. The same job with our Python merge sort took 1.87 s.

## When It Goes Wrong

Like quick sort, quickselect can be unlucky. If each pivot is the smallest or largest item, the window shrinks by one each round and the cost is O(n²). A random pivot makes that unlikely. Many equal items are a second trap with this partition, which sends equal items to the right: on 2,000 equal items, finding the median took 1,500,499 comparisons. Three way partitioning removes the problem, as it does for quick sort.

A deterministic algorithm called median of medians picks a pivot that is guaranteed to be good, and so finds the k-th item in O(n) time in the worst case. Its constants are large enough that practical code uses a random pivot instead.

## Where It Is Used

- **Medians and percentiles**: a summary statistic from a large list without sorting it, as in the 95th percentile of the response times
- **Thresholds**: the value above which only the largest k items sit, a step toward [Top K Elements](/algorithms/top-k), where heaps are the other main tool
- **Trimmed statistics**: dropping the lowest and highest few percent before averaging
- **Library functions**: C++ has `std::nth_element` and NumPy has `numpy.partition`, which do this job directly

Quickselect also leaves the list partially ordered: after it returns, everything before index k is no larger than the answer and everything after is no smaller. That is the same shape as one round of quick sort, which is why the two algorithms are so alike.

## Key Points

- Selection finds the k-th smallest item, and sorting solves it but does more work than the problem needs
- Quickselect partitions around a pivot and continues only into the side that contains index k
- With a random pivot, the expected cost is O(n): about 2n comparisons for the minimum and about 3.4n for the median
- The worst case is O(n²) for unlucky pivots, and a deterministic median of medians version guarantees O(n) with larger constants
- It is the tool for medians and percentiles, and a library version exists in many languages
