> **2D DP on a grid** uses a cell as the state: the answer for a cell comes from the cells just above it and just to its left. When a route can only move right or down, each cell has only two ways in, so the cheapest route cost, or the number of routes, is filled row by row in time proportional to the number of cells.

A delivery cart rolls across a campus laid out as a grid of blocks, from the top left corner to the bottom right. It can move only right or down, and entering a block costs some effort, because of stairs, ramps or crowds. What is the cheapest route, and how many routes are there?

Trying every route works for a grid of 4 by 4, and for a grid of 20 by 20 there are more than 35 billion of them. A grid asks for a table with one entry for each block.

## Cheapest Route

Let cost(r, c) be the cheapest total cost from the top left block to block (r, c). The cart came into that block from above or from the left, so its cheapest cost is the block's own cost plus the cheaper of the two ways in.

cost(r, c) = effort(r, c) + min of cost(r − 1, c) and cost(r, c − 1)

Blocks on the top row or left column have only one way in. The corner costs its own effort.

```python
def cheapest(effort):
    rows, cols = len(effort), len(effort[0])
    INF = float("inf")
    cost = [[INF] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                cost[r][c] = effort[0][0]
                continue
            from_above = cost[r - 1][c] if r > 0 else INF
            from_left = cost[r][c - 1] if c > 0 else INF
            cost[r][c] = effort[r][c] + min(from_above, from_left)
    return cost
```

A cell needs the one above it and the one to its left, so filling row by row from the left is a valid order, and that is the whole algorithm.

<figure class="diagram">
<p class="rowname">Cost of each block</p>
<div class="cells board"><div class="cell hl">3</div><div class="cell hl">1</div><div class="cell hl">4</div><div class="cell hl">1</div></div>
<div class="cells board"><div class="cell">5</div><div class="cell">9</div><div class="cell">2</div><div class="cell hl">6</div></div>
<div class="cells board"><div class="cell">5</div><div class="cell">3</div><div class="cell">5</div><div class="cell hl">8</div></div>
<div class="cells board"><div class="cell">9</div><div class="cell">7</div><div class="cell">9</div><div class="cell hl">3</div></div>
<p class="rowname">Cheapest cost to reach each block</p>
<div class="cells board"><div class="cell hl">3</div><div class="cell hl">4</div><div class="cell hl">8</div><div class="cell hl">9</div></div>
<div class="cells board"><div class="cell">8</div><div class="cell">13</div><div class="cell">10</div><div class="cell hl">15</div></div>
<div class="cells board"><div class="cell">13</div><div class="cell">16</div><div class="cell">15</div><div class="cell hl">23</div></div>
<div class="cells board"><div class="cell">22</div><div class="cell">23</div><div class="cell">24</div><div class="cell hl">26</div></div>
<figcaption>A 4 by 4 grid of block costs and the table of cheapest costs, moving only right or down. The outlined cells are the cheapest route, 3 + 1 + 4 + 1 + 6 + 8 + 3 = 26</figcaption>
</figure>

On the 4 by 4 grid, the cheapest total is 26. The picture shows the table and the route behind it, found by walking back from the bottom right corner, each step to whichever neighbor, above or to the left, has the smaller cost, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions). The route runs along the top row and then down the right column.

We tested the table against a brute force over every route on 500 random grids of up to 6 by 6, with efforts from 1 to 9. The cheapest costs matched on every grid.

## Counting Routes

The same grid answers a counting question: the number of routes into a block is the number into the block above plus the number into the block to its left. A blocked block, a closed building, has no routes through it.

```python
def count_routes(blocked, rows, cols):
    ways = [[0] * cols for _ in range(rows)]
    ways[0][0] = 0 if (0, 0) in blocked else 1
    for r in range(rows):
        for c in range(cols):
            if (r, c) in blocked:
                ways[r][c] = 0                       # no route passes through a closed block
            elif r or c:
                ways[r][c] = (ways[r - 1][c] if r else 0) + (ways[r][c - 1] if c else 0)
    return ways[rows - 1][cols - 1]
```

On a 5 by 5 grid with three blocked blocks there were 10 routes, against 70 with none blocked. With nothing blocked, the count has a formula: a route is a sequence of moves with rows − 1 downs and cols − 1 rights, so the number is C(r + c − 2, r − 1), from [Combinatorics](/algorithms/combinatorics).

We checked the table against that for every grid up to 11 by 11, and against a listing of all routes, with random blocked blocks, on 500 grids up to 6 by 6. All matched.

The formula stops working when blocks are closed. The table doesn't, and that is why it is the tool for grids with obstacles. For a 1,000 by 1,000 grid the count has 600 digits, and Python handled it as an ordinary integer.

## Why the Table Is Needed

The plain recursion asks, for each block, about the block above and to the left, and many routes share blocks, so it repeats work. For a 10 by 10 grid the plain recursion made 184,755 calls, and there are only 100 blocks. The table makes 100. The recursion's call count is about the number of routes, since every route is a separate walk down the call tree, and that number grows as a binomial coefficient.

The time of the table is the number of cells, with a constant amount of work for each.

| Grid | Cells | Time |
| --- | --- | --- |
| 200 by 200 | 40,000 | Under 5 ms |
| 500 by 500 | 250,000 | 0.02 s |
| 1,000 by 1,000 | 1,000,000 | 0.09 s |

## When Moves Aren't Restricted

The table works because the moves go only right or down, so a cell depends on cells already finished. If the cart could also go up or left, a cell could depend on a cell that depends on it back, and the order breaks. Then the problem is a shortest path in a graph with cells as vertices, and the tool is [Dijkstra’s Algorithm](/algorithms/dijkstra).

How much does the restriction cost? On 2,000 random grids of sizes from 2 by 2 to 7 by 7, where most blocks cost 1 and the rest up to 20, the right and down route was more expensive than the free four direction route in 63 of them, about 3%. Free moves can only give an answer as good or better, and Dijkstra pays for a priority queue where the table needs none.

## Other Moves, Other Neighbors

The recurrence is the list of ways into a cell, and a different list is a different problem. With a diagonal move added, a cell depends on three neighbors: above, left and above left. A move for a knight depends on cells two rows up and one column over, and so on. The shape stays the same as long as every dependency points to a cell filled earlier.

Two-dimensional grids are also the tables of the next topics: a cell can mean a pair of positions in two sequences, as in [Longest Common Subsequence and Edit Distance](/algorithms/lcs-edit-distance), or a pair of an item and a remaining capacity, as in [Knapsack Problems](/algorithms/knapsack).

## Key Points

- On a grid with right and down moves, the cheapest cost to a cell is its own cost plus the smaller of the cost above and the cost to the left, filled row by row
- The 4 by 4 example costs 26, and the table matched a brute force over every route on 500 random grids
- Counting routes adds the counts above and to the left, with blocked cells set to 0, and it matched C(r + c − 2, r − 1) when nothing is blocked and a listing of all routes when some are
- The plain recursion made 184,755 calls on a 10 by 10 grid and the table 100 cells, and a 1,000 by 1,000 grid took 0.09 s
- If moves can go up or left, a cell's dependencies loop, and the problem becomes a shortest path, where 3% of our random grids had a cheaper four direction route
