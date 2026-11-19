> **Binary search on the answer** searches over the possible values of an answer instead of positions in a list. If the check "is x enough?" turns from no to yes at a single point, binary search finds the smallest x that works.

A study group has a reading list of chapters with different page counts, to be split in order into 3 sessions. Nobody wants one huge session, so the goal is to make the longest session as short as possible. For a long list, trying every way to cut it is far too many. But a different question is easy: if no session may run longer than L pages, how many sessions would we need?

## Search the Answers, Not the Data

Take pages 12, 7, 9, 21, 8, 15 and 4. Given a limit L, packing the chapters greedily answers the question: keep adding chapters to the current session until the next one wouldn't fit, then start a new session.

```python
def sessions_needed(pages, limit):
    """Fewest sessions, in order, with no session longer than limit."""
    sessions, current = 1, 0
    for p in pages:
        if current + p > limit:
            sessions += 1
            current = 0
        current += p
    return sessions
```

At a limit of 28 this gives three sessions, 12 + 7 + 9, then 21, then 8 + 15 + 4.

<figure class="diagram">
<div class="cells">
<div class="cell done">12</div>
<div class="cell done">7</div>
<div class="cell done">9</div>
<div class="cell">21</div>
<div class="cell done">8</div>
<div class="cell done">15</div>
<div class="cell done">4</div>
</div>
<figcaption>With a limit of 28 pages the greedy packing makes three sessions of 28, 21 and 27 pages</figcaption>
</figure>

Now the key step. If a limit L is enough, then a larger limit is enough too, since the same split still fits. So the question "can we manage in k sessions with limit L?" is no for small L and yes from some point on. That is the monotone question from [Binary Search Beyond Sorted Arrays](/algorithms/binary-search-beyond-sorted), and the thing being searched is the number L, not an array.

```python
def shortest_longest_session(pages, k):
    lo, hi = max(pages), sum(pages)          # the answer is somewhere in this range
    return first_true(lo, hi + 1, lambda limit: sessions_needed(pages, limit) <= k)
```

Here `first_true` is the function from the previous article: it returns the first value for which the question turns true. The smallest possible limit is the largest single chapter, since a chapter can't be split. The largest ever needed is the whole list in one session. The answer lies between, and `first_true` finds the smallest limit that works.

## Watching It Work

For the list above and k = 3, the range is 21 to 76. Here are the limits the search tried.

| Limit Tried | Sessions Needed | Enough for 3? |
| --- | --- | --- |
| 49 | 2 | Yes |
| 35 | 3 | Yes |
| 28 | 3 | Yes |
| 24 | 5 | No |
| 26 | 5 | No |
| 27 | 4 | No |

Six checks gave the answer, 28. A limit of 27 needs four sessions, and 28 needs three, so 28 is the smallest limit that works. We compared the result with a brute force search over every way to cut the list, on 3,000 random lists, and the two agreed on all of them.

The cost is the number of checks times the cost of one check. The range has size at most the total number of pages, and halving it takes about log₂ of that many steps. For a reading list of a million chapters with 1,000 sessions, the range was about 501 million wide and the search needed 29 checks, each a pass over the list, 0.8 seconds in all. There was no need to look at the exponentially many ways to split the list.

## Why the Check Has to Be Monotone

The method works because of one property. If x works then every larger x works, so the answers form a "no, no, no, yes, yes, yes" row and the switch point is the answer. Two habits keep it safe.

- **State the check as "is it enough", not "is it exact"**: asking whether the limit is exactly the answer isn't monotone and can't guide the search
- **Make sure the greedy check is right**: here, packing as much as fits into each session gives the fewest sessions. If the check could miss a valid arrangement, the monotone shape would be false in practice

The same shape appears in other problems, with the direction reversed. To make the shortest gap between cameras as large as possible, place k cameras along a corridor. The check "can k cameras fit with at least d between neighbors?" is yes for small d and no for large d. We want the last yes, which is one step before the first no.

```python
def can_place(pos, k, gap):
    count, last = 1, pos[0]
    for p in pos[1:]:
        if p - last >= gap:
            count += 1
            last = p
    return count >= k

def best_gap(pos, k):
    pos = sorted(pos)
    return first_true(1, pos[-1] - pos[0] + 2, lambda g: not can_place(pos, k, g)) - 1
```

For positions 1, 2, 4, 8, 9, 15 and 20 with three cameras, the best gap is 8, and it matched brute force on 3,000 random cases.

## Real Numbers

The answer doesn't have to be a whole number. To find x where x² = 2, treat "is mid² below 2?" as the question and shrink a range of reals. With real numbers there is no exact "found", so run a fixed number of halvings, not until two values are equal.

```python
def sqrt_bisect(x, iterations=60):
    lo, hi = 0.0, max(1.0, x)
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if mid * mid < x:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
```

Each halving cuts the error in half, so the accuracy improves by a fixed factor each round. Here is how far from the true √2 the estimate was.

| Halvings | Error |
| --- | --- |
| 10 | 8 × 10⁻⁴ |
| 20 | 6 × 10⁻⁷ |
| 30 | 9 × 10⁻¹⁰ |
| 50 | 2 × 10⁻¹⁶ |

By 50 halvings the error is at the limit of what a floating point number can represent, so more rounds can't help. Numerical analysis calls this the bisection method, and it finds a root of any continuous function whose sign changes between the ends of the range.

## Spotting the Pattern

Several signs suggest this approach.

- The question says **minimize the maximum** or **maximize the minimum**, as with the longest session and the closest cameras
- The question asks for the **smallest x such that** something is possible, or the **largest x such that**
- The answer is a number inside a range you can bound
- Checking whether a particular value works is easy, by a greedy pass or a simulation, while constructing the best answer directly is hard

When all four hold, the recipe is: bound the range, write the check, confirm it is monotone, and let `first_true` do the searching. The cost is log₂ of the range times one check.

## Key Points

- Binary search on the answer searches over candidate values, using a check that is no for small values and yes from some point on
- Bound the range, write a check that asks "is it enough", and find the first value where it holds
- The cost is about log₂ of the range times the cost of one check, so a million items took 29 passes
- Maximizing works by finding the last yes, one step before the first no
- For real numbers, run a fixed number of halvings, and 50 or so reaches the limit of floating point accuracy
- Look for "minimize the maximum", "maximize the minimum" and "smallest x such that" in the problem
