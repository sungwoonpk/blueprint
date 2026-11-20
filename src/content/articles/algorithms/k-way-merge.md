> A **k-way merge** combines k sorted lists into one sorted list by keeping a heap with the front item of each list. The smallest front item is taken, and the next item from the same list takes its place, so every output item costs O(log k).

A service runs on eight servers, and each server writes its log in timestamp order. For an incident review, the team wants one log with all the events in time order. Each file is already sorted, so sorting the combined pile throws that information away. Merging two sorted lists is a single pass, as in [Merge Sort](/algorithms/merge-sort) and [Reversing and Merging Linked Lists](/algorithms/reversing-merging-lists). The question is what to do with eight.

## One Front Item for Each List

The two list merge compares the two front items and takes the smaller. With k lists, the next item to output is the smallest among k front items. Scanning all k fronts costs k steps for each output item, O(N × k) for N items. A heap keeps the fronts so that the smallest is on top: take it, then push the next item from that same list.

<figure class="diagram">
<p class="rowname">Server A</p>
<div class="cells">
<div class="cell done">1</div>
<div class="cell hl">4</div>
<div class="cell">9</div>
</div>
<p class="rowname">Server B</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">3</div>
<div class="cell hl">10</div>
</div>
<p class="rowname">Server C</p>
<div class="cells">
<div class="cell hl">5</div>
<div class="cell">6</div>
<div class="cell">7</div>
</div>
<figcaption>After outputting 1, 2 and 3, the heap holds 4, 10 and 5, the outlined front items. The next output is 4, and then 9 joins the heap</figcaption>
</figure>

```python
import heapq

def k_way_merge(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]   # value, which list, position
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, j = heapq.heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
```

Each heap entry records the value, which list it came from, and its position in that list, so the next item from the same list can be found. The list number also breaks ties between equal values without comparing anything else, the counter idea from [Heaps and Priority Queues](/algorithms/heaps).

The invariant is that the heap holds exactly one item for each list that isn't used up, the smallest one not yet output, and everything output so far is no larger than anything still waiting. So the top of the heap is the next item of the merged result. We checked the function against sorting the concatenated lists on 2,000 random sets of lists, including empty ones.

## The Cost

The heap holds at most k items, so each push and pop is O(log k). With N items in total, the merge costs O(N log k), against O(N log N) for sorting the pile and O(N × k) for scanning the fronts. For k = 2 it is the ordinary merge, and for k = 8 the heap is only 3 levels deep. The only extra memory is the heap, O(k), plus the output.

The same merge can run in rounds, merging pairs of lists, then pairs of results, as merge sort does, which is also O(N log k) and needs no heap. A heap is simpler when the lists arrive as streams.

## When Sorting Is Faster

Here is a surprise from measuring. We merged a million random numbers split into k sorted lists, three ways: our heap version, Python's `heapq.merge`, and sorting the concatenation.

| Lists | Our Heap Merge | heapq.merge | Sort the Concatenation |
| --- | --- | --- | --- |
| 2 | 188 ms | 124 ms | 36 ms |
| 16 | 323 ms | 232 ms | 68 ms |
| 256 | 348 ms | 306 ms | 73 ms |
| 4,096 | 501 ms | 633 ms | 109 ms |

Sorting the pile was the fastest everywhere, even though its bound is worse. The reason is that Python's sort looks for runs, stretches that are already in order, and merges them in C, as [How Standard Library Sorts Work](/algorithms/library-sorts) explained.

The concatenation of k sorted lists is k runs, so the sort merges those runs, two at a time, with far less overhead per item than our loop. The O(N log k) bound is real but the constant factors favor the library.

So why use a heap merge? Because of memory and timing. The sort needs every item in memory at once. The heap merge reads each list a bit at a time, so it works on lists too large to load and can start producing output before the inputs end.

We measured it with eight generators of 250,000 sorted numbers each, 2,000,000 items. Streaming them through `heapq.merge` peaked at about 26 KB of memory. Sorting the concatenation peaked at 73 MB. For files on disk, or logs still being written, that is the difference between working and not.

## Where It Is Used

- **Merging sorted logs or files**: the opening example, one pass over eight servers in time order
- **Sorting data larger than memory**: sort chunks that fit, write each out as a sorted run, then do a k-way merge of the runs, the second half of an external merge sort
- **Combining sorted results from several sources**: a search across shards, where each shard returns its results in order, and a merge produces the global order
- **Linked lists**: put the head node of each list in the heap, tie broken by list number since nodes can't be compared, and relink as you go

Python's `heapq.merge(*iterables)` does it lazily and assumes each input is already sorted. If you only want the first few items of the merged result, the lazy version stops after producing them, which sorting can't do.

## Key Points

- A k-way merge keeps a heap with the front item of each of k sorted lists, takes the smallest, and pushes the next item from the same list
- It costs O(N log k) for N items, with O(k) extra memory beyond the output
- Sorting the concatenation can be faster in memory, since a library sort merges runs well, but the heap version streams
- With eight generators and 2,000,000 items, streaming used about 26 KB and sorting used 73 MB
- It is how sorted logs are combined, how external sorting finishes, and how results from several sorted sources are merged
