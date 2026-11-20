> **Brute force** solves a problem by generating every candidate answer and checking each one. It is simple and easy to get right, and its cost is the number of candidates times the cost of checking one.

A courier has to visit eight stops and return to the depot, and wants the shortest loop. The simplest plan needs no cleverness: write down every order in which the stops can be visited, add up the distance of each, and keep the shortest. The answer is easy to trust, because no order was skipped.

That plan is brute force, and the rest of this phase is about doing better than it when the number of candidates gets out of hand.

## Generate and Test

Every brute force has two parts. A **generator** produces the candidates, and a **test** scores or checks one candidate. The loop keeps the best candidate seen so far.

```python
import itertools, math

def shortest_route(d):                       # d[i][j] is the distance from stop i to stop j
    n = len(d)
    best, best_route = math.inf, None
    for order in itertools.permutations(range(1, n)):   # stop 0 is the depot
        route = (0,) + order + (0,)
        cost = sum(d[route[i]][route[i + 1]] for i in range(n))
        if cost < best:
            best, best_route = cost, route
    return best, best_route
```

The depot is fixed at the start, so only the other stops are ordered. The correctness argument takes one line: the answer is the minimum over all candidates, and the loop looks at all of them. There is no invariant to prove beyond "best is the minimum of what has been seen".

This is the shape to remember. A problem becomes a brute force once you can answer two questions: what is a candidate, and how do I check one?

## Counting the Candidates

The cost is candidates times test, so counting candidates is the first thing to do. For the courier, the first stop after the depot has n − 1 choices, the next has n − 2, and so on, which gives (n − 1)! routes.

We timed the function above on random stops. It scored a route in about 0.42 microseconds on average, and the time stayed at that rate from 8 to 10 stops. The last three rows are our estimates at the same rate, not measurements.

| Stops | Routes | Time |
| --- | --- | --- |
| 8 | 5,040 | 2 ms |
| 10 | 362,880 | 0.15 s |
| 12 | about 40 million | about 17 s |
| 15 | about 87 billion | about 10 hours |
| 20 | about 1.2 × 10¹⁷ | about 1,600 years |

Going from 10 to 12 stops multiplies the work by 110, and going from 12 to 20 multiplies it by three billion. A faster computer or a faster language shifts the table by a factor of ten or a hundred, which moves the cliff by one stop or two.

The courier problem is the traveling salesman problem, and no known algorithm solves it in polynomial time. The honest options are better exhaustive search, which the next articles cover, or accepting a good route instead of the best one.

## Where Candidates Come From

The number of candidates depends on how the problem is built. A few shapes cover most of what you will meet.

| Shape of the Choice | Candidates | At n = 20 |
| --- | --- | --- |
| Pick a pair | n(n − 1) / 2 | 190 |
| Pick a subset | 2ⁿ | about 1 million |
| Pick k of n items | C(n, k) | 184,756 for k = 10 |
| Put n things in order | n! | about 2.4 × 10¹⁸ |

Counting like this is the reading of constraints from [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints), applied before writing any code. With n up to 20, subsets are comfortable and orderings are hopeless. With n up to 9, orderings are fine.

## When Brute Force Is the Right Answer

Brute force has a bad reputation, and some of it is deserved. It still earns its place in four situations.

- **The input is small**: a few thousand candidates cost nothing, and simple code has fewer places to hide a bug
- **It is the specification**: a brute force is the clearest statement of what the answer means, which is why we checked the fast solutions in this series against one on random inputs
- **It is a test oracle**: when you write a clever solution, a slow and obviously correct one makes the test for it, as in [Edge Cases and Testing](/algorithms/edge-cases)
- **It is the first step**: in an interview or a design review, state the brute force and its cost, and then improve on it, as [How to Approach a Problem](/algorithms/approaching-problems) suggests

The mistake is to stop there when the numbers say it won't finish. A solution whose cost is 10¹⁷ steps is a description of the problem, not a program.

## Fewer Candidates Before a Cleverer Algorithm

Often the first improvement is to notice candidates that never needed to be generated. We already fixed the depot as the start, which turned n! into (n − 1)!. Another saving comes from symmetry: when distances are the same in both directions, a route and its reverse have the same length, so only one of each pair needs to be scored. Keeping only the routes whose first stop has a smaller label than the last halves the work.

```python
for order in itertools.permutations(range(1, n)):
    if order[0] > order[-1]:                 # its reverse is also a candidate
        continue
    ...
```

We checked that this gives the same shortest length on 200 random instances of 8 stops, and it kept 2,520 of the 5,040 routes. Halving is welcome, but it doesn't change the growth, and the table above is only one stop further out.

Bigger savings need a different idea. Instead of producing complete routes and then scoring them, build a route one stop at a time. When the partial route is already too long, or can't be completed, drop it along with every route that would have started with it. That is [Backtracking](/algorithms/backtracking), and cutting off hopeless branches is [Pruning the Search Space](/algorithms/pruning). Both start from a brute force, so it pays to write the brute force first.

## Key Points

- Brute force generates every candidate and tests each, so its cost is the number of candidates times the cost of one test
- Count candidates first: pairs give n², subsets 2ⁿ, k-subsets C(n, k) and orderings n!
- Our route checker scored 0.42 microseconds per route, which is 0.15 seconds for 10 stops and an estimated 1,600 years for 20
- Use brute force for small inputs, as a specification, and as the oracle that tests a faster solution
- Reduce the candidates before changing the algorithm, by fixing a start or removing mirror images, and then build candidates incrementally
