> A **fixed size sliding window** looks at k consecutive items at a time and moves one step along the array. Instead of recomputing each window from scratch, it updates the previous answer by adding the item that enters and removing the one that leaves.

The library counts visitors each day, and the director wants the busiest stretch of seven days in the semester. Each stretch is a window of 7 consecutive days. There are about a hundred windows in a semester and 7 numbers to add in each.

That is easy. Now picture a sensor that logs a reading every second for a year, with a window of one hour. Adding up each window from scratch is a real cost, and the windows overlap almost completely. That overlap is the thing to use.

## Slide, Don't Recompute

Two neighboring windows share all but two days. Moving the window one step to the right adds the day on the right edge and drops the day on the left edge. So the sum of the new window is the old sum, plus the item that enters, minus the item that leaves.

<figure class="diagram">
<p class="rowname">Window of 3, sum 8</p>
<div class="cells">
<div class="cell hl">3</div>
<div class="cell hl">1</div>
<div class="cell hl">4</div>
<div class="cell">1</div>
<div class="cell">5</div>
<div class="cell">9</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<p class="rowname">Slide: 3 leaves, 1 enters. 8 − 3 + 1 = 6</p>
<div class="cells">
<div class="cell">3</div>
<div class="cell hl">1</div>
<div class="cell hl">4</div>
<div class="cell hl">1</div>
<div class="cell">5</div>
<div class="cell">9</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<p class="rowname">Slide: 1 leaves, 5 enters. 6 − 1 + 5 = 10</p>
<div class="cells">
<div class="cell">3</div>
<div class="cell">1</div>
<div class="cell hl">4</div>
<div class="cell hl">1</div>
<div class="cell hl">5</div>
<div class="cell">9</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<p class="rowname">Slide: 4 leaves, 9 enters. 10 − 4 + 9 = 15</p>
<div class="cells">
<div class="cell">3</div>
<div class="cell">1</div>
<div class="cell">4</div>
<div class="cell hl">1</div>
<div class="cell hl">5</div>
<div class="cell hl">9</div>
<div class="cell">2</div>
<div class="cell">6</div>
</div>
<figcaption>Each slide does one addition and one subtraction, no matter how wide the window is</figcaption>
</figure>

```python
def best_window_sum(a, k):
    window = sum(a[:k])                 # the first window, added up once
    best = window
    for i in range(k, len(a)):
        window += a[i] - a[i - k]       # the new item enters, the old one leaves
        best = max(best, window)
    return best
```

The first window costs k steps and each of the remaining n − k windows costs a constant, so the total is O(n). Recomputing each window costs O(n × k).

We tried it on 100,000 daily counts with a window of 1,000 days: sliding took 6.9 ms and recomputing took 505 ms, about 70 times more. The gap is the window size, so it grows with k. We compared the sliding version with brute force on 4,000 random arrays.

The invariant is that `window` holds the sum of the k items ending at index `i`. It is true after the first window is added, and each pass of the loop keeps it true by swapping one item for another.

## What the Window Can Hold

A running sum is the simplest summary. The idea works for any summary that can be updated by adding an item and removing an item.

**Counts.** How many distinct values are in each window of k? Keep a dictionary of counts. When an item enters, add one to its count. When an item leaves, subtract one, and delete the key when it hits zero. The number of keys is the answer.

```python
from collections import defaultdict

def distinct_in_windows(a, k):
    counts = defaultdict(int)
    out = []
    for i, x in enumerate(a):
        counts[x] += 1
        if i >= k:
            old = a[i - k]
            counts[old] -= 1
            if counts[old] == 0:
                del counts[old]
        if i >= k - 1:
            out.append(len(counts))
    return out
```

For visitors by department over the last k days, this tells you how many different departments were busy. We compared it with building a set for each window on 4,000 random arrays.

**Averages.** A moving average is the window sum divided by k. It smooths noisy numbers such as daily temperatures or response times.

**Recent history.** To keep only the last k items as they stream in, a `deque` with `maxlen=k` drops the oldest item automatically when a new one arrives, as in [Queues and Deques](/algorithms/queues-deques).

A window maximum can't be updated that simply, because removing the leaving item may remove the maximum, and you can't tell the next largest without more bookkeeping. That is a job for a [Monotonic Queue](/algorithms/monotonic-queue).

## A Floating Point Caution

With integers, adding and subtracting is exact. With decimals, each addition and subtraction rounds a little, and the rounding errors pile up as the window slides. We ran a window of 1,000 values between 0 and 100 over four million decimals.

The rolling sum was 6 × 10⁻¹⁰ away from the exactly summed window after 100,000 steps, 1.2 × 10⁻⁹ after two million steps and 2.9 × 10⁻⁹ after four million. That is a tiny relative error, near 6 × 10⁻¹⁴, but it wanders and tends to grow with more steps. If the exact value matters, recompute the sum from time to time, or use a summation routine such as `math.fsum` for each window.

## Choosing the Window Size

The window size k comes from the question, as in the busiest 7 days, or the average of the last 5 readings. If the size is not given and you are instead looking for the longest or shortest stretch that meets a condition, the window must grow and shrink, and that is the subject of [Variable Size Sliding Window](/algorithms/variable-window).

Edge cases for the fixed window are a k larger than the array, which has no window, and k equal to the array length, which has exactly one window. Check these before writing the loop, as the advice in [Edge Cases and Testing](/algorithms/edge-cases) suggests.

## Key Points

- A fixed size window moves along the array one step at a time, adding the item that enters and removing the one that leaves
- That update costs O(1), so all windows cost O(n), against O(n × k) for recomputing, 70 times slower in our test of 1,000 days
- Any summary that can be added to and subtracted from works: sums, averages and counts of distinct values
- Decimal sums drift with rounding errors over many steps, so recompute now and then if exactness matters
- A window maximum needs more than add and subtract, and a monotonic queue handles it
