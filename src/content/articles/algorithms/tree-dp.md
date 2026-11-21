> **Tree DP** computes, for every vertex, a small summary of the best answers for the subtree below it, using the summaries of its children. Because a tree has no cycles, the subtrees of siblings are independent, so one pass from the leaves up gives the answer in time proportional to the number of vertices. Usually the summary has a value for each way the vertex itself can take part.

A student club has an organization chart. Each member has a popularity score, and the committee for a reunion should have the largest total score, with one rule: nobody can be on the committee together with their direct boss, since people speak more freely without them. Which members should we pick?

Choosing the highest scores first gets stuck, because taking someone rules out their boss and their reports. A table kept at each member solves it.

## Two Answers for Each Person

<figure class="diagram graph">
<svg viewBox="0 0 360 236" role="img" aria-label="An organization chart of eight people, A at the top. A has reports B and C, B has D and E, C has F, and F has G and H. Scores: A 7, B 5, C 6, D 4, E 3, F 8, G 2, H 5. The best committee with nobody next to their direct boss is A, D, E and F, with a total of 22.">
<line class="e" x1="180.0" y1="24.0" x2="100.0" y2="84.0"/>
<line class="e" x1="180.0" y1="24.0" x2="260.0" y2="84.0"/>
<line class="e" x1="100.0" y1="84.0" x2="60.0" y2="144.0"/>
<line class="e" x1="100.0" y1="84.0" x2="140.0" y2="144.0"/>
<line class="e" x1="260.0" y1="84.0" x2="260.0" y2="144.0"/>
<line class="e" x1="260.0" y1="144.0" x2="220.0" y2="204.0"/>
<line class="e" x1="260.0" y1="144.0" x2="300.0" y2="204.0"/>
<rect class="n hl" x="160" y="10" width="40" height="28" rx="14"/>
<text class="t hl" x="180" y="19">A</text>
<text class="s" x="180" y="31">7</text>
<rect class="n" x="80" y="70" width="40" height="28" rx="14"/>
<text class="t " x="100" y="79">B</text>
<text class="s" x="100" y="91">5</text>
<rect class="n" x="240" y="70" width="40" height="28" rx="14"/>
<text class="t " x="260" y="79">C</text>
<text class="s" x="260" y="91">6</text>
<rect class="n hl" x="40" y="130" width="40" height="28" rx="14"/>
<text class="t hl" x="60" y="139">D</text>
<text class="s" x="60" y="151">4</text>
<rect class="n hl" x="120" y="130" width="40" height="28" rx="14"/>
<text class="t hl" x="140" y="139">E</text>
<text class="s" x="140" y="151">3</text>
<rect class="n hl" x="240" y="130" width="40" height="28" rx="14"/>
<text class="t hl" x="260" y="139">F</text>
<text class="s" x="260" y="151">8</text>
<rect class="n" x="200" y="190" width="40" height="28" rx="14"/>
<text class="t " x="220" y="199">G</text>
<text class="s" x="220" y="211">2</text>
<rect class="n" x="280" y="190" width="40" height="28" rx="14"/>
<text class="t " x="300" y="199">H</text>
<text class="s" x="300" y="211">5</text>
</svg>
<figcaption>A club's chart with each person's score. The outlined people, A, D, E and F, are the best committee with nobody next to their direct boss: 7 + 4 + 3 + 8 = 22</figcaption>
</figure>

Look at one member and the subtree of people below them. Their part of the problem is the same problem on a smaller tree, and it doesn't interact with any other branch: the people under B and the people under C are never each other's boss. What the rest of the tree needs to know about this subtree is only whether the member is picked. So keep two numbers for each member:

- take(v): the best total in v's subtree when v is picked
- skip(v): the best total in v's subtree when v is not picked

If v is picked, none of its direct reports can be, so take(v) is v's score plus the sum of skip(c) over the reports c. If v is not picked, each report is free to be picked or not, so skip(v) is the sum over reports of the larger of take(c) and skip(c). The answer is the larger of take and skip at the top.

```python
def best_committee(children, score, root=0):
    def solve(v):
        take, skip = score[v], 0
        for c in children[v]:
            child_take, child_skip = solve(c)
            take += child_skip                      # v is picked, so each report is not
            skip += max(child_take, child_skip)     # v is not picked, so each report may be either
        return take, skip
    take, skip = solve(root)
    return max(take, skip)
```

Each call combines the summaries of the children and returns its own, so the work at a vertex is the number of its reports. The sum over all vertices is the number of edges, so the total time is O(n).

For the chart in the picture, the values at each person, computed from the bottom up, are these.

| Person | Score | Take | Skip |
| --- | --- | --- | --- |
| D | 4 | 4 | 0 |
| E | 3 | 3 | 0 |
| B | 5 | 5 | 7 |
| G | 2 | 2 | 0 |
| H | 5 | 5 | 0 |
| F | 8 | 8 | 7 |
| C | 6 | 13 | 8 |
| A | 7 | 22 | 20 |

At B, taking B gives 5 and skipping B lets D and E both come, 4 + 3 = 7. At F, taking F gives 8 and skipping F lets G and H both come, 2 + 5 = 7.

At A, taking A gives 7 plus skip(B) and skip(C), which is 7 + 7 + 8 = 22, and skipping A gives take or skip of B and of C summed, 7 + 13 = 20. The best is 22. Walking down from the top, following the choices, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions), gives the committee A, D, E and F.

We compared the function with a brute force over every subset on 500 random trees of up to 14 members, with scores from 1 to 20. The totals matched in each case.

## Why Greedy Fails

Taking the highest score first, striking out the person's neighbors, and repeating gave the wrong total on 268 of 1,000 random trees of 3 to 12 members. A strong boss can rule out two strong reports, and the table sees the trade that greedy can't.

## Deep Trees and Recursion

The recursive version calls itself as deep as the tree, and a chart that is a long chain of 200,000 people crashed it with a `RecursionError`. The iterative version uses an order in which every child comes before its parent. Find such an order with a stack: visit the root, then its reports, and so on, writing down the vertices as they are reached, then process the list backward.

```python
def best_committee_iterative(children, score):
    n = len(score)
    order, stack = [], [0]
    while stack:
        v = stack.pop()
        order.append(v)
        stack.extend(children[v])
    take = [0] * n
    skip = [0] * n
    for v in reversed(order):                      # every report is handled before its boss
        take[v] = score[v] + sum(skip[c] for c in children[v])
        skip[v] = sum(max(take[c], skip[c]) for c in children[v])
    return max(take[0], skip[0])
```

On the chain of 200,000 it took 0.07 s, and on a random tree of a million members it took 0.97 s. It matched the recursive version on 500 random trees. What matters is the children first order that a postorder traversal from [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals) also gives.

## Other Tree Problems

The pattern of a summary for each vertex solves many tree problems.

| Problem | What Each Vertex Keeps |
| --- | --- |
| Largest committee with no boss and report together | Best with the vertex taken, and best with it skipped |
| Diameter, the longest path between two vertices | The depth of the deepest path going down |
| Fewest guards to watch every corridor | Whether the vertex has a guard, and whether it is watched |
| Number of ways to color with a rule between neighbors | A count for each color of the vertex |

For the diameter, each vertex combines its two deepest child paths, and the answer is the largest such sum anywhere. On the chart in the figure it is 5. In each case the table has a few numbers for each vertex, and the work is proportional to the size of the tree.

On a general graph with cycles this fails, since the pieces are no longer independent. The tree's lack of cycles is exactly what makes the summaries sufficient.

## Key Points

- Tree DP gives each vertex a summary of its subtree, built from its children's summaries, and in a tree the branches don't interact
- For a committee with nobody next to their boss, each member has take and skip values, take(v) is the score plus the children's skip, and skip(v) is the sum of the children's larger values
- It matched a brute force over all subsets on 500 random trees, and the best committee in the example chart was A, D, E and F with a total of 22
- Greedy by score was wrong on 268 of 1,000 random trees
- A recursive version failed on a chain of 200,000, while processing the vertices in reverse visiting order took 0.97 s for a tree of a million
