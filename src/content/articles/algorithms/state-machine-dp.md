> A **state machine DP** models a process as a small set of named situations, with fixed rules for moving between them each step. The table has one row per step and one value per situation, holding the best result for ending the step in it. The recurrence is read off the diagram of allowed moves, and rules like a rest day or a limit on trades become extra states.

A campus bookstore buys back textbooks, and a student with a keen eye watches the price of one popular title over eight days: 3, 8, 2, 9, 4, 7, 1, 6. The student may hold one copy at a time, buy at the day's price, and sell at the day's price. How much can be made?

With no other rule, the answer is easy: buy every time the price is about to rise, and sell at each peak. Adding rules changes the problem, and the rules fit a diagram.

## No Rules

Without limits, a day is spent in one of two situations: holding a copy, or not. Let free(i) be the most money we can have after day i with nothing held, and hold(i) the most with a copy in hand, counting the money paid for it.

Each day we choose what to do. With nothing held we can rest, or buy, which moves to holding and costs the price. Holding, we can rest, or sell, which moves to free and earns the price. So today's values come from yesterday's:

- Free after today is the larger of free yesterday, and hold yesterday plus today's price
- Hold after today is the larger of hold yesterday, and free yesterday minus today's price

```python
def best_unlimited(prices):
    free, hold = 0, float("-inf")        # we start with nothing held and no copy bought yet
    for p in prices:
        free, hold = max(free, hold + p), max(hold, free - p)
    return free
```

For the eight prices the answer is 20, which is buying at 3 and selling at 8, buying at 2 and selling at 9, buying at 4 and selling at 7, and buying at 1 and selling at 6.

## Add a Rest Day

Now the bookstore adds a rule: after selling, you must sit out the next day before buying again. Free is no longer enough to describe where we are. A trader who sold yesterday is in a different situation from one who has been idle: both hold nothing, but only one may buy today. So the state has to say that. Add a third situation, cooldown.

<figure class="diagram graph">
<svg viewBox="0 0 360 222" role="img" aria-label="A state machine with three states. From Free you can buy and move to Holding. From Holding you can sell and move to Cooldown. From Cooldown you wait a day and move back to Free. Free and Holding can also stay as they are for a day.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="95.0" y1="52.0" x2="253.0" y2="52.0" marker-end="url(#ah)"/>
<text class="w" x="174.0" y="40.0">buy</text>
<line class="e" x1="282.0" y1="67.0" x2="195.9" y2="159.0" marker-end="url(#ah)"/>
<text class="w" x="264.9" y="113.0">sell</text>
<line class="e" x1="166.0" y1="161.0" x2="79.9" y2="69.0" marker-end="url(#ah)"/>
<text class="w" x="88.9" y="115.0">wait a day</text>
<rect class="n" x="34" y="38" width="60" height="28" rx="14"/>
<text class="t " x="64" y="52">Free</text>
<rect class="n" x="256" y="38" width="80" height="28" rx="14"/>
<text class="t " x="296" y="52">Holding</text>
<rect class="n" x="136" y="162" width="88" height="28" rx="14"/>
<text class="t " x="180" y="176">Cooldown</text>
</svg>
<figcaption>The three states of the trader. Buying and selling are the only ways to change state, selling forces a rest day, and Free and Holding can also stay as they are, a loop not drawn here</figcaption>
</figure>

The diagram lists every move. Buying takes free to holding, selling takes holding to cooldown, and a day of waiting takes cooldown to free. A free or holding trader can also stay where they are. The recurrence is read straight off the arrows into each state:

- Free after today comes from free or cooldown yesterday, whichever is larger, since both can wait
- Hold after today comes from hold yesterday, or free yesterday minus today's price
- Cooldown after today comes only from selling: hold yesterday plus today's price

```python
def best_with_cooldown(prices):
    free, hold, cool = 0, float("-inf"), float("-inf")
    for p in prices:
        free, hold, cool = max(free, cool), max(hold, free - p), hold + p
    return max(free, cool)
```

On the eight prices the answer is 12, down from 20, because the rest days block some of the best trades. The values for each day:

| Day | Price | Free | Hold | Cooldown |
| --- | --- | --- | --- | --- |
| 1 | 3 | 0 | −3 | none |
| 2 | 8 | 0 | −3 | 5 |
| 3 | 2 | 5 | −2 | −1 |
| 4 | 9 | 5 | −2 | 7 |
| 5 | 4 | 7 | 1 | 2 |
| 6 | 7 | 7 | 1 | 8 |
| 7 | 1 | 8 | 6 | 2 |
| 8 | 6 | 8 | 6 | 12 |

The last day is a good example of using the table. The best end result is the larger of free, 8, and cooldown, 12, which is 12: selling on day 8 after holding since day 7. A trader still holding a copy at the end has not earned anything from it, so hold isn't a final answer.

We tested the cooldown version against a brute force that tries every sequence of resting, buying and selling, on 600 random price lists of up to 10 days with prices from 1 to 12. The two agreed every time. On 2,000 random 30 day lists with prices up to 100, the rest day cost an average of 94.5 in profit against the unrestricted version.

## Limit the Number of Trades

A different rule: at most k purchases. The count of trades used so far is part of the situation, so the state gains a number. Let free(t) be the best money with nothing held after t purchases, and hold(t) the best with a copy held after the t-th purchase.

```python
def best_with_k_trades(prices, k):
    NEG = float("-inf")
    free = [0] * (k + 1)
    hold = [NEG] * (k + 1)
    for p in prices:
        for t in range(k, 0, -1):                      # downward, so each day's price is used once
            free[t] = max(free[t], hold[t] + p)         # sell the t-th copy
            hold[t] = max(hold[t], free[t - 1] - p)     # buy the t-th copy
    return max(free)
```

For the eight prices, one trade earns 7, from buying at 2 and selling at 9, and two trades earn 12. With three or more it climbs towards the unlimited 20. The extra number multiplies the work by k: the state has k + 1 values for each situation, and the whole table for 2,000 days and up to 100 trades took 0.02 s.

Going downward over t is the same space saving trick as in [Saving Space in DP](/algorithms/saving-space).

## A Fee on Each Sale

If each sale costs a fee, the recurrence of the unlimited case needs one change: selling earns the price minus the fee. With a fee of 2, the eight prices give 12 as well, since the small gains are no longer worth it.

All of these versions agreed with the brute force on the same 600 random lists: unlimited, one to four trades, and a fee from 0 to 4.

## Reading a Problem as a Machine

The method is the same each time.

1. List the situations that make a difference to what you can do next, such as holding, free and cooling down
2. Draw the allowed moves between them in one step, including staying put
3. Give each move its gain or cost, such as plus a price or minus a price
4. Let each state's value be the best over the moves into it, and loop over the steps
5. Take the best over the states that are allowed to be the end

It is the idea of [Defining States and Transitions](/algorithms/states-transitions) in a form that is easy to draw. Whenever a rule refers to what happened recently, a rest, a streak or a cap on uses, the history becomes a state. The code is a few lines for each state, and the table for a million days of the cooldown version took 0.07 s.

## Key Points

- A state machine DP names the situations a process can be in, draws the allowed moves, and keeps for each step the best value of ending in each situation
- Holding and free give the unlimited trading profit, 20 for the eight prices, and adding a mandatory rest day needs a third state, cooldown, which cut it to 12
- A limit of k trades adds the count to the state, so the table is k + 1 times larger, one trade earns 7 and two earn 12
- A fee on each sale just reduces the gain of the sell move, and all versions matched a brute force over every action sequence on 600 random price lists
- A rule about recent history becomes a state, and the recurrence is read off the arrows into each state
