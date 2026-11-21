> A **segment tree** stores an answer for a block of the array at every node: the leaves are single items, and each parent combines its two children. It handles point updates and range queries for sums, minimums, maximums and more, each in O(log n).

The library's visitor counts are still changing during the day, and now the dean asks a question about the peak: what was the busiest single day between day 12 and day 40? The structure of [Fenwick Trees](/algorithms/fenwick-trees) can't help. It gets a range answer by subtracting two prefix sums, and there is no way to subtract a maximum. The structure has to hold the maximum of blocks directly.

## A Tree of Block Answers

Split the array in half, and each half in half, down to single items. Give every block a node that stores the answer for that block. The answer for a block is the combination of the answers for its two halves, so building the tree takes one pass from the bottom up.

<figure class="diagram">
<div class="flow packets tree">
<div class="node">9<small>days 0 to 3</small></div>
</div>
<div class="flow packets tree">
<div class="node">4<small>days 0 to 1</small></div>
<div class="node">5<small>days 2 to 3</small></div>
</div>
<div class="flow packets tree">
<div class="node">3</div>
<div class="node hl">1</div>
<div class="node hl">4</div>
<div class="node">1</div>
</div>
<figcaption>A segment tree for the sum of four days, 3, 1, 4 and 1. The sum of days 1 to 2 is the two outlined leaves, 1 + 4 = 5, without touching any other node</figcaption>
</figure>

The tree is complete, so it lives in an array with no links, as in [Binary Trees](/algorithms/binary-trees). The array has 2n slots. Slot 1 is the root, the children of slot `k` are `2k` and `2k + 1`, and the n items sit in the last n slots, from `n` to `2n − 1`. The array for the example is `[·, 9, 4, 5, 3, 1, 4, 1]`, with slot 0 unused.

## Update and Query

An update changes a leaf, then recomputes each ancestor from its two children on the way to the root, a path of about log₂ n nodes.

A query for days `l` to `r` starts at the two leaves and climbs. At each level, if the left end is a right child, its node belongs to the answer, so take it and step right.

If the right end is a left child, take its node and step left. Then both ends move up to their parents. The nodes taken are blocks that tile the range exactly, and there are at most two for each level.

```python
class SegTree:
    def __init__(self, a, combine, identity):
        self.n, self.f, self.e = len(a), combine, identity
        self.t = [identity] * self.n + list(a)               # leaves at n .. 2n - 1
        for i in range(self.n - 1, 0, -1):
            self.t[i] = combine(self.t[2 * i], self.t[2 * i + 1])

    def update(self, i, value):                              # a[i] = value, zero based
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = self.f(self.t[2 * i], self.t[2 * i + 1])

    def query(self, l, r):                                   # combine a[l..r], inclusive
        lo, hi = l + self.n, r + self.n + 1
        left = right = self.e
        while lo < hi:
            if lo & 1:
                left = self.f(left, self.t[lo])
                lo += 1
            if hi & 1:
                hi -= 1
                right = self.f(self.t[hi], right)
            lo //= 2
            hi //= 2
        return self.f(left, right)
```

For the four days, a query for days 1 to 2 takes the leaves at slots 5 and 6 and returns 1 + 4 = 5. The two outputs, `left` and `right`, keep the pieces in order. We also ran it with string concatenation, where order matters, and it matched joining the letters directly. Building costs O(n), and each update and each query costs O(log n).

The invariant is that `t[k]` holds the combination of the block under node `k`, and `update` restores it along the one path whose blocks contain the changed item. We checked sums, minimums and maximums against plain Python on 2,000 random sequences of updates and queries, with sizes from 1 to 20, so this version isn't limited to a power of two.

## Any Combinable Operation

The tree doesn't depend on addition. It needs a way to combine two block answers, and an **identity**, the answer for an empty block, which the query uses for the pieces it hasn't found yet. The operation must be associative, meaning that combining in any grouping gives the same result.

| Question | Combine | Identity |
| --- | --- | --- |
| Range sum | Add | 0 |
| Range minimum | Smaller of the two | Infinity |
| Range maximum | Larger of the two | Negative infinity |
| Range greatest common divisor | gcd | 0 |

So `SegTree(visits, max, -10**9)` answers the dean's question about the busiest day in any stretch, and `SegTree(visits, min, 10**9)` finds the quietest.

## What It Buys

We ran 100,000 operations on 100,000 days, half of them point updates and half range minimum queries, once with a segment tree and once by scanning the range for each question.

| Approach | Time |
| --- | --- |
| Scan the range for each query | 15 s |
| Segment tree | 0.15 s |

With ranges of random length, the tree was about 100 times faster, and the gap widens as the array grows, since the scan costs the length of the range and the tree costs its logarithm. The memory is 2n numbers, and a segment tree finds the position of a minimum too, by descending from the root toward the smaller child.

## Choosing a Range Tool

Several structures answer range questions, and each fits a different situation.

| Situation | Tool |
| --- | --- |
| Sums, data never changes | [Prefix Sums for Range Queries](/algorithms/prefix-sums) |
| Many range additions, read at the end | [Difference Arrays](/algorithms/difference-arrays) |
| Sums or counts with point updates | [Fenwick Trees](/algorithms/fenwick-trees) |
| Minimum, maximum or gcd with point updates | Segment tree |
| Minimum or maximum, data never changes | A sparse table, which answers in O(1) after O(n log n) preparation |
| Adding to a whole range and asking about ranges | Segment tree with lazy updates |

The last row extends the idea. To add a value to a whole range in O(log n), a node stores a pending change for its whole block and passes it to its children only when a later operation needs to look inside. This is called lazy propagation, and it builds on the same tree.

## Key Points

- A segment tree stores the answer for a block at each node, with leaves for single items and each parent combining its two children
- In an array of 2n slots, node `k` has children `2k` and `2k + 1`, and the items are in slots `n` to `2n − 1`
- Update changes a leaf and recomputes its ancestors, and a query climbs from both ends taking the blocks that tile the range, each in O(log n)
- Any associative operation with an identity works, such as sum, minimum, maximum and gcd
- It was about 100 times faster than scanning ranges on 100,000 mixed operations, and it covers the cases a Fenwick tree can't, such as range maximum
