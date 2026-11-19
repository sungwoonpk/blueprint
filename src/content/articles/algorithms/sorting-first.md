> **Sorting as a first step** means sorting the input before doing anything else, because order puts related items next to each other and turns many problems into a single pass.

In [What is an Algorithm?](/algorithms/what-is-an-algorithm), the neighbor check for duplicate IDs gave the wrong answer on `[3377, 4021, 3377, 5150]`: it only compared items that were side by side, and the two 3377s weren't. The fix was promised there. Sort the list first and the idea is correct, because equal items now sit next to each other. That is the pattern of this page. A sort costs n log n, and in exchange the list has a structure that a simple scan can use.

## Order Puts Related Items Together

<figure class="diagram">
<p class="rowname">Before sorting</p>
<div class="cells">
<div class="cell">3377</div>
<div class="cell">4021</div>
<div class="cell">3377</div>
<div class="cell">5150</div>
</div>
<p class="rowname">After sorting</p>
<div class="cells">
<div class="cell hl">3377</div>
<div class="cell hl">3377</div>
<div class="cell">4021</div>
<div class="cell">5150</div>
</div>
<figcaption>Equal IDs end up next to each other, so one pass comparing neighbors finds them</figcaption>
</figure>

```python
def has_duplicate_sorted(ids):
    ids = sorted(ids)
    return any(ids[i] == ids[i + 1] for i in range(len(ids) - 1))
```

The sort costs O(n log n) and the scan O(n), so the whole thing is O(n log n), with no pairs to compare. We checked it against a set based version on 3,000 random lists.

Closeness works the same way. In a sorted list, the two items nearest in value are neighbors, so finding the smallest gap between any two values needs only the gaps between neighbors.

```python
def smallest_gap(times):
    times = sorted(times)
    return min(times[i + 1] - times[i] for i in range(len(times) - 1))
```

Comparing every pair would take O(n²). Sorting reduces the question to n − 1 neighbor gaps. Suppose the library door logs arrival times and you want the two students who arrived closest together. We matched this against the all-pairs version on 3,000 random lists.

## Intervals and Overlaps

Meetings and bookings are intervals, and sorting by start time orders their conflicts. Can a student attend every meeting on a list?

```python
def can_attend_all(meetings):              # meetings are (start, end) pairs
    meetings = sorted(meetings)            # by start time
    for i in range(1, len(meetings)):
        if meetings[i][0] < meetings[i - 1][1]:
            return False                   # starts before the previous one ends
    return True
```

After sorting by start, it is enough to compare each meeting with the one before it. If each meeting starts no earlier than the previous one ends, all the earlier meetings have ended too, so nothing overlaps, and a meeting that starts before the previous one ends is a clash. Back-to-back meetings, such as 9 to 10 followed by 10 to 11, don't count as a clash, which is why the test is `<` and not `<=`. `[(9, 10), (10, 11), (11, 12)]` returns `True` and `[(9, 11), (10, 12)]` returns `False`. We compared it against checking every pair on 3,000 random lists. [Merging and Inserting Intervals](/algorithms/merging-intervals) takes this idea further.

## Sorting as a Normal Form

Sorting can also reduce different things to a common form. Two words are anagrams if their letters sorted are the same, so the sorted letters make a key for grouping.

```python
def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())
```

`listen`, `silent` and `enlist` all become `eilnst`, and they land in one group, as do `google` and `gogole`. A dictionary does the grouping, as in [Hash Maps and Hash Sets](/algorithms/hash-maps-sets), and the sort turns each word into something comparable.

## A Pattern List

Here are the kinds of problems that tend to get easier after a sort.

| Problem | What Sorting Gives You | Then |
| --- | --- | --- |
| Duplicates | Equal items are adjacent | Compare neighbors |
| Closest pair of values | The closest items are adjacent | Look at neighbor gaps |
| Overlapping intervals | Intervals in order of start | Compare each start with the latest end |
| Grouping by a property | Items with the same key are adjacent | Walk through runs of equal keys |
| Many lookups | A sorted array | Binary search for each |
| Median or percentile | Items in rank order | Read one position |
| A pair with a given sum | Small values at one end, large at the other | Two pointers from both ends |

The last two rows have their own chapters: [Binary Search](/algorithms/binary-search) for lookups and [Two Pointers](/algorithms/two-pointers) for pairs.

## When Sorting Pays Off

Sorting isn't free, and a faster method sometimes exists. We tested both sides on 100,000 numbers.

Looking up one item by scanning the list costs about 0.4 ms. Sorting costs about 10 ms, and each lookup after that, by binary search, takes about a microsecond.

| Lookups | Scan Each Time | Sort Once, Then Bisect |
| --- | --- | --- |
| 1 | 0.4 ms | 10.0 ms |
| 5 | 2.1 ms | 9.6 ms |
| 20 | 8.2 ms | 9.9 ms |
| 100 | 40.9 ms | 9.6 ms |

The sort pays for itself after about 20 lookups. At 2,000 lookups, scanning took 0.80 s and sorting once took 10 ms. A hash set did the same lookups in 2 ms, so when the only question is "is this item present?", a set beats sorting.

The duplicate check shows the same trade. On 1,000,000 distinct IDs, the set version took 44 ms and sorting then comparing neighbors took 262 ms. Sorting loses on speed there. What it offers instead is the order itself, which also answers questions a set can't, such as the closest pair. It also needs no hash table: sorting the list in place with `list.sort` avoids holding a second copy of the IDs, though the sort itself may use a temporary array.

A few cautions go with the idea. Sorting changes the order, so keep the original positions if you need them, for example by sorting pairs of (value, position). Sort by the right key, since sorting by name and then looking for a score pattern won't help. And if the list changes often, re-sorting after each change gets expensive, and a structure that stays ordered, such as a balanced tree, fits better.

## Key Points

- Sorting costs O(n log n) and puts equal, close and related items next to each other, so a single pass can finish the job
- It fixes the neighbor check for duplicates, finds the smallest gap, detects overlapping intervals and builds keys for grouping
- Sorting once and searching many times wins after about 20 lookups on 100,000 items, but a hash set beats it when only membership matters
- Sorting loses the original order, so keep positions when they matter
- The choice is between sorting, hashing and leaving the data alone, and the cost of each decides it
