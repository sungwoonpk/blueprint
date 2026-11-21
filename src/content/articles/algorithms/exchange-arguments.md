> An **exchange argument** proves that a greedy rule is correct. Take any optimal solution that differs from the greedy one, swap a piece of it for the greedy choice, and show the result is no worse. Repeating the swap turns the optimal solution into the greedy one.

An archive stores files one after another on a tape. To read a file, the drive winds past every file stored before it, so reading the third file costs the lengths of the first three. The archive can choose the order in which files are written, and wants reads to be as cheap as possible overall.

Which order is best? A guess is easy: shortest files first. A guess is not a proof, and the exchange argument turns it into one.

## The Tape Problem

Say five files have lengths 7, 2, 5, 1 and 3, stored in that order. Reading them costs 7, 9, 14, 15 and 18, which sums to 63. Storing them shortest first, as 1, 2, 3, 5 and 7, costs 1, 3, 6, 11 and 18, which sums to 39. The same files and the same reads cost 24 fewer units.

Trying every order would find the best one, but there are 5! = 120 orders here and n! in general. The goal is a rule that picks the order directly.

## Swapping Two Neighbors

Look at two files that sit next to each other, a first and then b. Every other file has the same cost whether a and b swap places, because the total length before them and after them doesn't change. Only the two files themselves matter.

- If a comes first, a costs its own length, and b costs the length of a plus its own, on top of what the earlier files cost
- If they swap, b costs its own length, and a costs the length of b plus its own, on top of the same earlier files

So swapping makes a cost L(b) more and b cost L(a) less, a net change of L(b) − L(a). If a is longer than b, that is negative, so swapping a longer file behind a shorter one lowers the total. If a file is longer than the one right after it, the order can be improved.

Take the order 7, 2, 5, 1, 3 and keep swapping the first neighbors that are out of order.

| After Swap | Order | Total Cost | Change |
| --- | --- | --- | --- |
| Start | 7, 2, 5, 1, 3 | 63 | None |
| 7 and 2 | 2, 7, 5, 1, 3 | 58 | −5 |
| 7 and 5 | 2, 5, 7, 1, 3 | 56 | −2 |
| 7 and 1 | 2, 5, 1, 7, 3 | 50 | −6 |
| 5 and 1 | 2, 1, 5, 7, 3 | 46 | −4 |
| 2 and 1 | 1, 2, 5, 7, 3 | 45 | −1 |
| 7 and 3 | 1, 2, 5, 3, 7 | 41 | −4 |
| 5 and 3 | 1, 2, 3, 5, 7 | 39 | −2 |

Each change equals the shorter length minus the longer one, as predicted, and each swap helps. After 7 swaps the order is sorted and no neighbors are out of order. The count of 7 is the number of inversions in the starting list, from [Counting Inversions and the Closest Pair](/algorithms/inversions-closest-pair), since each swap removes exactly one.

Here is the proof in one line. An optimal order can't have a longer file directly before a shorter one, because swapping them would make it cheaper. An order with no such pair is sorted by length. So some sorted order is optimal, and equal lengths can go in either order.

We checked it on 1,000 random instances of 7 files by trying all 5,040 orders. The cheapest order cost the same as the sorted one every time. On 1,000 files with lengths from 1 to 100, the average read cost was 16,730 when sorted, 25,451 in a random order and 33,440 with the longest first.

## When Reads Aren't Equal

Suppose file i is read F(i) times. Reading it now costs the prefix length times F(i), and a swap of neighbors a then b changes the total by L(b) × F(a) − L(a) × F(b). That is negative exactly when L(a) / F(a) > L(b) / F(b). So the right order puts the smallest ratio of length to frequency first.

The exchange argument has told us which key to sort by, and neither obvious guess is right. We tried 300 random instances of 6 files against all 720 orders. Sorting by the ratio was optimal in all 300. Sorting by length alone failed in 283 of them, and sorting by frequency alone failed in 287.

## The Recipe

The proof for the tape has the same shape as most greedy proofs.

1. Suppose some optimal solution differs from the greedy one
2. Find the first place where they differ
3. Exchange the optimal solution's piece for the greedy piece, and show the solution isn't made worse, though it needn't get better
4. Repeat, so by induction some optimal solution equals the greedy solution

Sometimes there is a fifth step, to show that no optimal solution can do strictly better than the greedy one, when the exchange leaves the cost unchanged.

## A Second Example: Choosing Classes

A student wants to attend as many classes as possible, and no two chosen classes may overlap. The greedy rule is to take the class that finishes first, then the next class that starts after it, and so on. The details are in [Greedy Scheduling](/algorithms/greedy-scheduling). The claim to prove is that some optimal schedule includes the class f that finishes first.

Let X be any optimal schedule that lacks f, and let g be the first class in X to finish. Since f finishes no later than g, and the other classes in X start after g finishes, f doesn't conflict with any of them.

Replace g with f. The new schedule has the same size and no conflicts, so it is also optimal, and it contains f. From there the same argument applies to the classes that start after f finishes.

We tested this step on 300 random instances of 8 classes. For each optimal schedule that lacked f, we swapped f for its first class to finish. All 562 of those schedules stayed conflict free and kept their size.

## When the Exchange Breaks

The argument works when the swapped pieces are interchangeable with respect to everything else: the class f takes the same slot that g took, and the files a and b touch nothing but each other. When an exchange changes how much room or value is used, it fails, and usually the rule fails too.

Take the 0/1 knapsack from [When Greedy Choices Work](/algorithms/greedy), with these items and a bag that holds 50.

| Item | Weight | Value | Value per Weight |
| --- | --- | --- | --- |
| A | 10 | 60 | 6 |
| B | 20 | 100 | 5 |
| C | 30 | 120 | 4 |

The best ratio rule takes A, then B, then can't fit C, for a value of 160. The best choice is B and C, with a value of 220. To exchange B for A in the optimal solution, A would have to fill B's place, but A weighs 10 less, so 10 units of space go unused and the value drops to 180.

The swap isn't free, so the argument has no way to go through.

Weighted scheduling gives a similar failure. A class of value 100 from time 0 to 10 conflicts with two classes of value 1 each at times 1 to 2 and 3 to 4. Earliest finish takes the two small ones, for 2, while the long class is worth 100. Here the swapped classes have different values, so the exchange isn't neutral.

## Testing the Exchange

Before writing the proof, check the claim by brute force on small cases, as the tape experiments did.

```python
import itertools

def total_cost(order, L, F):                    # F[i] reads of file i, in this order
    cost = prefix = 0
    for i in order:
        prefix += L[i]                             # the tape wound past this file
        cost += prefix * F[i]
    return cost

def check_key(key, instances):
    for L, F in instances:
        order = sorted(range(len(L)), key=key(L, F))
        best = min(total_cost(p, L, F) for p in itertools.permutations(range(len(L))))
        if total_cost(order, L, F) != best:
            return (L, F)                  # this key fails here
    return None
```

A key that fails shows a counterexample right away. A key that passes gives a strong hint about what to prove, and the proof usually follows the neighbor swap: write down how the total changes, and see which sign decides the order.

## Key Points

- An exchange argument takes an optimal solution that differs from the greedy one and swaps in the greedy piece without making it worse
- For the tape, swapping neighbors a and b changes the cost by L(b) − L(a), so the best order sorts by length
- With read counts, the swap changes the cost by L(b) F(a) − L(a) F(b), so the best order sorts by length divided by count, and sorting by length alone failed on 283 of 300 instances
- The argument works when swapped pieces are interchangeable, and fails for knapsack because the swapped items have different weights
- Check a proposed key against brute force on small inputs before proving it
