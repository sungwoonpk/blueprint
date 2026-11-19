> **Amortized analysis** gives the cost per operation averaged over a whole sequence of operations, so an occasional expensive operation is paid for by the many cheap ones around it. No probability is involved.

In [Arrays and Dynamic Arrays](/algorithms/arrays), appending was called O(1) "on average", yet some appends copy the whole array. Both statements are true, and the word "average" is doing a different job than it did in [Best, Average and Worst Cases](/algorithms/best-average-worst). Here is what it means.

## One Append Can Be Slow

Count the work each append does on a dynamic array that doubles when full: one step to place the item, plus one step for each item copied into a bigger array. The bars show 32 appends, starting from an array with room for one item.

<figure class="chart">
<div class="bars" role="img" aria-label="Cost of each of 32 appends to a doubling array. Most cost 1. Appends 2, 3, 5, 9 and 17 cost 2, 3, 5, 9 and 17">
<div class="bar" style="--h: 5.9%"></div>
<div class="bar peak" style="--h: 11.8%"></div>
<div class="bar peak" style="--h: 17.6%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar peak" style="--h: 29.4%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar peak" style="--h: 52.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar peak" style="--h: 100%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
<div class="bar" style="--h: 5.9%"></div>
</div>
<div class="axis"><span>Append 1</span><span>Append 16</span><span>Append 32</span></div>
<figcaption>Steps taken by each append, counted for a doubling array</figcaption>
</figure>

A single append can cost as much as the number of items so far, but those expensive ones get rarer. The next one after append 17 is append 33, and then 65. Each time the array doubles, the gap to the next resize doubles too.

## Adding It Up

There are a few ways to turn that picture into a proof. Each starts from the same question: what is the total cost of n appends?

**Add up the whole sequence.** The 32 appends above cost 63 steps in total, about 2 each. In general, the resizes copy 1, 2, 4, 8 and so on items, which add up to less than 2n, and placing the items costs n more. So n appends cost under 3n steps, and each costs under 3 on average. We checked this by running 100,000 appends: the total was 231,071 steps, about 2.3 for each.

**Charge coins.** Give each append a budget of 3 coins. One coin pays for placing the item. The other two stay with the new item as savings. When the array doubles from k slots to 2k, the k/2 items added since the last doubling hold 2 coins each, which is k coins, exactly enough to copy all k items. The savings cover the next resize, so a budget of 3 per append is enough.

A third method, the **potential method**, keeps the savings as one balance for the whole structure instead of coins on items, which helps when savings can't be pinned to particular items. The amortized cost is then the actual cost plus the change in the balance.

All three give the same answer: the **amortized cost** of an append is O(1), even though the worst cost of one append is O(n).

## Amortized Is Not Average Case

The word "average" shows up in both ideas, and they are different.

| | Average Case | Amortized |
| --- | --- | --- |
| Averages Over | Possible inputs, weighted by chance | A sequence of operations on one structure |
| Needs | An assumption about the inputs | No assumption |
| Promise | Typical inputs run fast | Any sequence of n operations costs at most n times the amortized cost |

Amortization is a worst case statement about a sequence. It holds even if an adversary picks the operations.

What it does not promise is that each individual operation is fast. We timed a million appends to a Python list, one at a time. The median append took 83 ns, including the timer's own overhead, and the slowest took 241 µs, nearly 3,000 times the median. Not every slow one is a resize, since the machine also has other work to do, but resizes are among them.

For most programs that doesn't matter. For something that must answer within a fixed time on each request, such as a trading system or a game's frame loop, one slow append can matter. The usual fix is to reserve the capacity up front, as `new ArrayList<>(n)` does in Java and `make([]T, 0, n)` does in Go, so the array doesn't have to grow.

## Counting in Binary

A binary counter is the other classic example. Adding 1 flips the lowest bits: it turns trailing ones into zeros and the next zero into a one.

<figure class="diagram">
<p class="rowname">7 in binary</p>
<div class="cells">
<div class="cell">0</div>
<div class="cell">1</div>
<div class="cell">1</div>
<div class="cell">1</div>
</div>
<p class="rowname">8 in binary, after adding 1</p>
<div class="cells">
<div class="cell hl">1</div>
<div class="cell hl">0</div>
<div class="cell hl">0</div>
<div class="cell hl">0</div>
</div>
<figcaption>Going from 7 to 8 flips all four bits. Going from 8 to 9 flips one</figcaption>
</figure>

A single increment can flip every bit, which is a lot of work in a counter with many bits. But the lowest bit flips every time, the next one every second time, the next every fourth, and so on. We counted over 1,000,000 increments: 1,999,993 bit flips in total, about 2 for each increment, while the worst single increment flipped 20 bits. The amortized cost is O(1), by the same reasoning as the dynamic array.

## Shrinking Without Thrashing

Arrays shrink too, and here amortization can fail if the rule is careless. Suppose a full array doubles on push, and halves as soon as it is half full on pop. Then at the boundary, one push doubles it and the next pop halves it, so every operation copies the whole array.

We simulated 2,000 alternating pushes and pops starting from 1,024 items. Halving at half full made 2,048,000 item copies. Halving only when the array is a quarter full made 1,024, a single copy at the start.

The quarter rule leaves a gap between the grow and shrink thresholds, so after a resize the array has to see many operations before the next one. Hash tables use the same trick when they resize, as [How Hash Tables Work](/algorithms/hash-tables) shows.

## Key Points

- Amortized cost averages over a sequence of operations on one structure, with no probability and no assumption about inputs
- Dynamic array appends are O(1) amortized because resizes copy fewer than 2n items in total, which spreads to under 3 steps for each append
- Three common proofs are the total count, coins saved on items, and a potential balance for the whole structure
- Amortized O(1) still allows an occasional slow operation, which matters when each response has a deadline
- Resizing rules need a gap between the grow and shrink thresholds, or alternating operations copy the whole structure each time
