> **Merge sort** sorts a list by splitting it in half, sorting each half recursively, and merging the two sorted halves. It takes O(n log n) time on any input and keeps equal items in order, at the cost of extra memory for the merge.

The simple sorts in [Bubble, Selection and Insertion Sort](/algorithms/simple-sorts) take about n² steps, which was fine for a classroom list and too slow for a million check-ins. We need an idea that does less work as the list grows. The idea is old and simple: sorting two short lists is easier than sorting one long one, and combining two sorted lists is easy.

## Split, Sort, Merge

You have seen the combining part already. Merging two sorted lists means repeatedly taking the smaller front item, as in [Reversing and Merging Linked Lists](/algorithms/reversing-merging-lists). Merge sort is that step applied over and over. Cut the list in half, sort each half by the same method, and merge. A list of one item is already sorted, and that is where the recursion ends.

Here is the merging, bottom up, on eight numbers. Each row merges neighbors from the row above, and the shading marks the sorted groups.

<figure class="diagram">
<p class="rowname">Eight lists of one item</p>
<div class="cells">
<div class="cell">5</div>
<div class="cell">2</div>
<div class="cell">4</div>
<div class="cell">7</div>
<div class="cell">1</div>
<div class="cell">3</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<p class="rowname">Merge pairs</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">5</div>
<div class="cell">4</div>
<div class="cell">7</div>
<div class="cell done">1</div>
<div class="cell done">3</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<p class="rowname">Merge groups of two</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">4</div>
<div class="cell done">5</div>
<div class="cell done">7</div>
<div class="cell">1</div>
<div class="cell">2</div>
<div class="cell">3</div>
<div class="cell">6</div>
</div>
<p class="rowname">Merge the halves</p>
<div class="cells">
<div class="cell hl">1</div>
<div class="cell hl">2</div>
<div class="cell hl">2</div>
<div class="cell hl">3</div>
<div class="cell hl">4</div>
<div class="cell hl">5</div>
<div class="cell hl">6</div>
<div class="cell hl">7</div>
</div>
<figcaption>Three rounds of merging sort eight items. The groups double in size each round</figcaption>
</figure>

There are log₂ 8 = 3 rounds, and each round touches all eight items once. That is the whole cost argument, and we will count it exactly below.

## The Code

The merge step takes two sorted lists and builds one, with an index in each list marking the next item to take.

```python
def merge(left, right):
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:        # <= keeps equal items in their original order
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:])               # one of these is empty
    out.extend(right[j:])
    return out
```

The sort is a recursive function that trusts the recursion for each half, in the way described in [Thinking Recursively](/algorithms/thinking-recursively).

```python
def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    return merge(merge_sort(a[:mid]), merge_sort(a[mid:]))
```

Correctness is an induction. A list of zero or one item is sorted, which is the base case. For a longer list, assume each half comes back sorted, so the only thing left to show is that merging two sorted lists gives a sorted list containing both.

The merge has a loop invariant: the output so far holds the smallest items taken from both lists, in order, and nothing left in either list is smaller than the last one taken. When one list runs out, the rest of the other list is already in order, so appending it finishes the job.

The `<=` in the merge is deliberate. When the two front items are equal, it takes the left one first, so equal items keep their original order. That makes merge sort **stable**, a property used in [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators). We checked it on records with repeated keys, along with correctness against Python's `sorted` on 3,000 random lists.

## Why It Is O(n log n)

The recursion tree has a level for each halving: a list of n items is cut to n/2, then n/4, until single items, so there are about log₂ n levels. At each level, the merges together handle every item once, so the work per level is proportional to n. The total is n log n.

We counted the comparisons the merge step makes, for lists whose length is a power of two, so every split is even.

| Items | Random | Sorted or Reversed | Random Divided by n log₂ n |
| --- | --- | --- | --- |
| 1,024 | 8,940 | 5,120 | 0.87 |
| 16,384 | 208,674 | 114,688 | 0.91 |
| 262,144 | 4,386,947 | 2,359,296 | 0.93 |

Every count lies between half of n log₂ n and n log₂ n, which for the first row is 5,120 to 10,240. A sorted or reversed list is the cheap case at exactly half, because in each merge one side runs out first and the other side is appended without comparisons. Random data needs about 0.9 of n log₂ n.

The gap over insertion sort grows quickly. We sorted random lists in Python with both.

| Items | Insertion Sort | Merge Sort |
| --- | --- | --- |
| 5,000 | 0.24 s | 6 ms |
| 10,000 | 1.11 s | 11 ms |
| 20,000 | 4.0 s | 24 ms |

Doubling the size quadrupled the insertion sort and a bit more than doubled the merge sort. At a million items merge sort took 1.7 seconds in Python. Python's built-in `sorted`, which is written in C and uses a smarter method, took 0.18 seconds on the same list.

## The Costs

Merge sort's weak point is memory. The merge builds a new list, so it needs extra space proportional to n, where insertion sort needs only a few variables. Our version also copies with slices, which costs time but not growth: it adds a constant factor and no extra levels.

Merge sort is easy to improve. Skip the merge when the largest item of the left half is not greater than the smallest of the right, since the halves are already in order, which makes a sorted list cost O(n).

Sort tiny pieces with insertion sort instead of recursing down to single items, which is the approach in [Bubble, Selection and Insertion Sort](/algorithms/simple-sorts) and saves some of the overhead. Both ideas appear in real library sorts.

Merge sort can also avoid recursion by working bottom up, as the figure did: merge pairs, then groups of two, then four, doubling the width until one group remains.

```python
def merge_sort_bottom_up(a):
    a = a[:]
    width = 1
    while width < len(a):
        for lo in range(0, len(a), 2 * width):
            a[lo:lo + 2 * width] = merge(a[lo:lo + width],
                                         a[lo + width:lo + 2 * width])
        width *= 2
    return a
```

Merge sort reads its data from start to end, which makes it a good fit for [linked lists](/algorithms/linked-lists), where merging needs no extra space, and for data on disk, where sequential reading is far faster than jumping around. For arrays that fit in memory, its main competitor is [Quick Sort](/algorithms/quick-sort), which sorts in place and is often faster in practice, but gives up the worst case guarantee.

## Key Points

- Merge sort splits the list in half, sorts each half recursively and merges, with a single item as the base case
- The merge takes the smaller front item each time, and taking the left one on a tie makes the sort stable
- There are about log₂ n levels and each level handles all n items, so the cost is O(n log n), in the best, average and worst case
- Counting showed between ½ n log₂ n and n log₂ n comparisons, and the gap over insertion sort widens as the list grows
- The price is O(n) extra memory, and the strengths are stability, a guaranteed running time and sequential access to the data
