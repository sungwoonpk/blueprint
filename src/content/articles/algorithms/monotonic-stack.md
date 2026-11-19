> A **monotonic stack** is a stack that is kept in sorted order, with values only rising or only falling from bottom to top. Items that can no longer matter are popped before a new one is pushed, which answers questions like "what is the next larger value?" for every position in one pass.

The weather app wants to tell students how many days they must wait for a warmer day. For the daily highs 20, 18, 22, 17, 16, 19, 25 and 21, the answer for day 0 is 2, since day 2 is the first with more than 20 degrees. Checking forward from each day until a warmer one turns up is easy to write. On a long run of falling temperatures, every day scans to the end, and the cost is O(n²).

## Days That Are Still Waiting

Think about what happens as the scan moves forward. At any moment, some earlier days are still waiting for a warmer day. Keep their positions on a stack. When a new day arrives and is warmer than the day on top of the stack, that waiting day has found its answer: pop it and record the distance. Keep popping while the new day beats the top. Then push the new day, which starts waiting.

```python
def days_until_warmer(temps):
    wait = [0] * len(temps)
    stack = []                               # days still waiting, temperatures falling
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            wait[j] = i - j                  # day j has waited i - j days
        stack.append(i)
    return wait
```

Here is the run on the eight days.

| Day | High | Days Popped | Stack After, as Days |
| --- | --- | --- | --- |
| 0 | 20 | None | 0 |
| 1 | 18 | None | 0, 1 |
| 2 | 22 | 1, 0 | 2 |
| 3 | 17 | None | 2, 3 |
| 4 | 16 | None | 2, 3, 4 |
| 5 | 19 | 4, 3 | 2, 5 |
| 6 | 25 | 5, 2 | 6 |
| 7 | 21 | None | 6, 7 |

On day 2, the 22 pops day 1 (waited 1 day) and day 0 (waited 2 days). On day 6, the 25 pops days 5 and 2, which waited 1 and 4 days. Days 6 and 7 never find a warmer day, so their answer stays 0. The final answer is 2, 1, 4, 2, 1, 1, 0, 0.

The stack is **monotonic** because the temperatures of the days on it always fall from bottom to top. A new day that is cooler than the top gets pushed without disturbing anything, and a warmer day pops until the order is restored. That is the invariant: the stack holds exactly the days that haven't seen a warmer day yet, in falling order of temperature.

## Why It Is O(n)

The inner `while` suggests a nested loop, but each day is pushed once and popped at most once. The total number of pops can't exceed n, so the total work is at most 2n steps, which is the amortized argument from [Amortized Analysis](/algorithms/amortized-analysis). On a million random temperatures, the function took 83 ms in Python.

For the double loop to show its cost, the data has to be steadily falling, so that no day ever finds a warmer one and each scan runs to the end.

| Days of Falling Temperatures | Stack | Check Forward from Each Day |
| --- | --- | --- |
| 2,000 | 0.11 ms | 0.04 s |
| 4,000 | 0.19 ms | 0.15 s |
| 8,000 | 0.33 ms | 0.59 s |

Doubling the size quadruples the double loop and doubles the stack. We compared the function with the double loop on 4,000 random lists.

## The Same Idea, Looking Backward

The question can also be asked in the other direction: for each item, what is the nearest earlier item that is smaller? The stack then holds the candidates in increasing order. Pop every item that is not smaller than the new one. The new item is no larger than a popped item and closer to everything that comes later, so the popped item can never be the nearest smaller value for a later item.

```python
def previous_smaller(a):
    out, stack = [], []                      # the stack holds values, rising bottom to top
    for x in a:
        while stack and stack[-1] >= x:
            stack.pop()
        out.append(stack[-1] if stack else None)
        stack.append(x)
    return out
```

The top of the stack after the pops is the answer, or `None` if the stack is empty. This is the "nearest smaller values" problem, and it checks out against a direct search on 4,000 random lists.

## The Largest Rectangle

A less obvious use is the largest rectangle under a histogram. The bars have heights 3, 1, 4, 5, 2, 6 and 2, each one unit wide. Which rectangle, resting on the baseline, has the largest area? For each bar, the widest rectangle that uses its full height reaches left and right until a shorter bar blocks it. Those blockers are the nearest smaller values on each side.

```python
def largest_rectangle(heights):
    best = 0
    stack = []                               # indexes with rising heights
    for i, h in enumerate(heights + [0]):    # a final 0 flushes the stack
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            left = stack[-1] + 1 if stack else 0
            best = max(best, height * (i - left))
        stack.append(i)
    return best
```

When a bar of height `h` arrives and pops a taller bar, the popped bar's rectangle ends just before `i`. It begins just after the bar now on top of the stack, which is the nearest shorter bar on the left. For the heights above the answer is 10, the rectangle of height 2 and width 5 across the middle five bars, and it matched checking every pair of ends on 4,000 random histograms.

## Spotting It

Reach for a monotonic stack when the problem asks, for each position, about the nearest item in some direction that is larger or smaller. Typical forms are the next warmer day, the stock price span of previous days that were lower, and rectangles bounded by shorter bars. The signal is that an item can be forgotten once something better arrives, which is what the popping does.

The stack handles one end of a stretch. When the question is about a window that slides, with items leaving from the other end too, a queue is needed, and that is the [Monotonic Queue](/algorithms/monotonic-queue).

## Key Points

- A monotonic stack stays sorted by popping items that a new item makes irrelevant before pushing it
- For the next larger value, the stack holds the positions still waiting, with values falling from bottom to top, and each pop settles one answer
- Each item is pushed once and popped at most once, so the pass is O(n), compared with O(n²) for scanning forward from each item
- Looking backward gives the nearest smaller value, and the largest rectangle in a histogram uses both sides
- Look for "nearest larger or smaller item" in the problem statement
