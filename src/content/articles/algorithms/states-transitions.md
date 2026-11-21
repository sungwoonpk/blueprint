> A dynamic programming **state** is a precise description of a subproblem, and a **transition** says how a state's answer comes from the answers of smaller states. A good state holds just enough to make the rest of the problem independent of how we got there. Too little and the recurrence is wrong, too much and the table is too big, so the running time is the number of states times the work for each transition.

A lab runs a review session on some days of a week, and the same session can't run on two days in a row, since the helpers need a rest day. Each day has an expected attendance, and we want the schedule with the largest total. With six days of attendance 4, 1, 2, 9, 3 and 7, which days do we pick?

Trying every schedule works for six days, since there are 21 schedules with no two days adjacent, and not for sixty. The recurrence has to come from the structure.

## The Specification

The first step is a sentence in plain words, a **specification**, saying what the state means. Without it nobody can check the recurrence.

Let best(i) be the largest total attendance using only the first i days, with no two chosen days adjacent. That is the complete state: one number, the length of the prefix. The answer to the original question is best(6).

## The Transition

Look at day i. Either we don't use it, and the best total is best(i − 1). Or we do use it, so day i − 1 is out, and the best is the attendance of day i plus best(i − 2). Take the larger.

best(i) = max of best(i − 1), and best(i − 2) + attendance of day i

with best(0) = 0 and best(1) = the first day's attendance. Each state looks at two earlier states, so every cell costs the same small amount.

<figure class="diagram">
<p class="rowname">Attendance each day</p>
<div class="cells"><div class="cell hl">4<small>day 1</small></div><div class="cell">1<small>day 2</small></div><div class="cell">2<small>day 3</small></div><div class="cell hl">9<small>day 4</small></div><div class="cell">3<small>day 5</small></div><div class="cell hl">7<small>day 6</small></div></div>
<p class="rowname">Best total using the first i days</p>
<div class="cells"><div class="cell">0<small>0</small></div><div class="cell">4<small>1</small></div><div class="cell">4<small>2</small></div><div class="cell">6<small>3</small></div><div class="cell">13<small>4</small></div><div class="cell">13<small>5</small></div><div class="cell hl">20<small>6</small></div></div>
<figcaption>Six days with attendance 4, 1, 2, 9, 3, 7 and the best total for each prefix. The outlined days 1, 4 and 6 give 4 + 9 + 7 = 20, with no two days in a row</figcaption>
</figure>

The row below the days holds the answers: 0, 4, 4, 6, 13, 13, 20. At day 4 the choice is best(3) = 6 against best(2) + 9 = 13, so day 4 is taken. At day 5 the choice is best(4) = 13 against best(3) + 3 = 9, so day 5 is skipped.

At day 6 it is best(5) = 13 against best(4) + 7 = 20. The best total is 20, from days 1, 4 and 6.

```python
def best_attendance(days):
    prev2, prev1 = 0, 0                  # best for the first i - 2 and i - 1 days
    for x in days:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
```

Each value needs only the two before it, so two variables stand in for the table. We checked the function against trying all schedules with no two days adjacent, on 2,000 random lists of up to 12 days with attendance from 1 to 20, and it matched every time. For a million days it took 0.03 s.

## When the Recurrence Is Wrong

The structure above is easy to damage, and the damage comes from the state or the transition. We tried two plausible shortcuts on the same 2,000 lists.

| Method | Wrong Answers Out of 2,000 |
| --- | --- |
| The recurrence above | 0 |
| Always take day i, so best(i) = best(i − 2) + attendance | 596 |
| Greedy: take the biggest day, drop its neighbors, repeat | 430 |

The first forgets the option to skip a day, so it cannot take days 1 and 4 in the example above while skipping 2 and 3. The second, greedy, as in [When Greedy Choices Work](/algorithms/greedy), fails because the biggest day can sit between two good ones.

Neither is more than a few characters away from the right idea, and both are wrong more than a fifth of the time. An exhaustive comparison with brute force is the way to catch that.

## Adding Information to the State

Change the rule: a rest day is needed only after two picked days in a row. We may pick adjacent days, but no three in a row. The old state, the prefix length, is no longer enough, because whether day i may be picked depends on how many of the days just before it were picked.

So put that in the state: best(i, s) is the largest total for the first i days where the run of picked days ending at day i has length s, which is 0, 1 or 2. The transitions follow the meaning:

- A skipped day ends any run, so best(i, 0) is the best of the three states for day i − 1
- A day that starts a run takes the attendance on top of best(i − 1, 0)
- A day that extends a run takes it on top of best(i − 1, 1)

```python
def best_no_three(days):
    NEG = float("-inf")
    cur = [0, NEG, NEG]                      # cur[s]: best so far, ending in a run of s picked days
    for x in days:
        cur = [max(cur), cur[0] + x, cur[1] + x]
    return max(cur)
```

On 2,000 random lists the function matched a brute force over all schedules with no three consecutive days. Reusing the old recurrence, with only the prefix as the state, gave the wrong answer on 1,777 of the 2,000 lists, since it forbids adjacent days that are allowed.

The same pattern applies each time a problem has a limit that depends on history: a budget, a count of something used, a streak, a previous choice. The history goes into the state as a number.

## What the State Costs

Total work is the number of states times the work to fill one. Adding a dimension multiplies the states, so it should be added only when needed. Suppose we also may pick at most k days. The state becomes best(i, j), the best total of the first i days using at most j picks.

| Version | State | States for n = 1,000 | Work for Each |
| --- | --- | --- | --- |
| No two adjacent | Prefix length i | 1,001 | 2 comparisons |
| No three in a row | Prefix and run length | 3,000 | 3 comparisons |
| At most k = 50 days | Prefix and picks used | 50,000 | 2 comparisons |

For the last row, best(i, j) is the larger of best(i − 1, j) and best(i − 2, j − 1) plus the attendance of day i. We checked it against brute force on 1,000 random lists with k from 1 to 5, and it agreed. For 2,000 days and k = 500, it took 0.08 s.

## The Steps

Every dynamic programming problem in this phase goes through the same few questions.

1. What does a state mean, in words? Say it as a sentence, not a formula
2. What does the rest of the problem need to know about the past? Put exactly that into the state
3. How is a state's answer made from smaller states? That is the transition, with a rule for choosing, such as max or min, or for combining, such as a sum
4. Which states are the base cases, with answers known directly
5. In what order can the states be filled so every answer needed is ready, and where is the final answer

Writing the specification first makes the rest checkable: for each transition, ask whether it follows from the sentence. [Reconstructing the Solution](/algorithms/reconstructing-solutions) shows how to recover which days were picked and not just the total.

## Key Points

- A state is a precise description of a subproblem, written in words first, and a transition builds its answer from smaller states, so the time is the number of states times the work for each
- For days with no two adjacent, best(i) is the larger of best(i − 1) and best(i − 2) plus day i, and it matched brute force on 2,000 random lists, where always taking day i failed on 596 and greedy on 430
- When a rule depends on history, such as no three days in a row, the history goes into the state, as a run length of 0, 1 or 2, which the one number state got wrong on 1,777 of 2,000 lists
- Every added dimension multiplies the number of states, 1,001 for the prefix alone, 3,000 with a run length, and 50,000 with a limit of 50 picks
- A state should hold exactly what the future needs from the past, and brute force on small cases is the way to check it
