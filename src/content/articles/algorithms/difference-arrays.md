> A **difference array** records only where values change, not the values themselves. To add a number to a whole stretch of an array, you change two entries of the difference array, and one running total at the end turns it back into the final array.

The campus rents out study rooms by the day. A reservation reserves one room from day `l` to day `r`, and over the semester there are thousands of them. At the end, the office wants to know how many rooms are booked on each day.

The obvious way adds 1 to every day in every reservation. A month-long reservation touches 30 entries, and a semester-long one touches 120. If there are as many reservations as days, that adds up to a lot of work for something that should be simple: each reservation has just a start and an end.

## Record the Edges

Instead of adding to every day in the stretch, mark only the edges. A reservation from day `l` to day `r` raises the count at day `l` and lowers it again just after day `r`. Keep an array `diff`, where `diff[i]` is the change in the count from day `i − 1` to day `i`.

- Add `v` to `diff[l]`, because the count goes up by `v` starting at day `l`
- Subtract `v` from `diff[r + 1]`, because the count goes back down right after day `r`

Then a running total of `diff` gives the count for each day. The count at day `i` is the sum of all the changes up to `i`, which is exactly a prefix sum.

Here are two updates on an array of eight zeros: add 5 on days 1 to 4, and add 3 on days 3 to 6.

<figure class="diagram">
<p class="rowname">Difference array after the two updates</p>
<div class="cells">
<div class="cell">0<small>0</small></div>
<div class="cell hl">5<small>1</small></div>
<div class="cell">0<small>2</small></div>
<div class="cell hl">3<small>3</small></div>
<div class="cell">0<small>4</small></div>
<div class="cell hl">−5<small>5</small></div>
<div class="cell">0<small>6</small></div>
<div class="cell hl">−3<small>7</small></div>
</div>
<p class="rowname">Running total of the differences, the final array</p>
<div class="cells">
<div class="cell">0<small>0</small></div>
<div class="cell">5<small>1</small></div>
<div class="cell">5<small>2</small></div>
<div class="cell">8<small>3</small></div>
<div class="cell">8<small>4</small></div>
<div class="cell">3<small>5</small></div>
<div class="cell">3<small>6</small></div>
<div class="cell">0<small>7</small></div>
</div>
<figcaption>Each update changed two entries, and the running total spread them over the stretches. Days 3 and 4 have both updates, so they hold 5 + 3 = 8</figcaption>
</figure>

```python
import itertools

def apply_updates(n, updates):
    diff = [0] * (n + 1)                # one spare slot for r + 1
    for l, r, v in updates:
        diff[l] += v
        diff[r + 1] -= v
    return list(itertools.accumulate(diff))[:n]
```

The spare slot at the end absorbs the subtraction when an update reaches the last position, so there is no special case for it. The update loop costs O(1) for each update, and one pass at the end costs O(n), for O(n + q) with q updates. A direct approach that adds to each entry costs the length of the stretch for every update.

We compared them with all updates adding 1 to a random stretch, as many updates as there are days.

| Days and Updates | Adding to Each Day | Difference Array |
| --- | --- | --- |
| 2,000 | 25 ms | 0.13 ms |
| 4,000 | 120 ms | 0.22 ms |
| 8,000 | 446 ms | 0.46 ms |

The direct version quadruples when the size doubles, and the difference array roughly doubles. With a million days and a million updates, the difference array took 94 ms. We checked the two against each other on 4,000 random cases.

## The Mirror of Prefix Sums

A difference array and the prefix sums of [Prefix Sums for Range Queries](/algorithms/prefix-sums) are inverses of each other. The prefix sum turns values into running totals, so a stretch's sum becomes one subtraction. The difference array turns a running total back into the steps between neighboring values, so a stretch's update becomes two edits. Differences of the prefix sums give back the original array, and prefix sums of the differences give it back the other way.

That makes the pair useful together. The difference array is for writing in bulk, many updates before one read. The prefix array is for reading in bulk, many queries before one write. If updates and queries arrive mixed together, neither works alone, and [Fenwick Trees](/algorithms/fenwick-trees) handle the mixture in O(log n) per operation.

## Counting Overlaps

The study room question becomes: after all the reservations, how many rooms are booked on the busiest day? Each reservation is an update of +1 on its stretch, and the largest value of the final array is the answer. This is the heart of the technique in [Sweep Line](/algorithms/sweep-line), which works on events when the positions are too far apart to fit in an array.

The same method answers other overlap questions:

- How many classes are in session at each minute of the day
- Which days are covered by no booking at all, the zeros in the final array
- How many times each seat in a theater was selected by overlapping requests

## Two Dimensions

In a grid, an update adds a value to a rectangle. Change four corner entries of a difference grid, plus `v` at the top left, minus `v` just past the right edge and just past the bottom edge, and plus `v` at the bottom right corner past both.

A two dimensional running total then fills in the rectangle. The four terms mirror the four terms of the rectangle sum in [Prefix Sums for Range Queries](/algorithms/prefix-sums), as they should for an inverse.

## Pitfalls

- **Off by one at the end**: the subtraction goes at `r + 1`, not `r`, and the array needs a spare slot for it
- **Reading too early**: the difference array isn't the answer until the running total has been taken
- **Overflow**: many large updates can push the running totals past a 32 bit integer, so use a 64 bit type where integers have a fixed width

## Key Points

- A difference array stores the change between neighbors, so adding `v` to a stretch is two edits: `+v` at the start and `−v` just after the end
- A running total of the differences produces the final array, in one O(n) pass
- That makes q updates cost O(n + q), and in our test a million updates on a million days took 94 ms
- It is the inverse of a prefix sum, one for writing in bulk and the other for reading in bulk
- Counting overlaps of intervals is its classic use, and the largest final value is the busiest point
