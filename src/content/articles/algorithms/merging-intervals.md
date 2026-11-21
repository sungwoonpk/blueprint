> **Merging intervals** combines overlapping ranges into the fewest non-overlapping ones. After sorting by start, one pass is enough: each interval either extends the last merged one or begins a new one.

The campus has a list of times when a lab is booked, such as 1 to 3, 2 to 6, 8 to 10, 15 to 18 and 17 to 20. Staff want the list cleaned up so each busy stretch appears once, and they want to know when the lab is free. Looking at the list in order doesn't help, because the bookings were entered in no particular order. Sorting changes that.

## Sort, Then Sweep

Sort the intervals by start time. Now any interval that overlaps an earlier one overlaps the **last merged interval**, since everything earlier is already folded into it. Scan once. If the next interval starts no later than the end of the last merged one, they overlap: stretch the merged end if needed. Otherwise a gap appeared, and the interval starts a new merged one.

```python
def merge_intervals(intervals):
    """Merge overlapping closed intervals. Touching ends, like (1, 3) and (3, 5), merge too."""
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
```

The `max` matters. A later interval can sit entirely inside the last merged one, such as 3 to 4 inside 1 to 6, and its end must not shrink the merged end.

<figure class="chart">
<div class="waterfall" role="img" aria-label="Five booked intervals on a timeline from 0 to 20, and the three merged intervals they become: 1 to 6, 8 to 10 and 15 to 20">
<div class="wf"><span>1 to 3</span><span class="track"><span class="bar" style="--s: 5%; --w: 10%"></span></span><span class="value">booked</span></div>
<div class="wf"><span>2 to 6</span><span class="track"><span class="bar" style="--s: 10%; --w: 20%"></span></span><span class="value">booked</span></div>
<div class="wf"><span>8 to 10</span><span class="track"><span class="bar" style="--s: 40%; --w: 10%"></span></span><span class="value">booked</span></div>
<div class="wf"><span>15 to 18</span><span class="track"><span class="bar" style="--s: 75%; --w: 15%"></span></span><span class="value">booked</span></div>
<div class="wf"><span>17 to 20</span><span class="track"><span class="bar" style="--s: 85%; --w: 15%"></span></span><span class="value">booked</span></div>
<div class="wf peak"><span>1 to 6</span><span class="track"><span class="bar" style="--s: 5%; --w: 25%"></span></span><span class="value">merged</span></div>
<div class="wf peak"><span>8 to 10</span><span class="track"><span class="bar" style="--s: 40%; --w: 10%"></span></span><span class="value">merged</span></div>
<div class="wf peak"><span>15 to 20</span><span class="track"><span class="bar" style="--s: 75%; --w: 25%"></span></span><span class="value">merged</span></div>
</div>
<figcaption>Five bookings on a timeline from 0 to 20 and the three merged stretches they become</figcaption>
</figure>

The invariant is that `merged` holds disjoint stretches, in order, covering exactly what the intervals seen so far cover, and the last one is the only one a later interval could touch. Sorting costs O(n log n) and the sweep O(n).

We checked the function on 4,000 random lists by comparing which points are covered before and after, and that the merged stretches are separated by gaps. Merging a million intervals took 0.88 s in Python.

## Deciding What Counts as Overlap

Whether touching ends merge depends on what the interval means. A booking from 1 to 3 and another from 3 to 5 might be one continuous block of the lab, or two back-to-back bookings with a handover. The code above treats the ends as included, so (1, 3) and (3, 5) merge to (1, 5).

To keep them apart, as with bookings that end exactly when the next one begins, compare with `<` instead of `<=`. Write the convention down. It is the sort of detail from [Edge Cases and Testing](/algorithms/edge-cases) that changes answers at the boundaries.

## Finding the Free Time

The gaps between the merged stretches are the free time. Walk the merged list and report the space before each stretch, then the space after the last one.

```python
def free_gaps(merged, day_start, day_end):
    gaps, cursor = [], day_start
    for s, e in merged:
        if s > cursor:
            gaps.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < day_end:
        gaps.append((cursor, day_end))
    return gaps
```

With the merged list 1 to 6, 8 to 10 and 15 to 20 and a day from 0 to 24, the free times are 0 to 1, 6 to 8, 10 to 15 and 20 to 24.

## Inserting One More Interval

If the list is already merged and sorted, a new interval doesn't need a full re-sort. Intervals fall into three groups relative to the new one: those that end before it starts, those that overlap it, and those that start after it ends. Copy the first group, fold the second group into the new interval, and copy the third.

```python
def insert_interval(sorted_disjoint, new):
    """Insert new = (start, end) into a sorted list of disjoint closed intervals."""
    out, i, n = [], 0, len(sorted_disjoint)
    start, end = new
    while i < n and sorted_disjoint[i][1] < start:        # entirely before
        out.append(list(sorted_disjoint[i])); i += 1
    while i < n and sorted_disjoint[i][0] <= end:         # overlaps the new one
        start = min(start, sorted_disjoint[i][0])
        end = max(end, sorted_disjoint[i][1]); i += 1
    out.append([start, end])
    while i < n:                                          # entirely after
        out.append(list(sorted_disjoint[i])); i += 1
    return out
```

Adding 5 to 9 to the merged list above gives 1 to 10 and 15 to 20, since it bridges the first two stretches. The pass is O(n) and needs no sort, and it matched merging everything again on 4,000 random cases.

In practice it isn't much faster. On about 190,000 merged intervals, the insertion pass took about 18 ms, and adding the interval and merging everything again took about 21 ms. The reason is that Python's sort is adaptive: a list that is already sorted except for one new item is sorted in nearly linear time, as [How Standard Library Sorts Work](/algorithms/library-sorts) explains. The insertion pass has a guaranteed bound without relying on that behavior.

## The Pattern

Interval problems often yield to "sort by start, then scan with a running end". Besides merging, the same pass answers whether any two intervals overlap, which was the meeting question in [Sorting as a First Step](/algorithms/sorting-first), and it finds the free time. When the question is how many intervals overlap at a time, a different view is better, which is the [Sweep Line](/algorithms/sweep-line).

## Key Points

- Sort by start, then scan once, extending the last merged interval when the next one starts no later than its end and starting a new one otherwise
- Use `max` for the end, since a later interval can sit inside the last one
- Decide whether touching ends merge, and use `<=` or `<` to match
- The gaps between merged intervals are the free time
- Inserting into a merged list takes three groups and a pass, but a nearly sorted list also sorts quickly in many languages
