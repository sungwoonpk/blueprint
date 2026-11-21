> **Combinatorics** counts arrangements and selections without listing them. n items can be ordered in n! ways, k of them can be picked in order in n!/(n − k)! ways, and k of them can be picked as a group in the **binomial coefficient** C(n, k) = n!/(k!(n − k)!) ways. Pascal's rule builds all the coefficients by addition, and a table of factorials with inverses answers C(n, k) modulo a prime in constant time.

We chose among eight students to form project teams. How many teams of 3 are there? How many ways to hand out three different roles instead? How many teams of any size?

Counting answers like these decides whether a search of every case is realistic, and it explains the numbers we met in the bitmask article.

## Ordered Picks

Three roles, lead, tester and writer, go to three different students out of 8. The lead can be any of 8, then the tester any of the 7 left, then the writer any of the remaining 6. The choices multiply: 8 × 7 × 6 = 336. This is the product rule, and it is written 8! ÷ 5!, since dividing by 5! cancels the factors from 5 down to 1.

Orderings of everything are the extreme case. 8 students can line up in 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1 = 8! = 40,320 ways.

Factorials grow fast: 10! is 3,628,800. 12! is 479,001,600, the last factorial under 2³¹ − 1 = 2,147,483,647, so 13! overflows a signed 32 bit integer. 20! is 2,432,902,008,176,640,000, the last one under the 64 bit limit of 9,223,372,036,854,775,807. 21! overflows that too.

Python counts these directly: `math.perm(8, 3)` is 336, and `math.factorial(8)` is 40,320. We confirmed 336 by generating all the ordered picks with `itertools.permutations(range(8), 3)`.

## Choosing a Group

A team of 3 has no roles, so Ana, Ben and Chi is the same team as Chi, Ana and Ben. Each team appears among the 336 ordered picks 3! = 6 times, once for each way to assign three roles. So the number of teams is 336 ÷ 6 = 56.

In general, picking k of n as a group is the ordered count divided by the k! orderings of the chosen group.

C(n, k) = n! ÷ (k! × (n − k)!)

It's read "n choose k". `math.comb(8, 3)` gives 56, and `itertools.combinations(range(8), 3)` produced exactly 56 teams.

Two facts follow. C(n, k) = C(n, n − k), since choosing the three who join is the same as choosing the five who don't. And all sizes together make 2ⁿ, the number of subsets: the counts for teams of 0 to 8 are 1, 8, 28, 56, 70, 56, 28, 8, 1, adding to 256.

In the last article, 256 was the number of masks, and of the 56 teams of 3, exactly 14 covered all five skills.

## Pascal's Triangle

There's a way to get the counts without any factorials. Take student number n. Teams of k either include that student, and then the other k − 1 members come from the other n − 1 students, or they don't, and all k come from the other n − 1. So

C(n, k) = C(n − 1, k − 1) + C(n − 1, k)

<figure class="diagram">
<div class="cells board"><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">2</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">3</div><div class="cell">3</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">4</div><div class="cell">6</div><div class="cell">4</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">5</div><div class="cell">10</div><div class="cell">10</div><div class="cell">5</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">6</div><div class="cell hl">15</div><div class="cell hl">20</div><div class="cell">15</div><div class="cell">6</div><div class="cell">1</div><div class="cell" style="visibility:hidden"></div></div>
<div class="cells board"><div class="cell">1</div><div class="cell">7</div><div class="cell">21</div><div class="cell hl">35</div><div class="cell">35</div><div class="cell">21</div><div class="cell">7</div><div class="cell">1</div></div>
<figcaption>The binomial coefficients C(n, k) for n = 0 to 7, with n down the rows and k across. Each entry is the sum of the one above it and the one above and to the left, as outlined: 15 + 20 = 35</figcaption>
</figure>

Each row is built from the one above by adding neighbors, which is Pascal's triangle. The outlined cells show C(7, 3) = 35 = C(6, 2) + C(6, 3) = 15 + 20. The edges are 1, since there's one way to choose nobody and one way to choose everybody.

```python
def pascal(rows):
    table = [[1]]
    for n in range(1, rows):
        prev = table[-1]
        table.append([1] + [prev[i] + prev[i + 1] for i in range(len(prev) - 1)] + [1])
    return table
```

We checked this rule against `math.comb` for all n up to 60 and all k, together with the symmetry and the fact that each row adds to 2ⁿ for n below 60.

## Computing One Coefficient

Building a whole triangle to read one entry is wasteful, and so is the formula taken literally, since n! gets huge before the division cancels most of it. The multiplicative form keeps numbers small and exact: with k chosen as the smaller of k and n − k, multiply and divide step by step.

```python
def comb(n, k):
    k = min(k, n - k)
    result = 1
    for i in range(1, k + 1):
        result = result * (n - k + i) // i      # always exact: the result is C(n-k+i, i)
    return result
```

After step i the value is C(n − k + i, i), a whole number, so the division is always exact. We checked it against three other methods, the triangle, the factorial formula and `math.comb`, for every n up to 60.

For C(1,000, 500), a number with 300 digits, the loop took 0.08 ms, the factorial formula 0.08 ms and `math.comb` 0.03 ms. For C(5,000, 2,500), with 1,504 digits, they took 1.5 ms, 1.8 ms and 0.5 ms. The built in is the one to use in Python, and the loop is how to do it elsewhere.

## Coefficients Modulo a Prime

Counting problems often want the answer modulo 1,000,000,007, as [Modular Arithmetic](/algorithms/modular-arithmetic) explained. The number C(n, k) can be gigantic, and the exact value isn't needed, only its remainder. Division isn't allowed in modular arithmetic, but multiplying by an inverse is. Precompute the factorials mod p, and the inverse of each factorial by the method of [Fast Exponentiation](/algorithms/fast-exponentiation). Then any coefficient is two multiplications.

```python
M = 10**9 + 7
N = 10**6
fact = [1] * (N + 1)
for i in range(1, N + 1):
    fact[i] = fact[i - 1] * i % M
inv = [1] * (N + 1)
inv[N] = pow(fact[N], M - 2, M)                 # one inverse, by Fermat
for i in range(N, 0, -1):
    inv[i - 1] = inv[i] * i % M                 # (i-1)!^-1 = i! ^-1 * i

def comb_mod(n, k):
    if k < 0 or k > n:
        return 0
    return fact[n] * inv[k] % M * inv[n - k] % M
```

Only one modular power is needed, for the top factorial, because each earlier inverse is the next one times i. Building the tables for 10⁶ took 0.17 s. After that, 100,000 queries with n up to a million took 0.04 s. For comparison, computing the exact `math.comb(n, k)` and reducing took 3.5 s for just three such queries, since the numbers have hundreds of thousands of digits.

The tables matched the exact value mod p on 3,000 random pairs with n up to 3,000.

## Counting Routes

How many shortest routes lead across a grid of city blocks, 10 blocks east and 10 north, if every move goes east or north? Each route is a sequence of 20 moves, 10 east and 10 north, and choosing which 10 of the 20 positions are east decides it. So the count is C(20, 10) = 184,756.

We checked the formula against counting by dynamic programming, where the number of ways to reach a corner is the sum of the ways to reach the two corners before it, which is Pascal's rule again. For all grids up to 14 by 14 the counts agreed. This is the argument behind the grid counting of [Counting with DP](/algorithms/counting-dp).

The same count appears in bit patterns: the number of n bit numbers with exactly k ones is C(n, k). We counted the 16 bit numbers by their number of ones and got C(16, k) for each k.

## How Fast It Grows

The middle coefficient is the largest in its row, and the row adds to 2²ⁿ = 4ⁿ. We computed the middle coefficient's share of that total, C(2n, n) ÷ 4ⁿ, and compared it with 1 ÷ √(πn).

| n | C(2n, n) ÷ 4ⁿ | 1 ÷ √(πn) |
| --- | --- | --- |
| 5 | 0.2461 | 0.2523 |
| 10 | 0.1762 | 0.1784 |
| 50 | 0.0796 | 0.0798 |
| 500 | 0.02523 | 0.02523 |

The two agree better as n grows, within 0.03% at n = 500. So the middle value shrinks slowly: the chance that 2n fair coin flips give exactly n heads falls like 1 ÷ √(πn), and for 20 flips, it is about 18%.

## Key Points

- Choices multiply: n! orders n items, 8 × 7 × 6 = 336 assigns three roles among 8, and 21! no longer fits a signed 64 bit integer
- A group of k has k! orderings, so C(n, k) = n! ÷ (k!(n − k)!), 56 teams of 3 from 8, with C(n, k) = C(n, n − k) and each row adding to 2ⁿ
- Pascal's rule C(n, k) = C(n − 1, k − 1) + C(n − 1, k) builds all coefficients by addition, and the multiplicative loop gets one exactly with no huge factorials
- Modulo a prime, tables of factorials and their inverses give any coefficient in constant time, 100,000 queries in 0.04 s against seconds for three exact ones
- Routes across a grid, bit patterns with k ones and teams of k all count C(n, k), and the middle coefficient is about 4ⁿ ÷ √(πn) as n grows
