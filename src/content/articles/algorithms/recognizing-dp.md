> A problem is a candidate for **dynamic programming** when it asks for a best value, a count or a yes or no over many choices, when its answer can be built from answers to smaller versions of the same problem, and when those smaller versions repeat, with only a few different ones. Counting the calls of a plain recursion against the number of different calls tells you at once whether memoizing will help.

A new problem arrives, and the first job is to choose a tool. It might be brute force, backtracking, a greedy rule, a graph search, or dynamic programming. The wrong choice costs either a wrong answer or a program that never finishes.

There's no formula for choosing, but there are four questions that settle most cases, and one of them can be tested by counting.

## Four Questions

**1. What is being asked?** Dynamic programming answers questions of the shape "the best", "how many ways" or "is it possible". A problem that asks to list every arrangement can't be sped up by remembering, since the output itself is that long, which is the territory of [Backtracking](/algorithms/backtracking).

**2. Does the answer decompose?** The best answer for the whole problem has to be assembled from the best answers for smaller problems of the same kind. This is called **optimal substructure**. The fewest coins for 25 cents is one coin plus the fewest coins for what remains.

**3. Do the smaller problems repeat?** This is **overlapping subproblems**. If every smaller problem is different, there's nothing to remember.

**4. Are there few different smaller problems?** If the number of different ones is huge, the table is huge. The state has to be something small, like a position, an amount, or a pair of positions.

Question 3 is the one to test.

## Counting the Repeats

Take the plain recursion for a problem, and count two things: the total number of calls, and the number of different argument values among them. If the first is much bigger than the second, the recursion repeats itself, and a table pays off. We did this for several problems.

| Problem | Calls | Different Calls | Ratio |
| --- | --- | --- | --- |
| Climbing 20 steps | 21,891 | 21 | 1,042 |
| Fewest coins for 25 cents with 1, 3, 4 | 229,970 | 26 | 8,845 |
| Splitting a 16 letter string into known words | 23,249 | 17 | 1,368 |
| Longest common subsequence of two 9 letter strings | 3,433 | 82 | 42 |
| 0/1 knapsack, 10 items, capacity 40 | 1,107 | 240 | 4.6 |
| Merge sort on 1,024 items | 2,047 | 2,047 | 1.0 |
| Placing 7 queens | 552 | 552 | 1.0 |

The first five are dynamic programming problems, with ratios from 4.6 to 8,845, and the ratio grows quickly with the size. The coin recursion made almost a quarter of a million calls to answer 26 different questions.

The last two have a ratio of exactly 1. Merge sort splits an array into halves that never overlap, so each call is different. The queens search extends a partial placement, and each partial placement is different. Memoizing those would only add a dictionary that is never hit. They use divide and conquer, from [How Divide and Conquer Works](/algorithms/divide-and-conquer), and backtracking, from [Backtracking](/algorithms/backtracking), and not dynamic programming.

## When the Answer Doesn't Decompose

A problem that sounds like a path problem can still fail question 2. The shortest route between two buildings splits cleanly: every piece of a shortest route is itself a shortest route, which is why [Dijkstra’s Algorithm](/algorithms/dijkstra) works. The longest route that visits no building twice doesn't.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus map with the longest path that visits no building twice from the Dorm to the Hall highlighted: Dorm, Gym, Cafe, Lab, Library, Hall, 30 minutes in total.">
<line class="e dim" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e hl" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e dim" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e dim" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e hl" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e hl" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e dim" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n done" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t done" x="40" y="108">Dorm</text>
<rect class="n" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t " x="118" y="52">Quad</text>
<rect class="n done" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t done" x="222" y="38">Library</text>
<rect class="n done" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t done" x="318" y="78">Hall</text>
<rect class="n done" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t done" x="258" y="140">Lab</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="150">Cafe</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="188">Gym</text>
</svg>
<figcaption>The longest walk from the Dorm to the Hall that never repeats a building, 30 minutes. Its first part, Dorm to Gym to Cafe, takes 13, but the longest such walk to the Cafe takes 23</figcaption>
</figure>

On the campus map, the longest such route from the Dorm to the Hall goes Dorm, Gym, Cafe, Lab, Library, Hall, for 30 minutes. Its first part, Dorm, Gym, Cafe, takes 13. But the longest route from the Dorm to the Cafe that visits no building twice takes 23, going through the Quad, Library, Hall and Lab.

So the first part of the longest route is not the longest route to the Cafe. The reason is that the later part of the walk uses buildings the earlier part shouldn't use, so the pieces aren't independent.

We checked all four stopping points along the 30 minute route against the longest route to each. Not one of them was the longest route to that building: the best routes to the Gym, Cafe, Lab and Library are 28, 23, 29 and 29 minutes, while the route's pieces take 8, 13, 19 and 22.

The state would have to include which buildings are already used, and that is a state with a huge number of values, so the problem has no small table. It is one of the hard problems of [P and NP](/algorithms/p-and-np).

## When Greedy Looks Easy

A greedy rule is the first thought for many optimization problems, and it is right when [When Greedy Choices Work](/algorithms/greedy) can show it. When it can't, a quick test is to search for a counterexample with small numbers. Greedy failed for the coins 1, 3 and 4 at 6 cents, where it uses 3 coins and the best is 2.

In the greedy article, it failed on 89% of 2,000 random systems of 4 coins. If a counterexample turns up in a few minutes of trying, the problem likely wants dynamic programming.

## Reading the Constraints

The limits in a problem statement show the size of the table. A state with one number up to n and a transition that looks at all earlier ones is O(n²), so n up to a few thousand fits. A state that is a pair of positions in two sequences of length n each has n² states, again a few thousand.

A state with a value up to W, such as an amount of money or a capacity, has W states and works for W up to a few million, provided the value is a number and not a huge one. A state that is a subset of up to 20 items has 2²⁰ states. [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints) turns limits into complexity targets in the same way.

## Words That Point to Dynamic Programming

| The Problem Says | Likely Shape |
| --- | --- |
| Minimum cost, fewest steps | Minimize over the last choice |
| Maximum value within a limit | Include or skip, with the limit in the state |
| How many ways | Add up the ways for each last choice |
| Is it possible to reach exactly | True or false for each value |
| Longest or shortest subsequence | A prefix, or a pair of prefixes, in the state |
| Split into pieces, each valid | The position where the last piece starts |
| Best over all orders of combining | An interval of the sequence in the state |

None of these is a guarantee. Each is a reason to go through the four questions. The next articles take the common shapes one at a time, from [Linear DP on Sequences](/algorithms/linear-dp) onward.

## Key Points

- Dynamic programming fits a problem that asks for a best value, a count or a feasibility, whose answer decomposes into smaller problems of the same kind, which repeat, with few different ones
- Counting the calls of the plain recursion against the different calls tests the repeat: the coin recursion made 229,970 calls for 26 different ones, while merge sort and a queens search had a ratio of 1.0 and gain nothing
- Optimal substructure can fail: on the campus the longest walk with no repeated building to the Hall has a first part that is not the longest walk to its end, and the state would have to track every used building
- A greedy rule that survives no small counterexample search is a candidate, and one that fails quickly points to dynamic programming
- The constraints bound the number of states, a few thousand for a prefix pair, a few million for an amount, and about 20 items for a subset
