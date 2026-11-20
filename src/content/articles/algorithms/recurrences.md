> A **recurrence** states the running time of a recursive algorithm in terms of itself. The **master theorem** solves the common form T(n) = a T(n / b) + n<sup>c</sup> by comparing c with log<sub>b</sub> a, which tells whether the root, every level or the leaves of the recursion tree carry most of the work.

When we counted the work of the two multiplication methods in [How Divide and Conquer Works](/algorithms/divide-and-conquer), the four product method grew by 4 times for each doubling, and the three product method by 3 times. We found those numbers by running code. A recurrence lets us predict them from the structure of the algorithm, before writing it.

## From Code to Recurrence

Read three numbers off a divide and conquer algorithm.

- **a**: how many recursive calls each call makes
- **b**: the factor by which the input shrinks in each of those calls
- **c**: the exponent of the work done outside the calls, which is n<sup>c</sup>

Merge sort makes 2 calls on halves and does n work to merge, so a = 2, b = 2 and c = 1. The running time T(n) is the cost of the two calls plus the merge, which is written T(n) = 2 T(n / 2) + n. Binary search makes 1 call on half the input with constant work, so T(n) = T(n / 2) + 1, and the four product multiplication is T(n) = 4 T(n / 2) + n. We assume a constant cost for the smallest input.

## The Recursion Tree

To solve T(n) = a T(n / b) + n<sup>c</sup>, draw the calls as a tree and add up the work level by level. The root is one call of size n. Level i has a<sup>i</sup> calls, each of size n / b<sup>i</sup>, and each does (n / b<sup>i</sup>)<sup>c</sup> work outside its children.

The work on level i is therefore

a<sup>i</sup> × (n / b<sup>i</sup>)<sup>c</sup> = n<sup>c</sup> × (a / b<sup>c</sup>)<sup>i</sup>

Each level is the previous one multiplied by the same ratio r = a / b<sup>c</sup>. A series like that is dominated by its first term, its last term, or neither, depending on whether r is below 1, above 1, or equal to 1. Here are the first four levels for n = 1,024, with b = 2 and c = 1 and three different values of a.

<figure class="chart">
<div class="hbars" role="img" aria-label="Work on each of the first four levels of the recursion tree for n equals 1,024. With a equal to 1 the levels shrink from 1,024 to 128. With a equal to 2 every level has 1,024. With a equal to 3 they grow from 1,024 to 3,456">
<div class="hbar peak"><span>a = 1, level 0</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 1, level 1</span><span class="track"><span class="fill" style="--w: 14.8%"></span></span><span class="value">512</span></div>
<div class="hbar"><span>a = 1, level 2</span><span class="track"><span class="fill" style="--w: 7.4%"></span></span><span class="value">256</span></div>
<div class="hbar"><span>a = 1, level 3</span><span class="track"><span class="fill" style="--w: 3.7%"></span></span><span class="value">128</span></div>
<div class="hbar"><span>a = 2, level 0</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 2, level 1</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 2, level 2</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 2, level 3</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 3, level 0</span><span class="track"><span class="fill" style="--w: 29.6%"></span></span><span class="value">1,024</span></div>
<div class="hbar"><span>a = 3, level 1</span><span class="track"><span class="fill" style="--w: 44.4%"></span></span><span class="value">1,536</span></div>
<div class="hbar"><span>a = 3, level 2</span><span class="track"><span class="fill" style="--w: 66.7%"></span></span><span class="value">2,304</span></div>
<div class="hbar peak"><span>a = 3, level 3</span><span class="track"><span class="fill" style="--w: 100.0%"></span></span><span class="value">3,456</span></div>
</div>
<figcaption>Work on each level of the recursion tree for n = 1,024, with b = 2 and c = 1. With a = 1 the root dominates, with a = 2 the levels are equal, and with a = 3 the levels grow toward the leaves</figcaption>
</figure>

With a = 1 each level has half the work of the one above, so the total is less than twice the root: the running time is Θ(n). With a = 2 every level costs n, and there are about log₂ n levels, so the total is n log n. With a = 3 each level costs 1.5 times the one above, so the bottom level, which is the leaves, outweighs all the others combined.

The leaves are easy to count. The tree has log<sub>b</sub> n levels, so the number of leaves is a<sup>log<sub>b</sub> n</sup>, which equals n<sup>log<sub>b</sub> a</sup>. That exponent, log<sub>b</sub> a, is the number to compare with c.

## The Three Cases

This is the **master theorem** for recurrences of the form T(n) = a T(n / b) + Θ(n<sup>c</sup>), where a ≥ 1, b > 1 and c ≥ 0.

| Compare | Heaviest Part | Running Time |
| --- | --- | --- |
| c > log<sub>b</sub> a | The root | Θ(n<sup>c</sup>) |
| c = log<sub>b</sub> a | All levels equally | Θ(n<sup>c</sup> log n) |
| c < log<sub>b</sub> a | The leaves | Θ(n<sup>log<sub>b</sub> a</sup>) |

In words: if the work outside the calls grows faster than the number of leaves, the top dominates. If they grow at the same rate, every level contributes the same and the log n levels multiply it. If there are many more leaves, they dominate. Rounding n / b up or down doesn't change the result, so it is fine to mix floors and ceilings.

## Worked Examples

| Algorithm | Recurrence | log<sub>b</sub> a and c | Running Time |
| --- | --- | --- | --- |
| Binary search | T(n / 2) + 1 | 0 = 0 | Θ(log n) |
| Quickselect, ideal pivots | T(n / 2) + n | 0 < 1 | Θ(n) |
| Merge sort | 2 T(n / 2) + n | 1 = 1 | Θ(n log n) |
| Walking a balanced tree | 2 T(n / 2) + 1 | 1 > 0 | Θ(n) |
| Four product multiplication | 4 T(n / 2) + n | 2 > 1 | Θ(n²) |
| Karatsuba multiplication | 3 T(n / 2) + n | 1.585 > 1 | Θ(n<sup>1.585</sup>) |
| Strassen matrix multiplication | 7 T(n / 2) + n² | 2.807 > 2 | Θ(n<sup>2.807</sup>) |

Binary search has c = 0, and log₂ 1 = 0 too, so the levels are equal at constant cost and there are log n of them. Quickselect with a pivot that halves the input is dominated by its first partition, which is why [Quickselect](/algorithms/quickselect) runs in linear time. Walking a balanced tree makes 2 calls with constant work, and the leaves, the nodes, dominate, which is the n we expect.

For the multiplication methods, doubling n multiplies the work by 2<sup>log<sub>b</sub> a</sup>, which is a. The four product method grows 4 times, and Karatsuba 3 times, which matches what we measured in the last article, 3.95 to 4.03 and 2.95 to 3.01.

## Checking a Solution

A recurrence can be evaluated exactly on a computer, which makes it easy to test a claimed solution. We computed T(n) with T(1) = 1 for n = 2<sup>10</sup> and n = 2<sup>20</sup>, divided by the claimed growth, and looked for a ratio that settles on a constant.

| Recurrence | Claimed Growth | Ratio at 2<sup>10</sup> | Ratio at 2<sup>20</sup> |
| --- | --- | --- | --- |
| T(n / 2) + n | n | 2.00 | 2.00 |
| 2 T(n / 2) + n | n log₂ n | 1.10 | 1.05 |
| 3 T(n / 2) + n | n<sup>1.585</sup> | 2.97 | 3.00 |
| 4 T(n / 2) + n | n² | 2.00 | 2.00 |
| 7 T(n / 2) + n² | n<sup>2.807</sup> | 2.33 | 2.33 |

Every ratio is nearly flat as n grows by a factor of a thousand, so each claimed growth fits. A ratio that kept rising or falling would show a wrong claim.

## When the Theorem Doesn't Apply

Some recurrences fall outside the form, and the recursion tree still works.

- **Work that isn't a power of n**: 2 T(n / 2) + n / log₂ n has levels that are neither equal nor a geometric series. Summing them gives Θ(n log log n). We computed it, and T(n) divided by n log₂ log₂ n stayed near 0.71 from n = 2<sup>10</sup> to 2<sup>40</sup>, while T(n) divided by n log₂ n kept falling, from 0.24 to 0.09
- **Pieces of unequal size**: T(n) = T(n / 3) + T(2n / 3) + n has branches of different depths. Every complete level still adds up to n, and there are about log<sub>3/2</sub> n of them, so the answer is Θ(n log n). Our computed ratio to n log₂ n stayed between 1.11 and 1.15 from 2<sup>10</sup> to 2<sup>26</sup>
- **Shrinking by subtraction**: T(n) = T(n − 1) + n is a chain, not a tree, and it adds up to n(n + 1) / 2, so Θ(n²), like insertion sort. T(n) = 2 T(n − 1) + 1 gives 2ⁿ − 1, which we confirmed for n up to 7, the moves of the towers of Hanoi puzzle

There is also a general theorem by Akra and Bazzi from 1998 that handles several subproblem sizes at once, but the recursion tree is usually enough, and it works for the rest as well.

## A Recipe

1. Write the recurrence from the code: how many calls, how much smaller, how much other work
2. If it has the form a T(n / b) + n<sup>c</sup>, compare c with log<sub>b</sub> a to find the case
3. Otherwise draw a few levels of the tree and add each level
4. Check by computing T(n) for n = 2<sup>10</sup> and 2<sup>20</sup> and dividing by the claim
5. Compare the answer with a doubling experiment on the real code, which should multiply the time by about 2<sup>log<sub>b</sub> a</sup> in the leaf case

[Counting Inversions and the Closest Pair](/algorithms/inversions-closest-pair) gives two more recurrences to read this way.

## Key Points

- A recurrence writes the running time of a recursive algorithm in terms of smaller calls, and a, b and c can be read from the code
- The recursion tree has log<sub>b</sub> n levels, level i costs n<sup>c</sup> (a / b<sup>c</sup>)<sup>i</sup>, and there are n<sup>log<sub>b</sub> a</sup> leaves
- Compare c with log<sub>b</sub> a: the root dominates when c is larger, every level is equal when they match, and the leaves dominate when c is smaller
- Binary search, quickselect, merge sort, Karatsuba and Strassen fit, with results Θ(log n), Θ(n), Θ(n log n), Θ(n<sup>1.585</sup>) and Θ(n<sup>2.807</sup>)
- Test a solution by evaluating the recurrence at large n, and fall back on the recursion tree when the theorem's form doesn't fit
