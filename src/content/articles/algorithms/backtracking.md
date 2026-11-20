> **Backtracking** builds a solution one decision at a time and checks the partial solution after each decision. When a partial solution can't be finished, it undoes the last decision and tries the next one. It is brute force that stops walking down a road as soon as the road is blocked.

The eight queens puzzle asks for eight queens on a chessboard with no two attacking each other. A queen attacks along its row, its column and both diagonals. The puzzle is old enough that Gauss wrote about it in a letter, and the method he described is the one we use here: place the queens one row at a time, trying the squares of a row from left to right, and keep a square only if the queens already placed don't attack it.

That method is backtracking, and the puzzle is a good place to learn it.

## Why Not Generate Every Board?

A board with one queen in each row can be described by eight column numbers, so there are 8⁸ = 16,777,216 of them. Insisting on different columns leaves the 8! = 40,320 permutations, and then each permutation still has to be checked for diagonals. That is [Brute Force](/algorithms/brute-force), and it wastes effort in an obvious way.

Suppose the first two queens are placed on squares that attack each other. Every board that begins with those two queens is wrong, and there are millions of them, but brute force builds them all and rejects each at the end. Backtracking notices at the second queen and abandons all of them at once.

## Place, Check, Undo

Build the board row by row. For row r, try each column in turn. If the square is attacked, skip it. Otherwise place a queen, solve the remaining rows, and take the queen back off so the next column can be tried. If no column in row r works, return, and the caller will try its next column. That return is the backtrack.

```python
def queens(n):
    cols, down, up = set(), set(), set()      # columns and diagonals already used
    q, solutions = [], []
    def place(r):
        if r == n:
            solutions.append(q[:])           # all rows filled
            return
        for c in range(n):
            if c in cols or r - c in down or r + c in up:
                continue                      # attacked, try the next column
            cols.add(c); down.add(r - c); up.add(r + c); q.append(c)
            place(r + 1)
            q.pop(); cols.remove(c); down.remove(r - c); up.remove(r + c)
    place(0)
    return solutions
```

Squares on the same diagonal share a value of r − c, and squares on the other diagonal share r + c, so three sets answer "is this square attacked?" in constant time. Checking against the earlier queens one by one would also work and costs up to r steps.

The invariant is that when `place(r)` starts, the first r queens are in different columns and on different diagonals, and the sets describe them exactly. The last line of the loop body restores the sets to what they were before the choice. Skipping part of that undo is a common bug, and the symptom is a search that finds fewer solutions than exist. With the line that removes the second diagonal left out, our version found 0, 1, 0, 1 and 0 solutions for boards 4 to 8, instead of 2, 10, 4, 40 and 92.

<figure class="diagram">
<p class="rowname">Dead End</p>
<div class="cells board">
<div class="cell hl">Q</div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell hl">Q</div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell bad">x</div><div class="cell bad">x</div><div class="cell bad">x</div><div class="cell bad">x</div>
</div>
<div class="cells board">
<div class="cell dim"></div><div class="cell dim"></div><div class="cell dim"></div><div class="cell dim"></div>
</div>
<p class="rowname">Solution</p>
<div class="cells board">
<div class="cell"></div><div class="cell hl">Q</div><div class="cell"></div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell hl">Q</div>
</div>
<div class="cells board">
<div class="cell hl">Q</div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
</div>
<div class="cells board">
<div class="cell"></div><div class="cell"></div><div class="cell hl">Q</div><div class="cell"></div>
</div>
<figcaption>On a 4 by 4 board, queens at the first column of row 1 and the third column of row 2 leave no safe square in row 3, so the search backs up. Starting from the second column instead leads to a complete board</figcaption>
</figure>

On the 4 by 4 board the search starts with a queen in column 1 of row 1. Row 2 has two attacked squares, so the queen goes in column 3, and then row 3 has no safe square at all. The search takes that queen off and tries column 4 in row 2, which leads to a dead end one row later. After exhausting row 2 it takes back the first queen and starts again with column 2, which reaches the board in the figure. In total it made 17 calls to `place` to find the 2 solutions of the 4 by 4 board.

## The Pattern

Most backtracking code has the same outline as [Generating Subsets, Permutations and Combinations](/algorithms/subsets-permutations): choose, explore, un-choose. What changes is the test between choosing and exploring.

1. Decide what one call decides, such as the queen of one row, and what it needs to know about earlier decisions, which here is three sets
2. List the options for this decision
3. Skip an option if it breaks a rule given the earlier decisions
4. Make the choice, recurse, and undo the choice
5. When all decisions are made, record the solution

The recursion tree is the tree of partial solutions, and backtracking is a depth-first search of it, as in [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals), with branches skipped whenever a rule fails. The call stack from [The Call Stack and Recursion Depth](/algorithms/call-stack) holds the decisions made so far, which is why undoing is cheap: returning from a call is the undo.

## How Much It Saves

We counted the calls to `place` and compared them with the number of permutations that brute force has to check. Both found the same number of solutions, which we confirmed by also counting solutions of the brute force for n up to 8.

| Board | Solutions | Backtracking Calls | Permutations |
| --- | --- | --- | --- |
| 4 | 2 | 17 | 24 |
| 8 | 92 | 2,057 | 40,320 |
| 10 | 724 | 35,539 | 3,628,800 |
| 12 | 14,200 | 856,189 | 479,001,600 |

For n = 10, brute force over permutations took 1.05 s and backtracking took 0.025 s, which is 42 times faster, and the gap grows with n. Backtracking is still exponential. The calls grow four to five times for each added row, while the number of permutations grows by a factor of n.

The calls are not spread evenly over the depths. For n = 8, the number of calls at depth 0 to 8 is 1, 8, 42, 140, 344, 568, 550, 312 and 92. Most of the work is in the middle rows, where a queen can usually be placed and the failure shows up a few rows later. Only 92 of the 2,057 calls complete a board.

## Finding One Answer

Often one solution is enough. Make the function return whether it succeeded, and stop as soon as one call says yes.

```python
def first(r):
    if r == n:
        return True
    for c in range(n):
        if safe(r, c):
            place_queen(r, c)
            if first(r + 1):
                return True                   # keep the queens where they are
            remove_queen(r, c)
    return False
```

The work needed to find one answer is much less predictable than the total. We counted calls for one solution: 114 for n = 8, 262 for n = 12, 10,053 for n = 16 and 199,636 for n = 20. Then n = 26 took 397,700 calls and n = 28 took 3 million, and n = 30 took 56 million calls, about a minute in Python. The order in which columns are tried decides how soon the search hits a good region, and a small change in n can change the luck.

## Other Problems With the Same Shape

| Problem | One Call Decides | A Rule That Prunes |
| --- | --- | --- |
| Sudoku | The digit in the next empty cell | The digit is already in its row, column or box |
| Word search in a grid | The next neighboring cell | The cell is used or the letter differs |
| Subset sum | Take or skip the next number | The running total passes the target |
| Maze path | Which direction to step | A wall or a cell already on the path |

In each, the question to ask is whether a bad choice shows up early. When the partial solution can be checked cheaply, backtracking saves a great deal. When a bad choice can't be noticed until the very end, backtracking behaves like brute force with extra bookkeeping. [Pruning the Search Space](/algorithms/pruning) covers how to notice sooner.

## Key Points

- Backtracking builds a solution one decision per call, checks the partial solution, and undoes the decision when it leads nowhere
- The code follows choose, explore and un-choose, and every piece of state changed by a choice must be restored afterward
- The recursion tree is a depth-first search over partial solutions, with failed branches cut off early
- For 8 queens it made 2,057 calls where brute force over permutations checks 40,320 boards, and for 10 queens it ran 42 times faster
- It remains exponential, and the time to find a single solution can swing widely with n, from 114 calls at n = 8 to 56 million at n = 30
