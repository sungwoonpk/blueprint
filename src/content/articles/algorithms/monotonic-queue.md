> A **monotonic queue** is a double-ended queue kept in sorted order, so its front holds the largest (or smallest) value in a sliding window. Items that can never be the answer again are dropped from the back, and items that left the window are dropped from the front.

A service logs its response time every second, and an alert needs the slowest response in the last 60 seconds, updated every second.

The [fixed window](/algorithms/fixed-window) can add and subtract to keep a running sum, but a maximum can't be updated that way: when the slowest request leaves the window, the next slowest has to be known, and the window's sum doesn't carry that. Scanning the whole window each second costs O(k). We can do better.

## Keep Only the Contenders

Think about which items in the window could ever be the maximum. Suppose a newcomer is larger than an item that is already in the window. The older item will leave the window before the newcomer does, and the newcomer is larger anyway, so the older item can never be the maximum again. It can be dropped right now.

So keep the window's candidates in a deque of positions, ordered so that their values fall from front to back. The front is the current maximum. Each step does three things:

1. Pop from the back every item that is not larger than the new one, since those are no longer contenders
2. Push the new item at the back
3. If the front slid out of the window, pop it from the front

```python
from collections import deque

def window_max(a, k):
    out, dq = [], deque()                    # positions, values falling from front to back
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()                     # the front slid out of the window
        if i >= k - 1:
            out.append(a[dq[0]])
    return out
```

Here is a run on 4, 2, 12, 3, 8, 5, 1, 7 with a window of 3. The deque is shown as values.

| Position | Item | Deque of Values After | Window Maximum |
| --- | --- | --- | --- |
| 0 | 4 | 4 | |
| 1 | 2 | 4, 2 | |
| 2 | 12 | 12 | 12 |
| 3 | 3 | 12, 3 | 12 |
| 4 | 8 | 12, 8 | 12 |
| 5 | 5 | 8, 5 | 8 |
| 6 | 1 | 8, 5, 1 | 8 |
| 7 | 7 | 7 | 7 |

At position 2, the 12 pops both smaller items, since they sit in the window but will never be the maximum. At position 5, the front of the deque is the 12 from position 2, which has now slid out of the window of positions 3 to 5, so it is popped and the 8 becomes the maximum.

At position 7 the 7 pops the 1 and the 5. The front, the 8 from position 4, has slid out of the window of positions 5 to 7, so it is popped too.

The invariant is that the deque holds the positions inside the window whose values are larger than everything after them in the window, so the front is the maximum. We compared it with taking the maximum of each window on 4,000 random arrays.

## Why It Is O(n)

Each position is pushed once and popped at most once, from the back or from the front. That is at most 2n deque operations, the same argument as the [monotonic stack](/algorithms/monotonic-stack) and the amortized reasoning of [Amortized Analysis](/algorithms/amortized-analysis). The window size doesn't appear in the cost.

We timed it on 200,000 values with a window of 1,000.

| Method | Time |
| --- | --- |
| Take the maximum of each window | 1,313 ms |
| Heap with lazy deletion | 42 ms |
| Monotonic queue | 27 ms |

Taking the maximum of each window costs O(n × k). A heap, where an item is skipped later if it has slid out, is O(n log n) and pretty close in practice. The monotonic queue is O(n) and wins here with less code. All three agreed on the results.

For the response times, this is the alert loop: push each new reading, and read the front as the slowest of the last 60 seconds.

## Smallest in a Window, and Other Uses

For the minimum, flip the comparison, so the deque keeps rising values and the front is the smallest. The same code with `>=` in place of `<=` handles it.

The most useful trick is combining a monotonic queue with prefix sums. In [Kadane's Algorithm for Maximum Subarrays](/algorithms/kadane), the best stretch ending at `j` uses the smallest earlier prefix sum. If the stretch may be at most k items long, the earlier prefix must come from the last k positions, a sliding window minimum.

```python
import itertools

def best_stretch_at_most_k(a, k):
    p = list(itertools.accumulate(a, initial=0))
    dq, best = deque([0]), -10**18
    for j in range(1, len(p)):
        if dq[0] < j - k:
            dq.popleft()                     # that prefix is more than k items back
        best = max(best, p[j] - p[dq[0]])
        while dq and p[dq[-1]] >= p[j]:
            dq.pop()
        dq.append(j)
    return best
```

The front of the deque is the smallest prefix within reach, so each step is O(1) amortized. We compared this function with trying every stretch of at most k items on 4,000 random arrays.

The same shape appears in some dynamic programming problems, where the best value for position `i` depends on the best of the last k positions, and a monotonic queue turns an O(n × k) recurrence into O(n). [Linear DP on Sequences](/algorithms/linear-dp) shows the setup.

## Key Points

- A monotonic queue is a deque of positions whose values are kept in order, so the front is the window's maximum or minimum
- A new item pops weaker items from the back, which can never be the answer again, and the front pops when it slides out of the window
- Each position enters and leaves once, so all windows cost O(n) regardless of the window size
- On 200,000 values with a window of 1,000 it ran in 27 ms, against 1,313 ms for taking the maximum of each window
- Combined with prefix sums it finds the best stretch of bounded length, and it speeds up some dynamic programming recurrences
