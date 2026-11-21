> The **0/1 knapsack problem** picks items, each taken whole or not at all, to maximize total value within a weight limit. The table has a cell for each pair of the first i items and a capacity w, and each cell is either the cell without item i or the item's value plus the cell with the capacity reduced by its weight. It takes O(n × W) time, which depends on the size of the number W and not only on how many digits it has, so it is called pseudo-polynomial.

Pack a backpack for a trip with a weight limit of 50 units. Item A weighs 10 and is worth 60, item B weighs 20 and is worth 100, item C weighs 30 and is worth 120. Greedy says to take the item with the best value for its weight first: A is worth 6 per unit, B is 5 and C is 4.

It takes A, then B, and then C no longer fits, for a total of 160. But B and C together weigh exactly 50 and are worth 220.

This is the example from [When Greedy Choices Work](/algorithms/greedy), where the rule failed. Dynamic programming gets it right by keeping the capacity as part of the state.

## The Table

To keep numbers small, measure weights in tens: A weighs 1, B weighs 2, C weighs 3, and the limit is 5. Let best(i, w) be the largest value from the first i items within capacity w.

For item i there are two cases. Leave it out, and the answer is best(i − 1, w). Take it, if it fits, and the answer is its value plus best(i − 1, w − weight of i), since the rest of the items now share the smaller capacity. The larger one wins.

best(i, w) = max of best(i − 1, w), and value of i + best(i − 1, w − weight of i) when the weight fits

```python
def knapsack_table(items, limit):                 # items is a list of (weight, value)
    n = len(items)
    best = [[0] * (limit + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        weight, value = items[i - 1]
        for w in range(limit + 1):
            best[i][w] = best[i - 1][w]                       # leave item i out
            if weight <= w and best[i - 1][w - weight] + value > best[i][w]:
                best[i][w] = best[i - 1][w - weight] + value  # take item i
    return best
```

<figure class="diagram">
<div class="cells board"><div class="cell dim"></div><div class="cell dim">0</div><div class="cell dim">1</div><div class="cell dim">2</div><div class="cell dim">3</div><div class="cell dim">4</div><div class="cell dim">5</div></div>
<div class="cells board"><div class="cell dim">-</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div></div>
<div class="cells board"><div class="cell dim">A</div><div class="cell hl">0</div><div class="cell">60</div><div class="cell">60</div><div class="cell">60</div><div class="cell">60</div><div class="cell">60</div></div>
<div class="cells board"><div class="cell dim">B</div><div class="cell">0</div><div class="cell">60</div><div class="cell hl">100</div><div class="cell">160</div><div class="cell">160</div><div class="cell">160</div></div>
<div class="cells board"><div class="cell dim">C</div><div class="cell">0</div><div class="cell">60</div><div class="cell">100</div><div class="cell">160</div><div class="cell">180</div><div class="cell hl">220</div></div>
<figcaption>The knapsack table for items A (weight 1, value 60), B (2, 100) and C (3, 120) and capacities 0 to 5. Row i uses the first i items. The outlined cells trace the best answer, 220: take C, leaving capacity 2, then take B, leaving 0</figcaption>
</figure>

The last cell, 220, is the answer. To find which items give it, walk back from the last cell, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions): if the value differs from the cell above, the item was taken, so record it and reduce the capacity by its weight. Here it takes C, leaving capacity 2, then takes B, leaving 0. The items are B and C.

```python
def chosen_items(items, best, limit):
    chosen, w = [], limit
    for i in range(len(items), 0, -1):
        if best[i][w] != best[i - 1][w]:           # the value changed, so item i was taken
            chosen.append(i - 1)
            w -= items[i - 1][0]
    return sorted(chosen)
```

We tested the table on 2,000 random instances of 3 to 10 items, with weights from 1 to 20 and values from 1 to 30, and the limit set to half the total weight. The value matched a brute force over all subsets each time, and the recovered items fit in the limit and added up to the best value.

## Greedy by Ratio, Again

How often does the greedy rule lose? On those 2,000 instances, taking items in order of value per weight gave less than the best in 509, about a quarter of them. On average it lost 2.1% of the value, and in the worst case it lost 60%. A rule that is nearly right is the harder kind to catch, and the table always gets it right.

## One Row at a Time

Row i looks only at row i − 1, so one row is enough if it is updated in the right order. For each item, go through the capacities from the largest to the smallest.

```python
def knapsack_value(items, limit):
    best = [0] * (limit + 1)
    for weight, value in items:
        for w in range(limit, weight - 1, -1):    # downward, so each item is used at most once
            best[w] = max(best[w], best[w - weight] + value)
    return best[limit]
```

Going downward matters. When best[w] is updated, the cell best[w − weight] to its left has not been changed in this round, so it still holds the value from before the item. Going upward would let the same item be taken again in the same round.

It agreed with the full table on all 2,000 instances, and saves the memory of the other rows, at the price of the walk back, a trade that [Saving Space in DP](/algorithms/saving-space) comes back to.

If the items can be taken any number of times, which is the **unbounded** version, the order flips: going upward lets an item be used again, which is exactly what is wanted. That is the structure of the coin problem from [Memoization and Tabulation](/algorithms/memoization-tabulation). We checked it against the 0/1 table on a list where every item was repeated enough times, for 300 random cases.

## The Cost of the Capacity

The table has n rows and W + 1 columns, so the time is O(n × W). Here W is the capacity as a number, not the number of digits needed to write it. With 100 items we measured the time to fill the table for capacities of 1,000 to a million.

| Capacity W | Time |
| --- | --- |
| 1,000 | Under 5 ms |
| 10,000 | 0.05 s |
| 100,000 | 0.46 s |
| 1,000,000 | 4.52 s |

The time grows in step with W: each tenfold increase in W is a tenfold increase in time. Writing W takes about log₂ W bits, so doubling the number of bits squares the time. An algorithm whose time is polynomial in the values of its numbers but not in their length is called **pseudo-polynomial**. A capacity of 10⁹ in grams would make the table impractical, even though it takes only 30 bits to write.

This is why the knapsack problem is believed to be hard in general, in the sense of [NP-Completeness](/algorithms/np-completeness), though easy when the numbers are small.

## Subset Sum and Bitsets

The special case where each item's value is its weight, with a target to hit exactly, is the **subset sum** problem: can some of these numbers add up to T? The table has booleans, and a cell is true if the number is reachable.

A whole row can be a single integer with a bit for each reachable sum, as in [Bitwise Operations](/algorithms/bitwise-operations). Adding an item of weight w means OR-ing the row with itself shifted left by w.

```python
def subset_sum(weights, target):
    reachable = 1                                  # bit 0: the sum 0 is reachable
    mask = (1 << (target + 1)) - 1
    for w in weights:
        reachable |= (reachable << w) & mask       # every reachable sum, with or without w
    return reachable >> target & 1 == 1
```

We checked the list version, the bitset version and a brute force on 1,000 random cases, and all agreed. For 500 random weights up to 2,000 and a target of 243,679, the list took 2.69 s and the bitset took 4 ms, about 670 times faster, since the machine shifts and combines many positions in each step.

## Key Points

- Knapsack takes a state of the first i items and a capacity w, and each cell is the larger of leaving item i out and its value plus the best for the smaller capacity, 220 for the example where greedy gets 160
- The table matched brute force on 2,000 random instances, and walking back through the cells lists the items
- Greedy by value per weight was suboptimal in 509 of 2,000 instances, losing 2.1% on average and 60% in the worst case
- One row is enough when the capacities are visited from high to low, and low to high allows repeated items, the unbounded version
- The time n × W grows with the value of W, 4.52 s at a million with 100 items, which is pseudo-polynomial, and subset sum as a bitset ran 670 times faster than the boolean list
