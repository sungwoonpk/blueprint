> A **matching** in a graph is a set of edges that share no vertex, and a **maximum matching** has as many edges as possible. In a bipartite graph, a matching can be improved whenever there is an **augmenting path**, one that alternates between unused and used edges and runs from an unmatched vertex on one side to an unmatched vertex on the other. Repeating that finds a maximum matching in O(V × E) time, and it is a special case of maximum flow.

Five students each want a lab for the term, and each lab takes one student. A student lists the labs they would accept. The question is how many students can be placed, and who goes where.

First come, first served is the obvious plan: take the students in order and give each the first lab on their list that is free. It is quick, and the picture below shows where it goes wrong.

## First Come, First Served

Students on the left, labs on the right, and a line for each lab a student would take.

<figure class="diagram graph">
<svg viewBox="0 0 360 272" role="img" aria-label="Five students on the left and five labs on the right, with a line for each lab a student would take. A first-come matching pairs Ana with Vision, Ben with Theory, Chi with Systems and Eli with Security. Dev, who only wants Vision, and the Robotics lab are left out.">
<line class="e hl" x1="60.0" y1="28.0" x2="300.0" y2="28.0"/>
<line class="e" x1="60.0" y1="28.0" x2="300.0" y2="82.0"/>
<line class="e" x1="60.0" y1="82.0" x2="300.0" y2="28.0"/>
<line class="e hl" x1="60.0" y1="82.0" x2="300.0" y2="136.0"/>
<line class="e hl" x1="60.0" y1="136.0" x2="300.0" y2="82.0"/>
<line class="e" x1="60.0" y1="136.0" x2="300.0" y2="190.0"/>
<line class="e" x1="60.0" y1="190.0" x2="300.0" y2="28.0"/>
<line class="e" x1="60.0" y1="244.0" x2="300.0" y2="136.0"/>
<line class="e hl" x1="60.0" y1="244.0" x2="300.0" y2="190.0"/>
<line class="e" x1="60.0" y1="244.0" x2="300.0" y2="244.0"/>
<rect class="n done" x="38" y="14" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="28">Ana</text>
<rect class="n done" x="38" y="68" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="82">Ben</text>
<rect class="n done" x="38" y="122" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="136">Chi</text>
<rect class="n bad" x="38" y="176" width="44" height="28" rx="14"/>
<text class="t bad" x="60" y="190">Dev</text>
<rect class="n done" x="38" y="230" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="244">Eli</text>
<rect class="n done" x="270" y="14" width="60" height="28" rx="14"/>
<text class="t done" x="300" y="28">Vision</text>
<rect class="n done" x="268" y="68" width="64" height="28" rx="14"/>
<text class="t done" x="300" y="82">Systems</text>
<rect class="n done" x="272" y="122" width="56" height="28" rx="14"/>
<text class="t done" x="300" y="136">Theory</text>
<rect class="n done" x="268" y="176" width="64" height="28" rx="14"/>
<text class="t done" x="300" y="190">Security</text>
<rect class="n bad" x="264" y="230" width="72" height="28" rx="14"/>
<text class="t bad" x="300" y="244">Robotics</text>
</svg>
<figcaption>Students and the labs they would take. First come, first served pairs four of them (bright lines). Dev only wants Vision, which Ana has, and Robotics, which only Eli lists, is empty</figcaption>
</figure>

Ana is first and takes Vision. Ben wants Vision or Theory, and Vision is gone, so he takes Theory. Chi lists Systems first and takes it. Dev only lists Vision, which is taken, so Dev gets nothing. Eli takes Security. Four students are placed, and the Robotics lab, which only Eli listed, sits empty.

Yet a full placement exists. No single choice was foolish, but together they blocked Dev. To see it, follow a path from Dev that alternates between a line not used and a line used. Dev's only line leads to Vision, which Ana holds. Ana could instead take Systems, which Chi holds. Chi could take Security, which Eli holds. Eli could take Robotics, which is free.

<figure class="diagram graph">
<svg viewBox="0 0 360 272" role="img" aria-label="The same graph with a perfect matching: Ana with Systems, Ben with Theory, Chi with Security, Dev with Vision and Eli with Robotics.">
<line class="e dim" x1="60.0" y1="28.0" x2="300.0" y2="28.0"/>
<line class="e hl" x1="60.0" y1="28.0" x2="300.0" y2="82.0"/>
<line class="e dim" x1="60.0" y1="82.0" x2="300.0" y2="28.0"/>
<line class="e hl" x1="60.0" y1="82.0" x2="300.0" y2="136.0"/>
<line class="e dim" x1="60.0" y1="136.0" x2="300.0" y2="82.0"/>
<line class="e hl" x1="60.0" y1="136.0" x2="300.0" y2="190.0"/>
<line class="e hl" x1="60.0" y1="190.0" x2="300.0" y2="28.0"/>
<line class="e dim" x1="60.0" y1="244.0" x2="300.0" y2="136.0"/>
<line class="e dim" x1="60.0" y1="244.0" x2="300.0" y2="190.0"/>
<line class="e hl" x1="60.0" y1="244.0" x2="300.0" y2="244.0"/>
<rect class="n done" x="38" y="14" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="28">Ana</text>
<rect class="n done" x="38" y="68" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="82">Ben</text>
<rect class="n done" x="38" y="122" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="136">Chi</text>
<rect class="n done" x="38" y="176" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="190">Dev</text>
<rect class="n done" x="38" y="230" width="44" height="28" rx="14"/>
<text class="t done" x="60" y="244">Eli</text>
<rect class="n done" x="270" y="14" width="60" height="28" rx="14"/>
<text class="t done" x="300" y="28">Vision</text>
<rect class="n done" x="268" y="68" width="64" height="28" rx="14"/>
<text class="t done" x="300" y="82">Systems</text>
<rect class="n done" x="272" y="122" width="56" height="28" rx="14"/>
<text class="t done" x="300" y="136">Theory</text>
<rect class="n done" x="268" y="176" width="64" height="28" rx="14"/>
<text class="t done" x="300" y="190">Security</text>
<rect class="n done" x="264" y="230" width="72" height="28" rx="14"/>
<text class="t done" x="300" y="244">Robotics</text>
</svg>
<figcaption>After following the path from Dev: Dev takes Vision, Ana moves to Systems, Chi to Security and Eli to Robotics. All five students have a lab</figcaption>
</figure>

Moving everyone along that path makes the new placement: Dev takes Vision, Ana Systems, Chi Security and Eli Robotics, with Ben unchanged. Four old pairs were replaced by five new, one more than before.

## Augmenting Paths

A **matching** pairs up vertices so that no vertex is in two pairs. A vertex is **matched** if it is in a pair, and **free** otherwise. An **alternating path** starts at a free vertex on the left and alternates between edges not in the matching and edges in it.

If it ends at a free vertex on the right, it is an **augmenting path**, since flipping it, using the unused edges and dropping the used ones, turns k matched pairs into k + 1.

The method is simply to keep flipping augmenting paths. A theorem of Berge says that a matching is maximum exactly when no augmenting path exists. So when the search for one comes up empty, we are done.

```python
def max_matching(left, adj):                   # adj maps a left vertex to its right neighbors
    match_r = {}                               # right vertex -> the left vertex holding it
    def try_augment(u, seen):
        for v in adj[u]:
            if v in seen:
                continue
            seen.add(v)
            if v not in match_r or try_augment(match_r[v], seen):
                match_r[v] = u                 # take v, sending its old holder elsewhere
                return True
        return False
    size = 0
    for u in left:
        if try_augment(u, set()):
            size += 1
    return size, match_r
```

For each left vertex u, `try_augment` looks for a lab. A free lab is simply taken. If the lab is held, it asks the holder to move on to another lab, and so on down the chain, which is a depth-first search for an augmenting path from u. If one is found, the labs along it change hands. A search costs O(E), and there is one for each left vertex, so O(V × E) overall.

On the five students it returns 5, with Dev in Vision, Ana in Systems, Ben in Theory, Chi in Security and Eli in Robotics.

We tested it on 300 random bipartite graphs with up to 7 vertices on each side, comparing the size with brute force over all matchings. The sizes agreed on all 300, and each returned set of pairs used each lab and student at most once and only listed edges.

## Why Not Just Greedy

How much does first come, first served lose? On random bipartite graphs, where each student lists 3 labs, we compared it with the true maximum.

| Students and Labs | Greedy | Maximum | Greedy Reaches |
| --- | --- | --- | --- |
| 1,000 | 824 | 924 | 89.2% |
| 10,000 | 8,250 | 9,383 | 87.9% |

It leaves about one placement in nine on the table. The small example shows why: a choice that blocks a later student can only be undone by moving people who are already placed, which an augmenting path does.

## When No Full Placement Exists

Change the lists so that Ana, Ben and Chi all want only Vision and Systems, while Dev wants Theory and Eli wants Theory or Security. Three students compete for two labs, and the best placement has 4 people.

That is the general obstacle, stated by Hall's marriage theorem. A complete matching of the left side exists exactly when every set of left vertices together lists at least as many labs as it has students. We checked this on 300 random bipartite graphs of up to 7 students: the algorithm placed every student exactly when no group of students had fewer labs than members, and 111 of the graphs had such a group.

The matching algorithm tells the same story in its own way, since a failed search for an augmenting path ends at a set of students whose labs are all taken by students in the set.

## The Flow Behind It

Matching is a flow in disguise, as in [Maximum Flow and Minimum Cut](/algorithms/maximum-flow). Add a source linked to every student, and a sink linked from every lab, and give every link capacity 1. A flow of value k picks k student and lab pairs that don't share a vertex, since a student can send only one unit and a lab can accept only one.

Augmenting paths in that network are exactly the alternating paths above, and the min cut is the Hall obstruction. On 300 random bipartite graphs, the maximum flow in the unit network equalled the size of the matching our code found every time.

## A Faster Way for Big Graphs

One search per student can add up. Hopcroft and Karp found a way to flip many shortest augmenting paths in each round: a breadth-first search labels the distance of every student from a free student, then a depth-first search takes a set of vertex-disjoint shortest augmenting paths all at once. It takes O(√V × E) time, since the number of rounds grows only as √V.

On random bipartite graphs with 5 labs listed per student, we compared a version of the one-search-per-student method that uses breadth-first search with Hopcroft-Karp.

| Students | Lines | One Search Each | Hopcroft-Karp | Rounds |
| --- | --- | --- | --- | --- |
| 1,000 | 4,990 | 0.01 s | 0.004 s | 4 |
| 4,000 | 19,988 | 0.04 s | 0.021 s | 5 |
| 100,000 | 499,988 | Not run | 0.85 s | 5 |

Both found matchings of the same size, 989 and 3,971 for the first two. Hopcroft-Karp needed 4 or 5 rounds each time, far under the √V bound, and finished a graph of 100,000 students and half a million lines in under a second. Random graphs are friendly, though. The √V rounds is a worst case guarantee, and adversarial inputs get nearer to it.

## Key Points

- A matching pairs vertices with no vertex in two pairs, and first come, first served can miss pairs, placing 4 of 5 students in our example and 88 to 89% of the maximum on random graphs
- An augmenting path alternates between unused and used edges from a free vertex on the left to a free one on the right, and flipping it adds one pair
- A matching is maximum exactly when no augmenting path exists, and searching one per left vertex takes O(V × E)
- A complete matching of the left side exists exactly when every group of students lists at least as many labs as members, which matched the algorithm on 300 random graphs
- Matching is a unit capacity maximum flow, and Hopcroft-Karp flips many shortest paths per round, taking 4 or 5 rounds on our graphs of up to 100,000 students
