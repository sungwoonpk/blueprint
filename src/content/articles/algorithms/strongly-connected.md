> A **strongly connected component** (SCC) of a directed graph is a maximal group of vertices in which every vertex can reach every other by following arrows. The components can always be put in an order with no arrow going backward, and two depth-first passes, the second on the reversed graph's finishing order, find them all in O(V + E) time.

A team's backend has nine services, and each call from one service to another is an arrow. Some services only call downward, which makes them easy to start and stop in order. Others call each other in rings, and a ring can't be started first or last. To plan a safe startup order, the team has to find the rings.

Connectivity in a directed graph is subtler than in an undirected one, since reaching a service doesn't mean it can reach you back.

## Rings of Dependence

Here are the services, with an arrow from each caller to the service it calls.

<figure class="diagram graph">
<svg viewBox="0 0 360 252" role="img" aria-label="Nine services with an arrow from each service to a service it calls. Auth and Users call each other. Orders calls Billing, Billing calls Inventory, and Inventory calls Orders. Gateway calls Auth, Orders and Search. Orders calls Users, Search calls Inventory, Billing calls Email, and Email calls Logs.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head " d="M0 0L10 5L0 10z"/></marker><marker id="ah-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -hl" d="M0 0L10 5L0 10z"/></marker><marker id="ah-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -bad" d="M0 0L10 5L0 10z"/></marker><marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head -done" d="M0 0L10 5L0 10z"/></marker></defs>
<line class="e" x1="150.9" y1="37.0" x2="79.0" y2="74.1" marker-end="url(#ah)"/>
<line class="e" x1="178.2" y1="37.0" x2="174.1" y2="71.0" marker-end="url(#ah)"/>
<line class="e" x1="210.0" y1="37.0" x2="281.0" y2="72.5" marker-end="url(#ah)"/>
<path class="e hl" d="M57.8 103.0Q66.0 124.0 58.6 143.0" marker-end="url(#ah-hl)"/>
<path class="e hl" d="M46.2 145.0Q38.0 124.0 45.4 105.0" marker-end="url(#ah-hl)"/>
<line class="e bad" x1="163.2" y1="103.0" x2="139.9" y2="143.0" marker-end="url(#ah-bad)"/>
<line class="e bad" x1="159.0" y1="160.0" x2="219.0" y2="160.0" marker-end="url(#ah-bad)"/>
<line class="e bad" x1="238.5" y1="145.0" x2="191.8" y2="105.0" marker-end="url(#ah-bad)"/>
<line class="e" x1="147.0" y1="103.0" x2="80.3" y2="143.0" marker-end="url(#ah)"/>
<line class="e" x1="300.3" y1="103.0" x2="269.2" y2="143.0" marker-end="url(#ah)"/>
<line class="e" x1="130.0" y1="175.0" x2="130.0" y2="209.0" marker-end="url(#ah)"/>
<line class="e" x1="155.0" y1="226.0" x2="231.0" y2="226.0" marker-end="url(#ah)"/>
<rect class="n" x="146" y="8" width="68" height="28" rx="14"/>
<text class="t " x="180" y="22">Gateway</text>
<rect class="n hl" x="28" y="74" width="48" height="28" rx="14"/>
<text class="t hl" x="52" y="88">Auth</text>
<rect class="n hl" x="26" y="146" width="52" height="28" rx="14"/>
<text class="t hl" x="52" y="160">Users</text>
<rect class="n bad" x="144" y="74" width="56" height="28" rx="14"/>
<text class="t bad" x="172" y="88">Orders</text>
<rect class="n" x="284" y="74" width="56" height="28" rx="14"/>
<text class="t " x="312" y="88">Search</text>
<rect class="n bad" x="102" y="146" width="56" height="28" rx="14"/>
<text class="t bad" x="130" y="160">Billing</text>
<rect class="n bad" x="222" y="146" width="68" height="28" rx="14"/>
<text class="t bad" x="256" y="160">Inventory</text>
<rect class="n" x="106" y="212" width="48" height="28" rx="14"/>
<text class="t " x="130" y="226">Email</text>
<rect class="n" x="234" y="212" width="44" height="28" rx="14"/>
<text class="t " x="256" y="226">Logs</text>
</svg>
<figcaption>A call graph of nine services. The services in a red loop (Orders, Billing, Inventory) and the pair in a blue loop (Auth, Users) depend on each other, so each loop is one strongly connected component</figcaption>
</figure>

Auth calls Users, and Users calls Auth. The two are tied together: from either, you can get to the other. Orders calls Billing, Billing calls Inventory, and Inventory calls Orders, a ring of three. Gateway calls into these but nothing calls Gateway, so there's no way back to it.

Say two vertices are **strongly connected** when each can reach the other. That is an equivalence relation, like connection in an undirected graph, so it splits the vertices into groups, the strongly connected components. Here there are six: {Auth, Users}, {Orders, Billing, Inventory}, and four single services, Gateway, Search, Email and Logs.

A graph is **strongly connected** if it is one component. At the other extreme, a graph with no cycle has a component for every vertex, which is why finding components is a step beyond finding cycles.

## The Components Form a DAG

Squeeze each component into one point. The arrows between components never form a cycle: if component A had a path to B and B back to A, every vertex of A and B could reach every other, and they would be one component. So the **condensation**, as the squeezed graph is called, is a DAG.

On the services, it has six points and seven arrows, among them Gateway to both rings and the Orders ring to Email. A DAG has a topological order, from [Topological Sort](/algorithms/topological-sort), so the rings can be ordered such that every call between rings goes in one direction: start the callee rings first, within a ring start them together, and the order is safe.

## Finding Them in Two Passes

The simple method uses the definition. For a vertex v, the set that v can reach, found by a search, and the set that can reach v, found by a search on the reversed graph, overlap in exactly the component of v. Doing that for each component costs a pair of searches each, which adds up to O(V × E) in the worst case.

A depth-first search holds the key to doing better. Run a search of the reversed graph over all vertices, and note the order in which vertices finish. The vertex that finishes last belongs to a component of the original graph that has no arrow leaving it for another component, a dead end for the callers.

Search the original graph starting from that vertex, and the search can't escape, since nothing leads out: every vertex it finds is in that one component. Label them, and repeat from the next vertex in the finishing order that is not yet labeled, which is a dead end in what remains.

The names attached are Kosaraju and Sharir, who each found it.

```python
def reverse(g):
    r = {u: [] for u in g}
    for u in g:
        for v in g[u]:
            r[v].append(u)
    return r

def strong_components(g):                     # g maps a vertex to the vertices it points to
    r = reverse(g)
    seen, finish = set(), []
    for s in g:                               # pass 1: finishing order, on the reversed graph
        if s in seen:
            continue
        seen.add(s)
        stack = [(s, iter(r[s]))]
        while stack:
            u, neighbors = stack[-1]
            for v in neighbors:
                if v not in seen:
                    seen.add(v)
                    stack.append((v, iter(r[v])))
                    break
            else:
                finish.append(u)
                stack.pop()
    comp, count = {}, 0
    for s in reversed(finish):                # pass 2: last finished first, on the original graph
        if s in comp:
            continue
        comp[s] = count
        stack = [s]
        while stack:
            u = stack.pop()
            for v in g[u]:
                if v not in comp:
                    comp[v] = count
                    stack.append(v)
        count += 1
    return comp, count
```

Both passes touch each vertex and each edge once, so the time is O(V + E), and the order of the work comes from the finishing times that [Depth-First Search](/algorithms/depth-first-search) introduced.

On the services it returns 6 components, with Logs as number 0, then Email, then {Auth, Users}, then {Orders, Billing, Inventory}, then Search, then Gateway as number 5. The numbers come out sinks first: every one of the seven arrows between components goes from a higher number to a lower one.

## Checking It

We compared the function with the definition on 300 random directed graphs of up to 30 vertices. For every pair of vertices, the function put them in the same component exactly when each reached the other. For each graph the arrows between components all went from a higher component number to a lower one, so the condensation had no cycle.

The cost matters at size. On random graphs with 3 edges for each vertex, we compared the two-pass method with the definition-based one that runs a pair of searches for each component.

| Vertices | Edges | Two Passes | A Pair of Searches for Each Component |
| --- | --- | --- | --- |
| 1,000 | 3,000 | 0.6 ms | 16 ms |
| 2,000 | 6,000 | 1.3 ms | 64 ms |
| 4,000 | 12,000 | 2.5 ms | 269 ms |
| 8,000 | 24,000 | 5.3 ms | 1,113 ms |

Doubling the graph doubled the time of the two passes and multiplied the other by 4, as O(V + E) against O(V × E) predicts.

## How Big Is the Biggest Ring?

A random directed graph has a turn like the one in the undirected case, from [Connected Components and Cycles](/algorithms/components-cycles). We generated graphs with 200,000 vertices and a chosen average number of outgoing arrows, c, and measured the largest strongly connected component.

| Out-Arrows for Each Vertex | Largest Component | Share of All Vertices |
| --- | --- | --- |
| 0.8 | 13 | 0.0% |
| 1.0 | 304 | 0.2% |
| 1.5 | 68,328 | 34.2% |
| 2.0 | 126,695 | 63.3% |
| 3.0 | 176,846 | 88.4% |

Below an average of 1, nearly all of the components were single vertices. Above it, one giant component appeared, and its share matched S², where S is the number that solves S = 1 − e<sup>−cS</sup> from the undirected case: 0.340, 0.635 and 0.885 against our 0.342, 0.633 and 0.884.

The square makes sense: a vertex is in the giant component when it can reach the large core and the large core can reach it, and each of those holds with probability about S.

## What It Is Used For

Once a graph is squeezed into its condensation, a problem on a graph with cycles becomes a problem on a DAG. A tool that studies a program's call graph can report each ring of mutually recursive functions as one unit and then order the units. Whenever a system has mutual dependencies, the question of which parts are really one unit is an SCC computation.

A method by Tarjan finds the components in a single depth-first pass, by tracking for each vertex the earliest vertex it can reach, an idea closely related to the one in [Bridges and Articulation Points](/algorithms/bridges).

## Key Points

- Two vertices are strongly connected when each reaches the other, and the groups of such vertices are the strongly connected components, 6 among our 9 services
- Squeezing each component to a point gives a DAG, so the components can always be ordered with every arrow going the same way
- The Kosaraju-Sharir method runs a search of the reversed graph to get finishing times, then searches the original graph from the last finished vertex, each search staying inside one component, in O(V + E)
- It matched the definition on 300 random directed graphs, and on 8,000 vertices it took 5.3 ms against 1,113 ms for a pair of searches for each component
- In random directed graphs a giant component appeared once the average out-degree passed 1, and its share was S² for the S of the undirected case
