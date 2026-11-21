> The **longest common subsequence** (LCS) of two sequences is the longest list of items that appears in both in the same order, with gaps allowed. The **edit distance** is the fewest single letter insertions, deletions and substitutions that turn one string into another. Both use a table with one cell for each pair of prefixes, filled from the corner in O(m × n) time.

A spell checker sees campus and wonders whether the user meant company. A file comparison tool sees two versions of a document and has to show what changed. Both need a number for how alike two strings are, and both are answered by a table indexed by a pair of positions.

Two kinds of likeness come up. One is how much the strings share in order, the longest common subsequence. The other is how much work it takes to change one into the other, the edit distance.

## Longest Common Subsequence

A **subsequence** keeps the order and may skip letters. cmp is a subsequence of campus, taking c, m and p, and also of company. Let lcs(i, j) be the length of the longest common subsequence of the first i letters of one string and the first j letters of the other.

Look at the last letters. If they are equal, they can be matched, and the rest is lcs(i − 1, j − 1) plus 1. If they differ, at least one of them is unused, so the answer is the better of dropping the last letter of the first string, lcs(i − 1, j), or of the second, lcs(i, j − 1).

```python
def lcs_table(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp
```

For campus and company the answer is 3, the subsequence cmp. Walking back from the bottom right corner, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions), gives the letters: a diagonal step on a match, and otherwise a step toward the larger neighbor.

We checked the length and the recovered string against a brute force over every subsequence of the first string, on 400 random pairs of strings of up to 6 letters from a, b and c. All matched.

## Edit Distance

The edit distance, also called the Levenshtein distance, counts the fewest operations from this list: insert a letter, delete a letter, or replace a letter with another. Let edit(i, j) be the distance between the first i letters of one string and the first j letters of the other. The last letters give three choices.

- Delete the last letter of the first string, which costs 1 plus edit(i − 1, j)
- Insert the last letter of the second string, which costs 1 plus edit(i, j − 1)
- Match or replace the two last letters, which costs edit(i − 1, j − 1) plus 0 if they are equal and 1 if not

The smallest of the three is edit(i, j). The edges are the cost of building from or down to the empty string: edit(i, 0) = i and edit(0, j) = j.

```python
def edit_table(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = min(dp[i - 1][j] + 1,                                # delete
                           dp[i][j - 1] + 1,                                # insert
                           dp[i - 1][j - 1] + (a[i - 1] != b[j - 1]))       # keep or replace
    return dp
```

<figure class="diagram">
<div class="cells board"><div class="cell dim"></div><div class="cell dim"></div><div class="cell dim">c</div><div class="cell dim">o</div><div class="cell dim">m</div><div class="cell dim">p</div><div class="cell dim">a</div><div class="cell dim">n</div><div class="cell dim">y</div></div>
<div class="cells board"><div class="cell dim"></div><div class="cell hl">0</div><div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div><div class="cell">7</div></div>
<div class="cells board"><div class="cell dim">c</div><div class="cell">1</div><div class="cell hl">0</div><div class="cell">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div><div class="cell">6</div></div>
<div class="cells board"><div class="cell dim">a</div><div class="cell">2</div><div class="cell">1</div><div class="cell hl">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div></div>
<div class="cells board"><div class="cell dim">m</div><div class="cell">3</div><div class="cell">2</div><div class="cell">2</div><div class="cell hl">1</div><div class="cell">2</div><div class="cell">3</div><div class="cell">4</div><div class="cell">5</div></div>
<div class="cells board"><div class="cell dim">p</div><div class="cell">4</div><div class="cell">3</div><div class="cell">3</div><div class="cell">2</div><div class="cell hl">1</div><div class="cell hl">2</div><div class="cell">3</div><div class="cell">4</div></div>
<div class="cells board"><div class="cell dim">u</div><div class="cell">5</div><div class="cell">4</div><div class="cell">4</div><div class="cell">3</div><div class="cell">2</div><div class="cell">2</div><div class="cell hl">3</div><div class="cell">4</div></div>
<div class="cells board"><div class="cell dim">s</div><div class="cell">6</div><div class="cell">5</div><div class="cell">5</div><div class="cell">4</div><div class="cell">3</div><div class="cell">3</div><div class="cell">3</div><div class="cell hl">4</div></div>
<figcaption>The edit distance table for campus (down) and company (across). The outlined cells are one cheapest path, from the top left to the bottom right, and the bottom right entry, 4, is the number of edits. Moving diagonally keeps or replaces a letter, moving right inserts one, and moving down deletes one</figcaption>
</figure>

For campus and company the distance is 4. The path in the picture is one cheapest sequence of edits: keep c, replace a with o, keep m, keep p, insert a, replace u with n, and replace s with y, which is four edits. Every cell on the path is the cost of getting from the start to that pair of prefixes, and the walk back from the corner reads off the operations.

We checked the distance against breadth-first search over all strings reachable by one edit, on 400 random pairs of up to 6 letters. The distances agreed. The edit script returned by walking back, applied to the first string, always produced the second, and used exactly as many edits as the table said.

## The Two Problems Are Related

If only insertions and deletions are allowed, with no replacing, the distance is the number of letters in both strings that are not part of a longest common subsequence: m + n − 2 × lcs. For campus and company, that is 6 + 7 − 6 = 7, against 4 when replacing is allowed, since a replacement does the work of a deletion and an insertion together.

We checked that this value is never below the edit distance on the same 400 pairs.

The longest increasing subsequence of a sequence of different values equals the longest common subsequence of the sequence and its sorted copy. We confirmed it on 500 random sequences. That connects this table to the faster method in [Longest Increasing Subsequence](/algorithms/lis).

## Cost

Each cell takes constant work, and there is a cell for each pair of prefixes, so the time is O(m × n). With strings of 500, 1,000 and 2,000 letters from the alphabet a, c, g and t, the full table took 0.03 s, 0.13 s and 0.55 s, quadrupling when the lengths double, with 250,000, 1,000,000 and 4,000,000 cells.

Each row needs only the row before it, so two rows are enough to get the distance, which took 0.02 s, 0.10 s and 0.42 s. It gives the same numbers, and loses the table to walk back through, as [Saving Space in DP](/algorithms/saving-space) explains.

## Suggesting Spellings

A spelling suggester needs every word within one or two edits of the typed word. Computing the distance to each of the 234,454 words of a dictionary works but is slow, about 0.35 s for a word of 7 letters when words of very different length are skipped.

Another way is to produce all the strings one edit away from the typed word, 26 letters in each of its positions and in the gaps, and keep those that are in the dictionary.

For recieve, campuss, algoritm, graf and databse, the two methods returned the same suggestions. For campuss it found campus, and for algoritm it found algorism and algorithm. The word list on our machine is an old one, so recieve found relieve and not receive.

Swapping two letters counts as 2 edits, since it takes a deletion and an insertion or two replacements, so receive is 2 edits away and a distance of 1 does not reach it.

## Key Points

- The LCS table has one cell for each pair of prefixes: a match on the last letters adds 1 to the diagonal cell, and otherwise the better of the cell above and the cell to the left
- The edit distance takes the smallest of deleting, inserting, and keeping or replacing the last letters, and for campus and company it is 4 edits with an LCS of 3
- Both were checked against brute force on 400 random pairs, and the table can be walked back to give the common letters or the edit script
- With only insertions and deletions the distance is m + n − 2 × lcs, and the LIS of distinct values equals the LCS of the sequence with its sorted copy
- The time is O(m × n), 0.55 s for two strings of 2,000 letters, and keeping two rows saves memory but loses the walk back
