> A **Fenwick tree**, also called a binary indexed tree, stores partial sums of an array so that both changing one value and asking for a prefix sum take O(log n) steps. It is a compact array that behaves like a tree.

The library's visitor counts are no longer a finished history. The count for today keeps changing as people walk in, and the dean still asks for the total over any stretch of days.

The running totals of [Prefix Sums for Range Queries](/algorithms/prefix-sums) answer each question in O(1), but one change to a day's count invalidates every running total after it, and repairing them costs O(n). Scanning the days for each question costs O(n) too. A Fenwick tree makes both operations cost O(log n).

## Each Slot Covers a Block

The idea is to store, in each slot, the sum of a block of days ending at that slot, and to choose the blocks so that any prefix is a few blocks laid end to end.

Slots are numbered from 1. The block that slot `k` covers has a length equal to the **lowest set bit** of `k`, the value of the rightmost 1 in its binary form, which Python can compute as `k & -k`.

| Slot | Binary | Lowest Bit | Days Covered |
| --- | --- | --- | --- |
| 1 | 001 | 1 | 1 |
| 2 | 010 | 2 | 1 to 2 |
| 3 | 011 | 1 | 3 |
| 4 | 100 | 4 | 1 to 4 |
| 5 | 101 | 1 | 5 |
| 6 | 110 | 2 | 5 to 6 |
| 7 | 111 | 1 | 7 |
| 8 | 1000 | 8 | 1 to 8 |

Here is the same table drawn on a timeline of eight days.

<figure class="chart">
<div class="waterfall" role="img" aria-label="The days covered by each of the eight Fenwick slots: slot 1 covers day 1, slot 2 covers days 1 to 2, slot 3 covers day 3, slot 4 covers days 1 to 4, slot 5 covers day 5, slot 6 covers days 5 to 6, slot 7 covers day 7, and slot 8 covers days 1 to 8">
<div class="wf"><span>Slot 1</span><span class="track"><span class="bar" style="--s: 0%; --w: 12.5%"></span></span><span class="value">day 1</span></div>
<div class="wf"><span>Slot 2</span><span class="track"><span class="bar" style="--s: 0%; --w: 25%"></span></span><span class="value">days 1 to 2</span></div>
<div class="wf"><span>Slot 3</span><span class="track"><span class="bar" style="--s: 25%; --w: 12.5%"></span></span><span class="value">day 3</span></div>
<div class="wf peak"><span>Slot 4</span><span class="track"><span class="bar" style="--s: 0%; --w: 50%"></span></span><span class="value">days 1 to 4</span></div>
<div class="wf"><span>Slot 5</span><span class="track"><span class="bar" style="--s: 50%; --w: 12.5%"></span></span><span class="value">day 5</span></div>
<div class="wf peak"><span>Slot 6</span><span class="track"><span class="bar" style="--s: 50%; --w: 25%"></span></span><span class="value">days 5 to 6</span></div>
<div class="wf peak"><span>Slot 7</span><span class="track"><span class="bar" style="--s: 75%; --w: 12.5%"></span></span><span class="value">day 7</span></div>
<div class="wf"><span>Slot 8</span><span class="track"><span class="bar" style="--s: 0%; --w: 100%"></span></span><span class="value">days 1 to 8</span></div>
</div>
<figcaption>The block each slot covers. The highlighted slots 4, 6 and 7 are the ones a prefix sum up to day 7 adds up</figcaption>
</figure>

## Asking and Updating

To get the sum of days 1 to k, add the block ending at `k`, then jump to the end of the previous block, which is `k` minus its lowest set bit, and repeat until you reach 0. For day 7 the blocks are slot 7 (day 7), slot 6 (days 5 to 6) and slot 4 (days 1 to 4), which together tile days 1 to 7.

To change day `k`, every block that contains day `k` must change. Start at slot `k`, then jump to the next slot whose block contains it, `k` plus its lowest set bit, and keep going until you pass the end. A change to day 5 touches slots 5, 6 and 8.

```python
class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)              # slots 1..n, slot 0 unused

    def add(self, k, x):                       # day k gets x more visitors
        while k <= self.n:
            self.tree[k] += x
            k += k & -k                        # the next block that contains day k

    def prefix(self, k):                       # total for days 1..k
        s = 0
        while k > 0:
            s += self.tree[k]
            k -= k & -k                        # the block just before this one
        return s

    def range_sum(self, l, r):                 # total for days l..r
        return self.prefix(r) - self.prefix(l - 1)
```

The sum of any stretch is the difference of two prefix sums, as in that article. Each loop moves through at most about log₂ n slots, because each step clears or carries the lowest set bit, so both operations are O(log n). For a million days, a prefix sum reads at most 20 slots, and the prefix up to day 999,999 read 12.

The invariant is that `tree[k]` holds the sum of the days in the block ending at `k`, and `add` keeps it true for every block that contains the changed day. We checked the structure against a plain list on 2,000 random sequences of updates and range sums, with sizes from 1 to 20.

A faster start is available when the array already exists. Instead of adding items one at a time, copy the array into the slots and pass each slot's total up to its parent block, the slot `i + (i & -i)`, in one O(n) pass.

## What It Buys

We ran 100,000 operations on 100,000 days, half of them changes and half range sums, with three approaches.

| Approach | Update | Range Sum | Time |
| --- | --- | --- | --- |
| Plain list, add up each range | O(1) | O(n) | 3.88 s |
| Prefix sums, rebuilt after each change | O(n) | O(1) | About 64 s, estimated |
| Fenwick tree | O(log n) | O(log n) | 0.10 s |

Each of the first two makes one operation cheap and the other expensive. The Fenwick tree balances them, and on a mix of the two it was 39 times faster than the list and hundreds of times faster than rebuilding. The more updates, the more it helps.

## Limits

A Fenwick tree is a narrow tool, and that is why it is small.

- **It works for sums, and for other operations that can be undone**, such as counts, because a range answer comes from subtracting two prefixes. It can't answer range maximums, since a maximum can't be subtracted back out. A segment tree handles those
- **It supports point updates and prefix or range queries**. Adding a value to a whole range of days at once needs a second trick or a different tree
- **Indexes start at 1**, which suits the lowest bit trick, so a zero based array needs a shift by one

These limits are the price of simplicity: about ten lines of code, one array of n + 1 numbers, and no node objects. When the question isn't a sum, the next article covers the more general structure, [Segment Trees](/algorithms/segment-trees).

## Key Points

- A Fenwick tree stores in slot `k` the sum of a block of days ending at `k`, whose length is the lowest set bit of `k`
- A prefix sum adds a few blocks, jumping by `k −= k & −k`, and an update changes a few blocks, jumping by `k += k & −k`
- Both take O(log n), and the sum of a stretch is the difference of two prefix sums
- On 100,000 mixed operations it took 0.10 s against 3.88 s for scanning ranges
- It handles sums and counts with point updates, and other questions, like range maximum, need a segment tree
