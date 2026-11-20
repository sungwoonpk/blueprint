> The **top K elements** problem asks for the k largest (or smallest) items of a collection. A small heap of size k answers it in one pass over the data in O(n log k) time and O(k) memory, without sorting everything.

A service logs the response time of each of a million requests, and the on-call engineer wants the ten slowest. Sorting the whole log would work, but it does a huge amount of ordering that nobody asked for: the order of the 999,990 requests that were not slow. And for a log still being written, sorting means keeping every entry. The better question is what the engineer needs to remember as the log streams by.

## Keep Only the Best So Far

To track the k largest items seen, hold a collection of k candidates. When a new item arrives, it enters only if it beats the weakest candidate, and then the weakest leaves. The operation that finds the weakest and replaces it is exactly what a heap does. A **min-heap** of size k keeps its smallest candidate at the root, so one comparison tells you whether a new item matters.

```python
import heapq

def top_k_heap(items, k):
    """The k largest items, using a min-heap that never holds more than k of them."""
    heap = []
    for x in items:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)       # drop the smallest of the k, keep x
    return sorted(heap, reverse=True)
```

Here is the run for the three largest of 4, 9, 2, 7, 5, 8 and 1.

| Item | What Happens | Heap After |
| --- | --- | --- |
| 4 | Push | 4 |
| 9 | Push | 4, 9 |
| 2 | Push | 2, 4, 9 |
| 7 | Beats 2, replace it | 4, 7, 9 |
| 5 | Beats 4, replace it | 5, 7, 9 |
| 8 | Beats 5, replace it | 7, 8, 9 |
| 1 | Not above 7, skip | 7, 8, 9 |

The invariant is that the heap holds the k largest items among those seen so far. An item that is not larger than the heap's smallest can never be in the final answer, since k items already beat it. The cost for each item is a comparison with the top, and for items that get in, a replacement costing O(log k).

So the pass is O(n log k) at worst. The heap only ever holds k items, which matters for streams: we ran a million values through a generator with k = 100, and the extra memory peaked at about 4 KB, where sorting the same stream used 36 MB.

## Faster Than the Worst Case Suggests

The O(n log k) bound is for an input where almost every item gets in. On typical data, most items fail the first comparison and cost almost nothing. For random order, the number of replacements is about k ln(n / k). We counted for a million random numbers.

| k | Replacements | k ln(n / k) |
| --- | --- | --- |
| 10 | 108 | 115 |
| 1,000 | 6,894 | 6,908 |
| 100,000 | 230,573 | 230,259 |

A million items needed only about a hundred heap operations for k = 10, and the rest were skipped by one comparison. The worst case is data arriving in ascending order, where each item beats the weakest: with k = 1,000, all 999,000 later items replaced something, and the pass took 172 ms where random order took about 23 ms.

## Comparing the Methods

Three ways to find the top k, each with a different cost.

- **Sort and slice**: O(n log n) time and memory for everything
- **A size k heap**: O(n log k) time, O(k) memory, works on a stream
- **Quickselect**: partition the list until the k largest are in one block, as in [Quickselect](/algorithms/quickselect), O(n) expected, but needs the whole list in memory, and the k items come out unordered

We timed all of them on a million random numbers, along with Python's `heapq.nlargest`, which uses the heap method.

| k | Sort | Heap Loop | heapq.nlargest | Quickselect |
| --- | --- | --- | --- | --- |
| 10 | 143 ms | 19 ms | 6 ms | 62 ms |
| 1,000 | 126 ms | 23 ms | 9 ms | 93 ms |
| 100,000 | 127 ms | 110 ms | 221 ms | 95 ms |

For small k the heap wins by a wide margin, and the library function, which is written in C, wins by more. As k grows toward n, the advantage fades: at k = 100,000 the library's heap method was slower than sorting.

So a sensible default is `nlargest` for small k, `sorted` for large k, and `max` for the single largest. Quickselect is the best choice when k is a big fraction of n and the data is in memory.

## Variations

The same heap handles related questions with small changes.

- **Smallest k**: use a max-heap of size k, or in Python negate the values
- **The kth largest in a stream**: the heap's top is the answer after every item
- **Most frequent items**: count first, then run the heap over the counts. `Counter.most_common(3)` does this, and on a thousand course requests it returned the three most requested courses
- **Top k by a key**: push pairs of key and item, and break ties with a counter, as described in [Heaps and Priority Queues](/algorithms/heaps)
- **Merging sorted sources**: when each source is already sorted, a heap with one entry for each source gives the top items across all of them, the idea in [Merging K Sorted Lists](/algorithms/k-way-merge)

Check what the problem says about ties and about k larger than n. If the data has fewer than k items, the heap just returns all of them.

## Key Points

- To find the k largest, keep a min-heap of k candidates and let each new item replace the smallest one if it is bigger
- The cost is O(n log k) time and O(k) memory, and the data can be a stream too large for memory
- On random input only about k ln(n / k) items get into the heap, so the pass is close to n comparisons
- For small k the heap beats sorting by an order of magnitude, and for k near n sorting or quickselect is better
- The same structure answers smallest k, the kth largest in a stream, and the most frequent items
