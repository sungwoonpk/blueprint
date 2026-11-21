> **Dynamic programming** is recursion without repetition. A recursive solution often asks for the same smaller problem many times, and the work doubles with each level. Dynamic programming notices that there are only a few different smaller problems, computes each one once, and looks the answer up afterward, which turns exponential time into polynomial time.

The library has a staircase, and you may climb it one step or two steps at a time. In how many different ways can you climb 30 steps?

You can answer by reasoning about the last move: it was either a single step from step 29 or a double step from step 28, so the ways to reach step n are the ways to reach n − 1 plus the ways to reach n − 2.

That sentence is a complete algorithm. The only question is how long it takes to run.

## The Recursion Is Correct and Slow

Write the sentence as a function. Reaching step 0 or step 1 can be done in one way.

```python
def ways(n):
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
```

We checked it by listing every sequence of single and double steps for n from 1 to 15 and counting them. For 4 steps the five sequences are 1,1,1,1 and 1,1,2 and 1,2,1 and 2,1,1 and 2,2, and `ways(4)` returns 5. The function agreed with the listing for every n we tried.

Now count how many times the function is called.

| Steps | Ways | Calls Made |
| --- | --- | --- |
| 5 | 8 | 15 |
| 10 | 89 | 177 |
| 20 | 10,946 | 21,891 |
| 30 | 1,346,269 | 2,692,537 |

The number of calls is always twice the answer minus one, and the answer itself grows by about 1.6 times for each extra step. So the time follows. On our machine, `ways(30)` took 0.13 s, `ways(32)` took 0.35 s and `ways(35)` took 1.46 s, with nearly 30 million calls.

## Seeing the Repeats

The picture shows why.

<figure class="diagram graph">
<svg viewBox="0 0 360 270" role="img" aria-label="The calls made by a recursive count of ways for 5 steps. The call for 3 steps appears twice and the call for 2 steps three times, each recomputed from scratch.">
<line class="e" x1="46.0" y1="178.0" x2="24.0" y2="230.0"/>
<line class="e" x1="46.0" y1="178.0" x2="68.0" y2="230.0"/>
<line class="e" x1="79.0" y1="126.0" x2="46.0" y2="178.0"/>
<line class="e" x1="79.0" y1="126.0" x2="112.0" y2="178.0"/>
<line class="e" x1="178.0" y1="126.0" x2="156.0" y2="178.0"/>
<line class="e" x1="178.0" y1="126.0" x2="200.0" y2="178.0"/>
<line class="e" x1="128.5" y1="74.0" x2="79.0" y2="126.0"/>
<line class="e" x1="128.5" y1="74.0" x2="178.0" y2="126.0"/>
<line class="e" x1="266.0" y1="126.0" x2="244.0" y2="178.0"/>
<line class="e" x1="266.0" y1="126.0" x2="288.0" y2="178.0"/>
<line class="e" x1="299.0" y1="74.0" x2="266.0" y2="126.0"/>
<line class="e" x1="299.0" y1="74.0" x2="332.0" y2="126.0"/>
<line class="e" x1="213.8" y1="22.0" x2="128.5" y2="74.0"/>
<line class="e" x1="213.8" y1="22.0" x2="299.0" y2="74.0"/>
<rect class="n" x="5" y="216" width="38" height="28" rx="14"/>
<text class="t " x="24" y="230">f(1)</text>
<rect class="n" x="49" y="216" width="38" height="28" rx="14"/>
<text class="t " x="68" y="230">f(0)</text>
<rect class="n done" x="27.0" y="164" width="38" height="28" rx="14"/>
<text class="t done" x="46.0" y="178">f(2)</text>
<rect class="n" x="93" y="164" width="38" height="28" rx="14"/>
<text class="t " x="112" y="178">f(1)</text>
<rect class="n hl" x="60.0" y="112" width="38" height="28" rx="14"/>
<text class="t hl" x="79.0" y="126">f(3)</text>
<rect class="n" x="137" y="164" width="38" height="28" rx="14"/>
<text class="t " x="156" y="178">f(1)</text>
<rect class="n" x="181" y="164" width="38" height="28" rx="14"/>
<text class="t " x="200" y="178">f(0)</text>
<rect class="n done" x="159.0" y="112" width="38" height="28" rx="14"/>
<text class="t done" x="178.0" y="126">f(2)</text>
<rect class="n" x="109.5" y="60" width="38" height="28" rx="14"/>
<text class="t " x="128.5" y="74">f(4)</text>
<rect class="n" x="225" y="164" width="38" height="28" rx="14"/>
<text class="t " x="244" y="178">f(1)</text>
<rect class="n" x="269" y="164" width="38" height="28" rx="14"/>
<text class="t " x="288" y="178">f(0)</text>
<rect class="n done" x="247.0" y="112" width="38" height="28" rx="14"/>
<text class="t done" x="266.0" y="126">f(2)</text>
<rect class="n" x="313" y="112" width="38" height="28" rx="14"/>
<text class="t " x="332" y="126">f(1)</text>
<rect class="n hl" x="280.0" y="60" width="38" height="28" rx="14"/>
<text class="t hl" x="299.0" y="74">f(3)</text>
<rect class="n" x="194.75" y="8" width="38" height="28" rx="14"/>
<text class="t " x="213.75" y="22">f(5)</text>
</svg>
<figcaption>The 15 calls for 5 steps. The outlined f(3) is computed twice and the shaded f(2) three times, and the repeats grow quickly with the number of steps</figcaption>
</figure>

The call for 3 steps appears twice, and the call for 2 steps three times. Each copy runs its whole subtree again, though the answer can't change: the ways to climb 3 steps are the same whenever someone asks. The further down you look, the more copies there are, and a call for k steps is repeated about as many times as there are ways to climb the remaining n − k steps.

Count the different questions, and the picture changes. Climbing to 20 steps makes more than 20,000 calls, yet they only ever ask about 21 different values of n, the numbers from 0 to 20. We recorded the arguments of every call to confirm it. The waste isn't in the number of questions. It is in asking each one thousands of times.

## Remember the Answers

The fix is to write down each answer the first time it is computed and look it up afterward. This is called **memoization**, from "memo".

```python
memo = {}

def ways_memo(n):
    if n <= 1:
        return 1
    if n not in memo:
        memo[n] = ways_memo(n - 1) + ways_memo(n - 2)   # computed once
    return memo[n]
```

Now each value of n is worked out once, and a second request is a dictionary lookup. We counted the calls, and the totals became tiny.

| Steps | Calls Made | Time |
| --- | --- | --- |
| 5 | 9 | 5 µs |
| 30 | 59 | 6 µs |
| 100 | 199 | 17 µs |
| 500 | 999 | 104 µs |

Thirty steps took 59 calls instead of 2,692,537, and the count grows as 2n − 1. The answer for 500 steps has 105 digits and took about a tenth of a millisecond. We compared the memoized function with the table-filled version below for every n from 1 to 59, and they gave the same numbers.

## The Same Idea From the Bottom

The memo fills in the order 2, 3, 4, and so on, since each value needs the two before it. So we can skip the recursion and compute in that order directly. This is **tabulation**, covered in [Memoization and Tabulation](/algorithms/memoization-tabulation).

```python
def ways_table(n):
    a, b = 1, 1                                     # ways to reach steps 0 and 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b
```

It uses a single loop and two variables, and needs no memory for the rest of the table, since each step only reads the last two values.

## The Pattern

Here is what happened, in the order that works on every problem of this kind.

1. **Write the recursion.** Express the answer for the whole problem through answers to smaller versions of the same problem. This is the hard part, and the first sentence of this article was it
2. **Check that few different smaller problems arise.** Here they are the numbers 0 to n
3. **Compute each one once.** Remember them as they are computed, or fill them in from the smallest up

The central claim of this phase is that the recursion is the algorithm, and the table is a way of running it fast. A wrong recurrence gives a wrong answer however neatly it is memoized, and a right one gives a correct answer even if it is slow.

So the work is in finding the recurrence, and the following articles show how: what to remember, what the order is, how to recover the choices, and which problems fit.

The name comes from Richard Bellman, in the 1950s, who used "programming" in the sense of planning, as in a schedule, and not in the sense of computer code.

## Key Points

- Dynamic programming is recursion without repetition: express the answer through answers to smaller problems, then compute each distinct one only once
- The climbing recursion made 2,692,537 calls for 30 steps and 29,860,703 for 35, but only 21 different questions arise for 20 steps, so the time went into repeats
- Remembering each answer in a dictionary cut 30 steps to 59 calls, 2n − 1 for n steps, and 500 steps took about 0.1 ms
- Filling the answers from the smallest up gives the same result with a loop, and since each value needs only the last two, two variables suffice
- The hard part is finding a correct recurrence, and the table is only a fast way to run it
