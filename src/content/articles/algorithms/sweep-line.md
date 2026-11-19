> A **sweep line** solves a problem by sorting its important points, such as where intervals start and end, and then moving an imaginary line across them in order while keeping a running state. It answers questions about overlap and coverage in O(n log n), even when the positions are huge.

The campus has six study group bookings. Each one reserves a room from a start hour to an end hour: 1 to 5, 2 to 6, 4 to 8, 7 to 9, 8 to 12 and 10 to 13. How many rooms must be open so that no group is turned away? The answer is the largest number of bookings that overlap at the same moment. [Merging Intervals](/algorithms/merging-intervals) joins overlapping bookings together, but it can't count how many overlap at once. Counting needs a different pass.

## Starts and Ends as Events

Replace each booking by two **events**: a start, which adds a room in use, and an end, which frees one. Sort all the events by time and walk through them in order, keeping a counter. The counter after each event is the number of rooms in use at that moment, and its largest value is the number of rooms needed.

```python
def max_overlap(intervals):
    """Half open intervals [start, end). The most that run at the same time."""
    events = []
    for s, e in intervals:
        events.append((s, 1))
        events.append((e, -1))
    events.sort()                    # at equal times, -1 sorts before +1
    count = best = 0
    for _, delta in events:
        count += delta
        best = max(best, count)
    return best
```

Here are the twelve events for the six bookings.

| Time | Event | Rooms in Use |
| --- | --- | --- |
| 1 | Start | 1 |
| 2 | Start | 2 |
| 4 | Start | 3 |
| 5 | End | 2 |
| 6 | End | 1 |
| 7 | Start | 2 |
| 8 | End | 1 |
| 8 | Start | 2 |
| 9 | End | 1 |
| 10 | Start | 2 |
| 12 | End | 1 |
| 13 | End | 0 |

At time 4 three bookings overlap, which is the most, so three rooms are needed. The counts at each hour from 0 to 13 look like this.

<figure class="chart">
<div class="bars" role="img" aria-label="Number of bookings running at each hour from 0 to 13: 0, 1, 2, 2, 3, 2, 1, 2, 2, 1, 2, 2, 1, 0, with the maximum of 3 at hour 4">
<div class="bar" style="--h: 3%"></div>
<div class="bar" style="--h: 33%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar peak" style="--h: 100%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 33%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 33%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 67%"></div>
<div class="bar" style="--h: 33%"></div>
<div class="bar" style="--h: 3%"></div>
</div>
<div class="axis"><span>Hour 0</span><span>Hour 7</span><span>Hour 13</span></div>
<figcaption>Bookings running at each hour. The busiest hour is hour 4, with three</figcaption>
</figure>

The invariant is that after processing the events up to a time, `count` is the number of intervals that contain that time. Sorting dominates the cost, O(n log n) for 2n events, and the pass itself is O(n). We compared the function with counting the bookings at every hour directly on 4,000 random lists.

## The Order of Simultaneous Events

When an end and a start have the same time, the order matters. Two back-to-back bookings, 9 to 10 and 10 to 11, don't share a room at the same moment, since the first ends exactly as the second begins. With the ends processed first, the counter drops to 0 before it rises again, and the answer for 9 to 10, 10 to 11 and 11 to 12 is 1. If the start came first, the counter would briefly say 2, and the answer would be wrong.

Sorting the pairs `(time, delta)` puts −1 before +1 at the same time, which gives the half open behavior for free. We ran the version that processes starts first on those three bookings, and it said 2 instead of 1. If bookings are closed, so that 9 to 10 and 10 to 11 do share the moment 10, flip the order. As with [Merging Intervals](/algorithms/merging-intervals), decide what overlap means and keep the code consistent with it.

## When the Positions Are Huge

[Difference Arrays](/algorithms/difference-arrays) solve the same counting question by adding 1 at each start and subtracting 1 after each end, then taking a running total. That needs an array with a slot for every position. If the times are seconds in a year, or any numbers up to a billion, the array doesn't fit.

The sweep line is the same idea without the array. The events are exactly the places where the difference array is nonzero, and sorting them stands in for walking the array's slots in order. We generated 200,000 intervals with start times up to a billion. The sweep took 222 ms, and the busiest moment had 142 bookings overlapping. A difference array for the same data would have needed about 8 GB of counters.

So the choice is between the two: use a difference array when the positions are small enough to index, and a sweep over sorted events when they are spread out.

## What the Line Remembers

The count is the simplest state. The pattern is more general, since a sweep keeps whatever is useful about the intervals that the line is currently inside.

- **The busiest time, not only how busy it is**: record the time when the counter reaches a new maximum
- **Which room each booking gets**: keep a heap of the end times of the bookings in progress, and reuse the room that frees up first
- **Total time covered by at least one interval**: add up the lengths of stretches where the counter is above zero, which agrees with the merged intervals
- **Geometry**: sweep a vertical line across points and segments, keeping the ones it crosses in a sorted structure, as in counting where horizontal and vertical segments cross, or finding the closest pair of points

In each case, the work happens at the events, because nothing changes between them. That is what lets the line jump from one event to the next instead of moving through every position.

## Key Points

- A sweep line sorts the events, where the situation changes, and processes them in order while keeping a running state
- For overlap counts, each interval gives a +1 at its start and a −1 at its end, and the largest running total is the most that overlap
- At equal times, process ends before starts for half open intervals, and flip it for closed ones
- It is the sparse form of a difference array, so it works when positions are far too spread out to index, at O(n log n)
- The state can be a counter, a heap or a sorted set, and the same pattern handles scheduling, coverage and geometry
