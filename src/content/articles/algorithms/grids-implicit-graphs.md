> A **grid** is a graph whose vertices are cells and whose edges join neighboring cells. An **implicit graph** goes further: its vertices and edges are never stored, and the neighbors of a vertex are computed from the vertex itself when the search needs them. BFS and DFS run on these unchanged.

The campus graph was small enough to write down. A game board, a maze or a floor plan isn't. A grid of 500 by 500 cells has 250,000 vertices, and people don't type out neighbor lists, because the neighbors of the cell in row 7, column 12 are right there in the arithmetic: rows 6 and 8, columns 11 and 13.

That arithmetic is the whole idea of this article.

## A Grid Is Already a Graph

Each cell is a vertex, and a step up, down, left or right is an edge, so a grid with R rows and C columns has R × C vertices and 2RC − R − C edges. A wall just means the cell isn't a vertex we can enter. If diagonal steps are allowed, the list of directions grows to eight, and nothing else changes.

```python
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]          # up, down, left, right

def neighbors(grid, r, c):
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] != "#":
            yield nr, nc
```

This function is the adjacency list. A generator that yields the legal neighbors takes the place of the stored one, and we confirmed the edge count formula by counting neighbors on grids of 3 by 4, 10 by 10 and 7 by 2.

The two bounds checks are where the bugs live. In Python a negative index is legal and wraps to the other end of a row or column, so a missing `0 <=` doesn't fail at the edge of the grid, it quietly steps onto the opposite side or crashes later.

We dropped that check from the code above and searched 200 random grids: 184 raised an `IndexError`, 15 gave a wrong set of reachable cells, and one happened to be right.

## Finding a Way Through a Maze

Here is a maze of 6 rows and 8 columns. We want the fewest moves from S to E.

<figure class="diagram">
<div class="cells board"><div class="cell hl">S</div><div class="cell hl"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board"><div class="cell wall"></div><div class="cell wall"></div><div class="cell hl"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell"></div></div>
<div class="cells board"><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell"></div><div class="cell"></div><div class="cell wall"></div><div class="cell"></div><div class="cell"></div></div>
<div class="cells board"><div class="cell hl"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div></div>
<div class="cells board"><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div><div class="cell hl"></div></div>
<div class="cells board"><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell wall"></div><div class="cell"></div><div class="cell wall"></div><div class="cell hl">E</div></div>
<figcaption>A maze of 6 rows and 8 columns. Solid cells are walls, and the outlined cells are a shortest way from S to E, 16 moves long</figcaption>
</figure>

The search from [Breadth-First Search](/algorithms/breadth-first-search) needs only a start, a goal and the neighbors function. Cells are the keys of the `parent` dictionary, which also serves as the seen set.

```python
from collections import deque

def shortest_path(grid, start, goal):
    parent = {start: None}
    queue = deque([start])
    while queue:
        cell = queue.popleft()
        if cell == goal:
            path = []
            while cell is not None:
                path.append(cell)
                cell = parent[cell]
            return path[::-1]
        for nxt in neighbors(grid, *cell):
            if nxt not in parent:
                parent[nxt] = cell
                queue.append(nxt)
    return None                         # the goal can't be reached
```

It returns 17 cells, so 16 moves, and the path in the picture goes down the left side and along the bottom. The other way, over the top and down the right hand column, takes 18. Breadth-first search found the shorter one without ever comparing the two, because it reaches cells in order of their distance.

We tested the function on 200 random mazes, comparing its distances with those of Dijkstra's algorithm with every step costing 1, and they agreed on every cell. When the goal is walled in, the queue empties and the function returns `None`.

## Counting the Regions

A different question: how many separate islands does a grid of land and water have? Land cells joined by a side belong to the same island, so an island is a connected component of the grid graph. The plan is to scan the cells, and each time we find unseen land, count one island and fill in everything connected to it.

```python
def count_islands(grid):                          # grid rows are strings of "1" and "0"
    R, C = len(grid), len(grid[0])
    seen = [[False] * C for _ in range(R)]
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and not seen[r][c]:
                count += 1                        # a new island
                seen[r][c] = True
                stack = [(r, c)]
                while stack:
                    cr, cc = stack.pop()
                    for dr, dc in DIRS:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "1" and not seen[nr][nc]:
                            seen[nr][nc] = True
                            stack.append((nr, nc))
    return count
```

The inner loop is a depth-first search with a stack, and a queue would count the same islands. This is exactly what the paint bucket in an image editor does: filling a region means finding the cells connected to the one you clicked.

We checked the count on 200 random grids against a different method that labels each land cell with the smallest label among its neighbors until nothing changes, and the counts matched. On a grid of 400 by 400 cells, 160,000 in all, with half of the cells land, it found 10,932 islands in 42 ms.

Each cell is marked once and looked at from four sides, so the time is O(R × C) however many islands there are. Memory is the same size as the grid, for the `seen` table.

## Why Not Build the Graph?

We could build adjacency lists for the grid first and then run the search from the previous articles. It works, and it costs more than the search. On a grid of 250,000 cells with a quarter of them walls, building the adjacency dictionary took 1.89 s and 95 MB, and the maze search itself on the implicit grid took 0.79 s.

The explicit graph adds nothing, since the neighbors function can regenerate any list on demand. And the generator is where a different kind of grid is changed: the list of steps. A knight on a chessboard doesn't move to adjacent squares, but replacing four directions with the eight knight jumps gives the same search a new meaning.

We ran it on an 8 by 8 board, and a knight needs 6 moves to go from a corner to the opposite corner.

```python
KNIGHT = [(1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)]
```

## When the Vertices Are States

The idea reaches past grids. A vertex can be any description of a situation, and an edge any legal change from one to another. The graph exists only as the rule for generating neighbors.

Take the sliding puzzle with 8 numbered tiles on a 3 by 3 tray and one gap. A state is the arrangement, written as a string like `12345678_`, and a move slides a tile next to the gap into it.

```python
def moves(state):
    i = state.index("_")
    r, c = divmod(i, 3)
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            j = nr * 3 + nc
            s = list(state)
            s[i], s[j] = s[j], s[i]               # slide the tile into the gap
            yield "".join(s)
```

From the solved board, `moves` gives two neighbors, since the gap is in a corner. In the middle, it gives four. A breadth-first search from the solved board, with the strings as vertices, explores the whole graph.

It found 181,440 states, which is 9! / 2, half of the 362,880 ways to place nine items, because the other half can't be reached by sliding. The search took 0.30 s. The farthest boards are 31 moves away, and only 2 boards are that far. Any board that can be solved at all can be solved in 31 moves or fewer, and breadth-first search finds the shortest solution.

<figure class="chart">
<svg class="line" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Number of 8 puzzle boards at each distance from the solved board. It starts at 1, grows to a peak of 24,047 at 24 moves, then falls to 2 boards at 31 moves.">
<line class="grid" x1="0" y1="40" x2="100" y2="40"></line>
<line class="mark" x1="77.4" y1="0" x2="77.4" y2="40"></line>
<path class="area" d="M0.0 40.0 L3.2 40.0 L6.5 40.0 L9.7 40.0 L12.9 40.0 L16.1 40.0 L19.4 39.9 L22.6 39.9 L25.8 39.8 L29.0 39.8 L32.3 39.5 L35.5 39.4 L38.7 38.8 L41.9 38.4 L45.2 37.0 L48.4 36.0 L51.6 32.8 L54.8 31.0 L58.1 24.8 L61.3 22.6 L64.5 12.8 L67.7 12.6 L71.0 1.7 L74.2 7.6 L77.4 1.5 L80.6 15.1 L83.9 16.7 L87.1 30.0 L90.3 33.7 L93.5 38.8 L96.8 39.6 L100.0 40.0 L100 40 L0 40 Z"></path>
<path class="stroke" d="M0.0 40.0 L3.2 40.0 L6.5 40.0 L9.7 40.0 L12.9 40.0 L16.1 40.0 L19.4 39.9 L22.6 39.9 L25.8 39.8 L29.0 39.8 L32.3 39.5 L35.5 39.4 L38.7 38.8 L41.9 38.4 L45.2 37.0 L48.4 36.0 L51.6 32.8 L54.8 31.0 L58.1 24.8 L61.3 22.6 L64.5 12.8 L67.7 12.6 L71.0 1.7 L74.2 7.6 L77.4 1.5 L80.6 15.1 L83.9 16.7 L87.1 30.0 L90.3 33.7 L93.5 38.8 L96.8 39.6 L100.0 40.0"></path>
</svg>
<div class="axis"><span>0 moves</span><span>15</span><span>31 moves</span></div>
<figcaption>Boards at each distance from the solved 8 puzzle, up to 24,047 at 24 moves. The dotted line marks the peak</figcaption>
</figure>

The chart is the size of the ring in the BFS, the number of boards at each distance, and it shows the queue's biggest moment at 24 moves, with 24,047 boards waiting. The state graph is where the memory worry of BFS from [Breadth-First Search](/algorithms/breadth-first-search) becomes concrete.

## When the Graph Is Too Big

The 15 puzzle, with a 4 by 4 tray, uses the same code with a bigger board. It has 16! / 2 = 10,461,394,944,000 reachable states, about 10.5 trillion. At the 605,000 states a second our search managed on the 8 puzzle, exploring all of them would take about 200 days, and even one byte for each state in the seen set would need more than 10 terabytes.

Implicit graphs make a huge graph easy to describe, but they don't make it small. The search has to avoid looking at most of it, and that needs a guess about which direction is promising, the subject of [A* Search](/algorithms/a-star).

## Key Points

- A grid is a graph with R × C vertices and 2RC − R − C edges, and a function that yields the legal neighbors of a cell replaces the adjacency list
- Bounds checks matter: dropping the lower check let Python's negative indexes wrap, and 184 of 200 random grids crashed
- BFS finds a shortest path through a maze, 16 moves in ours, and a stack or queue fill counts connected regions in O(R × C), 10,932 islands on 160,000 cells in 42 ms
- Building the adjacency lists first cost more than searching, 1.89 s against 0.79 s on 250,000 cells, so we compute neighbors on demand, and a list of knight jumps changes the grid's meaning
- Any state space is an implicit graph, and BFS covered the 181,440 states of the 8 puzzle in 0.30 s with a farthest board 31 moves away, while the 15 puzzle's 10.5 trillion states are out of reach without a guide
