> **P** is the set of yes or no problems that some algorithm solves in polynomial time, a number of steps like n² or n³ in the size of the input. **NP** is the set of yes or no problems whose yes answers come with a proof that can be checked in polynomial time. Every problem in P is in NP, and whether the two sets are equal, the **P versus NP** question, is the best known open problem in computer science.

A courier has to visit the seven campus buildings from the Dorm and come back. [Bitmask DP](/algorithms/bitmask-dp) found the shortest tour, 33 minutes. Now imagine a friend hands you a tour and says "this takes at most 33 minutes". How hard is it to see whether the friend is right, compared with finding such a tour in the first place?

The two jobs have very different costs, and the gap between them is what P and NP are about.

## A Question With a Yes or No Answer

The theory starts from **decision problems**, which have a yes or no answer. The tour problem is an optimization: find the shortest tour. Its decision form asks: is there a tour that takes at most T minutes? For the campus, the answer is yes when T is 33 and no when T is 32.

Turning a problem into a yes or no question loses little. Later in this article, we will see that an algorithm for the decision form can be used to find the tour itself.

## Checking Is Easy

Suppose the friend's answer comes as a proposed tour, which is called a **certificate** (a piece of evidence for a yes answer). To check it, we make sure that each building appears once, that the tour ends where it started, and that the walking times add up to at most T.

```python
def check_tour(walk, tour, limit):
    n = len(walk)
    if tour[0] != tour[-1] or sorted(tour[:-1]) != list(range(n)):
        return False                                   # not a loop through every building once
    return sum(walk[tour[k]][tour[k + 1]] for k in range(n)) <= limit
```

This takes about n steps, plus the sort. We timed it on random points in a square.

| Stops | Finding the Best Tour | Checking One Tour | Finding ÷ Checking |
| --- | --- | --- | --- |
| 10 | 0.003 s | 1.2 µs | 2,100 |
| 12 | 0.013 s | 1.1 µs | 12,000 |
| 14 | 0.055 s | 1.0 µs | 57,000 |
| 16 | 0.257 s | 1.0 µs | 250,000 |

For finding, we used the fastest method we have, the table of [Bitmask DP](/algorithms/bitmask-dp), not brute force. Even so, its time multiplies by about 4 for each 2 extra stops, while checking barely moves. A tour through a million random points checked in 0.11 s.

## The Classes P and NP

With a certificate in hand, we can define both classes. A decision problem is in **NP** if every yes instance has a certificate whose length is polynomial in the input and that a polynomial-time algorithm can check. Stephen Cook's official description of the problem for the Clay Mathematics Institute phrases it as a checking relation: the instance is a yes exactly when some short certificate passes the check.

The name comes from the way the class was first defined, with machines that could guess at each step, "nondeterministic polynomial time". NP does not mean "not polynomial", and many NP problems, such as shortest paths and matching, are easy.

Two facts follow from the definitions.

- Every problem in P is in NP, because the checker can ignore the certificate and solve the problem itself
- Checking is a different job from finding: a certificate has to be produced by someone, and for the tour, nobody knows a fast way to produce it

An example from number theory, which Cook uses, shows both sides. The question "is c a composite number?" is in NP, because a divisor of c is a certificate that a computer checks with one division. Finding that divisor is the hard part, and it is the factoring problem that many cryptographic schemes lean on.

Whether compositeness can be decided without a divisor was a long open question until Agrawal, Kayal and Saxena showed, in 2002, that it is in P, and finding a divisor remains believed hard.

<figure class="diagram graph">
<svg viewBox="0 0 360 236" role="img" aria-label="The class P drawn inside the class NP, with problems on each side">
<rect class="n" x="6" y="6" width="348" height="224" rx="22"/>
<text class="t" x="180" y="26">NP: a yes answer can be checked fast</text>
<rect class="n done" x="22" y="48" width="144" height="168" rx="16"/>
<text class="t done" x="94" y="68">P: solved fast</text>
<text class="s" x="94" y="98">Shortest path</text>
<text class="s" x="94" y="122">Euler walk test</text>
<text class="s" x="94" y="146">2-coloring</text>
<text class="s" x="94" y="170">2-SAT</text>
<text class="s" x="94" y="194">Minimum spanning tree</text>
<rect class="n hl" x="194" y="48" width="144" height="168" rx="16"/>
<text class="t hl" x="266" y="68">No fast method known</text>
<text class="s" x="266" y="98">Tour within T</text>
<text class="s" x="266" y="122">Hamiltonian cycle</text>
<text class="s" x="266" y="146">3-coloring</text>
<text class="s" x="266" y="170">3-SAT</text>
<text class="s" x="266" y="194">Subset sum</text>
</svg>
<figcaption>Two kinds of problems inside NP. Nobody has proved whether the right box really sits outside P, and that open question is P versus NP</figcaption>
</figure>

## Problems on Both Sides

Problems that look alike often land on opposite sides, and the figure's two boxes are full of such pairs.

| Easy Question (in P) | Similar Question With No Fast Method Known |
| --- | --- |
| Shortest path between two buildings | Longest path that visits no building twice |
| Walk that uses every path once, an Euler circuit | Walk that visits every building once, a Hamiltonian cycle |
| Can the vertices be split into two sides | Can the vertices be colored with three colors so neighbors differ |
| Does a 2-clause formula have a satisfying assignment | The same for 3-clause formulas, 3-SAT |

The longest path is the problem that resisted a table in [Recognizing a Dynamic Programming Problem](/algorithms/recognizing-dp), and the two-sides test is the check from [Bipartite Graphs](/algorithms/bipartite). The Euler walk of [Eulerian Paths and Circuits](/algorithms/eulerian-paths) we measured against a Hamiltonian cycle. On random graphs with three edges per vertex, the degree test took 3 to 7 µs at every size from 10 to 22 vertices, leaving out the connectivity check, which is linear.

Our best Hamiltonian cycle search, a bitmask table, went from 0.001 s at 10 vertices to 1.2 s at 22.

## Exponential Against Polynomial

The reason to draw the line at polynomial time is how differently the two kinds of growth behave. Suppose a computer does a billion steps a second.

| n | n³ Steps | 2ⁿ Steps | Time for 2ⁿ |
| --- | --- | --- | --- |
| 10 | 1,000 | 1,024 | 1 µs |
| 30 | 27,000 | 1.07 × 10⁹ | 1 s |
| 50 | 125,000 | 1.1 × 10¹⁵ | 13 days |
| 100 | 1,000,000 | 1.3 × 10³⁰ | 40 trillion years |

Trying every subset of n numbers for a target sum is a 2ⁿ method, and we measured it: 22 numbers took 8.6 s, and each extra number doubles that. A tour of 100 buildings has about 10¹⁵⁶ orders to try. Checking the answer for either problem is a few lines and a fraction of a millisecond.

Polynomial time is only a rough boundary. An algorithm that takes n¹⁰⁰ steps is polynomial, and useless. Cook defends the line for natural problems, whose polynomial algorithms tend to have small exponents, and he names a few rare exceptions with enormous constants.

## Finding Is No Harder Than Deciding

Why study only yes or no questions? Because an algorithm for the decision form can be turned into one for the real problem. For the tour, three steps are enough.

1. Binary search on T for the smallest limit whose answer is yes, which is the length of the shortest tour
2. For each path in turn, make it very long and ask again with the same limit. If the answer is still yes, some best tour avoids that path, so leave it long. If it turns to no, the path is needed, so restore it
3. The paths left at their original length form a shortest tour

We built this with our table as the yes or no oracle, on 200 random instances of 4 to 7 stops with whole-minute walks. The tour came out valid and as short as the true optimum every time, using 19 calls on average and 29 at most.

On the campus it took 27 calls and returned the tour Dorm, Quad, Library, Lab, Hall, Cafe, Gym, which also takes 33 minutes: the walk from the Hall to the Cafe goes through the Lab, so it ties with the one from [Bitmask DP](/algorithms/bitmask-dp). The number of calls grows with the number of paths, so the search version costs a polynomial factor more than the decision version, not an exponential one.

## The Open Question

Does every problem with quickly checkable answers also have a quickly computable answer, P = NP? The Clay Mathematics Institute listed it among its seven Millennium Prize Problems in 2000, with a prize of one million dollars for each.

Most researchers believe P is not equal to NP, and Cook gives the main reason in his description of the problem: a thousand or so NP-complete problems, among them 3-SAT, subset sum and the Hamiltonian cycle, have resisted efforts by many people for decades, and a fast method for any one of them would give a fast method for all of them, as the next articles show.

It is not a proof, since no one has shown that a fast method can't exist, and the question remains open.

The practical stakes are large. If P were equal to NP, finding a certificate would be as easy as checking it, and Cook points out that this would break the encryption schemes built on factoring. For now, the useful working belief is that the hard problems in the right box of the figure have no fast, exact method for every input.

[Reductions](/algorithms/reductions) and [NP-Completeness](/algorithms/np-completeness) show how to recognize them, and then [Exact Algorithms for Hard Problems](/algorithms/exact-algorithms), [Approximation Algorithms](/algorithms/approximation) and [Heuristics and Local Search](/algorithms/local-search) show what to do instead.

## Key Points

- P is the set of yes or no problems solved in polynomial time, and NP is the set whose yes answers can be checked in polynomial time with a certificate
- Checking a tour took about a microsecond at 10 to 16 stops while finding the best one grew from 0.003 s to 0.257 s, and a million-stop tour checked in 0.11 s
- Every problem in P is in NP, and NP means nondeterministic polynomial time, not "not polynomial"
- Similar problems land on both sides: the Euler test took 3 to 7 µs where our Hamiltonian cycle search took up to 1.2 s at 22 vertices
- A yes or no algorithm gives the real answer too: our tour finder used at most 29 calls on 200 random instances and matched the optimum each time
- Whether P equals NP is open, most researchers believe it does not, and the belief rests on decades of failed searches for fast methods
