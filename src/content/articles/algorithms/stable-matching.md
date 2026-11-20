> A matching between two groups is **stable** if no pair, one from each side, would both rather be with each other than with the partners they were given. The **Gale-Shapley algorithm** finds one: one side proposes in order of preference, the other side holds the best offer so far and drops it only for a better one. It always ends, in at most n² proposals, with a stable matching that is the best possible for the proposing side.

The last article placed students in labs so that as many as possible got a place, and it didn't care who wanted what. Real placements are different. Students rank the labs, labs rank the students, and a placement that ignores both rankings will be undone by the people in it.

Suppose a matching puts Ben in Theory, a lab he ranks last, while the Vision lab, which ranks Ben first, has Ana. Ben would rather be in Vision, and Vision would rather have Ben. If they both just agree, the plan falls apart.

## Four Students, Four Labs

Each student ranks the labs, and each lab ranks the students, best first.

| Student | 1st | 2nd | 3rd | 4th |
| --- | --- | --- | --- | --- |
| Ana | Vision | Systems | Theory | Security |
| Ben | Systems | Vision | Security | Theory |
| Chi | Vision | Theory | Systems | Security |
| Dev | Systems | Security | Vision | Theory |

| Lab | 1st | 2nd | 3rd | 4th |
| --- | --- | --- | --- | --- |
| Vision | Ben | Ana | Dev | Chi |
| Systems | Ana | Chi | Ben | Dev |
| Theory | Dev | Ben | Chi | Ana |
| Security | Chi | Dev | Ana | Ben |

Take the placement Ana in Vision, Ben in Theory, Chi in Systems and Dev in Security. Every student has a lab, so as a pairing it is complete. But Ben ranks Vision second and Theory fourth, and Vision ranks Ben first and Ana second. Ben and Vision form a **blocking pair**: each prefers the other to what the placement gave.

A **stable matching** is a complete matching with no blocking pair. No pair has a reason to break away. The question is whether one always exists, and how to find it.

## Proposals and Holding Offers

The method is a courtship in rounds. Every student who has no lab yet proposes to the best lab on their list that they haven't proposed to. A lab that gets a proposal compares it with the student it currently holds, if any, and keeps the one it ranks higher, releasing the other. A released student goes on to the next lab on their list. This continues until everyone is placed.

The lab's holding of an offer is only a "maybe", which is why it is called **deferred acceptance**. A lab's holding can only get better, since it trades up. A student's lab can only get worse, since a student moves down the list after each rejection.

| Step | Student | Proposes To | Result |
| --- | --- | --- | --- |
| 1 | Ana | Vision | Vision is free and holds Ana |
| 2 | Ben | Systems | Systems is free and holds Ben |
| 3 | Chi | Vision | Vision prefers Ana to Chi, so Chi is rejected |
| 4 | Dev | Systems | Systems prefers Ben to Dev, so Dev is rejected |
| 5 | Chi | Theory | Theory is free and holds Chi |
| 6 | Dev | Security | Security is free and holds Dev |

Six proposals, and everyone is placed: Ana in Vision, Ben in Systems, Chi in Theory and Dev in Security.

```python
from collections import deque

def gale_shapley(prop_prefs, recv_prefs):      # lists of preference lists, indexed by person
    n = len(prop_prefs)
    rank = [{p: r for r, p in enumerate(prefs)} for prefs in recv_prefs]
    nxt = [0] * n                              # the next choice each proposer will try
    holder = [None] * n                        # receiver -> the proposer it holds
    free = deque(range(n))
    while free:
        p = free.popleft()
        r = prop_prefs[p][nxt[p]]
        nxt[p] += 1
        if holder[r] is None:
            holder[r] = p
        elif rank[r][p] < rank[r][holder[r]]:
            free.append(holder[r])             # r trades up, and the old holder is free again
            holder[r] = p
        else:
            free.append(p)                     # rejected
    return {holder[r]: r for r in range(n)}
```

## Why It Works

It stops. Each proposal goes to a lab the student hasn't tried, so there are at most n × n proposals in all, and everybody has someone to propose to until placed.

It places everyone. Suppose a student ended without a lab. They would have proposed to every lab, and a lab that has received a proposal holds someone from then on. So all n labs would hold someone, n different students, plus this one student with nothing, which is n + 1 students when there are only n.

It is stable. Suppose Ben prefers Vision to the lab he ended with. Then Ben proposed to Vision earlier and was turned down, either at once or later when Vision traded up, so at that moment Vision held someone it ranks above Ben. Vision's holding only gets better, so it ends with someone it ranks above Ben, and Ben and Vision are no blocking pair.

We checked all three claims on 300 random instances with 2 to 6 students and labs. For each, we listed all permutations and kept the ones with no blocking pair. The algorithm's result was always in that list, and 115 of the instances had more than one stable matching.

## Who Gets the Better Deal

On our example the students proposed. If the labs propose instead, with the same lists, the answer changes.

| Who Proposes | Average Rank of Students' Labs | Average Rank of Labs' Students |
| --- | --- | --- |
| Students | 1.5 | 2.5 |
| Labs | 3.0 | 1.0 |

When labs propose, each gets its first choice, and in only 4 proposals. When students propose, the students do far better. Both matchings are stable, and a third stable matching lies between them.

This isn't an accident. The side that proposes gets, for each member, the best partner that member has in any stable matching, and the side that receives gets its worst. On the 300 random instances, we checked this against the full list of stable matchings: every proposer got the best partner among all stable matchings, and every receiver the worst.

The gap grows with size. On random preference lists, we ran the algorithm with students proposing.

| Students and Labs | Proposers' Average Rank | Receivers' Average Rank |
| --- | --- | --- |
| 100 | 5.65 | 17.32 |
| 1,000 | 7.17 | 144.65 |

With 1,000 on each side, a proposing student got a lab ranked about 7th on average, and a receiving lab got a student ranked about 145th. The first is close to ln 1,000 = 6.9 and the second to 1,000 / ln 1,000 = 145. Who proposes decides who gets the good end, which is why the design of a matching system, who proposes, is a design decision with consequences.

## How Many Proposals

The worst case is n² proposals, but random lists are far kinder. We counted for 100, 1,000 and 5,000 on each side.

| Size | Proposals | n ln n | n² |
| --- | --- | --- | --- |
| 100 | 565 | 461 | 10,000 |
| 1,000 | 7,169 | 6,908 | 1,000,000 |
| 5,000 | 46,173 | 42,586 | 25,000,000 |

The count stayed within about 25% of n ln n, far below the n² bound, and the 5,000 case took 1.5 s in Python. Real preference lists aren't random, so the bound is the safe promise and the n ln n is an observation.

The method was published by Gale and Shapley in 1962. The American residency match, which began in 1952 to stop hospitals making offers earlier and earlier, was redesigned in 1998 so that the students are the ones who propose.

## When There Aren't Two Sides

Stability doesn't always have an answer when the people can pair with anyone. Four roommates, A, B, C and D, each rank the other three. A ranks B, C, D. B ranks C, A, D. C ranks A, B, D. And D ranks A, B, C.

There are only three ways to pair four people. We tried each: with A and B together, B and C would prefer each other, with A and C, A and B would, and with A and D, A and C would. Every pairing has a blocking pair, so no stable pairing exists.

Two sides are what make the argument above work. Roommates have no two sides, the argument fails, and for some inputs there is no answer at all.

## Key Points

- A matching is stable when no student and lab both prefer each other to their assigned partners, and a stable matching always exists for two sides
- In Gale-Shapley, each unplaced proposer asks the best lab not yet tried, and each lab keeps the best offer so far, which takes at most n² proposals
- The proposing side gets its best stable partner and the other side its worst: on 1,000 random pairs, proposers averaged rank 7 and receivers rank 145
- Our instance had 3 stable matchings, and the result changed completely when the labs proposed instead of the students
- On random lists it needed about n ln n proposals, 7,169 for 1,000 pairs, and with one group of four roommates no stable pairing exists
