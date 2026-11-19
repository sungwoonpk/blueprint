> **Partitioning with three pointers** rearranges an array in one pass into three groups, items smaller than a value, items equal to it and items larger, using three indexes that keep the groups apart. It is known as the Dutch national flag problem.

A student club orders T-shirts, and the pile on the table is a jumble of small, medium and large. You want them sorted into three stacks, in place, looking at each shirt only once. A general sort would do it, but there are only three kinds, and that is a lot of structure to waste. The same one-pass idea also repairs the quick sort from [Quick Sort](/algorithms/quick-sort), which slowed to O(n²) when many keys were equal.

## Three Groups, Three Pointers

Edsger Dijkstra posed this as sorting the colors of the Dutch flag, red, white and blue, into three bands. Take a value `v` as the middle group. The goal is an array that reads: everything less than `v`, then everything equal to `v`, then everything greater.

Keep three indexes, `lt`, `i` and `gt`, so that the array always has four regions.

| Region | Items There |
| --- | --- |
| `a[0..lt-1]` | Less than `v`, finished |
| `a[lt..i-1]` | Equal to `v`, finished |
| `a[i..gt]` | Not yet looked at |
| `a[gt+1..]` | Greater than `v`, finished |

The pointer `i` scans forward through the unseen middle. Look at `a[i]`:

- **Less than `v`**: swap it with the first item of the equal group, `a[lt]`, and advance both `lt` and `i`. The smaller item joins the low group, and the equal item that was pushed to position `i` is still in the equal group
- **Greater than `v`**: swap it with the last unseen item, `a[gt]`, and move `gt` back. Don't advance `i`, because the item that arrived at `i` hasn't been looked at yet
- **Equal to `v`**: leave it and advance `i`

Here is the middle of a run on 2, 0, 2, 1, 1, 0, 2, 1 with `v = 1`, the sizes small, medium and large coded as 0, 1 and 2.

<figure class="diagram">
<p class="rowname">Start: nothing sorted yet</p>
<div class="cells ptrs">
<div class="cell" data-ptr="lt, i">2</div>
<div class="cell">0</div>
<div class="cell">2</div>
<div class="cell">1</div>
<div class="cell">1</div>
<div class="cell">0</div>
<div class="cell">2</div>
<div class="cell" data-ptr="gt">1</div>
</div>
<p class="rowname">Midway: lt = 1, i = 2, gt = 5</p>
<div class="cells ptrs">
<div class="cell done">0</div>
<div class="cell hl" data-ptr="lt">1</div>
<div class="cell" data-ptr="i">2</div>
<div class="cell">1</div>
<div class="cell">1</div>
<div class="cell" data-ptr="gt">0</div>
<div class="cell dim">2</div>
<div class="cell dim">2</div>
</div>
<p class="rowname">Done</p>
<div class="cells">
<div class="cell done">0</div>
<div class="cell done">0</div>
<div class="cell hl">1</div>
<div class="cell hl">1</div>
<div class="cell hl">1</div>
<div class="cell dim">2</div>
<div class="cell dim">2</div>
<div class="cell dim">2</div>
</div>
<figcaption>Shaded cells are less than v, outlined cells equal v, faded cells are greater, and plain cells haven't been looked at</figcaption>
</figure>

```python
def three_way_partition(a, v):
    """Rearrange a so that items < v come first, then items == v, then items > v.
    Returns (lt, gt): a[:lt] < v, a[lt:gt+1] == v, a[gt+1:] > v."""
    lt, i, gt = 0, 0, len(a) - 1
    while i <= gt:
        if a[i] < v:
            a[lt], a[i] = a[i], a[lt]
            lt += 1
            i += 1
        elif a[i] > v:
            a[i], a[gt] = a[gt], a[i]
            gt -= 1
        else:
            i += 1
    return lt, gt
```

The loop ends when `i` passes `gt`, when the unseen region is empty and the other three regions cover the whole array. Each pass either advances `i` or shrinks the unseen region from the right, so the loop takes at most n passes and does no more than one swap per pass: O(n) time and O(1) extra memory. On a million items coded 0, 1 and 2, each item was examined exactly once and the partition made 666,686 swaps. We checked the three groups, and that no item was lost, on 5,000 random arrays.

## Sorting Three Kinds in One Pass

Sorting the shirts is the partition with the middle size as `v`.

```python
def sort_colors(a):
    three_way_partition(a, 1)
```

The same function sorts any array with exactly three kinds of values: balls marked 0, 1 and 2, or three priority levels. It beats a general sort, since one pass does the work of an O(n log n) sort, and it needs no extra counting array. With more than three kinds, [Counting, Radix and Bucket Sort](/algorithms/linear-time-sorting) takes over.

The two group version is simpler still, with only a `lt` pointer: move every item satisfying a rule to the front, which is the "write pointer" idea from [Two Pointers](/algorithms/two-pointers).

## Fixing Quick Sort

Quick sort with the partition from [Quick Sort](/algorithms/quick-sort) puts items equal to the pivot on one side. When there are many equal items, one side stays large, and the sort goes quadratic. We measured 1,999,000 comparisons on 2,000 equal items.

Three way partitioning fixes it. Partition around the pivot value, and the equal group is already in its final place, so only the smaller and larger groups need sorting.

```python
def quicksort3(a, lo, hi):
    stack = [(lo, hi)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            continue
        v = a[random.randint(lo, hi)]           # a random pivot value
        lt, i, gt = lo, lo, hi
        while i <= gt:
            if a[i] < v:
                a[lt], a[i] = a[i], a[lt]; lt += 1; i += 1
            elif a[i] > v:
                a[i], a[gt] = a[gt], a[i]; gt -= 1
            else:
                i += 1
        stack.append((lo, lt - 1))
        stack.append((gt + 1, hi))
```

The loop keeps its pending ranges on a stack, as in [Turning Recursion into Iteration](/algorithms/recursion-to-iteration). We counted how many items it examined.

| Input | Items | Examined per Item |
| --- | --- | --- |
| All equal | 2,000 | 1.0 |
| 10 distinct values | 100,000 | 3.6 |
| Random distinct values | 100,000 | 20.6 |

All equal items take a single pass, because the whole array lands in the equal group at once. With 10 distinct values, the sort finishes after a few passes. The cost drops as duplicates increase, which suits data such as grades, ages or categories.

[Quickselect](/algorithms/quickselect) has the same weakness with duplicates and the same cure.

## Key Points

- Three way partitioning splits an array into less than, equal to and greater than a value, in one pass with three pointers
- The unseen items sit between `i` and `gt`, and the other three regions are finished at every step
- It runs in O(n) time with O(1) extra memory and at most one swap for each item examined
- It sorts three kinds of values in one pass, the Dutch national flag problem
- Partitioning quick sort and quickselect this way removes the quadratic slowdown on many equal keys
