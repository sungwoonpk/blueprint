# 7. Algorithms roadmap revised for its reader

**Decision:** The Algorithms roadmap now has 11 phases and 137 topics, written for a computer science student in the later years of a degree or an engineer early in a career. The math, strings and bits phase is split, a Hard Problems phase is added, a few topics move to where their prerequisites are, and a few are added, merged or dropped.

**Why:** The first version (decision 0006) was drafted before the reader was fixed. Measured against what a senior algorithms course covers and what coding interviews test, it had gaps (correctness proofs, the sorting lower bound, flows and matching, NP-completeness and coping with it), a phase that joined three unrelated subjects, and some topics placed before the ideas they need.

**How it was checked:** we compared the chapter order of several textbooks (Cormen, Leiserson, Rivest and Stein; Sedgewick and Wayne; Erickson; Kleinberg and Tardos; Dasgupta, Papadimitriou and Vazirani; Skiena; Laaksonen's handbook for competitive programmers), two university courses (MIT 6.006 and Stanford CS161), two curriculum documents (the ACM and IEEE CS2023 Algorithmic Foundations area and the IOI syllabus), and research on how students learn the hardest parts (dynamic programming and greedy algorithms). No source's structure was copied. Where they disagree, the order follows our own rule: each topic builds on what came before it.

**Main changes:**

- Moved: amortized analysis to just after dynamic arrays (its standard example); solving recurrences into divide and conquer, after merge sort has been seen; turning recursion into iteration next to stacks; tries into the new Strings phase; sorting before binary search; Fenwick trees before segment trees (they extend prefix sums most directly).
- Added: proving correctness with loop invariants, the lower bound for comparison sorting, how standard library sorts work, Huffman coding, skip lists, shortest paths in a DAG, minimum spanning trees as a topic of its own, maximum flow and minimum cut, bipartite matching, stable matching, fast exponentiation as its own topic, how integers are stored, suffix arrays, reconstructing a DP solution, recognizing a DP problem, and the six Hard Problems topics.
- Merged or dropped: linear search (it opens the binary search article), BFS and 0-1 BFS (BFS already covers unweighted shortest paths), the two matrix topics (one "Working with Matrices"), basic geometry and digit DP (they belong to competitive programming more than to this reader).

**Ordering choices worth recording:**

- Greedy before dynamic programming. Textbooks split on this. We keep greedy in Design Strategies because the graph phase needs it (Dijkstra, Prim, Kruskal), and because students tend to over-trust greedy choices, the greedy group teaches counterexamples and exchange proofs, not just examples.
- Dynamic programming late. It uses trees, DAGs, strings, bits and modular arithmetic, and it is the topic students find hardest: they struggle to recognize it, to build the recurrence and to implement it efficiently. The fundamentals group follows those three steps, starting from a brute force recursion and adding memoization before tables.
- B-Trees, Bloom filters and consistent hashing stay in System Design, so the two subjects don't teach the same thing twice.

**Costs:** More topics than before, and two more phases. No Algorithms articles existed, so no links broke, and slugs could change freely.

**Alternatives:** Keep 9 phases with a combined math, strings and bits phase (a grab bag, not one subject); put dynamic programming right after the other strategies (Bellman-Ford and Floyd-Warshall could then be taught as DP, but bitmask and counting DP would come before bits and math, and the DAG view of DP would come before graphs); leave out NP-completeness (it is part of a degree's core, and recognizing a hard problem saves engineers from searching for an algorithm that isn't known).
