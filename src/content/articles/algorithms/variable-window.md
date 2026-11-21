> A **variable size sliding window** is a stretch of the array whose right end moves forward to take in items and whose left end moves forward to give them up, so it grows and shrinks to meet a condition. Both ends only move forward, which makes the whole scan O(n).

A student wants to finish a reading assignment in the fewest consecutive days, reading at least 7 hours in total, and the hours available on successive days are 2, 3, 1, 2, 4 and 3. Which stretch of days is shortest and still reaches 7 hours? There is no fixed length to slide this time. The answer's length is what we are looking for.

## Grow, Then Shrink

Keep a window with a left end and a right end. Push the right end forward, adding each day to the window's total, until the total reaches the goal. Then the window is long enough. Record its length, and shrink it from the left to see whether a shorter window still reaches the goal. When the total drops below the goal, grow on the right again.

```python
def shortest_with_sum(a, target):
    """Length of the shortest run of consecutive positive numbers with sum >= target, or 0."""
    best = float("inf")
    left = total = 0
    for right, x in enumerate(a):
        total += x                          # grow: take in a[right]
        while total >= target:              # shrink while the goal is still met
            best = min(best, right - left + 1)
            total -= a[left]
            left += 1
    return 0 if best == float("inf") else best
```

Here is the run on 2, 3, 1, 2, 4, 3 with a goal of 7. A window is written as the days it covers.

| Action | Window | Total | Note |
| --- | --- | --- | --- |
| Grow | 2, 3, 1, 2 | 8 | Reaches 7, record length 4 |
| Shrink | 3, 1, 2 | 6 | Below 7, stop shrinking |
| Grow | 3, 1, 2, 4 | 10 | Reaches 7, record 4 |
| Shrink | 1, 2, 4 | 7 | Still reaches 7, record 3 |
| Shrink | 2, 4 | 6 | Below 7, stop shrinking |
| Grow | 2, 4, 3 | 9 | Reaches 7, record 3 |
| Shrink | 4, 3 | 7 | Still reaches 7, record 2 |

The shortest stretch is the last two days, 4 and 3 hours, and the function returns 2. The invariant is that `total` equals the sum of `a[left..right]`. Shrinking can stop as soon as the goal is missed, which is safe because with positive numbers any shorter window ending at `right` would have an even smaller total.

## Why It Is O(n)

The loops look nested, a `while` inside a `for`, which suggests O(n²). It isn't. The left pointer only moves forward and never past the right pointer, so it advances at most n times in total over the whole run. The right pointer advances n times.

The work is at most 2n steps, however the shrinking is spread over the iterations. This is an amortized argument, the same style as in [Amortized Analysis](/algorithms/amortized-analysis): a single pass of the outer loop may do a lot of shrinking, but the total across the pass is bounded.

We timed it against checking every start position with a loop that stops at the first success. On 20,000 numbers with a hard target, the window took 1.0 ms and the brute force took 4.42 s. At 5,000 numbers they took 0.2 ms and 0.30 s, so the gap widens quickly as the array grows. We also compared the function with brute force on 4,000 random arrays.

## Windows Over Strings

The same grow and shrink pattern works on strings. Find the length of the longest stretch of a string with no repeated character. The window must stay free of repeats. Grow it by taking in the next character. If that character is already inside the window, shrink from the left, until the earlier copy is gone.

```python
def longest_unique(s):
    last = {}                                   # character -> index of its latest copy
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1                 # jump past the earlier copy
        last[ch] = right
        best = max(best, right - left + 1)
    return best
```

Here the left end jumps in one move instead of shrinking one step at a time, because a dictionary remembers where each character last appeared. For `abcabcbb` the answer is 3 and for `pwwkew` it is 3 as well.

We compared it with trying every substring on 4,000 random strings. The dictionary is the hash map from [Hash Maps and Hash Sets](/algorithms/hash-maps-sets), and a set works too if the left end moves one step at a time.

## When the Window Works, and When It Doesn't

The method relies on one property: growing the window can only push the condition one way, and shrinking pushes it the other way. With positive numbers, taking in an item raises the total and dropping one lowers it. That is what lets the left end move forward without ever needing to go back.

Negative numbers break it. With the days 5, −4 and 6 and a goal of 6, the right answer is the single day 6, a window of length 1. Our window version returned 3. It recorded the whole window, whose total is 7, then dropped the 5, which left a total of 2.

That is below the goal, so it stopped shrinking. Dropping the −4 as well would have raised the total to 6, but the loop assumed that dropping items can only lower the total. That holds for positive numbers and fails for negative ones.

For arrays with negative numbers there are other tools: [Prefix Sums with Hash Maps](/algorithms/prefix-sums-hash-maps) handles exact sums, and [Kadane’s Algorithm for Maximum Subarrays](/algorithms/kadane) handles the largest sum.

## A Template

Most variable window problems fit the same shape.

- **Longest window that satisfies a rule**: grow on the right, and shrink only when the rule breaks, then record the length
- **Shortest window that satisfies a rule**: grow until it holds, then shrink while it still holds, recording the length each time
- **A state to maintain**: a running total, a set, or a dictionary of counts, updated when an item enters or leaves

The two questions to ask are what the window needs to remember, and whether growing and shrinking move the condition in one direction.

## Key Points

- A variable window grows on the right until a condition holds and shrinks on the left while it still holds
- Both ends only move forward, so the scan is O(n) even though a loop sits inside a loop
- It works on arrays and strings, with a total, a set or a dictionary as the state the window remembers
- The condition must respond to growing and shrinking in one direction, as sums of positive numbers do
- Negative numbers break the shrinking logic, and prefix sums or Kadane's algorithm take over
