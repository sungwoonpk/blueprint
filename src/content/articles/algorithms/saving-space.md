> Many dynamic programming tables are bigger than they need to be. When a row depends only on the row before it, two rows, or one row updated in the right order, are enough to get the value. The price is that the answer itself can no longer be recovered by walking back through the table, unless a divide and conquer method such as Hirschberg's algorithm is used.

Comparing two strings of 2,000 letters with the table from [Longest Common Subsequence and Edit Distance](/algorithms/lcs-edit-distance) takes 4 million cells, and our run peaked at 56 MB. Strings of 50,000 letters would need 2.5 billion cells, far more than a Python list of lists can hold on an ordinary computer.

Time and memory are different resources. The table is quadratic in size, and it has more in it than the calculation needs.

## Which Cells Are Still Needed

Look at where each cell gets its value. In the common subsequence table, a cell reads the cell above it, the cell to its left, and the one above and to the left. All three are in the current row or the row immediately above. Once row i is finished, row i − 1 is never read again, and nothing older was needed since row i − 1 was done.

<figure class="diagram">
<div class="cells board"><div class="cell dim"></div><div class="cell dim"></div><div class="cell dim">c</div><div class="cell dim">o</div><div class="cell dim">m</div><div class="cell dim">p</div><div class="cell dim">a</div><div class="cell dim">n</div><div class="cell dim">y</div></div>
<div class="cells board"><div class="cell dim"></div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div><div class="cell dim">0</div></div>
<div class="cells board"><div class="cell dim">c</div><div class="cell dim">0</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div></div>
<div class="cells board"><div class="cell dim">a</div><div class="cell dim">0</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">2</div><div class="cell dim">2</div><div class="cell dim">2</div></div>
<div class="cells board"><div class="cell dim">m</div><div class="cell done">0</div><div class="cell done">1</div><div class="cell done">1</div><div class="cell done">2</div><div class="cell done">2</div><div class="cell done">2</div><div class="cell done">2</div><div class="cell done">2</div></div>
<div class="cells board"><div class="cell dim">p</div><div class="cell hl">0</div><div class="cell hl">1</div><div class="cell hl">1</div><div class="cell hl">2</div><div class="cell hl">3</div><div class="cell hl">3</div><div class="cell hl">3</div><div class="cell hl">3</div></div>
<div class="cells board"><div class="cell dim">u</div><div class="cell dim">0</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">2</div><div class="cell dim">3</div><div class="cell dim">3</div><div class="cell dim">3</div><div class="cell dim">3</div></div>
<div class="cells board"><div class="cell dim">s</div><div class="cell dim">0</div><div class="cell dim">1</div><div class="cell dim">1</div><div class="cell dim">2</div><div class="cell dim">3</div><div class="cell dim">3</div><div class="cell dim">3</div><div class="cell dim">3</div></div>
<figcaption>The longest common subsequence table of campus and company, at the moment the row for the letter p is being filled. Only the shaded row above it and the outlined row being filled are in memory, and the faded rows are already gone or not yet needed. The answer is the last number of the last row, 3</figcaption>
</figure>

So at any moment two rows are alive. Keep a previous row and a current row, fill the current one, and then let it become the previous one.

```python
def lcs_length(a, b):
    previous = [0] * (len(b) + 1)
    for x in a:
        current = [0] * (len(b) + 1)
        for j, y in enumerate(b, 1):
            if x == y:
                current[j] = previous[j - 1] + 1
            else:
                current[j] = max(previous[j], current[j - 1])
        previous = current
    return previous[-1]
```

For two strings of 2,000 letters over a, c, g and t, the full table with a walk back took 5.03 s and 56 MB at its peak. Two rows gave the same length of 1,295 in 1.73 s, and the peak memory was 0.1 MB.

The memory fell from the number of cells to about the width of a row. The same trick works for the edit distance, the grid path costs and anything whose cells look back one row.

## One Row, Updated in Place

Sometimes a single row is enough, if each cell is changed after the cells it needs have been read. The grid path cost is an example: a cell needs the cell above it, which is the same column of the single row before it is overwritten, and the cell to the left, which is the one just written.

```python
def cheapest_route(effort):
    row = [0] * len(effort[0])
    for r, line in enumerate(effort):
        for c, cost in enumerate(line):
            if r == 0 and c == 0:
                row[c] = cost
            elif r == 0:
                row[c] = row[c - 1] + cost
            elif c == 0:
                row[c] = row[c] + cost                    # only the cell above
            else:
                row[c] = min(row[c], row[c - 1]) + cost   # above is the old value, left is the new one
    return row[-1]
```

It agreed with the full table on 500 random grids of up to 8 by 8. The knapsack from [Knapsack Problems](/algorithms/knapsack) is the other classic case, and there the order of the inner loop is what makes it right: downward over the capacities, so every cell is read before it is overwritten in this round.

Going upward uses an item more than once, which is wrong for the 0/1 version. We compared the two orders on 1,000 random instances against the full table. Downward matched all of them and upward was wrong on 751.

For a knapsack of 100 items and a capacity of 100,000, a full table has about 10.1 million cells, which as a Python list of lists is about 81 MB of pointers, and a single row is 0.8 MB.

## What Is Lost

With only two rows, the older rows are gone. That is fine when the question is the value, such as the length of the longest common subsequence or the lowest cost, and a problem when the question is the answer itself: which letters, which edits, which items. The walk back from [Reconstructing the Solution](/algorithms/reconstructing-solutions) needs the choice at every cell.

There are three ways out. Keep the choices in a compact form, such as a bit for each cell instead of a number, which cuts memory by a constant factor. Recompute: run the two row version, find the value, and use it to decide the first step, which costs time. Or use a cleverer method.

## Hirschberg's Idea

Hirschberg's algorithm, from 1975, finds the longest common subsequence itself in the time of the table and the memory of two rows. It combines divide and conquer with the two row computation.

Split the first string in the middle, a₁ and a₂. A longest common subsequence of the whole splits into a part from a₁ and a part from a₂, matched against a prefix and a suffix of the second string, b₁ and b₂. Which split of b is right? Compute with two rows the last row for a₁ against every prefix of b.

Do the same for the reverse of a₂ against every suffix of b, by reversing both strings. For each split point k of b, the best total is the left value for k plus the right value for the rest. The k with the largest total is where the optimal route crosses the middle. Then solve the two halves the same way, each with a smaller piece of each string.

```python
def hirschberg(a, b):
    if not a or not b:
        return ""
    if len(a) == 1:
        return a if a in b else ""
    mid = len(a) // 2
    left = lcs_last_row(a[:mid], b)                          # a[:mid] against every prefix of b
    right = lcs_last_row(a[mid:][::-1], b[::-1])             # a[mid:] against every suffix of b
    n = len(b)
    k = max(range(n + 1), key=lambda t: left[t] + right[n - t])
    return hirschberg(a[:mid], b[:k]) + hirschberg(a[mid:], b[k:])
```

Here `lcs_last_row` is the two row function above, returning the whole last row and not just its final entry. The work at the top level is the full table's work, and the two halves together do half of that, then a quarter, so the total is about twice the table, still O(m × n). The memory is the rows and the recursion depth.

We checked it against the full table on 1,000 random pairs of strings of up to 25 letters from a, b and c. The returned string had the right length, and was a subsequence of both strings. On the 2,000 letter strings it returned 1,295 letters, like the others, in 2.85 s and 0.2 MB of peak memory.

That was faster than the full table with a walk back, which took 5.03 s, probably because the big table is costly to allocate and to touch in Python, though we didn't separate the causes. It was slower than the two row length alone at 1.73 s, which is the price of getting the letters.

| Method | Time | Peak Memory | Gives the Letters |
| --- | --- | --- | --- |
| Full table and walk back | 5.03 s | 56 MB | Yes |
| Two rows | 1.73 s | 0.1 MB | No, only the length |
| Hirschberg | 2.85 s | 0.2 MB | Yes |

## When to Bother

If the table fits in memory and the answer is needed, the table is the simplest. If only the value is needed, use a row or two. If the table is too big and the answer is needed, Hirschberg's method or a stored bit for each cell is the choice. A rule of thumb: decide what must be returned before deciding what to keep.

## Key Points

- A cell that reads only the row above lets two rows replace the whole table, which cut the peak memory of a 2,000 by 2,000 comparison from 56 MB to 0.1 MB
- A single row can be enough if cells are updated after their inputs are read, and in the 0/1 knapsack the capacities must go downward, since upward was wrong on 751 of 1,000 instances
- Dropping the old rows loses the walk back, so the value is available and the answer isn't
- Hirschberg's algorithm splits one string in the middle, finds where the best route crosses it with two row computations from each end, and recurses, giving the letters in O(m × n) time and linear memory
- On two strings of 2,000 letters, Hirschberg took 2.85 s and 0.2 MB, the table with a walk back 5.03 s and 56 MB
