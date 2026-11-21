> **Binary search** finds an item in a sorted array by checking the middle item and discarding the half that can't contain the target, which takes about log₂ n steps.

The registrar's list of 1,000,000 student IDs is sorted, and you need to find one ID. Scanning from the front checks about half a million entries on average. But the list is sorted, and that is information a scan ignores. Look at the middle entry: if it is bigger than the ID you want, the target can't be in the second half. One look discards 500,000 entries.

## Throw Away Half

Repeat that idea. Keep a window of positions that could still hold the target, look at the middle of the window, and cut the window in half. Here it is finding 52 in nine sorted numbers.

<figure class="diagram">
<p class="rowname">Window is all nine. The middle is 31, and 31 &lt; 52</p>
<div class="cells ptrs">
<div class="cell">4<small>0</small></div>
<div class="cell">9<small>1</small></div>
<div class="cell">15<small>2</small></div>
<div class="cell">23<small>3</small></div>
<div class="cell hl" data-ptr="mid">31<small>4</small></div>
<div class="cell">38<small>5</small></div>
<div class="cell">47<small>6</small></div>
<div class="cell">52<small>7</small></div>
<div class="cell">60<small>8</small></div>
</div>
<p class="rowname">The window is 5 to 8. The middle is 47, and 47 &lt; 52</p>
<div class="cells ptrs">
<div class="cell dim">4<small>0</small></div>
<div class="cell dim">9<small>1</small></div>
<div class="cell dim">15<small>2</small></div>
<div class="cell dim">23<small>3</small></div>
<div class="cell dim">31<small>4</small></div>
<div class="cell">38<small>5</small></div>
<div class="cell hl" data-ptr="mid">47<small>6</small></div>
<div class="cell">52<small>7</small></div>
<div class="cell">60<small>8</small></div>
</div>
<p class="rowname">The window is 7 to 8. The middle is 52, found</p>
<div class="cells ptrs">
<div class="cell dim">4<small>0</small></div>
<div class="cell dim">9<small>1</small></div>
<div class="cell dim">15<small>2</small></div>
<div class="cell dim">23<small>3</small></div>
<div class="cell dim">31<small>4</small></div>
<div class="cell dim">38<small>5</small></div>
<div class="cell dim">47<small>6</small></div>
<div class="cell hl" data-ptr="mid">52<small>7</small></div>
<div class="cell">60<small>8</small></div>
</div>
<figcaption>Three looks were enough. The faded cells have been ruled out</figcaption>
</figure>

Each step halves the window, so the number of steps is about log₂ n. We counted the steps for a search that misses, which is the longest case.

| Items | Steps in the Worst Case |
| --- | --- |
| 10 | 4 |
| 1,000 | 10 |
| 1,000,000 | 20 |
| 1,000,000,000 | 30 |

A billion sorted items need 30 looks. On a list of a million random numbers in Python, a scan with `in` took 26 ms for a lookup that misses. Our binary search took 2.7 µs, and Python's built-in `bisect` took 0.7 µs, averaged over random targets.

## The Code

This is the loop from [Proving Correctness with Loop Invariants](/algorithms/loop-invariants), with the midpoint written the safe way described in [Edge Cases and Testing](/algorithms/edge-cases).

```python
def contains(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

The invariant is that, if the target is in the list, it is in positions `lo` to `hi`. The window starts as the whole list, and each step shrinks it without losing the target. An empty window means the target isn't there.

Binary search has a reputation for off by one bugs, and many come from mixing two conventions. In this form, the window includes both ends, so the loop runs while `lo <= hi` and the updates skip the middle with `mid + 1` and `mid - 1`.

The form in the next section keeps the window half open and updates with `hi = mid`. Combining parts of the two makes a loop that doesn't end or misses the last item.

## Lower and Upper Bound

With duplicate values, `contains` returns whichever copy it happens to land on. A sharper question has one answer: where would this value go? The **lower bound** of x is the first position whose item is at least x. The **upper bound** is the first position whose item is greater than x. Both can be the length of the list when no item qualifies.

```python
def lower_bound(a, x):
    """First index i with a[i] >= x, or len(a)."""
    lo, hi = 0, len(a)          # the answer is always in lo..hi
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

def upper_bound(a, x):
    """First index i with a[i] > x, or len(a)."""
    lo, hi = 0, len(a)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if a[mid] <= x:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

For the list 1, 3, 3, 3, 7, 9, the lower bound of 3 is 1 and the upper bound is 4, so the count of 3s is 4 − 1 = 3. The lower bound of 4 is 4, which is where a 4 would be inserted.

The lower bound of 10 is 6, the length of the list. To test whether x is present, check that the lower bound is inside the list and that the item there equals x.

This form returns a position even for a missing value, and its loop has a simple shape: the answer stays in `lo..hi`, and the window shrinks until the two meet. Libraries are built on it. We checked both against Python's `bisect` and against `in` on 5,000 random lists.

| Language | Function | What It Returns |
| --- | --- | --- |
| Python | `bisect_left`, `bisect_right` | The lower bound, the upper bound |
| C++ | `lower_bound`, `upper_bound` | The same, as iterators |
| NumPy | `searchsorted` | Left or right, chosen by `side` |
| Go | `sort.Search(n, f)` | The first index where `f` is true |
| Java | `Arrays.binarySearch` | The index if found, or −(insertion point) − 1 |

Java's version doesn't promise which duplicate it finds, and its encoding of a miss, as a negative number that holds the insertion point, folds two answers into one return value.

## What Binary Search Needs

Binary search leans on three assumptions, and breaking any of them gives wrong answers without an error.

**The list must be sorted by the same rule you compare with.** We sorted four names the default way, which puts uppercase letters first: Bob, Carol, alice, dave. Then we searched for each name with a comparison that ignores case.

Bob, Carol and `dave` were found, but `alice` was reported missing even though it is in the list: the first look at Carol said the target belongs to the left, where the list has no `alice`, because the middle checks assumed an order that the list didn't have. Sorting with the case-insensitive key fixed all four.

**It needs fast access by position.** An array gives the middle in one step. On a linked list, reaching the middle costs a walk, and Java's documentation says that a binary search of a list without fast positional access does a number of link traversals proportional to n, along with only log n comparisons. The advantage disappears.

**Inserting into a sorted array is still slow.** Binary search finds the spot in O(log n), but opening a gap shifts the items after it, which is O(n), so Python's `bisect.insort` is dominated by the shifting. When a collection needs both fast search and fast insertion, a balanced tree is the better fit, as in [Balanced Trees and Ordered Maps](/algorithms/balanced-trees).

Binary search is also optimal among comparison methods. A search over n sorted items has n + 1 possible answers, so by the counting argument in [The Lower Bound for Comparison Sorting](/algorithms/sorting-lower-bound), no comparison based search can use fewer than about log₂(n + 1) comparisons.

The idea reaches beyond sorted arrays, which [Binary Search Beyond Sorted Arrays](/algorithms/binary-search-beyond-sorted) explores.

## Key Points

- Binary search keeps a window that must contain the target and halves it with each look at the middle, so it needs about log₂ n steps
- The invariant is that the target, if present, lies inside the window, and an empty window means it is missing
- Choose one convention, a closed window with `lo <= hi` or a half open one with `lo < hi`, and don't mix them
- Lower bound and upper bound give exact answers with duplicates, and most libraries are built on them
- The data must be sorted by the same rule you search with, and stored where the middle is cheap to reach
