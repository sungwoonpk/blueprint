> There are two ways to run a dynamic programming recurrence. **Memoization**, or top down, keeps the recursion and caches each answer the first time it is computed. **Tabulation**, or bottom up, fills a table from the smallest subproblem up in an order where every answer needed is already there. They compute the same answers. Top down computes only the subproblems that are actually reached, and bottom up avoids recursion and its depth limit.

A vending machine has coins of 1, 3 and 4 cents. What is the fewest coins that make 6 cents? Greedy says to take the biggest coin that fits, which gives 4 + 1 + 1, three coins. The right answer is 3 + 3, two coins.

Greedy fails on this set of coins. A recurrence doesn't: the fewest coins for an amount is one coin plus the fewest for what remains after that coin, and we try each coin.

## The Recurrence

Let fewest(a) be the smallest number of coins that make a cents. It is 0 for a = 0. Otherwise the last coin could be any of the coins that fit, and the rest is a smaller amount.

fewest(a) = 1 + min of fewest(a − c) over the coins c that fit

Only the amounts from 0 to a are ever asked about, so there are a + 1 different subproblems, each solved with at most 3 comparisons. The two styles differ in how they get through those subproblems.

## Top Down: Cache the Recursion

Write the recurrence as a function and cache it.

```python
from functools import cache

INF = float("inf")

def make_fewest(coins):
    @cache
    def fewest(a):
        if a == 0:
            return 0
        best = INF
        for c in coins:
            if c <= a:
                best = min(best, fewest(a - c) + 1)
        return best
    return fewest
```

The `@cache` decorator from the standard library keeps a dictionary from each argument to its answer, so a repeated call is a lookup. With the coins 1, 3, 4, a call for 900 cents made 901 first-time calls and 1,795 calls that were answered from the cache, in 0.27 ms.

The code reads like the recurrence, which makes it the easier version to get right. It also computes only what is asked for, a difference we will see below.

## Bottom Up: Fill the Table

Each entry needs entries for smaller amounts, so fill the table for 0, 1, 2, and so on.

```python
def fewest_table(coins, amount):
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp
```

For amounts 0 to 9 it gives 0, 1, 2, 1, 1, 2, 2, 2, 2, 3.

<figure class="diagram">
<div class="cells"><div class="cell">0<small>0</small></div><div class="cell">1<small>1</small></div><div class="cell done">2<small>2</small></div><div class="cell done">1<small>3</small></div><div class="cell">1<small>4</small></div><div class="cell done">2<small>5</small></div><div class="cell hl">2<small>6</small></div><div class="cell">2<small>7</small></div><div class="cell">2<small>8</small></div><div class="cell">3<small>9</small></div></div>
<figcaption>The fewest coins from 1, 3 and 4 for each amount from 0 to 9. The outlined amount 6 looks at the shaded amounts 5, 3 and 2, one coin away, and the best is 3 with a 3 coin added, 2 coins in all</figcaption>
</figure>

To fill entry 6, look back one coin: from 5 with a 1 coin makes 2 + 1 = 3 coins, from 3 with a 3 coin makes 1 + 1 = 2, from 2 with a 4 coin makes 2 + 1 = 3. The smallest is 2.

We compared the two versions and an independent method for every amount from 0 to 300. The independent method is breadth-first search from [Breadth-First Search](/algorithms/breadth-first-search) on amounts as vertices, where adding a coin is an edge, since the fewest coins is the fewest edges from 0. All three agreed on all 301 amounts. Greedy was worse than the true answer for 74 of the 300 amounts from 1 to 300.

## Where They Differ

**Depth.** The top down version recurses as deep as the amount: asking for 1,000 cents calls itself 1,000 times in a row. Python's default limit is 1,000 levels. With the cached function, an amount of 998 worked and 1,000 raised `RecursionError`. Raising the limit helped less than expected.

With `sys.setrecursionlimit(1000000)`, the largest amount that worked with `@cache` was 3,332, and the failure came from the C code of the cache wrapper, not from that setting. A hand written dictionary version reached 200,000 with the raised limit.

The table has no such problem, because it is a loop. It filled 100,000 cents in 0.02 s. A common workaround for the recursive version is to ask for the amounts in increasing order, 0, 1, 2 and so on, so that every recursive call finds its answer already cached. We filled in 20,001 amounts that way under the default limit and it worked.

**Work done.** The table computes every cell from 0 to the amount, needed or not. The recursion computes only the amounts it reaches. For coins of 1, 3 and 4 that is all of them, 401 of 401 for amount 400. For other coins it can be few.

| Coins | Amount | Subproblems Reached | Table Cells |
| --- | --- | --- | --- |
| 1, 3, 4 | 400 | 401 | 401 |
| 7, 13, 29 | 3,000 | 2,973 | 3,001 |
| 25, 60, 110 | 5,000 | 979 | 5,001 |
| 100, 250 | 5,000 | 99 | 5,001 |

With coins of 100 and 250, only amounts that are 5,000 minus a combination of 100s and 250s can ever occur, 99 of the 5,001 cells. The recursion looked at only those, and a table would fill all of them unless it is changed to skip the unreachable ones.

**Speed.** When all cells are needed, the loop is faster. For 900 cents, the cached recursion took 0.27 ms and the loop 0.14 ms, about half, since a function call costs more than a loop step.

**Space.** Both keep a result for each subproblem, 901 for 900 cents. The table can sometimes drop old rows, which [Saving Space in DP](/algorithms/saving-space) takes up, while the cache keeps everything.

## Which to Use

| Situation | Choose |
| --- | --- |
| The recurrence is hard, and getting it right is the job | Top down, which mirrors the formula |
| Many subproblems are never needed | Top down |
| The recursion would be deep | Bottom up, or top down fed in increasing order |
| All subproblems are needed and speed counts | Bottom up |
| Only the last few results matter | Bottom up, keeping a small window |

They are two ways of running the same recurrence, so a design made in one is easy to rewrite in the other. A good habit is to write the top down version first to check the recurrence, and then convert to a loop if depth or speed demands.

## Key Points

- Memoization caches a recursion, and tabulation fills a table from the smallest subproblem up, in an order where everything needed is ready
- For coins of 1, 3 and 4, the recurrence fewest(a) = 1 + min of fewest(a − c) beat greedy on 74 of 300 amounts, and the cached recursion, the table and a breadth-first search all agreed on 301 amounts
- Top down depth grows with the amount, `@cache` failed at 1,000 levels by default and stopped near 3,332 even with a raised limit, while the table filled 100,000 cents in 0.02 s
- Top down computes only the subproblems it reaches, 99 of 5,001 for coins of 100 and 250, and a plain table fills them all
- When all cells are needed the loop was about twice as fast, 0.14 ms against 0.27 ms for 900 cents
