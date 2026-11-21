> A dynamic programming table gives the value of the best answer, such as 3 coins or a total of 20. To get the answer itself, record which choice won in each state, or recompute the choice at each step, and then walk back from the final state to the base case following those choices. The walk costs only the length of the answer.

The vending machine can make 10 cents with 3 coins, and the table says so. But a machine has to hand out coins. Which three?

The table of costs doesn't say, because it threw away how each value was reached. Keeping a little more, or looking back through the table, gets the actual coins.

## Remember the Last Choice

In the coin recurrence, each amount's best answer ends with some coin. When computing the amount, we choose the coin that gives the smallest count. Write that coin down.

```python
def fewest_coins(coins, amount):
    dp = [0] + [float("inf")] * amount
    choice = [0] * (amount + 1)               # the last coin of one best answer
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
                choice[a] = c
    return dp, choice
```

The extra array has one entry for each state. To rebuild an answer, start at the target amount, read its last coin, subtract it, and repeat until nothing is left.

```python
def rebuild(choice, amount):
    coins = []
    while amount > 0:
        coins.append(choice[amount])
        amount -= choice[amount]
    return coins
```

<figure class="diagram">
<p class="rowname">Fewest coins for the amount</p>
<div class="cells"><div class="cell">0<small>0</small></div><div class="cell">1<small>1</small></div><div class="cell">2<small>2</small></div><div class="cell">1<small>3</small></div><div class="cell">1<small>4</small></div><div class="cell">2<small>5</small></div><div class="cell">2<small>6</small></div><div class="cell">2<small>7</small></div><div class="cell">2<small>8</small></div><div class="cell">3<small>9</small></div><div class="cell">3<small>10</small></div></div>
<p class="rowname">Last coin used</p>
<div class="cells"><div class="cell">-</div><div class="cell">1</div><div class="cell">1</div><div class="cell">3</div><div class="cell hl">4</div><div class="cell">1</div><div class="cell">3</div><div class="cell hl">3</div><div class="cell">4</div><div class="cell">1</div><div class="cell hl">3</div></div>
<figcaption>For each amount from 0 to 10, the fewest coins and the last coin of one best answer. Starting at 10, the last coin is 3, which leads to 7. There the last coin is 3, which leads to 4, and there it is 4, which leads to 0. The coins are 3, 3 and 4</figcaption>
</figure>

For 10 cents, the last coin is 3, which leads to 7. The last coin for 7 is 3, which leads to 4, and for 4 it is 4, which leads to 0. The answer is 3, 3 and 4, three coins, as the table said. For 6 cents it gives 3 and 3.

## Look Back Instead

A second way keeps no extra array. From the target amount, look at each coin and find one where the amount left, a − c, has a cost that is one less than a's: dp[a − c] + 1 equals dp[a]. That coin can be part of a best answer. Take it, move to a − c, and repeat.

```python
def rebuild_from_table(dp, coins, amount):
    chosen = []
    while amount > 0:
        for c in coins:
            if c <= amount and dp[amount - c] + 1 == dp[amount]:
                chosen.append(c)
                amount -= c
                break
    return chosen
```

This takes a few comparisons for each step of the walk, and no memory beyond the table. It is the better choice when memory is tight or the recurrence has many branches.

We tested both on every amount from 0 to 300 with the coins 1, 3 and 4. Each rebuilt list added up to the amount, had exactly the number of coins in the table, and used only coins from the set. For an amount of 200,000, the table and the choice array took 0.04 s together.

Rebuilding from the choice array took 1.2 ms, giving 50,000 coins, and rebuilding from the table alone took 8.3 ms. Each list took 1.6 MB for its pointers.

## Choosing the Path for the Days

The same method recovers the days of the review sessions from [Defining States and Transitions](/algorithms/states-transitions). Walk back from the last day. If using day i beats skipping it, the best is attendance(i) plus best(i − 2), so day i is picked and we jump to day i − 2. Otherwise move to day i − 1.

```python
def pick_days(attendance):
    n = len(attendance)
    best = [0] * (n + 1)
    for i in range(1, n + 1):
        best[i] = max(best[i - 1], (best[i - 2] if i >= 2 else 0) + attendance[i - 1])
    picked, i = [], n
    while i >= 1:
        take = (best[i - 2] if i >= 2 else 0) + attendance[i - 1]
        if take > best[i - 1]:
            picked.append(i)
            i -= 2
        else:
            i -= 1
    return sorted(picked)
```

For the attendance 4, 1, 2, 9, 3, 7 it returns days 1, 4 and 6, with a total of 20. On 2,000 random lists, the picked days were never adjacent and always added up to the best value in the table.

## Ties: Many Best Answers

When two choices give the same value, the walk has to pick one, and different rules give different answers. With attendance 5, 5, 5, 5 the best total is 10, and there are three ways to get it: days 1 and 3, days 1 and 4, or days 2 and 4.

The code above, which takes a day only if that is strictly better than skipping, returns days 1 and 3. A variant that takes the day on a tie returns days 2 and 4. Both are correct on 2,000 random lists of up to 15 days.

If the problem asks for any optimal answer, either is fine. If it asks for a particular one, such as the smallest list of days or the earliest in alphabetical order, the tie rule is part of the specification, and has to be chosen before the code is written. Counting how many best answers exist is a different recurrence, which [Counting with DP](/algorithms/counting-dp) covers.

## A Cost of Saving Space

Reconstruction needs the table, or the choices. If we keep only the last two values to save memory, as the two variables of the days example did, nothing is left to walk back through. Methods that rebuild the answer with a small table exist, and they cost extra work.

[Saving Space in DP](/algorithms/saving-space) comes back to this choice. The usual rule is to decide whether the answer or just its value is needed before throwing the table away.

## Key Points

- The table holds values, so to get the answer, record the winning choice in each state, or recompute it by finding a choice that explains the value
- Walk back from the final state to a base case, following the choices, which costs the length of the answer, 50,000 steps took 1.2 ms for 200,000 cents
- For 10 cents the choices lead to the coins 3, 3 and 4, and every rebuilt list for amounts 0 to 300 added up to its amount with exactly the table's number of coins
- With ties, different tie rules return different valid answers, days 1 and 3 or days 2 and 4 for attendance 5, 5, 5, 5, so a requirement for a specific answer needs a rule chosen in advance
- Keeping only a window of the table to save space loses the ability to walk back
