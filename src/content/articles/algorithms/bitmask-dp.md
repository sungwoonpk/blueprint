> A **bitmask DP** stores a set of used items as an integer inside the DP state, so that the table can be indexed by "which of up to about 20 things have been done". The classic case is the traveling salesperson problem: the cheapest tour is found by remembering, for each set of visited stops and each last stop, the cheapest way to get there. It takes O(n² × 2ⁿ) time, against n! for trying every order.

A courier starts at the Dorm and has to visit all seven campus buildings and return, with the walking times of the campus map. What is the shortest tour?

The courier problem appeared in [Brute Force](/algorithms/brute-force) and [Pruning the Search Space](/algorithms/pruning), where trying every order took hours at 15 stops. Dynamic programming gets to 18 stops in seconds, and the saving comes from the fact that the order in which the first few stops were visited doesn't matter for the rest of the tour.

## What the Future Needs

Suppose the courier has visited the Dorm, Quad and Cafe, and is standing at the Cafe. To plan the rest, what matters? Which buildings are still to visit, and where the courier is. The order of the first three stops, and the route taken between them, is history and has no effect on what comes next.

Only the cost so far matters, and the cheapest way to have reached this situation is the one to keep.

So the state is a pair: the **set** of visited stops, and the **last** stop. We store cost(set, last), the cheapest cost of a path that starts at the Dorm, visits exactly the stops in the set, and ends at last.

There are 2ⁿ sets of n stops, and a set can be written as an n bit number with a 1 for each visited stop, from [Subsets as Bitmasks](/algorithms/bitmask-subsets).

## The Transition

From the state (set, last), the courier can step to any stop not yet in the set. Moving to next gives the state (set plus next, next) with the cost of the walk added.

cost(set plus next, next) = the smallest, over last in the set, of cost(set, last) + the walk from last to next

The start is cost({Dorm}, Dorm) = 0. At the end, from the full set, the courier returns to the Dorm from whichever stop it is at, and the best total is the answer.

```python
def tour(walk):                                     # walk[a][b] is the cost of going from a to b
    n = len(walk)
    INF = float("inf")
    cost = [[INF] * n for _ in range(1 << n)]
    came_from = [[-1] * n for _ in range(1 << n)]
    cost[1][0] = 0                                  # only stop 0, the start, is visited
    for visited in range(1, 1 << n):
        if not visited & 1:
            continue                                # every tour includes the start
        for last in range(n):
            here = cost[visited][last]
            if here == INF or not visited >> last & 1:
                continue
            for nxt in range(n):
                if visited >> nxt & 1:
                    continue
                grown = visited | (1 << nxt)
                c = here + walk[last][nxt]
                if c < cost[grown][nxt]:
                    cost[grown][nxt] = c
                    came_from[grown][nxt] = last
    full = (1 << n) - 1
    best, last = min((cost[full][s] + walk[s][0], s) for s in range(1, n))
    route, visited = [], full
    while last != -1:                               # walk back through the choices
        route.append(last)
        previous = came_from[visited][last]
        visited ^= 1 << last
        last = previous
    return best, route[::-1] + [0]
```

Take the values on the campus. The cheapest way to visit the Dorm, Quad and Cafe and end at the Cafe is 5 minutes, Dorm to Quad to Cafe. To end at the Quad instead it is 7, going Dorm to Cafe to Quad. Adding the Gym and ending there from the first set costs 5 more, so cost for the Dorm, Quad, Cafe and Gym ending at the Gym is 10.

<figure class="diagram graph">
<svg viewBox="0 0 360 212" role="img" aria-label="The shortest tour that starts at the Dorm, visits every building and returns, 33 minutes: Dorm, Gym, Cafe, Lab, Hall, Library, Quad, and back to the Dorm. The walk from the Hall to the Library passes through the Lab.">
<line class="e hl" x1="40.0" y1="108.0" x2="118.0" y2="52.0"/>
<text class="w" x="79.0" y="80.0">3</text>
<line class="e hl" x1="40.0" y1="108.0" x2="66.0" y2="188.0"/>
<text class="w" x="53.0" y="148.0">8</text>
<line class="e hl" x1="118.0" y1="52.0" x2="222.0" y2="38.0"/>
<text class="w" x="170.0" y="45.0">4</text>
<line class="e dim" x1="118.0" y1="52.0" x2="140.0" y2="150.0"/>
<text class="w" x="129.0" y="101.0">2</text>
<line class="e hl" x1="140.0" y1="150.0" x2="66.0" y2="188.0"/>
<text class="w" x="103.0" y="169.0">5</text>
<line class="e hl" x1="140.0" y1="150.0" x2="258.0" y2="140.0"/>
<text class="w" x="199.0" y="145.0">6</text>
<line class="e hl" x1="222.0" y1="38.0" x2="258.0" y2="140.0"/>
<text class="w" x="240.0" y="89.0">3</text>
<line class="e dim" x1="222.0" y1="38.0" x2="318.0" y2="78.0"/>
<text class="w" x="270.0" y="58.0">8</text>
<line class="e hl" x1="258.0" y1="140.0" x2="318.0" y2="78.0"/>
<text class="w" x="288.0" y="109.0">2</text>
<rect class="n hl" x="18" y="94" width="44" height="28" rx="14"/>
<text class="t hl" x="40" y="103">Dorm</text>
<text class="s" x="40" y="115">start</text>
<rect class="n done" x="96" y="38" width="44" height="28" rx="14"/>
<text class="t done" x="118" y="47">Quad</text>
<text class="s" x="118" y="59">6</text>
<rect class="n done" x="194" y="24" width="56" height="28" rx="14"/>
<text class="t done" x="222" y="33">Library</text>
<text class="s" x="222" y="45">5</text>
<rect class="n done" x="296" y="64" width="44" height="28" rx="14"/>
<text class="t done" x="318" y="73">Hall</text>
<text class="s" x="318" y="85">4</text>
<rect class="n done" x="238" y="126" width="40" height="28" rx="14"/>
<text class="t done" x="258" y="135">Lab</text>
<text class="s" x="258" y="147">3</text>
<rect class="n done" x="118" y="136" width="44" height="28" rx="14"/>
<text class="t done" x="140" y="145">Cafe</text>
<text class="s" x="140" y="157">2</text>
<rect class="n done" x="46" y="174" width="40" height="28" rx="14"/>
<text class="t done" x="66" y="183">Gym</text>
<text class="s" x="66" y="195">1</text>
</svg>
<figcaption>The cheapest tour of all seven buildings, 33 minutes. The small labels give the order of the visits, and the walk from the Hall to the Library goes through the Lab, so that edge pair is walked twice</figcaption>
</figure>

For the full campus the answer is 33 minutes. The tour goes Dorm, Gym, Cafe, Lab, Hall, Library, Quad, and back to the Dorm: 8 + 5 + 6 + 2 + 5 + 4 + 3. The 5 from the Hall to the Library is the walk through the Lab, which is shorter than the direct path of 8.

The walk-back array gives the tour itself, as in [Reconstructing the Solution](/algorithms/reconstructing-solutions). Trying all 720 orders of the six other buildings gave the same 33.

## Checking the Table

We tested the function against a brute force over every order of the stops, on 60 random sets of 2 to 8 points in the plane, with distances as straight lines. The tour cost matched each time, and the route returned visited every point once and added up to the cost.

Then we raced them, on random points.

| Stops | Orders to Try | Brute Force | Bitmask DP |
| --- | --- | --- | --- |
| 9 | 40,320 | 0.016 s | 0.001 s |
| 10 | 362,880 | 0.155 s | 0.002 s |
| 11 | 3,628,800 | 1.63 s | 0.004 s |

The brute force grew by about 10 times for each extra stop, and the table by 2 or 3.

For larger sizes the brute force isn't practical, and we only ran the table.

| Stops | Orders to Try | Bitmask DP | Peak Memory |
| --- | --- | --- | --- |
| 12 | 39,916,800 | 0.01 s | 2 MB |
| 14 | 6,227,020,800 | 0.05 s | 7 MB |
| 16 | 1,307,674,368,000 | 0.27 s | 31 MB |
| 18 | 355,687,428,096,000 | 1.43 s | 136 MB |

At the rate of our brute force, about 0.45 microseconds an order, 16 stops would take about a week and 18 stops about five years, by our estimate, and the table did 18 in under two seconds.

## The Limit

The table has 2ⁿ sets with n last stops each, so its size doubles with every stop, and so does the time, with a factor of n² as well. Memory was the first wall: 136 MB at 18 stops, so about 550 MB at 20 and 2 GB at 22 with this Python layout.

That is why bitmask DP is for sets of about 20 items at most, a fact that [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints) uses to recognize the problem: "n is at most 20" invites a subset in the state.

## Another Use: Assigning People to Jobs

Assign n students to n labs, one student to each lab, to minimize the total cost, where cost(i, j) is how much student i dislikes lab j. The mask says which labs are taken. Students are assigned in order, so the number of 1s in the mask tells which student is next.

```python
def cheapest_assignment(cost):
    n = len(cost)
    INF = float("inf")
    best = [INF] * (1 << n)
    best[0] = 0                                     # no lab taken, no student placed
    for taken in range(1 << n):
        if best[taken] == INF:
            continue
        student = taken.bit_count()                 # students 0 to student - 1 are placed
        if student == n:
            continue
        for lab in range(n):
            if not taken >> lab & 1:
                grown = taken | (1 << lab)
                best[grown] = min(best[grown], best[taken] + cost[student][lab])
    return best[(1 << n) - 1]
```

It matched a brute force over every assignment on 300 random matrices of up to 7 by 7. For 18 students it took 0.28 s with 262,144 masks, where the 18! assignments number 6.4 × 10¹⁵. This problem has faster algorithms for large n, but the table is the quick one to write and needs no new idea.

## Key Points

- A bitmask DP puts a set of used items in the state as an integer, which fits when there are about 20 items or fewer
- For the courier tour, the state is the set of visited stops and the last one, because the order of earlier stops doesn't matter for the rest, and the table takes O(n² × 2ⁿ)
- The cheapest tour of the campus is 33 minutes, Dorm, Gym, Cafe, Lab, Hall, Library, Quad and back, matching a check of all 720 orders
- The table did 18 stops in 1.43 s where trying every order would take about five years, and at 18 stops it used 136 MB, so memory is the first limit
- The same idea assigns n students to n labs in O(n × 2ⁿ), 0.28 s for 18, and it matched brute force on 300 random matrices
