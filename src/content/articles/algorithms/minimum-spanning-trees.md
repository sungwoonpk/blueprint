> A **spanning tree** of a connected graph is a set of V − 1 edges that connects every vertex and has no cycle. A **minimum spanning tree** (MST) is a spanning tree of the smallest total weight. Two facts decide which edges belong to it: the lightest edge across any split of the vertices is in, and the heaviest edge of any cycle is out.

The IT office is laying fiber between campus buildings along the existing walking paths. Every building has to be on the network, and the cost of each stretch is known. Laying cable on every path costs 41 units. Laying on fewer paths costs less, as long as nobody is cut off, and the cheapest way to do that is a minimum spanning tree.

Which paths do we dig? There are many choices, and no search through them is needed.

## What a Spanning Tree Is

Connecting 7 buildings takes at least 6 paths, since each new building needs one path to join the network. With exactly 6 and everybody connected, there can be no loop, because a loop would waste a path. That is a spanning tree: connected, no cycle, V − 1 edges, and any two of these facts imply the third.

The campus has 9 paths, and a network uses 6 of them. We enumerated all 84 ways to choose 6 of the 9 paths. Only 41 of them connect all the buildings, and their total costs run from 19 to 34. Exactly one costs 19. That is the MST, and the aim is to find it without trying them all.

## The Cut Rule

Split the buildings into two groups. The network needs at least one path across the split, or the groups can't talk. Of all the paths across, the cheapest one has to be in the cheapest network.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus split into the Dorm, Quad, Cafe and Gym on one side and the Library, Lab and Hall on the other. Two paths cross the split, Quad to Library at 4 and Cafe to Lab at 6, and the cheaper one is highlighted.">
<line class="e dim" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e dim" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e dim" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e dim" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e dash" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e dim" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dim" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e dim" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n done" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t done" x="40" y="108">Dorm</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="52">Quad</text>
<rect class="n" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t " x="222" y="38">Library</text>
<rect class="n" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t " x="318" y="78">Hall</text>
<rect class="n" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t " x="258" y="140">Lab</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="150">Cafe</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="188">Gym</text>
</svg>
<figcaption>A split of the campus into two groups. Of the two edges that cross it, the cheaper, Quad to Library at 4, must be in the minimum spanning tree</figcaption>
</figure>

The Dorm, Quad, Cafe and Gym on the left connect to the rest by two paths, Quad to Library at 4 and Cafe to Lab at 6. The first one belongs in the MST.

The reason is a swap. Suppose a tree doesn't contain the cheapest crossing path e. It must cross the split somewhere, using a different path e′ that costs more. Adding e to the tree creates a loop that passes through e′. Remove e′ and what remains is still a spanning tree, and it's cheaper by w(e′) − w(e). So a tree without e can't be the cheapest.

We tested the rule on 300 random connected graphs with distinct weights, drawing 2,693 random splits in all. The lightest crossing edge was in the MST every time, and the MST's total weight matched the brute force minimum over all spanning trees for each graph small enough to enumerate.

## The Cycle Rule

The cut rule says what to take. The other rule says what to leave out. On any loop, the heaviest path isn't needed: the rest of the loop already connects its two ends, at a lower cost.

On the campus, the loop Dorm, Quad, Cafe, Gym costs 3, 2, 5 and 8, and the 8 is the one to drop. The loop Library, Lab, Hall costs 3, 2 and 8, so the other 8 goes. The loop Quad, Library, Lab, Cafe is 4, 3, 6 and 2, and the 6 goes. With those three removed, the 6 edges left are a tree.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The campus with the six edges of the minimum spanning tree highlighted: Quad to Cafe 2, Lab to Hall 2, Dorm to Quad 3, Library to Lab 3, Quad to Library 4 and Cafe to Gym 5, a total of 19.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e dim" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e hl" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e dim" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dim" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e hl" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n done" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t done" x="40" y="108">Dorm</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="52">Quad</text>
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
<figcaption>The cheapest set of paths that keeps every building connected, 19 in total. The three edges left out, 6, 8 and 8, are each the heaviest edge on a loop</figcaption>
</figure>

In all our random tests, each edge outside the MST was heavier than every edge on the tree path between its ends, which is the cycle rule from the other side.

When some weights are equal, there may be several cheapest trees, with the same total. The rules still hold in the form "some MST contains it", as long as the algorithm breaks ties the same way each time.

## One Idea, Several Algorithms

Both rules suggest the same plan. Keep a forest of edges that are known to be in the MST, starting with no edges, so every building is its own tree. Repeatedly add an edge that the cut rule says is safe, until one tree remains. The algorithms differ in how they choose the safe edge.

| Algorithm | Safe Edge Chosen |
| --- | --- |
| [Kruskal’s Algorithm](/algorithms/kruskal) | The cheapest edge anywhere that doesn't close a loop |
| [Prim’s Algorithm](/algorithms/prim) | The cheapest edge leaving the one tree that is growing |
| Borůvka’s algorithm | For every tree at once, the cheapest edge leaving it |

Borůvka's is the oldest, designed for an electrical network, and the simplest to state. Each round, every tree picks its cheapest outgoing edge, and all of those edges are added together. Each round at least halves the number of trees, because every tree is joined to at least one other, so there are at most log₂ V rounds.

On the campus it took 2 rounds. In round 1 the Dorm picks the Quad at 3, the Quad picks the Cafe at 2, the Library picks the Lab at 3, the Hall and the Lab pick each other at 2, and the Gym picks the Cafe at 5. That leaves two trees, and in round 2 the cheapest crossing path is the Quad to Library at 4.

On random graphs with 5 edges for each vertex, plus a path to keep them connected, we measured the rounds.

| Vertices | Edges | Rounds | log₂ V |
| --- | --- | --- | --- |
| 1,000 | 5,999 | 4 | 10.0 |
| 10,000 | 59,999 | 6 | 13.3 |
| 100,000 | 599,999 | 7 | 16.6 |

The bound of log₂ V rounds isn't tight on these graphs. The rounds ran at 40% to 45% of it, since several trees can join into one in a single round. On 300 small graphs with deliberately repeated weights, its total matched Kruskal's every time. The code resolves ties by edge number, so every tree compares the same edges the same way.

## Where MSTs Show Up

The fiber story is the direct use: any network of roads, pipes, wires or links that has to connect everything at the least cost. An MST also appears inside other methods, such as some approximations for hard routing problems, which [Approximation Algorithms](/algorithms/approximation) takes up.

One caution: an MST isn't a shortest path tree. The cheapest network that connects every building can give some pairs a long way round. On the campus, the MST connects the Gym to the Dorm through the Cafe and the Quad, 5 + 2 + 3 = 10, while the direct path is 8.

## Key Points

- A spanning tree has V − 1 edges and connects all vertices without a cycle, and the campus had 41 of them among 84 choices of 6 paths, with only one at the minimum cost of 19
- The cut rule: the lightest edge across any split is in the MST, because a tree without it can swap it in for a heavier crossing edge
- The cycle rule: the heaviest edge on any loop can be left out, and all 3 edges outside the campus MST were each the heaviest in a loop
- Every algorithm adds safe edges to a forest, and they differ in the choice: Kruskal's cheapest overall, Prim's from one growing tree, Borůvka's for all trees at once
- Borůvka's takes at most log₂ V rounds, and on our random graphs it took 4 to 7 rounds for 1,000 to 100,000 vertices
