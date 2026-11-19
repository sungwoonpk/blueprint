> **Quick sort** picks one item as the **pivot**, rearranges the list so smaller items come before it and larger ones after it, and then sorts each side the same way. It sorts in place and takes O(n log n) time on average, though a poor choice of pivot can cost O(n²).

[Merge sort](/algorithms/merge-sort) does its clever work on the way back up, when it merges. Quick sort turns that around and does the work on the way down.

Pick one student as a reference, send the shorter ones to the left and the taller ones to the right, and the reference student is already standing where they belong. Then repeat for each group. The idea is from Tony Hoare in 1959, and its ideas run through the sorts in many standard libraries.

## Partition, Then Recurse

The rearranging step is called **partitioning**. Choose a pivot, and move items so that everything smaller is on its left and everything else is on its right. Here is one pass over 5, 2, 8, 1, 9, 3, 7, with the last item, 7, as the pivot.

<figure class="diagram">
<p class="rowname">Before, pivot is 7</p>
<div class="cells">
<div class="cell">5</div>
<div class="cell">2</div>
<div class="cell">8</div>
<div class="cell">1</div>
<div class="cell">9</div>
<div class="cell">3</div>
<div class="cell hl">7</div>
</div>
<p class="rowname">After partitioning</p>
<div class="cells">
<div class="cell done">5</div>
<div class="cell done">2</div>
<div class="cell done">1</div>
<div class="cell done">3</div>
<div class="cell hl">7</div>
<div class="cell">8</div>
<div class="cell">9</div>
</div>
<figcaption>The shaded items are smaller than 7 and the plain ones are larger. The pivot sits where it will end up in the sorted list</figcaption>
</figure>

After partitioning, the pivot is in its final position, and the two sides can be sorted independently, since no item on one side needs to cross to the other. That is a recursion: sort the left side, sort the right side, and the whole list is sorted.

```python
def partition(a, lo, hi):
    pivot = a[hi]
    i = lo                       # a[lo..i-1] holds items smaller than the pivot
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]    # put the pivot between the two groups
    return i

def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return
    r = random.randint(lo, hi)   # a random pivot, moved to the end
    a[r], a[hi] = a[hi], a[r]
    p = partition(a, lo, hi)
    quick_sort(a, lo, p - 1)
    quick_sort(a, p + 1, hi)
```

The partition loop has an invariant, in the style of [Proving Correctness with Loop Invariants](/algorithms/loop-invariants): `a[lo..i-1]` are smaller than the pivot, and `a[i..j-1]` are not. Each step looks at `a[j]` and either extends the first group by swapping it in, or leaves it in the second group. At the end the pivot is swapped into the gap between the two groups.

Everything happens inside the one array, so quick sort needs no extra list the way merge sort does, only the recursion's stack. We tested it on 3,000 random lists against `sorted`.

## Why the Pivot Matters

The cost depends on how evenly each partition splits the list. If each pivot lands near the middle, the list halves at each level and the total is O(n log n), like merge sort.

If each pivot is the smallest or largest item, one side is empty and the other has the rest of the items. Then the work is (n − 1) + (n − 2) + … + 1, which is O(n²), and the recursion goes n levels deep.

That worst case is easy to hit with a naive pivot. With the last item as the pivot, an already sorted list is the worst input, because the last item is the largest each time. We counted the comparisons on 1,000 items under three rules.

| Pivot Rule | Random Input | Sorted Input | Reversed Input |
| --- | --- | --- | --- |
| Last item | 11,184 | 499,500 | 499,500 |
| Random item | 10,716 | 10,476 | 10,585 |
| Median of first, middle, last | 9,159 | 7,987 | 14,378 |

The last item is fine on random data and a disaster on sorted data, which is a common kind of real input. On 10,000 sorted items it made about 50 million comparisons and went 9,999 levels deep. A recursive version crashed with Python's recursion limit on 2,000 sorted items, a case of [The Call Stack and Recursion Depth](/algorithms/call-stack).

A **random pivot** removes the problem. The bad inputs don't disappear, but the algorithm can't be steered to a bad pivot, so no input is reliably slow. The expected number of comparisons is about the same for sorted, reversed and random lists: 10,476, 10,585 and 10,716 above.

The **median of three**, which takes the middle value of the first, middle and last items, is cheaper on random and sorted data here. Its worse showing on reversed data shows that it swaps one bad pattern for another.

## Why Randomness Works

The expected cost has a short argument. In the sorted order of the list, call the items z₁ through zₙ. Two items are compared only if one of them is chosen as a pivot while both are still in the same group, and each pair is compared at most once, since a pivot is removed from later groups.

Items zᵢ and zⱼ stay together until the first pivot that falls between them in sorted order, and they are compared only if that pivot is zᵢ or zⱼ itself, which has probability 2 out of the j − i + 1 items in that range.

Adding that up over all pairs gives about 2n ln n comparisons, or 1.39 n log₂ n, with a smaller correction term. For 10,000 items, the exact expression is 155,772, and the average of 20 runs of our random pivot version was 155,349. That is about 17% more comparisons than n log₂ n, and more than merge sort's 0.9 n log₂ n.

Quick sort still wins in many settings because each step is cheap: it scans memory in order, moves items in place and allocates no new arrays. In pure Python on 200,000 random items, our quick sort took 0.20 s against 0.29 s for our merge sort.

## Making It Robust

A production quick sort adds several guards.

- **Random or median-of-three pivots** avoid the sorted-input trap
- **Equal keys**: our partition puts items equal to the pivot on the right side. On a list where every item is equal, each partition peels off one item, and we measured 1,999,000 comparisons for 2,000 equal items, quadratic again. Stopping the scans on equal keys fixes it, as does **three way partitioning**, which splits the list into smaller, equal and larger groups, as in [Partitioning with Three Pointers](/algorithms/partitioning)
- **Small pieces**: below a size somewhere between 5 and 15 items, switching to insertion sort is faster than recursing
- **Bounded depth**: recursing into the smaller side and looping on the larger keeps the stack to O(log n) levels
- **A fallback for the worst case**: some libraries watch the depth and switch to a different algorithm when partitioning goes badly. Rust's unstable sort does this, combining quicksort for the typical case with heapsort as a guard so the worst case stays O(n log n)

## What It Gives Up

Quick sort isn't stable. Partitioning swaps items across long distances, which can reverse equal items. Partitioning the records (1, a), (2, b), (2, c), (2, d) around the last item turned them into (1, a), (2, d), (2, c), (2, b), reversing the three equal ones. When equal items must keep their order, use merge sort, or a stable variant as described in [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators).

The same partitioning idea gives a way to find the kth smallest item without sorting everything, covered next in [Quickselect](/algorithms/quickselect).

## Key Points

- Quick sort partitions the list around a pivot so the pivot lands in its final place, then sorts each side recursively
- It works in place, with O(log n) extra stack when it recurses into the smaller side first
- Balanced splits give O(n log n), and the worst pivot at every step gives O(n²), which sorted input triggers when the pivot is the last item
- A random pivot makes the expected cost about 1.39 n log₂ n comparisons on any input, and no input is reliably slow
- Many equal keys need three way partitioning, and the sort isn't stable
