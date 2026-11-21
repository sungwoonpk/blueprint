> Binary search doesn't need a sorted array. It needs a yes or no question about positions whose answer is **no** for a while and then **yes** for the rest. Wherever you can ask such a question, you can find the switch point in about log₂ n steps.

A test started failing sometime during the last 1,000 commits. Nobody knows which commit broke it, and checking one means building the project and running the test. The commits aren't a sorted array of numbers.

But the question "does the test fail at this commit?" has the shape binary search needs: it is no for the early commits and yes from the breaking commit onward, since once the bug is in, it stays in. Check the middle commit, and half of the history is ruled out.

## The Yes or No Question

Write the question as a function `pred(i)`. Binary search finds the first position where it turns true.

```python
def first_true(lo, hi, pred):
    """Smallest i in [lo, hi) with pred(i) true, or hi if there is none.
    pred must be False for a while and then True for the rest."""
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if pred(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

This is the half open loop from [Binary Search](/algorithms/binary-search), with the comparison replaced by a question. The invariant is the same: the first true position lies between `lo` and `hi`.

The question is the only thing that changes from problem to problem, and the array was only one way to ask it. The lower bound is the special case `pred(i) = a[i] >= x`, which gave `first_true` the same answer as Python's `bisect_left` on our example list.

Go builds its standard search on exactly this shape: `sort.Search(n, f)` returns the first index where `f` is true, and its documentation says `f` must be false for a prefix and true for the rest.

## Finding the Commit That Broke the Test

The commits are numbered 0 to n − 1, and `pred(i)` runs the test at commit i. Version control tools automate this under the name bisecting, which is what `git bisect` does. We simulated it, counting how many times the test had to run.

| Commits in the Range | Tests Needed, Worst Case |
| --- | --- |
| 1,000 | 10 |
| 100,000 | 17 |
| 1,000,000 | 20 |

A thousand commits take at most 10 builds, where checking them in order could take a thousand. The count is ⌈log₂ n⌉, the same as for an array, because only the number of positions matters. The expensive part is the question, and binary search is how you ask it the fewest times.

## Rotated Sorted Arrays

A sorted array was rotated, so a stretch from the end moved to the front: 38, 47, 52, 60, 4, 9, 15, 23, 31. It isn't sorted, but it is two sorted pieces joined. Where does the second piece start, which is where the smallest item sits?

Compare each item with the last one. Items in the first piece are larger than the last item, and items in the second piece, including the last, are not. So `a[i] <= a[-1]` is false and then true, and `first_true` finds the rotation point.

```python
def rotation_point(a):
    """Index of the smallest item in a sorted array that was rotated."""
    return first_true(0, len(a), lambda i: a[i] <= a[-1])
```

For the list above it returns 4, where the 4 is. Searching for a value then takes two steps: find the rotation point, and binary search whichever sorted piece could hold the target.

```python
def search_rotated(a, target):
    k = rotation_point(a)
    for lo, hi in ((0, k), (k, len(a))):
        i = lo + first_true(0, hi - lo, lambda j: a[lo + j] >= target)
        if i < hi and a[i] == target:
            return i
    return -1
```

We checked both against brute force on 4,000 random rotated arrays and every target in range, and they matched. The method has a limit: it needs distinct values. In 2, 2, 2, 0, 2 the question is true everywhere, because every item is at most the last item, so it returns index 0 and the minimum is at index 3.

With repeated values a stretch of equal items hides which side you are on, and the search can't throw half away safely. Binary search is only as good as the monotone question.

## Finding a Peak

A hiker records elevation along a trail that climbs to a summit and then descends: 310, 335, 372, 410, 395, 360. Where is the summit? The question "is the next reading lower than this one?" is false while climbing and true after the summit.

```python
def peak(a):
    return first_true(0, len(a) - 1, lambda i: a[i] > a[i + 1])
```

This returns 3, the position of 410. We tested it on 3,000 randomly generated mountains. A flat stretch breaks it, because two equal neighbors don't say which direction the summit is. The question must change at exactly one place.

## When the Range Has No End

Sometimes there is no upper end to search. Find the first n where n² reaches 10¹². Pick a range that's too small and you miss the answer. **Exponential search** first finds a range by doubling, 1, 2, 4, 8 and so on, until the question turns true, and then binary searches inside the last doubling.

```python
def first_true_unbounded(pred):
    hi = 1
    while not pred(hi):
        hi *= 2
    lo = hi // 2 if hi > 1 else 0
    return lo + first_true(0, hi - lo + 1, lambda j: pred(lo + j))
```

For n² ≥ 10¹² it returned 1,000,000 using 40 calls to the question: about 20 doublings and about 20 halvings. The cost is O(log of the answer), so it works even when you don't know the size of the range up front.

## What Makes a Question Usable

Before using this idea, check one thing: is the question monotone? It should be false up to some point and true afterward, with no flips back. Four checks help.

- **Does the data back it up?** Test on a small case by hand, or compare with a brute force scan, as we did for each example here
- **What happens at the ends?** The first position might already be true, or none might be, and the loop should return the start or the end in those cases
- **Are there plateaus or duplicates?** They can make the answer ambiguous, as in the rotated array with repeated values and the flat peak
- **Is the answer stable?** A flaky test that fails at random breaks the shape of the commit search, since a later commit can pass again

When the question has the right shape, the same ten lines solve a wide range of problems. [Binary Search on the Answer](/algorithms/binary-search-on-answer) uses it for a particularly useful case: searching for the best answer to a problem, not a position in a list.

## Key Points

- Binary search needs a monotone question, one that is false for a while and then true, and not a sorted array
- `first_true(lo, hi, pred)` finds the switch point in about log₂ n questions, and lower bound is one case of it
- Examples: the first commit that breaks a test, the start of a rotated sorted array, and the summit of a mountain
- Exponential search finds a range by doubling first, so it works when no upper end is known
- Repeated values and flat stretches can break the monotone shape, so check small cases against brute force
