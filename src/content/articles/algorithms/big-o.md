> **Big O notation** describes how the time or memory an algorithm needs grows as its input grows, keeping only the part that dominates for large inputs.

In [What is an Algorithm?](/algorithms/what-is-an-algorithm), doubling the roster made the pair method four times slower and the set method twice as slow. The seconds came from one laptop and one language. Another machine would print other seconds but show the same pattern. Big O is the vocabulary for that pattern.

## Counting Steps, Not Seconds

Seconds depend on the machine, the language and what else is running. A **step** doesn't: it is one basic operation, such as a comparison, an addition or reading one array cell. Counting steps turns "how fast is this code?" into "what function of the input size gives its step count?"

The input size, called **n**, is usually the length of the list. Take the pair method from the roster example, on distinct IDs. The comparison runs (n − 1) + (n − 2) + … + 1 times, which is n(n − 1)/2. For 1,000 IDs that is 499,500 comparisons, and counting inside the loop gives the same number.

The set method does one lookup and one insert for each ID, so about 2n steps, or 2,000 for 1,000 IDs. We treat each set operation as one step, which is true on average for a hash table.

## Dropping What Stops Mattering

The pair count can be written as n²/2 − n/2. Two parts of it can go.

The smaller term, n/2, fades as n grows. Dropping it changes the count by about 11% at n = 10, by 0.1% at n = 1,000 and by 0.001% at n = 100,000. The constant ½ goes too. It records how long one step takes, and a faster machine or language shrinks it without changing the shape of the growth.

What remains is n², so we say the pair method is **O(n²)**, read "order n squared". The set method is **O(n)**. Dropping details this way is what lets one description fit any machine.

## What O, Ω and Θ Say

Write T(n) for the step count. Three notations describe how it relates to a simpler function f(n).

- **O(f(n))**: an upper bound. For some constant c and size n₀, T(n) ≤ c · f(n) whenever n ≥ n₀
- **Ω(f(n))**: a lower bound. T(n) ≥ c · f(n) beyond some size
- **Θ(f(n))**: both at once, so f(n) is a tight description of the growth

Take T(n) = 3n² + 10n + 7. From n = 11 on, 3n² ≤ T(n) ≤ 4n², so T(n) is Θ(n²). The chart divides T(n) by n² to show that.

<figure class="chart">
<svg class="line" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="T of n divided by n squared starts near 10 at n equals 2, falls quickly, and settles between 3 and 4 after n equals 11, approaching 3">
<line class="grid" x1="0" y1="40" x2="100" y2="40"></line>
<line class="bound" x1="0" y1="35" x2="100" y2="35"></line>
<line class="bound" x1="0" y1="30" x2="100" y2="30"></line>
<line class="mark" x1="23.7" y1="0" x2="23.7" y2="40"></line>
<path class="stroke" d="M0.0 1.2 L2.6 14.4 L5.3 20.3 L7.9 23.6 L10.5 25.7 L13.2 27.1 L15.8 28.2 L18.4 29.0 L21.1 29.6 L23.7 30.2 L26.3 30.6 L28.9 30.9 L31.6 31.2 L34.2 31.5 L36.8 31.7 L39.5 31.9 L42.1 32.1 L44.7 32.3 L47.4 32.4 L50.0 32.5 L52.6 32.7 L55.3 32.8 L57.9 32.9 L60.5 32.9 L63.2 33.0 L65.8 33.1 L68.4 33.2 L71.1 33.2 L73.7 33.3 L76.3 33.4 L78.9 33.4 L81.6 33.5 L84.2 33.5 L86.8 33.5 L89.5 33.6 L92.1 33.6 L94.7 33.7 L97.4 33.7 L100.0 33.7"></path>
</svg>
<div class="axis"><span>n = 2</span><span>n = 21</span><span>n = 40</span></div>
<figcaption>T(n) divided by n². The dashed lines are 4 and 3, and the dotted line marks n = 11, where the ratio drops under 4</figcaption>
</figure>

For small n the ratio is far above 4, so the bound fails there. The definition only cares about large n, and n₀ says where "large" starts. A few readings of the notation cause confusion.

- **O is a ceiling, not a measurement**: a linear algorithm is also O(n²), which is true and useless. People who write O(n²) usually mean the tight Θ(n²)
- **O is not "worst case"**: it bounds a function, and which function (best, average or worst case running time) is a separate choice, taken up in [Best, Average and Worst Cases](/algorithms/best-average-worst)
- **The log base doesn't matter**: log₂ n is about 3.3 times log₁₀ n, a constant, so we write log n

## The Growth Rates You Will Meet

Most algorithms fall into a short list. The last column is the one to remember, because it is what a doubling experiment, like the roster table, shows.

| Growth | Typical Source | Steps at n = 1,000 | If n Doubles |
| --- | --- | --- | --- |
| O(1) | Reading one array cell | 1 | Same |
| O(log n) | Halving the input each step | 10 | One more step |
| O(n) | One pass over the input | 1,000 | Doubles |
| O(n log n) | Efficient sorting | about 10,000 | A bit more than doubles |
| O(n²) | Pairs, a loop inside a loop | 1,000,000 | Quadruples |
| O(n³) | Triples | 1,000,000,000 | Eight times |
| O(2ⁿ) | Trying all subsets | about 10³⁰¹ | Squares |
| O(n!) | Trying all orderings | about 10²⁵⁶⁷ | Far worse |

Exponential growth gets out of hand at small sizes. At n = 50, 2ⁿ is already over a quadrillion steps. Experiments can separate n² from n, but they struggle to tell n from n log n, since the log factor grows so slowly.

## Reading Big O from Code

You can usually read the growth off the loops. Here are four small functions.

```python
def first(items):           # O(1): one step, however long the list is
    return items[0]

def total(items):           # O(n): one pass
    t = 0
    for x in items:
        t += x
    return t

def count_pairs(items):     # O(n²): a loop inside a loop
    count = 0
    for a in items:
        for b in items:
            count += 1
    return count

def halvings(n):            # O(log n): n is cut in half each step
    steps = 0
    while n > 1:
        n //= 2
        steps += 1
    return steps
```

Four rules cover most cases.

- Steps in sequence add, and the larger one wins, so a pass followed by a nested loop is O(n + n²) = O(n²)
- A loop inside a loop multiplies
- Halving or doubling the problem each step gives log n
- Different inputs get different letters: looping over `a` items and, for each, over `b` items costs O(a · b), not O(n²)

## Memory Counts Too

**Space complexity** is the same idea applied to memory: how much extra memory the algorithm needs as n grows, not counting the input itself. The pair method keeps a couple of counters, so it is O(1). The set method may store every ID, so it is O(n). In our run, a set of a million IDs added about 34 MB on top of the list holding them.

The set method buys its speed with memory, a trade you will make again and again. Recursion also uses memory, which we meet in [The Call Stack and Recursion Depth](/algorithms/call-stack).

## What Big O Hides

Big O drops constants, and constants are sometimes bigger than the difference between growth rates. Two measurements from our laptop show it.

First, two O(n) ways to add a million numbers: a Python loop took 12.7 ms, and the built-in `sum` took 2.1 ms. Same growth, about six times apart.

Second, insertion sort is O(n²) and merge sort is O(n log n), yet on short lists the slower one wins. The table gives microseconds for pure Python versions of each, on random lists.

| List Size | Insertion Sort (µs) | Merge Sort (µs) |
| --- | --- | --- |
| 8 | 1.2 | 3.0 |
| 32 | 12 | 16 |
| 64 | 41 | 33 |
| 256 | 609 | 165 |

The lines cross at around 40 items. Many library sorts use this fact and hand short stretches to insertion sort, as [How Standard Library Sorts Work](/algorithms/library-sorts) explains. Big O also ignores effects like how well the data fits in the processor's cache.

So Big O tells you which algorithm wins as inputs grow, and a measurement tells you who wins at the size you actually have. Knowing the sizes in advance is the subject of [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints).

## Key Points

- Count steps instead of seconds, then keep only how the count grows: drop constants and smaller terms
- O is an upper bound, Ω a lower bound and Θ a tight bound, and none of them means "worst case" on its own
- Loops give the growth: sequential steps add, nested loops multiply, and halving gives log n
- Space complexity counts extra memory, and a faster algorithm often spends memory to save time
- Big O hides constants, so it predicts large inputs well and small inputs poorly
