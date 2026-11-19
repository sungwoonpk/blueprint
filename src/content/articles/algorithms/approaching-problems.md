> A way to approach an algorithm problem is a short routine: understand the problem, make a plan, carry the plan out, and look back at the result. Starting with a slow but correct solution is part of the routine.

Staring at a new problem and waiting for the answer to appear is a common way to get stuck. Experienced problem solvers usually do something more routine: they ask questions, try small cases, write down an obvious solution and improve it. This page walks through that routine on one problem.

Your campus bookstore gives you a $60 gift card. Given the prices of the used textbooks on a shelf, find two different books whose prices add up to exactly $60.

## Four Phases

The routine comes from the mathematician George Pólya, whose book *How to Solve It* divides the work into four phases. They fit programming problems well.

<figure class="diagram">
<div class="flow">
<div class="node">Understand<small>what is asked</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Plan<small>pick an approach</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Carry Out<small>write and check</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Look Back<small>test and improve</small></div>
</div>
<figcaption>Pólya's four phases, applied to an algorithm problem</figcaption>
</figure>

You will often move backward too. A plan that fails usually sends you back to the problem statement, and that is normal.

## Understand the Problem

Restate the problem in your own words, in terms of inputs and outputs. Then look for what the statement leaves unsaid. For the gift card, a few questions come up at once.

- Can one book be used twice, or must the two books be different copies on the shelf?
- Can two books cost the same?
- What should come back, the prices or the positions, and what if several pairs work?
- What if no pair adds up, or the shelf has one book or none?

The statement says two different books, so the same copy can't count twice, but two books with equal prices are fine. We'll return their positions, and `None` if there is no pair. Writing these decisions down is the first step of a specification, as in [What is an Algorithm?](/algorithms/what-is-an-algorithm).

Then work small examples by hand, including awkward ones.

| Prices | Budget | Answer |
| --- | --- | --- |
| 25, 40, 15, 35 | 60 | Positions 0 and 3 (25 + 35) |
| 30, 20, 30 | 60 | Positions 0 and 2, two different books at the same price |
| 30 | 60 | None, since one book can't be used twice |
| (empty shelf) | 60 | None |

These examples become tests later, and doing them by hand often shows the pattern the algorithm needs.

## Plan: Start with the Obvious Solution

Before looking for a clever idea, find any correct one. Try each pair and stop at the first that works.

```python
def pair_for_budget_slow(prices, budget):
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[i] + prices[j] == budget:
                return i, j
    return None
```

This is a **brute force** solution. It is correct and easy to trust, and it is a baseline in two ways: it tells you how much better a fast version needs to be, and it gives you a reference to test that version against. It also costs about n²/2 comparisons, which [Measuring Time and Space with Big O](/algorithms/big-o) turns into O(n²). On 20,000 prices with no matching pair, it took 4.9 seconds on our machine.

The next question is where the work is wasted. For each book, the loop searches the rest of the shelf for one particular price, `budget - price`. That search is the slow part, and "have I seen this value?" is a problem you already know how to speed up. A hash table answers it in about one step, as [Hash Maps and Hash Sets](/algorithms/hash-maps-sets) explains.

Matching your problem to one you can already solve is a useful move in this phase.

| If the Problem Mentions | Think About |
| --- | --- |
| Finding, counting or checking membership quickly | Hash maps and sets |
| Order, or input that is sorted | Sorting and binary search |
| A stretch of consecutive items | Sliding windows and prefix sums |
| Nested data, or a smaller copy of itself | Recursion and trees |
| Things connected by links, or routes | Graphs |
| Trying choices and undoing them | Backtracking |
| The best of many overlapping choices | Dynamic programming |

Each row is a phase or group later in this roadmap, so the table doubles as a map of where the tools live.

## Carry Out the Plan

Walk the shelf once. For each book, ask whether the price that would complete the pair has already been seen, and then remember this book.

```python
def pair_for_budget(prices, budget):
    seen = {}                        # price -> position
    for j, p in enumerate(prices):
        if budget - p in seen:
            return seen[budget - p], j
        seen[p] = j
    return None
```

The order inside the loop matters. The check comes before the book is added, so a book can't be paired with itself, while an earlier book with the same price can still be found. That is why `[30, 20, 30]` works and `[30]` doesn't.

Check it with the loop invariant from [Proving Correctness with Loop Invariants](/algorithms/loop-invariants): before looking at position `j`, `seen` holds the books at positions below `j`, and no two of them add up to the budget. If a pair existed, it would end at some position `j`, and its earlier book would be in `seen` when we got there.

## Look Back

The last phase turns a solution into a skill. Ask these questions about the result.

- **Does it pass the examples?** Run the four from the table, and compare with the slow version on many small random inputs. We did that on 20,000 random cases and the two agreed
- **What does it cost?** One pass, so O(n) time, and the dictionary may hold a price for each book, so O(n) space. On 20,000 prices with no pair it took about 1 millisecond, against 4.9 seconds for the brute force
- **Is there another way?** Sorting the prices and moving two pointers in from both ends is one, and [Two Pointers](/algorithms/two-pointers) covers it
- **What carries over?** Remembering what you have seen so that a later item can find it is a pattern, and it appears again in prefix sums and in dynamic programming

## When You Are Stuck

Pólya's book includes a short dictionary of heuristics, and a few of its questions travel well.

- Can you solve a smaller version, with fewer items or an easier condition?
- Have you seen a similar problem, and can you use its method?
- What would you do by hand on a small example, and can you describe those steps exactly?
- If you knew the answer, what would the step just before it look like?

Saying the plan aloud before writing code, to a teammate or an interviewer, also gives someone the chance to correct a misunderstanding early.

The next question is how to know in advance what speed you need, which [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints) answers.

## Key Points

- Work in four phases: understand, plan, carry out, look back, and expect to move between them
- Ask questions that expose what the statement leaves unsaid, then try small and awkward examples by hand
- Start with a brute force solution. It is a baseline for speed and a reference to test against
- To speed it up, find where the work is wasted, then match that step to a problem you already know how to solve
- Afterward, test, check the cost and note the pattern you used
