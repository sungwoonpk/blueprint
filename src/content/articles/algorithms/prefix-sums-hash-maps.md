> Combining **prefix sums with a hash map** finds stretches of an array with a given total, even when the array has negative numbers. Each running total is checked against a dictionary of the totals seen earlier, so one pass finds every stretch.

The cafeteria card of a student goes up with deposits and down with purchases. The daily changes in dollars are 2, 4, −2, 1, 3 and 2, and the student asks: over how many stretches of consecutive days did the balance change by exactly +5? The [variable window](/algorithms/variable-window) can't answer this, because the numbers include a negative one, and a negative number breaks its rule that growing the window only raises the total. A different view of the same problem works.

## A Stretch Is a Difference of Two Prefixes

From [Prefix Sums for Range Queries](/algorithms/prefix-sums), the sum of the stretch from `i` to `j` is `p[j + 1] − p[i]`. We want that to equal the target k. Rearrange it: `p[i] = p[j + 1] − k`.

So when the scan reaches a position with running total `P`, the number of stretches ending here that sum to k equals how many earlier running totals equal `P − k`. Searching the past for a particular value is a job for a hash map: keep a count of every running total seen so far, and look up `P − k` in O(1).

```python
from collections import defaultdict

def count_subarrays_with_sum(a, k):
    seen = defaultdict(int)
    seen[0] = 1                    # the empty prefix, before any item
    total = count = 0
    for x in a:
        total += x
        count += seen[total - k]   # stretches ending here that sum to k
        seen[total] += 1
    return count
```

The map starts with `{0: 1}`, which stands for the empty prefix. Without it, a stretch that begins at the first day would never be counted, since there would be no earlier total of 0 to match.

Here is the run on 2, 4, −2, 1, 3, 2 with k = 5.

| Item | Running Total | Looking For | Earlier Totals Equal to It |
| --- | --- | --- | --- |
| 2 | 2 | −3 | 0 |
| 4 | 6 | 1 | 0 |
| −2 | 4 | −1 | 0 |
| 1 | 5 | 0 | 1 |
| 3 | 8 | 3 | 0 |
| 2 | 10 | 5 | 1 |

Two matches appear. At the fourth item the running total is 5 and an earlier total of 0, the empty prefix, exists, so the first four days sum to 5: 2 + 4 − 2 + 1. At the last item the total is 10 and the earlier total 5 exists, so the last two days sum to 5: 3 + 2. The answer is 2.

The invariant is that before each item, `seen` holds the count of each running total over the prefixes strictly before it. Every stretch ending at the current item is paired with exactly one earlier prefix, so none is missed or counted twice. We compared the function with checking every start and end pair on 4,000 random arrays with negative numbers.

## The Speedup

The pair-by-pair approach is O(n²). The hash map version makes one pass of O(1) work per item. We counted stretches summing to 7 in random arrays of small positive and negative numbers.

| Items | Hash Map | All Start and End Pairs |
| --- | --- | --- |
| 2,000 | 0.16 ms | 0.05 s |
| 4,000 | 0.23 ms | 0.22 s |
| 8,000 | 0.48 ms | 0.86 s |

The last column quadruples with each doubling, and the first one roughly doubles. The cost is memory: the dictionary may hold a key for every distinct running total, up to n of them.

## Variations

The pattern of looking up an earlier prefix covers a family of problems with small changes.

**The longest stretch with sum k.** Store the first position where each running total appeared, not a count. For each position, look up `total − k` and measure the distance back to that first position. Keep the earliest, so the stretch is as long as possible.

```python
def longest_with_sum(a, k):
    first = {0: -1}                    # the empty prefix ends at index -1
    total = best = 0
    for i, x in enumerate(a):
        total += x
        if total - k in first:
            best = max(best, i - first[total - k])
        first.setdefault(total, i)     # keep only the earliest position
    return best
```

We compared it with checking every stretch on 4,000 random arrays.

**Sums divisible by m.** Two prefixes with the same remainder modulo m differ by a multiple of m, so the stretch between them has a total divisible by m. Use `total % m` as the key instead of `total`.

**Equal counts of two kinds.** To find stretches with as many zeros as ones, replace each 0 by −1. A stretch with equal counts sums to 0, which is the case above with k = 0.

## When to Choose Which Tool

The tools for sums over stretches differ in what they allow.

| Situation | Tool |
| --- | --- |
| Many sum queries on fixed data | [Prefix Sums](/algorithms/prefix-sums) |
| All positive numbers, stretch with a condition | [Variable Size Sliding Window](/algorithms/variable-window) |
| Negative numbers allowed, sum exactly k | Prefix sums with a hash map |
| Largest sum of any stretch | [Kadane's Algorithm](/algorithms/kadane) |

The window is lighter on memory when it applies. The hash map approach is the general one, since it needs no assumption about the signs.

## Key Points

- A stretch's sum is the difference of two prefix sums, so a stretch with sum k ends at a position whose earlier prefix equals the current total minus k
- A dictionary of counts of earlier running totals finds all such stretches in one O(n) pass, and it works with negative numbers
- Start the dictionary with `{0: 1}` so stretches that begin at the first item are counted
- Storing the first position of each total finds the longest such stretch, and using remainders finds stretches divisible by m
- The cost is O(n) memory for the dictionary, which is the price of not assuming positive numbers
