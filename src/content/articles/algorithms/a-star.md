> **A\* search** (said "A star") finds a cheapest path to one goal by always expanding the vertex with the smallest f = g + h, where g is the cost of the best route found so far and h is a guess of the cost still to go. If the guess never overestimates, the first time the goal is taken out the path is cheapest. With h = 0 it is Dijkstra’s algorithm.

Ask a navigation app for a route and it doesn't explore the whole country. It leans toward your destination. [Dijkstra’s Algorithm](/algorithms/dijkstra) can't lean: its wavefront spreads in a ring, and a trip to the south east wastes effort on every road to the north west that is closer to the start than the goal is.

A\* keeps the same machinery and adds one idea, a guess about the distance that is left.

## A Guess Toward the Goal

Back in the maze of [Grids and Implicit Graphs](/algorithms/grids-implicit-graphs), with a goal in the bottom right corner. Each step moves one cell up, down, left or right at cost 1. From any cell, the goal is at least as many steps away as the rows plus columns between them, since each step covers one row or one column, and walls can only add to that.

That count is the **Manhattan distance**, and it is our guess h.

A\* ranks cells by **f = g + h**. A cell far from the start has a large g, and a cell far from the goal has a large h, so f is the estimate of a whole trip through that cell. Taking the smallest f first keeps the search on cells that look like part of a short trip.

<figure class="diagram">
<div class="cells board sm"><div class="cell hl">S</div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell done"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell wall"></div><div class="cell done"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell done"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell wall"></div><div class="cell done"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell hl"></div><div class="cell done"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board sm"><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell done"></div><div class="cell done"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell done"></div></div>
<div class="cells board sm"><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell done"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell wall"></div></div>
<div class="cells board sm"><div class="cell"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell done"></div><div class="cell done"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell hl"></div><div class="cell hl">E</div></div>
<figcaption>A 12 by 12 maze. A* settled the shaded cells and found the outlined path of 24 moves. Dijkstra’s algorithm settled 87 of the 103 open cells before it got there, and A* settled 35</figcaption>
</figure>

The code is Dijkstra's with `h(cell)` added to the priority. Among cells with the same f, it takes the one with the larger g, so the search keeps pushing deeper before spreading.

```python
import heapq

def a_star(grid, start, goal, h):
    g = {start: 0}
    parent = {start: None}
    heap = [(h(start), 0, start)]             # (f, tie-break, cell)
    closed = set()
    while heap:
        f, _, cell = heapq.heappop(heap)
        if cell in closed:
            continue                          # a stale entry
        if cell == goal:
            path = []
            while cell is not None:
                path.append(cell)
                cell = parent[cell]
            return path[::-1], g[goal]
        closed.add(cell)
        for nxt in neighbors(grid, *cell):    # from the grids article
            ng = g[cell] + 1
            if nxt not in g or ng < g[nxt]:
                g[nxt] = ng
                parent[nxt] = cell
                heapq.heappush(heap, (ng + h(nxt), -ng, nxt))
    return None, None
```

On random mazes of up to 15 by 15 cells, 300 of them, it found paths of the same length as breadth-first search every time.

## When the Guess Is Safe

The path returned is cheapest only if the guess is honest. An estimate is **admissible** if it never exceeds the true remaining cost. Manhattan distance qualifies on this grid. Then when the goal is taken out of the heap with f = g, no other route can be shorter.

Any better route would pass through a cell still waiting in the heap, and by the admissible guess that cell's f is at most the true length of that route, so it would come out first.

For our code, which never reopens a cell once it is settled, one more property is needed, **consistency**: h(u) ≤ cost(u to v) + h(v) for every edge, which says that a step can't lower the guess by more than the step costs. Manhattan distance changes by exactly 1 per step here, so it is consistent too.

The guess has to match the moves. If diagonal steps were allowed, Manhattan distance would overestimate, since one diagonal step covers a row and a column, and the safe choice becomes the larger of the two differences.

## What Dishonest Guesses Cost

We multiplied the Manhattan estimate by 1.5 and by 2, so it overestimates, and ran all four versions on the same 214 solvable mazes of 60 by 60 cells with a quarter of the cells walls.

| Guess | Cells Settled | Optimal Paths | Average Excess |
| --- | --- | --- | --- |
| None, h = 0 | 2,677 | 214 of 214 | 0% |
| Manhattan | 1,275 | 214 of 214 | 0% |
| 1.5 × Manhattan | 215 | 9 of 214 | 6.7% |
| 2 × Manhattan | 197 | 1 of 214 | 10.8% |

Exaggerating the guess made the search about 6 times faster than plain Manhattan, and the paths came out longer, 7% to 11% on average. Sometimes that is a good deal. Games often take a path that's near the best in a fraction of the time, and this version is called weighted A\*. But the guarantee of the cheapest path is gone, and the table is the price.

## Breaking Ties

On an open field with no walls, Manhattan distance gave no advantage in our first runs: 3,599 cells settled with h = 0 and also 3,599 with Manhattan. Every cell on the grid's diagonal band has the same f, since every shortest route costs the same, and the heap picked among them by cell position.

Preferring the larger g among equal f, as the code above does, makes the search commit to one direction. The same maze then settled 118 cells, the length of the path.

| Walls | h = 0 | Manhattan | Manhattan, Larger g First |
| --- | --- | --- | --- |
| 0% | 3,599 | 3,599 | 118 |
| 10% | 3,243 | 2,827 | 257 |
| 25% | 2,679 | 1,276 | 419 |
| 35% | 2,061 | 933 | 764 |

The advantage shrinks as walls grow, because Manhattan distance ignores walls and becomes a worse guess. At 35% walls the count was 764 against 2,061 for h = 0, so A\* still did well under half the work.

## A Better Guess for the Puzzle

The 8 puzzle from the grids article was the other graph to search. Breadth-first search settles states ring by ring until the goal, and on a random board that took 90,776 states on average. A\* needs a guess about the number of moves left. Two admissible ones:

- **Misplaced tiles**: the number of tiles not in their goal square, since each needs at least one move
- **Manhattan sum**: each tile's rows plus columns from its goal square, added up, since each move shifts one tile by one square

Both never overestimate, and the second is larger, so it's closer to the truth. On 100 random solvable boards, with a mean solution of 21.75 moves, all three methods found the same shortest length as the breadth-first distances.

| Method | States Settled, Average of 100 Boards | States Settled, Hardest Board |
| --- | --- | --- |
| Breadth-first search | 90,776 | 181,439 |
| A\*, misplaced tiles | 10,699 | 121,520 |
| A\*, Manhattan sum | 776 | 6,816 |

A better admissible guess cut the work by more than 100 times against breadth-first search on typical boards and by about 27 times on the hardest, a board needing 31 moves. A guess that is closer to the true distance, without passing it, wastes less effort.

The 15 puzzle is the test the other article left open, since 10.5 trillion states are out of reach for breadth-first search. We scrambled six random boards and ran A\* with the Manhattan sum, capped at 1.5 million settled states. Two boards were solved, in 38 moves with 67,768 states and in 42 moves with 124,105 states.

The other four hit the cap after about 9 seconds each. The guess brings the puzzle into reach for some boards, and it isn't a guarantee for all of them. Stronger guesses exist, and building them is a research topic of its own.

## Cost and Choice

A\* settles a vertex once and keeps the heap and the table of costs, so its memory is that of Dijkstra's algorithm. An honest guess shrinks the search, and with h = 0 it is the same search, so it can't do worse than Dijkstra apart from ties. A dishonest guess trades the guarantee for speed.

| Situation | Use |
| --- | --- |
| Every vertex's distance from a source | Dijkstra’s algorithm |
| One goal, with a guess that never overestimates | A\* |
| One goal, speed first, near the best is fine | Weighted A\* |
| Unweighted edges, no useful guess | Breadth-first search |

## Key Points

- A\* orders vertices by f = g + h, the cost so far plus a guess of the cost to go, and with h = 0 it is Dijkstra’s algorithm
- If the guess never overestimates, and for our code is also consistent, the first time the goal is taken out the path is cheapest, and our A\* matched breadth-first search on 300 mazes
- Manhattan distance settled 1,275 cells against 2,677 for h = 0 on 25% wall mazes, and doubling it settled 197 but found the best path in 1 of 214
- Preferring the larger g among equal f cut 3,599 settled cells to 118 on an open grid
- A closer admissible guess settled 776 states for the 8 puzzle against 10,699 and 90,776, and for the 15 puzzle it solved 2 of 6 random boards within 1.5 million states
