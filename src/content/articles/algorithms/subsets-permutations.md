> **Subsets, combinations and permutations** are the three basic families of candidates that a search generates. A subset keeps any items, a combination keeps k of them, and a permutation puts all of them in an order. One recursive pattern, choose, explore and un-choose, produces all three.

A team lead has four engineers, A, B, C and D. Depending on the question, the same four people give very different sets of candidates. Any team at all is a **subset**. A team of exactly two is a **combination**. A speaking order for the demo, with everyone speaking once, is a **permutation**.

Telling these apart is the first step of an exhaustive search, because they differ in two ways: whether order matters, and how many items are used.

## Three Questions, Three Counts

| Question | Name | Count | For 4 People |
| --- | --- | --- | --- |
| Which people are on the team? | Subset | 2ⁿ | 16 |
| Which k people are on the team? | Combination | C(n, k) | 6 for k = 2 |
| In what order do they speak? | Permutation | n! | 24 |

A subset is a yes or no for each person, so there are 2 × 2 × 2 × 2 = 16. The empty team is one of them. A combination fixes the size, and {A, B} and {B, A} are the same team, so it counts each team once.

A permutation counts {A, B} and {B, A} as different, which is why 4! = 24 is so much larger than the 6 teams of two.

## Subsets: Include or Skip

For each item decide whether it is in the subset. The recursion looks at one item at a time, tries leaving it out, and then tries putting it in.

```python
def subsets(items):
    out, chosen = [], []
    def go(i):
        if i == len(items):
            out.append(chosen[:])           # a copy, since chosen keeps changing
            return
        go(i + 1)                           # skip items[i]
        chosen.append(items[i])             # choose it
        go(i + 1)                           # explore with it
        chosen.pop()                        # un-choose it
    go(0)
    return out
```

The three lines marked skip, choose and explore, and un-choose, are the pattern to remember. The list `chosen` is shared by all calls, so each call must restore it before returning. That is why it records a copy at the end: later changes would alter an answer already saved.

<figure class="diagram">
<div class="flow packets tree">
<div class="node">{ }</div>
</div>
<div class="flow packets tree">
<div class="node">{ }</div>
<div class="node">{A}</div>
</div>
<div class="flow packets tree">
<div class="node">{ }</div>
<div class="node">{B}</div>
<div class="node">{A}</div>
<div class="node">{A B}</div>
</div>
<figcaption>Each level decides one more item, so the number of partial subsets doubles. After A and B are decided there are 4, and C doubles that to 8</figcaption>
</figure>

For A, B and C the function returns { }, {C}, {B}, {B, C}, {A}, {A, C}, {A, B}, {A, B, C}. Read with A as the leftmost digit, that is the binary numbers from 000 to 111, since each skip or choose is one bit. [Subsets as Bitmasks](/algorithms/bitmask-subsets) uses that fact to enumerate subsets with a plain counter.

## Combinations: Choose k, Moving Forward

For a combination, the set matters and the order doesn't. If the recursion may pick any unused item at each step, it builds {A, B} and {B, A} separately. The fix is to move only forward: after picking an item, the next pick must come from later in the list.

```python
def combinations(items, k):
    out, chosen = [], []
    def go(start):
        if len(chosen) == k:
            out.append(chosen[:])
            return
        for i in range(start, len(items)):
            chosen.append(items[i])
            go(i + 1)                       # only later items from here on
            chosen.pop()
    go(0)
    return out
```

For A, B, C, D and k = 2 it returns AB, AC, AD, BC, BD, CD, which is six teams, C(4, 2). The invariant is that the picks are in increasing position, so a team can only appear in one order and each appears once.

## Permutations: Use Each Item Once

A permutation fills positions one by one, and at each position it can take any item not yet used. A list of flags records which ones are taken.

```python
def permutations(items):
    out, chosen = [], []
    used = [False] * len(items)
    def go():
        if len(chosen) == len(items):
            out.append(chosen[:])
            return
        for i in range(len(items)):
            if used[i]:
                continue
            used[i] = True
            chosen.append(items[i])
            go()
            chosen.pop()
            used[i] = False                 # undo both parts of the choice
    go()
    return out
```

For A, B and C the order is ABC, ACB, BAC, BCA, CAB, CBA. The recursion tree has n choices at the top, then n − 1, then n − 2, which multiplies out to n!. Each choice has two things to undo, the item in the list and the flag, and forgetting one of them is a frequent bug in this kind of code.

We checked all three functions against the standard library on every input size from 0 to 7. Our combinations and permutations came out in the same order as `itertools`, and our subsets matched as a set.

## When Items Repeat

If the input has equal items, say A, A and B, the permutation code above treats the two A's as different and prints each answer twice. There are 3 distinct orders, AAB, ABA and BAA, instead of 3! = 6.

The fix is to sort the items first and, at each position, skip an item that equals the one before it unless that earlier one is already in use. The effect is that equal items are placed in the same left to right order every time.

```python
if i > 0 and items[i] == items[i - 1] and not used[i - 1]:
    continue                                # a twin was tried here already
```

Subsets and combinations use a similar test. After sorting, skip an item at the same level if it equals the previous one that was tried at that level. For A, A and B this gives { }, {A}, {A, A}, {A, A, B}, {A, B}, {B}, which is 6 distinct subsets, not 8.

We compared both repaired versions with `set(itertools...)` on 300 random lists of up to 7 items with values from 0 to 3, and they matched.

## The Standard Library

Python's `itertools` has these ready. `permutations`, `combinations`, `combinations_with_replacement` and `product` return their results in lexicographic order of positions, so with a sorted input the output is sorted too. They treat items as different by position, not by value, so equal values give repeated results, as above.

On permutations of 10 items, our function took 2.67 s and `itertools.permutations` took 0.28 s, because the library is written in C. Write your own when the search needs to stop early or prune, and use the library when it doesn't.

There is a second reason to prefer a generator: memory. A list of all 362,880 permutations of 9 items took 43 MB in our test. Looping over `itertools.permutations(range(9))` without keeping the results peaked at under 1 KB. When you only need to test each candidate, as in [Brute Force](/algorithms/brute-force), consume them one at a time.

## What It Costs

| Task | Candidates | Our Time |
| --- | --- | --- |
| Subsets of 16 items | 65,536 | 10 ms |
| Subsets of 20 items | 1,048,576 | 0.31 s |
| Permutations of 9 items | 362,880 | 0.28 s |
| Permutations of 10 items | 3,628,800 | 2.67 s |

The times grow as fast as the counts: one more item doubles the subsets and multiplies the permutations by n. These loops are fine up to roughly 20 items for subsets and 10 for permutations, the limits from [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints). Beyond that, building every candidate is the problem, and the next idea is to stop building the ones that can't work, in [Backtracking](/algorithms/backtracking).

## Key Points

- Subsets are 2ⁿ yes or no choices, combinations are C(n, k) teams where order doesn't matter, and permutations are n! orderings
- The shared pattern is choose, explore and un-choose, and every choice that is made has to be undone
- Combinations move forward through the list, so each set appears in just one order
- Permutations mark used items, and repeated values need sorting and a skip rule to avoid duplicate answers
- Use `itertools` for speed and stream the results, because listing 362,880 permutations of 9 items took 43 MB
