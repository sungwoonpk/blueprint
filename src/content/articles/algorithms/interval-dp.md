> **Interval DP** uses a stretch of a sequence, from position i to position j, as the state. The best answer for a stretch comes from choosing where to split it, or which item to treat last, and combining the best answers for the two smaller stretches on either side. The table is filled in order of increasing stretch length, and with O(n²) stretches and O(n) choices for each, it takes O(n³).

Four matrices have to be multiplied in a row: A is 60 by 5, B is 5 by 40, C is 40 by 3 and D is 3 by 50. Matrix multiplication is associative, so the answer doesn't depend on how the product is bracketed, but the work does. Multiplying a p by q matrix with a q by r matrix takes p × q × r scalar multiplications. Which bracketing is cheapest?

Going left to right, ((AB)C)D costs 28,200. Bracketing as (A(BC))D costs 10,500. There are five ways in all, with costs from 10,500 up to 138,000, and for a chain of 19 matrices there are 477,638,700 ways. We need a method that doesn't try each.

## The Stretch as State

The last multiplication of any bracketing splits the chain into a left part and a right part: (left)(right). The best total is the best bracketing of the left part, plus the best of the right part, plus the cost of the final multiplication. The two parts are chains of the same kind, and are stretches of the original sequence.

Let cost(i, j) be the cheapest way to multiply matrices i through j. Matrix k has the shape dims[k] by dims[k + 1]. If the final split is after matrix k, the final multiplication takes dims[i] × dims[k + 1] × dims[j + 1].

cost(i, j) = the smallest, over splits k from i to j − 1, of cost(i, k) + cost(k + 1, j) + dims[i] × dims[k + 1] × dims[j + 1]

A single matrix, cost(i, i), costs 0.

## The Order of Filling

cost(i, j) needs shorter stretches, so fill the table by length: all stretches of 2 matrices, then 3, then 4. That is the order in which every cell's inputs are ready.

```python
def matrix_chain(dims):
    n = len(dims) - 1                              # the number of matrices
    cost = [[0] * n for _ in range(n)]
    split = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            cost[i][j] = float("inf")
            for k in range(i, j):                  # the last multiplication joins i..k and k+1..j
                c = cost[i][k] + cost[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                if c < cost[i][j]:
                    cost[i][j] = c
                    split[i][j] = k
    return cost, split
```

<figure class="diagram">
<div class="cells board"><div class="cell dim"></div><div class="cell dim">A</div><div class="cell dim">B</div><div class="cell dim">C</div><div class="cell dim">D</div></div>
<div class="cells board"><div class="cell dim">A</div><div class="cell">0</div><div class="cell">12</div><div class="cell">1.5</div><div class="cell hl">10.5</div></div>
<div class="cells board"><div class="cell dim">B</div><div class="cell" style="visibility:hidden"></div><div class="cell">0</div><div class="cell">0.6</div><div class="cell">1.35</div></div>
<div class="cells board"><div class="cell dim">C</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell">0</div><div class="cell">6</div></div>
<div class="cells board"><div class="cell dim">D</div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell" style="visibility:hidden"></div><div class="cell">0</div></div>
<figcaption>The cheapest cost of multiplying each stretch of the chain A, B, C, D. The cell in row X and column Y is the cost for the matrices from X to Y, in thousands of scalar multiplications, and the outlined cell is the whole chain, 10.5 thousand</figcaption>
</figure>

For the four matrices, with dims 60, 5, 40, 3, 50, the table above holds the cost of every stretch. The pair BC is cheap, 5 × 40 × 3 = 600, and AB is expensive, 60 × 5 × 40 = 12,000, which already tells us not to multiply A and B first.

Then ABC is best as A(BC) at 1,500, and the whole chain is best as (ABC)D, at 1,500 + 60 × 3 × 50 = 10,500.

The `split` table remembers the winning k for each stretch, which lets us rebuild the bracketing the way [Reconstructing the Solution](/algorithms/reconstructing-solutions) does.

```python
def bracketing(split, i, j, names):
    if i == j:
        return names[i]
    k = split[i][j]
    return "(" + bracketing(split, i, k, names) + bracketing(split, k + 1, j, names) + ")"
```

It returns ((A(BC))D).

We checked the table against a brute force that computes the cost of every bracketing, on 500 random chains of up to 8 matrices with dimensions from 1 to 30. The cheapest cost matched each time.

The number of bracketings is the Catalan number, C(2m, m) ÷ (m + 1) for m + 1 matrices, from [Combinatorics](/algorithms/combinatorics): we counted 1, 1, 2, 5, 14, 42, 132 and 429 for 1 to 8 matrices and the formula agreed, with 477,638,700 for 19 and over a thousand trillion for 30.

## How Much Does the Order Matter

The cost of multiplying left to right, the obvious order, isn't often the best. We drew 2,000 random chains of 10 matrices with dimensions from 1 to 100. Left to right cost on average 9.65 times the cheapest bracketing, and in the worst chain 91 times.

## The Cost of the Table

There are n(n + 1) ÷ 2 stretches, and each tries up to n splits, so the time is O(n³) and the memory O(n²). We timed it on random chains.

| Matrices | Stretches | Split Choices | Time |
| --- | --- | --- | --- |
| 50 | 1,275 | 20,825 | Under 5 ms |
| 100 | 5,050 | 166,650 | 0.02 s |
| 200 | 20,100 | 1,333,300 | 0.12 s |
| 400 | 80,200 | 10,666,600 | 1.16 s |

Doubling the number of matrices multiplied the time by about 6 to 10, closer to the 8 the cube predicts as the table grows.

## The Shape of Interval DP

The same shape solves many problems where the last step splits a sequence.

| Problem | Stretch Means | The Choice |
| --- | --- | --- |
| Matrix chain | Matrices i to j | Where the last product splits |
| Optimal search tree | Keys i to j | Which key is the root |
| Bursting balloons | Balloons i to j | Which balloon bursts last |
| Splitting a string into palindromes | Letters i to j | Where one palindrome ends |
| RNA folding | Bases i to j | Whether the end bases pair |

The method has three parts: a state of two positions, a choice of where to cut or what to do last, and an order that goes from short stretches to long ones. Look for it when the problem's final step divides what remains into two independent parts.

A stretch is independent of everything outside it only if the choice that splits it leaves the two sides unaffected by each other, which is the property to check.

## Key Points

- Interval DP takes the stretch i to j as the state and tries every split, combining the best answers for the two sides, in O(n³) time and O(n²) memory
- For matrices 60 by 5, 5 by 40, 40 by 3 and 3 by 50, the best bracketing ((A(BC))D) costs 10,500 against 28,200 left to right, and the table matched a check of every bracketing on 500 random chains
- Cells are filled by increasing stretch length, so each one finds its two smaller stretches ready
- The number of bracketings is a Catalan number, 477,638,700 for 19 matrices, and the table avoids trying them
- Left to right averaged 9.65 times the cheapest cost on random chains of 10 matrices, and 91 times in the worst one
