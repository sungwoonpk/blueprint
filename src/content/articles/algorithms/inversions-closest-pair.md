> **Counting inversions** finds how many pairs in a list are out of order, and the **closest pair** problem finds the two nearest points among many. Both look quadratic at first, since they compare pairs, and both drop to O(n log n) with divide and conquer, by handling the pairs that cross between the halves in linear time with the help of sorted order.

Two friends each rank the same five songs. A music site wants one number for how differently they listen. One natural choice is to count the pairs of songs that the two friends put in opposite order. If they agree on everything, the count is 0. If one ranking is the reverse of the other, every pair disagrees.

A pair that disagrees is an **inversion**, and counting inversions is a measure of how far a list is from being sorted.

## What an Inversion Is

In a list `a`, an inversion is a pair of positions i < j with a[i] > a[j]. The list 3, 1, 4, 2, 5 has three: (3, 1), (3, 2) and (4, 2). A sorted list has none. A reversed list of n items has all n(n − 1) / 2 pairs inverted.

A random list lands halfway between, near n(n − 1) / 4: the mean of 20 random lists of 1,000 items was 248,721, against a predicted 249,750.

The same count shows up in other places. Insertion sort moves an item left past exactly the larger items before it, so its number of shifts equals the number of inversions. We confirmed that on 500 random lists, duplicates included. That is why insertion sort is fast on nearly sorted input, as [Bubble, Selection and Insertion Sort](/algorithms/simple-sorts) showed.

Brute force checks all pairs. For 8,000 items that took 1.05 s in Python, and the time grows 4 times for each doubling.

## Split, Count, Merge

Split the list in half. Every inversion falls into one of three groups: both items in the left half, both in the right half, or one in each. The first two groups are the same problem on a smaller list, so the recursion counts them. The question is how to count the third group fast.

Pairs that cross are easy to count when both halves are sorted. Merge them, as [Merge Sort](/algorithms/merge-sort) does. Whenever an item of the right half is placed in the output before the remaining items of the left half, it is smaller than all of them, and each of them is earlier in the original list. That is one inversion for each item still waiting in the left half.

```python
def sort_count(a):                          # returns the sorted list and the inversions
    if len(a) <= 1:
        return a[:], 0
    mid = len(a) // 2
    left, count_l = sort_count(a[:mid])
    right, count_r = sort_count(a[mid:])
    merged, i, j, crossing = [], 0, 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
            crossing += len(left) - i       # right[j] passed everything left in `left`
    merged.extend(left[i:]); merged.extend(right[j:])
    return merged, count_l + count_r + crossing
```

The function returns the sorted list as well as the count, because the parent needs sorted halves to merge. It is merge sort with one added line. Taking the left item on ties, `<=`, means equal items aren't counted, which matches the definition.

For 3, 1, 4, 2, 5, the recursion has three merges.

| Merge | Output | Crossing Inversions |
| --- | --- | --- |
| 3 with 1 | 1, 3 | 1, the pair 3 and 1 |
| 4 with 2, 5 | 2, 4, 5 | 1, the pair 4 and 2 |
| 1, 3 with 2, 4, 5 | 1, 2, 3, 4, 5 | 1, the pair 3 and 2 |

The total is 1 + 1 + 1 = 3. The recurrence is T(n) = 2 T(n / 2) + n, the same as merge sort, which [Solving Recurrences with the Master Theorem](/algorithms/recurrences) solves to O(n log n).

We compared the function with brute force, with insertion sort's shift count, and with a count built on a Fenwick tree, on 500 random lists with repeated values. All four agreed.

| Items | Brute Force | Merge and Count |
| --- | --- | --- |
| 2,000 | 56 ms | 2 ms |
| 8,000 | 1.05 s | 10 ms |
| 100,000 | about 160 s (estimate) | 0.15 s |
| 1,000,000 | about 4.5 hours (estimate) | 1.8 s |

The Fenwick tree version, from [Fenwick Trees](/algorithms/fenwick-trees), also does the job in O(n log n), and it took 1.8 s on a million items as well. It reads each item in turn and asks how many earlier items are larger. Divide and conquer wins when the combine step can reuse a sorted order.

Other counts follow the same plan: to count pairs with a[i] > 2 × a[j], run a two pointer pass over the two sorted halves before merging them. We checked that variant against brute force on 300 random lists.

## The Closest Pair of Points

A map service stores n points and wants the two that are nearest to each other, say two stores that are most likely to compete. Checking all n(n − 1) / 2 pairs is the brute force, and for 8,000 random points it took 2.05 s.

Sorting by x and comparing neighbors misses pairs, because two points close together can be far apart in x order when others lie between them in x but far away in y. Sorting by y has the opposite problem. Cutting the plane into four quadrants doesn't give equal pieces, since the points may bunch into one corner.

The reliable split is a vertical line through the median x, with half the points on each side. Solve each side recursively, and let δ be the smaller of the two closest distances found.

## The Crossing Pairs

The remaining question is whether a pair with one point on each side is closer than δ. If it is, both of its points are within δ of the dividing line. So only the points in a strip of width 2δ around the line matter.

Sort the strip points by y. For each, compare only with the points above it that are less than δ higher. The key fact is that only a few points can be there. Take the rectangle of width 2δ and height δ above a point, and cut it into eight squares with sides of δ / 2.

Two points on the same side of the line are at least δ apart, and a square that small has a diagonal shorter than δ, so each square holds at most one point. The rectangle holds at most 7 other points, so the number of comparisons per point is a constant.

<figure class="diagram">
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell done">C</div><div class="cell done"></div><div class="cell done"></div><div class="cell done"></div><div class="cell"></div><div class="cell">H</div>
</div>
<div class="cells board">
<div class="cell">A</div><div class="cell"></div><div class="cell done"></div><div class="cell done"></div><div class="cell done"></div><div class="cell done"></div><div class="cell"></div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell done"></div><div class="cell done"></div><div class="cell hl">E</div><div class="cell done"></div><div class="cell">G</div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell done"></div><div class="cell hl">D</div><div class="cell done"></div><div class="cell done"></div><div class="cell"></div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell">B</div><div class="cell done"></div><div class="cell done"></div><div class="cell done"></div><div class="cell done">F</div><div class="cell"></div><div class="cell"></div>
</div>
<figcaption>Eight points on a grid, x from 0 to 7 across and y from 0 to 4 up. The dividing line sits between columns 3 and 4, and the tinted columns are the strip. The closest pair, D and E, crosses the line</figcaption>
</figure>

In the figure, the left half A, B, C, D has its closest pair about 2.24 apart, and the right half E, F, G, H has its closest pair exactly 2 apart, so δ = 2. The strip holds C, D, E and F for the line drawn in the figure. In order of y they are F, D, E, C. Checking neighbors finds D and E at distance √2, about 1.41, closer than either half. That is the answer. The code below measures from x = 4, the first point of the right half, which keeps D, E and F, and that is enough, since any crossing pair closer than δ has both points within δ of that x.

```python
import math

def brute_force(points):                          # the smallest distance over all pairs
    return min(math.dist(p, q) for i, p in enumerate(points) for q in points[i + 1:])

def closest_pair(points):                         # distinct points
    px = sorted(points)                           # by x, sorted once
    py = sorted(points, key=lambda p: p[1])       # by y, sorted once
    return solve(px, py)

def solve(px, py):
    n = len(px)
    if n <= 3:
        return brute_force(px)
    mid = n // 2
    mid_x = px[mid][0]
    left = set(px[:mid])
    py_left = [p for p in py if p in left]        # keeps the y order
    py_right = [p for p in py if p not in left]
    d = min(solve(px[:mid], py_left), solve(px[mid:], py_right))
    strip = [p for p in py if abs(p[0] - mid_x) < d]
    for i in range(len(strip)):
        for k in range(i + 1, len(strip)):
            if strip[k][1] - strip[i][1] >= d:
                break
            d = min(d, math.dist(strip[i], strip[k]))
    return d
```

The points are sorted by x and by y once, at the start. Each call splits the y order into the two halves by a single pass, so no sorting is repeated. Sorting the strip at every level would cost an extra log factor. With this version each call does linear work plus two half-size calls, which is T(n) = 2 T(n / 2) + n, or O(n log n).

## How It Performs

We checked the function against brute force on 800 random sets, including sets with many points sharing an x or y value. We then timed it on random points.

| Points | Brute Force | Divide and Conquer |
| --- | --- | --- |
| 1,000 | 32 ms | 2 ms |
| 4,000 | 514 ms | 9 ms |
| 8,000 | 2.04 s | 19 ms |
| 100,000 | about 5 minutes (estimate) | 0.31 s |

Doubling the points multiplied the brute force time by 4 and the divide and conquer time by a little over 2. Running the same search with a counter, on random points, no strip point needed more than 2 comparisons, well under the 7 that the argument allows for in the worst case.

## What Is Known About It

The O(n log n) method is due to Shamos in 1975. Ben-Or in 1983 and Yao in 1989 showed that in the quadratic decision tree model, where each test compares a quadratic expression in the coordinates with zero, any method needs Ω(n log n) tests.

That still leaves room: Rabin showed in 1976 that randomization and hashing can find the closest pair in expected linear time, and a note by Fortune and Hopcroft observed that this escapes the lower bound because it uses the floor function, which the model doesn't allow. [Randomized Algorithms](/algorithms/randomized) covers the technique of using randomness in this way.

## The Common Idea

| Problem | Each Half Returns | Combine Step |
| --- | --- | --- |
| Inversions | The count and the sorted half | Merge, adding the left items passed by each right item |
| Closest pair | The best distance and the half in y order | Scan the strip of width 2δ in y order |

In both, the work is in the pairs that cross the split, and sorted order makes those pairs cheap to find. Both also return more than the answer to the question, which is the sorted order the parent needs, the same idea as returning a height and a best path from [Solving Tree Problems with Recursion](/algorithms/tree-recursion).

## Key Points

- An inversion is a pair in the wrong order, the count measures how unsorted a list is, and it equals the number of shifts insertion sort makes
- Merge sort with one extra line counts inversions in O(n log n), adding the number of left items still waiting each time a right item is output
- Closest pair splits by a vertical line, solves both sides, and checks only a strip of width 2δ sorted by y, where each point needs at most 7 comparisons
- Both algorithms return a sorted order with the answer, so the parent doesn't have to sort again
- Counting inversions on a million items took 1.8 s against an estimated 4.5 hours of brute force, and closest pair on 100,000 points took 0.31 s against about 5 minutes
