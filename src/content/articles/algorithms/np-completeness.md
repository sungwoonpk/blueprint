> A problem is **NP-hard** if every problem in NP reduces to it, so a fast algorithm for it would make everything in NP fast. It is **NP-complete** if it is also in NP, which makes it one of the hardest problems in NP. A fast algorithm for any one NP-complete problem would give a fast algorithm for all of them, so P would equal NP.

The [Reductions](/algorithms/reductions) article turned a Hamiltonian cycle into a tour question, and said the tour question is hard because the Hamiltonian cycle is. But why is the Hamiltonian cycle hard? Because another problem reduces to it, and the chain goes back to a single problem that had to be shown hard in a different way. This article starts at that first problem and follows the chain.

## The Hardest Problems in NP

NP is a large collection, from easy problems like finding a path to the tour question. Is there a problem in NP that every other problem in NP reduces to? Yes, there are many, and they are the NP-complete problems.

| Name | Meaning | Campus Example |
| --- | --- | --- |
| In NP | A yes answer has a short proof that can be checked fast | Is there a path of at most 12 minutes from the Dorm to the Hall |
| NP-hard | Every problem in NP reduces to it | Find the shortest tour of the buildings |
| NP-complete | In NP, and NP-hard | Is there a tour of at most T minutes |

The first row is in NP and also in P, so it is easy. The second is a "find the best" problem, not a yes or no question, so it is not in NP, but a solver for it would solve the tour question. The third is both.

The NP-complete problems are the "hardest in NP", and there is a way to see why that matters: if one is solved fast, so is every problem in NP, as each reduces to it. That would show that [P and NP](/algorithms/p-and-np) are equal.

## The First One

A chain needs a first link, and a reduction can't make one, since it needs a known hard problem to start from. The first link is **satisfiability**, SAT: given a formula with letters that are true or false, joined by "and", "or" and "not", can the letters be set so the formula is true?

Stephen Cook proved in 1971 that SAT is NP-complete, and Leonid Levin reached the same result on his own, so the result is called the Cook-Levin theorem.

The idea of the proof is that the checking algorithm of any NP problem is a program that takes the instance and a certificate and answers yes or no. A program running for polynomially many steps can be written as a formula, with the unknown certificate as unknown letters.

The formula can be made true exactly when some certificate passes the check. So any NP problem reduces to SAT. We don't prove it here, because the proof is about machines, and what we need is the result.

SAT also is in NP: a certificate is a setting of the letters, and evaluating the formula for it is quick. For the rest of the chain we use a tidy special case, **3-SAT**, where the formula is a list of clauses joined by "and", each clause three letters joined by "or". A letter may be negated.

(a ∨ b ∨ c) ∧ (¬a ∨ ¬b ∨ d) ∧ (¬c ∨ ¬d ∨ b) ∧ (a ∨ ¬b ∨ ¬d)

Setting a true, b false and c false makes every clause true, whatever d is. 3-SAT is NP-complete too, and the SAT-to-3-SAT conversion is a reduction of the kind we have seen.

## Proving a New Problem NP-Complete

To show that a problem X is NP-complete, there are three steps.

1. Show X is in NP, by describing a certificate for yes answers and a fast check of it
2. Pick a problem already known to be NP-complete and reduce it to X, with a fast converter that keeps the answer in both directions
3. Conclude: everything in NP reduces to the known problem, which reduces to X, and reductions chain

Let us do the second step for the independent set from the carts of [Reductions](/algorithms/reductions), starting from 3-SAT. Given a formula with k clauses, make a graph with a vertex for every letter in every clause, so 3k vertices. Join two vertices when they are in the same clause, which makes each clause a triangle, or when one is a letter and the other its negation.

<figure class="diagram graph">
<svg viewBox="0 0 360 284" role="img" aria-label="The graph built from a formula with four clauses">
<line class="e" x1="54.0" y1="76.0" x2="126.0" y2="76.0"/>
<line class="e" x1="54.0" y1="76.0" x2="90.0" y2="36.0"/>
<line class="e dash" x1="54.0" y1="76.0" x2="234.0" y2="76.0"/>
<line class="e" x1="126.0" y1="76.0" x2="90.0" y2="36.0"/>
<line class="e dash" x1="126.0" y1="76.0" x2="306.0" y2="76.0"/>
<line class="e dash" x1="126.0" y1="76.0" x2="306.0" y2="208.0"/>
<line class="e dash" x1="90.0" y1="36.0" x2="54.0" y2="208.0"/>
<line class="e" x1="234.0" y1="76.0" x2="306.0" y2="76.0"/>
<line class="e" x1="234.0" y1="76.0" x2="270.0" y2="36.0"/>
<line class="e dash" x1="234.0" y1="76.0" x2="234.0" y2="208.0"/>
<line class="e" x1="306.0" y1="76.0" x2="270.0" y2="36.0"/>
<line class="e dash" x1="306.0" y1="76.0" x2="90.0" y2="248.0"/>
<line class="e dash" x1="270.0" y1="36.0" x2="126.0" y2="208.0"/>
<line class="e dash" x1="270.0" y1="36.0" x2="270.0" y2="248.0"/>
<line class="e" x1="54.0" y1="208.0" x2="126.0" y2="208.0"/>
<line class="e" x1="54.0" y1="208.0" x2="90.0" y2="248.0"/>
<line class="e" x1="126.0" y1="208.0" x2="90.0" y2="248.0"/>
<line class="e dash" x1="90.0" y1="248.0" x2="306.0" y2="208.0"/>
<line class="e" x1="234.0" y1="208.0" x2="306.0" y2="208.0"/>
<line class="e" x1="234.0" y1="208.0" x2="270.0" y2="248.0"/>
<line class="e" x1="306.0" y1="208.0" x2="270.0" y2="248.0"/>
<rect class="n hl" x="39" y="62" width="30" height="28" rx="14"/>
<text class="t hl" x="54" y="76">a</text>
<rect class="n" x="111" y="62" width="30" height="28" rx="14"/>
<text class="t " x="126" y="76">b</text>
<rect class="n" x="75" y="22" width="30" height="28" rx="14"/>
<text class="t " x="90" y="36">c</text>
<rect class="n" x="219" y="62" width="30" height="28" rx="14"/>
<text class="t " x="234" y="76">¬a</text>
<rect class="n hl" x="291" y="62" width="30" height="28" rx="14"/>
<text class="t hl" x="306" y="76">¬b</text>
<rect class="n" x="255" y="22" width="30" height="28" rx="14"/>
<text class="t " x="270" y="36">d</text>
<rect class="n hl" x="39" y="194" width="30" height="28" rx="14"/>
<text class="t hl" x="54" y="208">¬c</text>
<rect class="n" x="111" y="194" width="30" height="28" rx="14"/>
<text class="t " x="126" y="208">¬d</text>
<rect class="n" x="75" y="234" width="30" height="28" rx="14"/>
<text class="t " x="90" y="248">b</text>
<rect class="n hl" x="219" y="194" width="30" height="28" rx="14"/>
<text class="t hl" x="234" y="208">a</text>
<rect class="n" x="291" y="194" width="30" height="28" rx="14"/>
<text class="t " x="306" y="208">¬b</text>
<rect class="n" x="255" y="234" width="30" height="28" rx="14"/>
<text class="t " x="270" y="248">¬d</text>
</svg>
<figcaption>The graph built from the four clauses. Each clause is a triangle, and the dashed lines join a letter to its opposite. The outlined vertices, one from each triangle, are an independent set of size 4, and they read a true, b false, c false</figcaption>
</figure>

Now see what a set of k carts means. It can hold at most one vertex from each triangle, since triangle vertices are joined, so k carts means exactly one from each. The letters chosen are read as true. No two chosen vertices are a letter and its opposite, because those are joined, so the choices are consistent.

Every clause has a true letter, and the formula is satisfied. In the other direction, a satisfying setting gives one true letter in each clause, and picking one of them in each triangle gives an independent set of size k.

```python
def formula_to_graph(clauses):                      # each clause is three letters, a negation is a minus
    vertices = [(i, lit) for i, clause in enumerate(clauses) for lit in clause]
    edges = []
    for a in range(len(vertices)):
        for b in range(a + 1, len(vertices)):
            (ci, la), (cj, lb) = vertices[a], vertices[b]
            if ci == cj or la == -lb:               # same clause, or a letter against its opposite
                edges.append((a, b))
    return vertices, edges, len(clauses)            # satisfiable exactly when an independent set this big exists
```

For the formula above, the graph has 12 vertices and 21 edges, and we look for 4 carts. The search finds one that takes a from the first clause, ¬b from the second, ¬c from the third and a from the fourth, which reads a true, b false, c false, the setting we found by hand.

We tested the claim on 600 random formulas with 3 to 6 letters, many of them built to be unsatisfiable by including all eight clauses over three letters. The formula was satisfiable in 369 cases, and in each the graph had an independent set of size k, while in the other 231 it had none.

The converter compares every pair of vertices, so it is quadratic, and a formula of 100 clauses became a graph of 300 vertices and about 520 edges in 2 ms. Since independent set is in NP, with the set as certificate, it is NP-complete.

## A Family of Problems

Every step of the chain gives another NP-complete problem, and the figure shows the chain behind the problems met in this phase.

<figure class="diagram graph">
<svg viewBox="0 0 360 264" role="img" aria-label="A tree of reductions from Circuit SAT to the other NP-complete problems">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="62.0" y1="41.0" x2="62.0" y2="61.0" marker-end="url(#ah)"/>
<line class="e" x1="62.0" y1="93.0" x2="62.0" y2="113.0" marker-end="url(#ah)"/>
<line class="e" x1="62.0" y1="145.0" x2="62.0" y2="165.0" marker-end="url(#ah)"/>
<line class="e" x1="97.0" y1="130.0" x2="121.0" y2="130.0" marker-end="url(#ah)"/>
<line class="e" x1="214.0" y1="115.0" x2="263.0" y2="93.4" marker-end="url(#ah)"/>
<line class="e" x1="180.0" y1="145.0" x2="180.0" y2="165.0" marker-end="url(#ah)"/>
<line class="e" x1="158.6" y1="197.0" x2="124.3" y2="221.0" marker-end="url(#ah)"/>
<line class="e" x1="231.0" y1="182.0" x2="249.0" y2="182.0" marker-end="url(#ah)"/>
<line class="e" x1="163.0" y1="238.0" x2="245.0" y2="238.0" marker-end="url(#ah)"/>
<rect class="n hl" x="10" y="12" width="104" height="28" rx="14"/>
<text class="t hl" x="62" y="26">Circuit SAT</text>
<rect class="n" x="32" y="64" width="60" height="28" rx="14"/>
<text class="t " x="62" y="78">SAT</text>
<rect class="n" x="28" y="116" width="68" height="28" rx="14"/>
<text class="t " x="62" y="130">3-SAT</text>
<rect class="n" x="16" y="168" width="92" height="28" rx="14"/>
<text class="t " x="62" y="182">3-Coloring</text>
<rect class="n" x="124" y="116" width="112" height="28" rx="14"/>
<text class="t " x="180" y="130">Independent Set</text>
<rect class="n" x="266" y="64" width="64" height="28" rx="14"/>
<text class="t " x="298" y="78">Clique</text>
<rect class="n" x="130" y="168" width="100" height="28" rx="14"/>
<text class="t " x="180" y="182">Vertex Cover</text>
<rect class="n" x="38" y="224" width="124" height="28" rx="14"/>
<text class="t " x="100" y="238">Hamiltonian Cycle</text>
<rect class="n" x="252" y="168" width="92" height="28" rx="14"/>
<text class="t " x="298" y="182">Subset Sum</text>
<rect class="n" x="248" y="224" width="100" height="28" rx="14"/>
<text class="t " x="298" y="238">Tour Within T</text>
</svg>
<figcaption>Each arrow is a reduction, pointing from the problem already known to be hard to the one it proves hard. Circuit SAT, the outlined problem, is hard by the Cook-Levin theorem, and the others inherit it</figcaption>
</figure>

Karp, in 1972, used the results of Cook to show that twenty more natural problems were NP-complete, and by now thousands of problems are on the list. Each arrow in the figure is a reduction like the one we just wrote. The pattern repeats so often that hard problems turn up regularly in practice, usually in disguise.

| Task | Problem Behind It |
| --- | --- |
| Carts, with no two on neighboring buildings | Independent set |
| Cameras that watch every path | Vertex cover |
| The courier's loop over all stops | Tour, a Hamiltonian cycle |
| Exam slots with no student in two exams at once, using three slots | 3-coloring |
| Splitting a bill of items into two equal halves | Subset sum |

When a new problem resembles one of these, try reducing the known problem to it, as above. A success is a proof of hardness, and it saves a long hunt for a fast algorithm.

## What NP-Complete Does Not Mean

An NP-complete problem is not hopeless in every form, and four points keep the idea from being overused.

- **It is about the worst case over all inputs.** Small instances are solved all the time: a table solved the tour of 18 stops in 1.43 s in [Bitmask DP](/algorithms/bitmask-dp)
- **Special cases are easy.** The committee in [DP on Trees](/algorithms/tree-dp), where no one sits with their boss, is a largest independent set, solved in linear time because the graph is a tree. 2-SAT and 2-coloring are easy, while 3-SAT and 3-coloring are NP-complete
- **Some problems are hard only for huge numbers.** Subset sum and [Knapsack Problems](/algorithms/knapsack) have a table whose time grows with the size of the numbers, 4.52 s for 100 items and a limit of a million, which is fine when the numbers are small and a failure when they have hundreds of digits
- **It isn't proved.** The belief that no fast algorithm exists rests on the failure to find one, as the previous article said, so "NP-complete" is evidence of hardness, not a theorem about it

What to do with a problem that is NP-complete is the topic of the next three articles. We can still solve small cases exactly, take a solution that is provably close to the best, or settle for a good one without a promise.

## Key Points

- A problem is NP-hard when every problem in NP reduces to it, and NP-complete when it is also in NP, so one fast algorithm for any NP-complete problem would put every NP problem in P
- SAT was the first, by the Cook-Levin theorem of 1971, because the check of any NP problem can be written as a formula
- To prove a new problem NP-complete, show it is in NP and reduce a known NP-complete problem to it, keeping the answer in both directions
- Our reduction from 3-SAT to independent set, one triangle for each clause, matched a brute force on 600 random formulas, 369 satisfiable and 231 not
- NP-complete problems hide behind carts, cameras, loops and schedules, small and special cases are often easy, and the hardness is a worst case belief, not a proof
