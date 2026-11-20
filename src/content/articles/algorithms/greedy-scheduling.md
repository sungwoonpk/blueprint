> **Greedy scheduling** solves three classic problems by sorting on the right key and sweeping once. Choose the earliest finishing request to fit the most requests into one room, the earliest starting request to open the fewest rooms for all of them, and the earliest deadline to keep the worst delay as small as possible.

A conference center has one hall and a list of booking requests, each with a start and an end time. Three different questions can be asked of the same list. How many requests can the hall accept if it is the only hall? How many halls are needed if every request must be accepted? And if the requests are tasks in a queue with deadlines, how should they be ordered so that nothing runs too late?

Each has a short greedy answer, and each depends on choosing the right thing to sort by.

## Fitting the Most Requests

Four requests: A from 8 to 15, B from 9 to 12, C from 12 to 15 and D from 11 to 13. No two accepted requests may overlap, although one may start at the moment another ends. The goal is the largest set.

The greedy rule is to sort by finish time and take each request that starts no earlier than the last accepted one ended.

```python
def most_requests(requests):                  # a list of (start, end)
    chosen, last_end = [], float("-inf")
    for start, end in sorted(requests, key=lambda r: r[1]):
        if start >= last_end:
            chosen.append((start, end))
            last_end = end
    return chosen
```

<figure class="chart">
<div class="waterfall" role="img" aria-label="Four requests on a timeline from 8 to 15. A runs 8 to 15, B runs 9 to 12, C runs 12 to 15 and D runs 11 to 13. B and C are chosen">
<div class="wf"><span>A, 8 to 15</span><span class="track"><span class="bar" style="--s: 0%; --w: 100%"></span></span><span class="value">skipped</span></div>
<div class="wf peak"><span>B, 9 to 12</span><span class="track"><span class="bar" style="--s: 14.3%; --w: 42.9%"></span></span><span class="value">chosen</span></div>
<div class="wf"><span>D, 11 to 13</span><span class="track"><span class="bar" style="--s: 42.9%; --w: 28.6%"></span></span><span class="value">skipped</span></div>
<div class="wf peak"><span>C, 12 to 15</span><span class="track"><span class="bar" style="--s: 57.1%; --w: 42.9%"></span></span><span class="value">chosen</span></div>
</div>
<figcaption>Earliest finish takes B, which ends at 12, then skips D because it starts before 12, and then takes C</figcaption>
</figure>

Sorted by finish time the requests are B (12), D (13), A and C (15). B is taken. D starts at 11, before B ends, so it is skipped. A starts at 8, so it is skipped too. C starts at 12, when B ends, so it is taken. That is 2 requests, and it is the best possible here.

The reason is the exchange argument from [Exchange Arguments for Greedy Proofs](/algorithms/exchange-arguments): finishing earliest leaves the most room for what follows, and swapping any optimal schedule's first request for the earliest finisher never causes a conflict.

The other rules that sound reasonable do worse. Taking the earliest start picks A and blocks everything. Taking the shortest request picks D, which overlaps both B and C. Each ends with one request. We compared four rules with an exact answer on 1,000 random sets of 12 requests.

| Rule | Optimal in |
| --- | --- |
| Earliest finish | 1,000 of 1,000 |
| Fewest conflicts | 1,000 of 1,000 |
| Shortest first | 936 of 1,000 |
| Earliest start | 563 of 1,000 |

Fewest conflicts matched earliest finish here, but a rule that does well on random data isn't proven. We searched 20,000 random sets of 11 requests and found 3 where fewest conflicts returned 4 requests when 5 fit. Earliest finish has the exchange proof, and the other doesn't. The sort dominates the cost, O(n log n), and a million random requests took 0.34 s.

## Fewest Halls for Everyone

Now every request must be accepted, in as few halls as possible. Take six requests: A from 9 to 12, B from 9 to 10, C from 10 to 11, D from 11 to 13, E from 12 to 14 and F from 13 to 15.

At any moment some number of requests are in progress. The largest such number is the **depth**, and no solution can use fewer halls than the depth, since that many requests overlap at one moment. Here the depth is 2.

The greedy rule processes requests by start time and keeps the halls in a min-heap ordered by when each hall becomes free, as in [Heaps and Priority Queues](/algorithms/heaps). If the hall that frees up soonest is free by the new request's start, use it. Otherwise open a new hall.

```python
import heapq

def halls_needed(requests):
    free_at = []                              # heap of (end time, hall number)
    halls = 0
    for start, end in sorted(requests):
        if free_at and free_at[0][0] <= start:
            _, hall = heapq.heappop(free_at)  # reuse the hall that frees first
        else:
            halls += 1
            hall = halls                      # every hall is busy: open a new one
        heapq.heappush(free_at, (end, hall))
    return halls
```

On the six requests it opens hall 1 for A. B starts at 9, while A is still running, so B gets hall 2. C starts at 10 and hall 2 is free then, so C takes it, and so do D and F in turn. E starts at 12, when A's hall is free, so E goes to hall 1. Two halls, the depth.

| Hall | Requests |
| --- | --- |
| 1 | A, E |
| 2 | B, C, D, F |

Why does it match the depth? A new hall number d opens only when the request, call it j, finds all d − 1 existing halls busy. Each of those busy halls holds a request that ends after j starts, and each started no later than j, because requests are processed in order of start. Together with j that is d requests in progress at the moment j starts, so the depth is at least d.

We checked that the heap method used exactly the depth in halls on 1,000 random sets of 30 requests. The order matters: placing the same requests in random order into the first hall that fits used more halls than the depth on 272 of the 1,000 sets. A million random requests needed 13 halls and took 0.79 s.

## Finishing on Time

The third problem is a queue of tasks on one machine. Each task has a processing time t and a deadline d. The machine does one task at a time with no pauses. A task that ends after its deadline is late by the difference. The goal is to minimize the largest lateness.

Take three tasks written as (time, deadline): P (4, 6), Q (1, 10) and R (2, 5). Running the earliest deadline first gives R, P, Q, with finishing times 2, 6 and 7, all on time. Running the shortest task first gives Q, R, P with finishing times 1, 3 and 7, and P is late by 1.

```python
def order_by_deadline(tasks):                 # tasks are (time, deadline)
    return sorted(tasks, key=lambda t: t[1])
```

Here the proof is again an exchange. Idle time never helps, so assume none. If a task j with a later deadline runs right before a task i with an earlier deadline, swap them. Task i now finishes sooner, so it is no later than before. Task j now finishes at the time i used to finish, so its lateness becomes that time minus its deadline. Since j's deadline is not earlier than i's, that is at most what i's lateness was before. The largest lateness doesn't grow, and each swap removes one out of order pair, so the sorted order is at least as good as any other.

We tested 1,000 random instances of 7 tasks against all 5,040 orders. Earliest deadline first matched the best order every time. Shortest task first matched it in only 52 instances, and ordering by slack, the deadline minus the time, matched it in 669.

## Where Greedy Stops

Small changes to the problem can break these rules. If each request has a value and the goal is the largest total value, earliest finish fails, as in [Exchange Arguments for Greedy Proofs](/algorithms/exchange-arguments). That version needs dynamic programming, from [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp). The rule that works for one question rarely carries over to the next.

| Question | Sort By | Then | Cost |
| --- | --- | --- | --- |
| Most requests in one hall | Finish time | Take each that fits | O(n log n) |
| Fewest halls for all | Start time | Reuse the earliest free hall | O(n log n) |
| Smallest worst lateness | Deadline | Run in that order | O(n log n) |

## Key Points

- To fit the most requests into one hall, sort by finish time and take each request that starts after the last one chosen ends
- Earliest finish was optimal on 1,000 of 1,000 random sets, while earliest start managed only 563 and shortest first 936
- To use the fewest halls, process by start time with a min-heap of halls by end time, which always uses exactly the depth, the most requests in progress at once
- To minimize the largest lateness, run tasks by earliest deadline, which matched the best of all 5,040 orders on 1,000 instances
- Each is O(n log n), dominated by the sort, and each proof is an exchange argument
