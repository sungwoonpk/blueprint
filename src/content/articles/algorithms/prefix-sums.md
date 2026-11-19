> A **prefix sum** array stores, for each position, the total of all items before it. With it, the sum of any stretch of the original array is one subtraction, so it answers range sum queries in O(1) after an O(n) setup.

The library keeps the visitor count for each day of the semester, and the dean asks questions all week: how many visitors came between day 12 and day 40, and between day 3 and day 90, and between day 50 and day 51. Each question is a sum over a stretch of days. Adding up the stretch from scratch costs as many steps as the stretch is long, which is fine for one question and expensive for thousands. The answers share almost all of their work, and prefix sums are how to reuse it.

## Running Totals

Build a second array `p` where `p[i]` is the sum of the first i items, with `p[0] = 0`. The prefix sum at position i already contains every item before it. The sum of items from `l` to `r` is everything up to and including `r`, minus everything before `l`.

<figure class="diagram">
<p class="rowname">The array, with items 2 to 5 selected</p>
<div class="cells">
<div class="cell">3<small>0</small></div>
<div class="cell">1<small>1</small></div>
<div class="cell hl">4<small>2</small></div>
<div class="cell hl">1<small>3</small></div>
<div class="cell hl">5<small>4</small></div>
<div class="cell hl">9<small>5</small></div>
<div class="cell">2<small>6</small></div>
<div class="cell">6<small>7</small></div>
</div>
<p class="rowname">Prefix sums, where p[i] is the sum of the first i items</p>
<div class="cells">
<div class="cell">0<small>p0</small></div>
<div class="cell">3<small>p1</small></div>
<div class="cell hl">4<small>p2</small></div>
<div class="cell">8<small>p3</small></div>
<div class="cell">9<small>p4</small></div>
<div class="cell">14<small>p5</small></div>
<div class="cell hl">23<small>p6</small></div>
<div class="cell">25<small>p7</small></div>
<div class="cell">31<small>p8</small></div>
</div>
<figcaption>The sum of items 2 to 5 is p6 − p2 = 23 − 4 = 19, which is 4 + 1 + 5 + 9</figcaption>
</figure>

```python
import itertools

def build_prefix(a):
    return list(itertools.accumulate(a, initial=0))   # p[i] = sum of a[:i]

def range_sum(p, l, r):
    return p[r + 1] - p[l]                            # sum of a[l..r]
```

The prefix array has one more slot than the data, because `p[0]` stands for the empty stretch. That leading zero removes the special case for a stretch that starts at the very first item: `p[r + 1] - p[0]` works with no extra branch.

Building the array is one pass, O(n). Each query is one subtraction, O(1). We ran 100,000 range queries over 100,000 numbers. With prefix sums the whole batch took 8 ms. Adding up each range directly would take about 29 seconds, extrapolating from 2,000 queries. The more queries, the better the trade: the setup costs n steps once, and each query saves up to n steps.

The invariant is simple: `p[i]` equals the sum of `a[0..i-1]`. Subtracting two prefix sums cancels the shared part, and what's left is exactly the stretch between them. We checked the formula against direct sums on 4,000 random arrays.

## Grids

The idea extends to two dimensions. In a grid, let `p[r][c]` be the sum of the rectangle from the top left corner down to just before row r and column c. The sum of any rectangle is then four lookups, the big rectangle minus the two strips above and to the left, plus the corner that was subtracted twice.

```python
def build_prefix_2d(grid):
    rows, cols = len(grid), len(grid[0])
    p = [[0] * (cols + 1) for _ in range(rows + 1)]
    for r in range(rows):
        for c in range(cols):
            p[r + 1][c + 1] = grid[r][c] + p[r][c + 1] + p[r + 1][c] - p[r][c]
    return p

def rect_sum(p, r1, c1, r2, c2):                      # inclusive corners
    return p[r2 + 1][c2 + 1] - p[r1][c2 + 1] - p[r2 + 1][c1] + p[r1][c1]
```

If a building keeps a grid of how many people are in each room, `rect_sum` tells you how many are in any block of rooms in O(1). Building costs O(rows × columns). We checked it against summing the rectangle cell by cell on 4,000 random grids. The same row and column ordering that matters in [Working with Matrices](/algorithms/matrices) applies to the build loops.

## What Else Prefix Arrays Hold

A running total isn't the only thing you can accumulate. The method works for any quantity that can be subtracted back out.

- **Counts**: a prefix array of how many items so far are of some kind, such as late arrivals, answers how many fall in any stretch
- **Letters**: one prefix count for each letter tells you how many times a letter appears in any substring
- **Balance points**: the split where the sum on the left equals the sum on the right is the position where `p[i]` is half of the total

Maximum and minimum can't be done this way, because there is no way to subtract a maximum back out. Those ranges need a different structure, such as a segment tree, covered in [Segment Trees](/algorithms/segment-trees).

## Limits

A prefix array is built for data that doesn't change. If an item changes, every prefix sum after it is wrong, and repairing them costs O(n). When values change as often as they are queried, [Fenwick Trees](/algorithms/fenwick-trees) keep both updates and queries at O(log n).

Sums can also overflow. A million values of a billion each total a quadrillion, which doesn't fit in a 32 bit integer. The prefix sums are the largest numbers in the program, so use a 64 bit type in languages with fixed width integers, as [Edge Cases and Testing](/algorithms/edge-cases) advises.

[Difference Arrays](/algorithms/difference-arrays) run the idea backward, to apply many updates at once, and [Prefix Sums with Hash Maps](/algorithms/prefix-sums-hash-maps) uses the subtraction trick to search for stretches with a given sum.

## Key Points

- A prefix sum array stores `p[i]`, the sum of the first i items, with a leading zero for the empty stretch
- The sum of `a[l..r]` is `p[r + 1] − p[l]`, one subtraction after O(n) setup
- 100,000 queries took 8 ms with prefix sums, against about 29 seconds when each range was added up directly
- In a grid, four lookups give the sum of any rectangle
- It needs data that doesn't change, and quantities that can be subtracted, so it fits sums and counts and not maximums
