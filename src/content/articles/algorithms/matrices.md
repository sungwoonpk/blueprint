> A **matrix** is a grid of values arranged in rows and columns. In memory it is stored as one long array, and the order the grid is laid out in decides which loops run fast.

A lecture hall has R rows of C seats, and the attendance app keeps a grid of which seats are taken. Questions about the hall come naturally in two dimensions: who sits next to seat (3, 5), how many seats are free in row 2, what does the hall look like from the other side. Each one is a loop over a grid, and the details of the loop matter more than they look.

## A Grid Stored in a Line

Memory is one dimensional, so a grid has to be flattened. The usual layout is **row-major**: the first row, then the second row, and so on. In a grid with C columns, the cell in row r and column c lands at position r × C + c in the flat array.

<figure class="diagram">
<p class="rowname">The grid, 2 rows and 3 columns</p>
<div class="cells">
<div class="cell">a<small>0,0</small></div>
<div class="cell">b<small>0,1</small></div>
<div class="cell">c<small>0,2</small></div>
</div>
<div class="cells">
<div class="cell">d<small>1,0</small></div>
<div class="cell hl">e<small>1,1</small></div>
<div class="cell">f<small>1,2</small></div>
</div>
<p class="rowname">The same cells in memory</p>
<div class="cells">
<div class="cell">a<small>0</small></div>
<div class="cell">b<small>1</small></div>
<div class="cell">c<small>2</small></div>
<div class="cell">d<small>3</small></div>
<div class="cell hl">e<small>4</small></div>
<div class="cell">f<small>5</small></div>
</div>
<figcaption>Cell (1, 1) sits at position 1 × 3 + 1 = 4 in row-major order</figcaption>
</figure>

C and NumPy use this layout, and it is NumPy's default. Python lists of lists do something slightly different: an outer list holds one reference to each row, and each row is its own list. The access `grid[r][c]` still takes two steps, and the rows don't have to sit next to each other.

## The Shared Row Trap

Building a Python grid has a classic bug. Repeating a row with `*` repeats the reference, not the row.

```python
bad = [[0] * 3] * 2
bad[0][0] = 7
print(bad)        # [[7, 0, 0], [7, 0, 0]]

good = [[0] * 3 for _ in range(2)]
good[0][0] = 7
print(good)       # [[7, 0, 0], [0, 0, 0]]
```

In the first version both rows are the same list, so a change to one shows up in the other. Writing a loop, or a comprehension, creates a fresh row each time.

## Row by Row or Column by Column

Both of these loops visit each cell, so by the step count they are equal. They are not equal in time.

```python
for r in range(R):          # row by row
    for c in range(C):
        total += grid[r][c]

for c in range(C):          # column by column
    for r in range(R):
        total += grid[r][c]
```

In row-major storage, walking along a row visits neighboring memory locations, and the processor loads memory in blocks, so the next few cells arrive with the first. Walking down a column jumps a whole row each step and uses only one cell from each block it loads.

We timed both on an 8,192 by 8,192 matrix of C integers, 256 MB. Row by row took 18 to 44 ms in two runs, and column by column took 426 ms both times, 10 to 20 times slower, for the same sum.

The lesson is to make the inner loop follow the memory layout. With row-major data, that is the column index. The same loop with the roles swapped is the right choice for data stored by column, which NumPy supports with its Fortran order option.

## Visiting Neighbors

Grid problems often ask about the cells around one cell. A list of direction offsets keeps the code short, and a bounds check keeps it safe.

```python
def neighbors(grid, r, c):
    rows, cols = len(grid), len(grid[0])
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            yield nr, nc
```

The bounds check does real work, and in Python the bug is subtle. A negative index doesn't fail, it counts from the end. For the cell at row 0, `grid[r - 1][c]` silently reads the last row, so a missing check returns plausible and wrong answers. This is a case for [Edge Cases and Testing](/algorithms/edge-cases): try the corners, the first and last rows, and a grid with one row or one column.

The same offsets with four more pairs add the diagonals. Cells on the same diagonal share a value: r − c is constant along one direction, and r + c along the other, which is handy for problems that ask about diagonals. [Grids and Implicit Graphs](/algorithms/grids-implicit-graphs) builds on this to search through a grid.

## Moving Whole Grids Around

Three operations come up often.

A **transpose** swaps rows and columns, so cell (r, c) moves to (c, r). A clockwise **rotation** is a transpose followed by reversing each row, and in Python it can be written by reversing the rows and then zipping them.

```python
def transpose(m):
    return [list(col) for col in zip(*m)]

def rotate_clockwise(m):
    return [list(col) for col in zip(*m[::-1])]
```

For the grid 1 2 3 / 4 5 6 / 7 8 9, the rotation gives 7 4 1 / 8 5 2 / 9 6 3. Applying it four times gives back the original grid.

A **spiral traversal** walks the outer ring, then the next ring inside it, and so on. It is a loop with an invariant: four boundaries mark the part of the grid not yet visited, and each ring moves them inward.

```python
def spiral(m):
    out = []
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(m[top][c])
        for r in range(top + 1, bottom + 1):
            out.append(m[r][right])
        if top < bottom:
            for c in range(right - 1, left - 1, -1):
                out.append(m[bottom][c])
        if left < right:
            for r in range(bottom - 1, top, -1):
                out.append(m[r][left])
        top += 1; bottom -= 1; left += 1; right -= 1
    return out
```

The two `if` lines guard the case where the remaining area is a single row or a single column, which would otherwise be visited twice. We ran it on a single row, a single column and a 3 by 2 grid, along with 2,000 random shapes, and each cell appeared exactly once. The rule from [Proving Correctness with Loop Invariants](/algorithms/loop-invariants) applies: say what the boundaries mean before writing the loop.

## How Big Can a Grid Get

A grid with R rows and C columns has R × C cells, and the memory grows with that product. In Python, a 1,000 by 1,000 list of lists holding distinct integers took 40.9 MB in our run. The same million numbers in one flat `array('i')` took 4.1 MB, ten times less.

A grid of 10,000 by 10,000 is 100 million cells, which would need at least 800 MB for the references alone in a list of lists. The sizes in a problem's limits, as in [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints), tell you whether to use a compact array.

If most cells are empty, a **sparse** representation is smaller still: a dictionary from (row, column) to value that stores only the cells that have something in them.

## Key Points

- A matrix is stored as one array, usually row-major, so cell (r, c) sits at r × C + c
- Python lists of lists share a trap: `[[0] * C] * R` repeats one row, so build rows with a loop
- Visit cells in memory order, because walking down columns of row-major data can be 10 to 20 times slower
- Direction offsets with a bounds check handle neighbors, and Python's negative indexes make a missing check give wrong answers silently
- Transpose, rotation and spiral traversal are small loops worth knowing, and the spiral is a good exercise in stating an invariant
- Large grids need compact storage, and mostly empty grids need a sparse form
