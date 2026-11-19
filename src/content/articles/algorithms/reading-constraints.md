> A problem's **constraints** are the limits on its input, such as how many items there can be and how large the values are. They tell you, before you write any code, which time complexity is fast enough.

A shelf of used textbooks has 200,000 prices, and you want two that add up to the gift card. The pair-by-pair search from [How to Approach a Problem](/algorithms/approaching-problems) took 4.9 seconds for 20,000 prices. Ten times more books makes the quadratic search a hundred times slower, so roughly 8 minutes. You can know this without running anything, and that skill is the point of this page.

## From Limits to Steps

The routine has four moves, and each one is a small calculation.

<figure class="diagram">
<div class="flow">
<div class="node">Read Limits<small>find n</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Budget Steps<small>how many fit</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Pick Growth<small>stay under</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Choose Method<small>that cost</small></div>
</div>
<figcaption>From the constraints to a target complexity</figcaption>
</figure>

**Read the limits.** Find the size of the input, called n. If there are several sizes, such as the vertices and edges of a graph or the rows and columns of a grid, note each one.

**Budget the steps.** Count how many basic steps a computer can do in the time you have. We timed a bare loop that does a few arithmetic operations in each step. Compiled C ran about a billion steps per second, and Python ran about ten million. A real step does more than that, such as reading memory and branching, so a safer plan is 100 million steps for compiled code and 10 million for plain Python.

**Pick a complexity.** Find which growth rates keep the total step count under the budget for your n.

**Choose a technique.** Pick an approach with that cost.

## What Fits in One Second

The table inverts the growth rates from [Measuring Time and Space with Big O](/algorithms/big-o): for each one, the largest n whose step count stays under the budget. We computed it by solving each growth rate for the budget, using 2 as the log base.

| Growth | Largest n at 100 Million Steps | Largest n at 10 Million Steps | Typical Techniques |
| --- | --- | --- | --- |
| O(n!) | 11 | 10 | Trying all orderings |
| O(2ⁿ) | 26 | 23 | Trying all subsets, backtracking, bitmask states |
| O(n³) | about 460 | about 215 | Three nested loops, all pairs shortest paths |
| O(n²) | 10,000 | about 3,200 | Pairs, simple tables, insertion sort |
| O(n log n) | about 4.5 million | about 530,000 | Sorting, heaps, balanced trees |
| O(n) | 100 million | 10 million | One pass, hashing, sliding windows, prefix sums |
| O(log n) | Any size that fits | Any size that fits | Binary search, halving, formulas |

Read it from the left to find your row. With 200,000 books, a quadratic algorithm is far over its budget even in a compiled language, since 200,000² is 40 billion steps. An O(n) or O(n log n) algorithm sits well under the limit, which tells us to look for a better method than comparing pairs.

The table is rough on purpose. Constants matter, and one step can be heavier than another. Treat a row as a sign to look more closely when n is within a factor of a few of the limit.

## What the Limits Hint At

Once you know the target, the constraints work like clues.

- **n up to about 10 or 20**: the problem may expect you to try everything, so think of [Backtracking](/algorithms/backtracking) or [Subsets as Bitmasks](/algorithms/bitmask-subsets)
- **n up to a few thousand**: a quadratic table is fine, which often means a two dimensional dynamic programming table
- **n up to a few hundred thousand or a million**: aim for O(n) or O(n log n), so sorting, heaps or a hash table
- **A value limit near 10⁹ or 10¹⁸**: the algorithm cannot loop over the values, so look for halving, as in [Binary Search on the Answer](/algorithms/binary-search-on-answer), or a formula
- **Small value range but large n**: counting with an array may beat sorting

## Reading the Rest of the Limits

The input size isn't the only number that matters.

- **Value ranges**: a sum of 100,000 values up to a billion is about 10¹⁴, which doesn't fit in a 32 bit integer, whose maximum is 2,147,483,647. Python integers don't overflow, but languages like Java and C++ do. See [Edge Cases and Testing](/algorithms/edge-cases)
- **Memory limits**: ten million 64 bit values take 80 MB, which may be more than you are allowed
- **Total size across test cases**: when a problem runs many test cases, the limit often applies to the sum of all of them, not to each case on its own
- **Special structure**: a guarantee that the input is sorted, or that values are distinct, can be exactly the fact a faster algorithm needs

In an interview there may be no printed limits. Ask for them: how many items, how large the values, and whether the data fits in memory. The answer to one question can change which algorithm is reasonable.

## Key Points

- The constraints tell you the target complexity before you write code: read n, budget the steps, then pick a growth rate that fits
- A compiled language does about a hundred million steps in a second in practice, and Python about ten million
- Small n of 10 to 25 allows exponential search, a few thousand allows O(n²), and a million needs O(n) or O(n log n)
- Huge value limits rule out looping over the values and point to halving or formulas
- Value ranges and memory limits are constraints too, and they decide integer types and data structures
