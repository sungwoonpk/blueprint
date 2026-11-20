> A **running median** is the median of a stream of numbers, kept up to date as each new number arrives. Two heaps do it: a max-heap holds the lower half and a min-heap holds the upper half, with sizes kept within one of each other, so the median is always at one of the tops.

A monitoring dashboard shows the median response time of all requests so far, updated with every request. The median, the middle value when the numbers are sorted, is calmer than the average, since one very slow request can't drag it far. But the dashboard can't re-sort a million numbers after each new request, and it can't remember a sorted list that is expensive to insert into. It needs a structure where the middle is always within reach.

## The Costs of the Easy Ways

Keeping all values in a sorted list lets you read the middle in O(1), but each insert shifts items, which costs O(n). Recomputing the median from scratch costs O(n log n) per step with a sort, or O(n) with [quickselect](/algorithms/quickselect), which is still too much at every step.

We measured both on streams of random numbers. With `bisect.insort` into a sorted list, 100,000 items took 795 ms. Recomputing `statistics.median` after each of 20,000 items would take about 16 seconds, estimated from samples. Both slow down quickly as the stream grows.

## Two Halves

The median splits the sorted data into a lower half and an upper half. Everything in the lower half is at most everything in the upper half. To find the median, you only need the largest item of the lower half and the smallest item of the upper half. Those are exactly the items that a heap puts on top: a **max-heap** for the lower half and a **min-heap** for the upper half.

Keep the halves balanced in size, so that the lower half has the same number of items as the upper half or one more. Then the median is:

- the top of the lower half, when the total count is odd
- the average of the two tops, when the count is even

Python's `heapq` only provides min-heaps, so the lower half stores negated values, which turns the smallest negative into the largest value.

```python
import heapq

def running_medians(stream):
    low, high = [], []                    # low: max-heap of negated values, high: min-heap
    out = []
    for x in stream:
        if low and x > -low[0]:
            heapq.heappush(high, x)       # x belongs in the upper half
        else:
            heapq.heappush(low, -x)       # x belongs in the lower half
        if len(low) > len(high) + 1:      # keep the sizes within one
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))
        out.append(-low[0] if len(low) > len(high) else (-low[0] + high[0]) / 2)
    return out
```

Each new number goes into whichever half it belongs to, found by comparing it with the top of the lower half. If that makes one side too big, its top moves across to the other side, which preserves the invariant that the lower half stays below the upper half. Here is the run on 5, 9, 4, 12, 8 and 9. The halves are listed in sorted order for readability.

| New Number | Lower Half | Upper Half | Median |
| --- | --- | --- | --- |
| 5 | 5 | (empty) | 5 |
| 9 | 5 | 9 | 7 |
| 4 | 4, 5 | 9 | 5 |
| 12 | 4, 5 | 9, 12 | 7 |
| 8 | 4, 5, 8 | 9, 12 | 8 |
| 9 | 4, 5, 8 | 9, 9, 12 | 8.5 |

After 9 arrives, the halves are 5 and 9, and the median is their average, 7. When 4 arrives, it goes into the lower half and makes it two items against one, which is allowed. When 12 arrives, it goes to the upper half and the sizes are equal again. We compared the function with `statistics.median` after every number, on 3,000 random streams, and the two matched at every step.

## The Cost

Each number costs a constant number of heap operations, each O(log n), and reading the median is O(1). Memory is O(n), since every number is kept, but it is only the two heaps.

| Items | Two Heaps | Sorted List with insort |
| --- | --- | --- |
| 100,000 | 30 ms | 795 ms |
| 1,000,000 | 0.33 s | About 80 s, estimated |

The heap version took 0.33 s for a million numbers. The sorted list approach grows quadratically, so a million would take roughly a hundred times its 100,000 figure.

## Variations

The structure bends to related problems.

- **Any percentile**: make the halves unequal, with the lower heap holding a fixed fraction of the items. To track the 95th percentile, keep the lower heap at 95% of the count and read its top
- **A sliding window median**: removing the number that leaves the window needs a way to delete from the middle of a heap. The usual trick is lazy deletion, marking the number as gone and skipping it when it reaches a top
- **One median of all the data**: if the data is complete and you want a single median, [Quickselect](/algorithms/quickselect) does it in O(n) without maintaining anything

The two heaps are the answer when the numbers arrive one at a time and the median is needed at every step. This is the same idea as [Combining Data Structures](/algorithms/combining-data-structures): two simple structures, each handling one end of the middle, together answer what neither could alone.

## Key Points

- Split the numbers into a lower half in a max-heap and an upper half in a min-heap, with sizes within one
- The median is the top of the bigger half, or the average of both tops when the sizes are equal
- Each new number goes into the right half, then one top may move across to keep the balance, so each step is O(log n)
- A million numbers took 0.33 s with two heaps, where a sorted list took 795 ms for just a tenth of that
- Python's `heapq` has only min-heaps, so the lower half stores negated values
