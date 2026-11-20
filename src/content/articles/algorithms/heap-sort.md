> **Heap sort** builds a max-heap from the array, then repeatedly swaps the largest item to the end and repairs the heap in the shorter front part. It sorts in place and takes O(n log n) time even in the worst case, but it isn't stable.

[Selection sort](/algorithms/simple-sorts) finds the largest remaining item with a full scan, n steps for each of n rounds. The scan is where the time goes. A heap from [Heaps and Priority Queues](/algorithms/heaps) can hand over the largest item in log n steps instead. Replace the scan with a heap, and selection sort's O(n²) becomes O(n log n), with its in-place habit intact.

## Two Phases

First **build** a max-heap in the array itself, with the largest item at position 0, using the bottom-up heapify from the heap article. Then repeat: swap the root, which is the largest, with the last item of the heap. That item is now in its final place at the end. Shrink the heap by one, so the sorted tail is no longer part of it, and sink the new root to repair the heap.

```python
def heap_sort(a):
    n = len(a)

    def sink(i, size):
        while True:
            child = 2 * i + 1
            if child >= size:
                break
            if child + 1 < size and a[child + 1] > a[child]:
                child += 1                         # the larger child
            if a[child] > a[i]:
                a[i], a[child] = a[child], a[i]
                i = child
            else:
                break

    for i in range(n // 2 - 1, -1, -1):            # phase 1: build a max-heap
        sink(i, n)
    for end in range(n - 1, 0, -1):                # phase 2: take the largest each time
        a[0], a[end] = a[end], a[0]
        sink(0, end)
```

Here is the run on 5, 3, 8, 1, 9, 2, 7. The first row is the heap after phase 1, and each later row is the array after one swap and repair. The sorted tail grows from the right.

<figure class="diagram">
<p class="rowname">Max-heap built</p>
<div class="cells">
<div class="cell hl">9</div>
<div class="cell">5</div>
<div class="cell">8</div>
<div class="cell">1</div>
<div class="cell">3</div>
<div class="cell">2</div>
<div class="cell">7</div>
</div>
<p class="rowname">9 moved to the end, heap repaired</p>
<div class="cells">
<div class="cell hl">8</div>
<div class="cell">5</div>
<div class="cell">7</div>
<div class="cell">1</div>
<div class="cell">3</div>
<div class="cell">2</div>
<div class="cell done">9</div>
</div>
<p class="rowname">8 moved, heap repaired</p>
<div class="cells">
<div class="cell hl">7</div>
<div class="cell">5</div>
<div class="cell">2</div>
<div class="cell">1</div>
<div class="cell">3</div>
<div class="cell done">8</div>
<div class="cell done">9</div>
</div>
<p class="rowname">7 moved, heap repaired</p>
<div class="cells">
<div class="cell hl">5</div>
<div class="cell">3</div>
<div class="cell">2</div>
<div class="cell">1</div>
<div class="cell done">7</div>
<div class="cell done">8</div>
<div class="cell done">9</div>
</div>
<figcaption>The heap shrinks from the right as the sorted tail grows. The outlined cell is the heap's top, the largest of what is left</figcaption>
</figure>

The invariant is that after each round, the front `end` items form a max-heap, and the items after it are the largest ones, in sorted order. When the heap shrinks to one item, the whole array is sorted. We checked the function against `sorted` on 3,000 random lists.

## The Cost

Building the heap is O(n). The second phase does n − 1 rounds, and each sink travels at most the height of the heap, log₂ n, so the total is O(n log n). The bound holds for every input, with no bad case like quick sort's. The only extra memory is a few variables, which is better than merge sort's O(n).

We counted comparisons on random arrays. The count should be about 2 n log₂ n at most, since each round makes up to two comparisons for each level.

| Items | Comparisons | Share of 2 n log₂ n | Minimum for Any Comparison Sort |
| --- | --- | --- | --- |
| 1,000 | 16,888 | 85% | 8,529 |
| 100,000 | 3,019,715 | 91% | 1,516,704 |

Heap sort uses nearly twice the minimum number of comparisons that any comparison sort needs, from [The Lower Bound for Comparison Sorting](/algorithms/sorting-lower-bound), where merge sort came within 2%. The count hardly changed with the input's order: a sorted list of 100,000 took 3,112,517 comparisons and a reversed one 2,926,640. Heap sort doesn't exploit existing order, which is why [Python's sort](/algorithms/library-sorts) beats it on partly ordered data.

## Not Stable, and Not Fast in Practice

Heap sort isn't stable. The swaps move items long distances, which can reorder equal ones. On the records (2, a), (2, b), (2, c) and (1, d), sorted by their number, heap sort returned (1, d), (2, c), (2, b), (2, a), with the three equal items in reverse order. When ties matter, use merge sort, as in [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators).

It is also slower than quick sort and merge sort in practice, even though its bound is as good. On 200,000 random numbers in Python, our versions took 0.45 s for heap sort, 0.28 s for merge sort and 0.21 s for quick sort. Several things add up. It makes more comparisons. It jumps between a parent and children that are far apart in the array, which is hard on the processor's cache, where quick sort scans neighbors. And it does extra work to sink each swapped item all the way back down.

## Where Heap Sort Earns Its Place

If it is rarely the fastest, why learn it? Its guarantee and its small memory make it useful as a safety net. Quick sort is fast on typical data but can slow down to O(n²) on a bad run of pivots. A library can watch for that, and when a sort goes badly, switch to heap sort for the rest, which caps the worst case at O(n log n) with no extra memory. Go's sort package falls back to heapsort after too many unbalanced partitions, and Rust's unstable sort does the same, as [How Standard Library Sorts Work](/algorithms/library-sorts) mentioned.

The underlying idea, a sort built from a priority queue, also generalizes. If you need only the largest k items, you don't have to finish the sort. Stop after k rounds, or keep a small heap, which is [Top K Elements](/algorithms/top-k).

## Key Points

- Heap sort builds a max-heap in the array, then repeatedly swaps the root to the end and sinks the new root in a shrinking heap
- It is O(n log n) in every case and sorts in place, with O(1) extra memory
- It makes close to 2 n log₂ n comparisons whether the input is random, sorted or reversed, nearly twice the minimum
- It isn't stable, and it is slower than quick sort and merge sort in practice because of extra comparisons and poor cache behavior
- Its main use is as a guarantee, the fallback that bounds the worst case of quick sort based library sorts
