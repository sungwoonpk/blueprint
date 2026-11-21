> A **longest increasing subsequence** (LIS) is the longest list of items taken from a sequence, in their original order and not necessarily next to each other, whose values keep strictly rising. Dynamic programming finds its length in O(n²) by asking, for each item, how long a rising run can end there. A cleverer table that keeps the smallest possible last value for each length does it in O(n log n) with binary search.

A fitness tracker records step counts in thousands for eight days: 5, 2, 8, 6, 3, 6, 9, 7. What is the longest run of days, skipping any days we like, where the count keeps going up? Days 2, 5, 6 and 7 give 2, 3, 6, 9, four days. Can we get five?

The days don't have to be next to each other, so this isn't a window problem, and it's easy to get wrong by hand. The recurrence answers it in a few lines.

## Ending at Each Day

<figure class="diagram">
<div class="cells"><div class="cell">5<small>day 1</small></div><div class="cell hl">2<small>day 2</small></div><div class="cell">8<small>day 3</small></div><div class="cell">6<small>day 4</small></div><div class="cell hl">3<small>day 5</small></div><div class="cell hl">6<small>day 6</small></div><div class="cell hl">9<small>day 7</small></div><div class="cell">7<small>day 8</small></div></div>
<figcaption>Eight days of step counts in thousands, 5, 2, 8, 6, 3, 6, 9, 7. The outlined days 2, 5, 6 and 7, with 2, 3, 6 and 9, are a longest increasing subsequence, 4 days long. The days need not be next to each other</figcaption>
</figure>

Let best(i) be the length of the longest increasing subsequence that ends exactly at day i. It consists of day i, and before it a subsequence that ends at an earlier day j with a smaller count. Choose the j that gives the longest.

best(i) = 1 + the largest best(j) over days j before i with a smaller count, or 1 if no such day exists

The answer is the largest value of best over all days.

```python
def lis_length(a):
    n = len(a)
    best = [1] * n
    for i in range(n):
        for j in range(i):
            if a[j] < a[i] and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
    return max(best, default=0)
```

For the eight days, the values of best are 1, 1, 2, 2, 2, 3, 4, 4. Day 7, with 9 steps, ends a run of 4 (2, 3, 6, 9), and day 8, with 7 steps, ends a run of 4 as well (2, 3, 6, 7). The longest has length 4.

Each day looks at all earlier days, so the time is O(n²), and the table has one entry per day. Keeping, for each day, the earlier day that gave the best value lets us walk back and list the run, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions). It lists 2, 3, 6, 9.

We checked this against a brute force over every subset of the days, on 1,500 random lists of up to 13 numbers from 1 to 8, with repeats. The lengths matched, and also matched the faster method below.

## The Smallest Tail for Each Length

The O(n²) work is looking at all earlier days. A different table avoids that. For each length k, keep the smallest value that can end an increasing subsequence of length k among the days seen so far. Call this list tails.

Two facts make it work. First, the list is always strictly increasing: if a subsequence of length k + 1 ends at v, then dropping its last item gives one of length k that ends at something smaller, so the smallest tail for length k is below the smallest for k + 1.

Second, a smaller tail is always at least as good, since anything that can follow a large tail can also follow a smaller one.

A new value x updates the list at one place. Find the first tail that is at least x. Replace it with x, since x gives a subsequence of that length that ends lower. If every tail is smaller than x, then x extends the longest run by one, and joins the list at the end. Because the list is sorted, binary search finds the place.

```python
import bisect

def lis_length_fast(a):
    tails = []
    for x in a:
        i = bisect.bisect_left(tails, x)       # the first tail that is at least x
        if i == len(tails):
            tails.append(x)                    # x extends the longest run
        else:
            tails[i] = x                       # a lower end for runs of length i + 1
    return len(tails)
```

| Day | Count | Tails After |
| --- | --- | --- |
| 1 | 5 | 5 |
| 2 | 2 | 2 |
| 3 | 8 | 2, 8 |
| 4 | 6 | 2, 6 |
| 5 | 3 | 2, 3 |
| 6 | 6 | 2, 3, 6 |
| 7 | 9 | 2, 3, 6, 9 |
| 8 | 7 | 2, 3, 6, 7 |

The list's length at the end, 4, is the answer. The list itself isn't always a real run. At the end it holds 2, 3, 6, 7, and 2, 3, 6, 7 happens to be a real run here, but each tail comes from the best run of its length so far, and those runs can use different days, so in general the list mixes them.

To list a real run, record for each tail which day it came from and which tail was just below it when it was placed, and walk back.

Each day costs one binary search, O(log n), so the total is O(n log n). We checked it against the quadratic version and the brute force on the same 1,500 lists. We also checked the version that allows equal values, by using `bisect_right` in place of `bisect_left`: for the days 3, 3, 3, 3, a strictly increasing run has length 1 and a non-decreasing one has length 4.

## How Much Faster

| Days | Quadratic Method | Tails Method |
| --- | --- | --- |
| 1,000 | 20 ms | 0.1 ms |
| 2,000 | 60 ms | 0.2 ms |
| 4,000 | 250 ms | 0.3 ms |

The quadratic time grows about 4 times when the length doubles, and the tails method hardly moves. Both returned the same lengths: 55, 78 and 122. The tails method took 0.01 s for 100,000 values and 0.18 s for a million.

## A Surprise About Random Sequences

In a random shuffle of the numbers 1 to n, we might expect the longest increasing run to be short or long. It is neither. For n = 100,000 it was 632, and for n = 1,000,000 it was 1,980. Compare with 2√n: 632 and 2,000.

The longest increasing subsequence of a random shuffle is about twice the square root of its length. A sorted list has an LIS of n, which for 1,000 values is 1,000, and a descending list has 1.

## Other Forms of the Same Problem

The same table solves the longest chain of nested envelopes, or boxes: sort by width, with equal widths ordered by falling height, then find the LIS of the heights. [Sorting as a First Step](/algorithms/sorting-first) is a good companion. The longest non-decreasing subsequence uses `bisect_right`. And the length of the LIS also equals the length of the longest common subsequence of the sequence and its sorted copy when all values differ, which leads to [Longest Common Subsequence and Edit Distance](/algorithms/lcs-edit-distance).

## Key Points

- A longest increasing subsequence keeps the original order and skips freely, and best(i) = 1 + the largest best(j) over earlier smaller values gives the length in O(n²)
- For step counts 5, 2, 8, 6, 3, 6, 9, 7 the longest run is 4 days long, 2, 3, 6, 9, and the table matched a brute force over all subsets on 1,500 random lists
- Keeping the smallest tail for each length gives a sorted list, and each new value either extends it or replaces the first tail at least as large, found by binary search, for O(n log n)
- The list of tails gives the length but not the run itself, so a real run needs the days recorded as well
- In random shuffles the longest run was close to 2√n, 1,980 for a million values, and the tails method took 0.18 s for that
