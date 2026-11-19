> An **algorithm** is a precise, finite procedure that solves a problem: given any valid input, it stops with a correct output.

The registrar exports a class roster, a list of student IDs, and wants to know whether any ID appears twice. You could check 30 IDs by eye. With 40,000, you need a method, and you need to be sure the method is right and fast enough. Choosing and checking such methods is what this roadmap is about.

## Problem, Algorithm, Program

Start with the question, stated so exactly that two people can't read it differently.

> **Problem**: given a list of integers (student IDs), return `True` if some value appears at least twice, and `False` otherwise.

That statement leaves out how to find the answer. An **algorithm** supplies the how, and a **program** is the algorithm written in one language.

|  | Problem | Algorithm | Program |
| --- | --- | --- | --- |
| What it says | Which inputs are allowed and which outputs are right | A method that finds the right output | The method in one programming language |
| Our example | Does any ID appear twice? | Remember each ID you have seen | `has_duplicate` in Python |

One problem can have many algorithms, and one algorithm can have many programs. Swapping Python for Java doesn't change the algorithm, but changing the method does.

## What Makes a Procedure an Algorithm

Four properties separate an algorithm from a vague plan:

- **Precise**: each step is clear enough for a machine to carry out, so "spot the duplicates" is a wish and "compare two IDs" is a step
- **Finite**: on any valid input, it stops
- **Correct**: the output is right for each valid input, not just for the inputs you tried
- **Efficient**: it finishes using a sensible amount of time and memory

The first two are easy to check by reading. The last two take real work, and they are the two questions to ask of any algorithm.

## Two Algorithms for One Problem

The first method follows how a person would start: compare each ID with the IDs after it.

```python
def has_duplicate_pairs(ids):
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if ids[i] == ids[j]:
                return True
    return False
```

The second walks through the list once and keeps a **set** of the IDs it has seen. A set answers "have I seen this?" quickly, using a hash table underneath (see [How Hash Tables Work](/algorithms/hash-tables)).

```python
def has_duplicate_seen(ids):
    seen = set()
    for x in ids:
        if x in seen:
            return True
        seen.add(x)
    return False
```

Both are precise, both stop, and both give the right answer on the inputs we try. So are they equally good? Before comparing them, we should see how a method can look right and still be wrong.

## Correct on Any Input

A tempting shortcut assumes duplicates sit next to each other, so it compares each ID with the one after it.

```python
def has_duplicate_neighbors(ids):
    for i in range(len(ids) - 1):
        if ids[i] == ids[i + 1]:
            return True
    return False
```

On `[4021, 3377, 3377, 5150]` it returns `True`, and on `[1, 2, 3]` it returns `False`. Both are right, so a quick test would pass. Now try an unsorted roster.

<figure class="diagram">
<div class="cells">
<div class="cell bad">3377<small>0</small></div>
<div class="cell">4021<small>1</small></div>
<div class="cell bad">3377<small>2</small></div>
</div>
<figcaption>The neighbor check compares cells 0 and 1, then 1 and 2. It does not compare the two 3377s, so it returns False</figcaption>
</figure>

The method works just when equal IDs happen to be adjacent. This roster has a duplicate and the method misses it, so it is a wrong algorithm for the problem. Sort the list first and the idea becomes correct, as [Sorting as a First Step](/algorithms/sorting-first) shows.

Testing can show that a method is wrong, but a handful of passing tests can't show that it is right, because the inputs are endless. A **correctness proof** covers them at once. The usual tool is induction, and for loops it takes the form of a loop invariant, the subject of [Proving Correctness with Loop Invariants](/algorithms/loop-invariants). The two correct methods above can each be proved that way.

## Fast Enough to Use

Both correct methods give the same answers, so the difference is time. We ran each one on rosters of distinct IDs, the case where no early exit helps and the whole list gets examined. Each size doubles the one before.

| Roster Size | Compare Every Pair | Remember What You Saw |
| --- | --- | --- |
| 1,000 | 0.009 s | 0.03 ms |
| 2,000 | 0.034 s | 0.06 ms |
| 4,000 | 0.15 s | 0.12 ms |
| 8,000 | 0.55 s | 0.28 ms |
| 16,000 | 2.2 s | 0.56 ms |

Look at how each column grows. When the roster doubles, the pair method takes about four times as long, while the set method takes about twice as long. At 32,000 IDs the same run took 9.2 seconds against 1.2 milliseconds.

The numbers come from one laptop and one language, so they will differ on yours. The pattern, four times against two times, won't. Describing that pattern without a stopwatch is the job of [Measuring Time and Space with Big O](/algorithms/big-o), and [Best, Average and Worst Cases](/algorithms/best-average-worst) explains why we chose inputs with no duplicates.

## Writing an Algorithm Down

Code is one way to write an algorithm, but it carries details that don't matter, like semicolons and type names. Many books use **pseudocode** instead: the structure of a program (loops, conditions, function calls) with the details left out.

```text
HasDuplicate(ids):
    seen = empty set
    for each x in ids:
        if x is in seen: return True
        add x to seen
    return False
```

The same description turns into Python, Java or C with little effort. The word itself comes from the name of al-Khwārizmī, a ninth century Persian scholar who described how to do arithmetic with decimal digits. Those digit by digit methods for adding and multiplying are among the first algorithms most people learn.

This roadmap shows ideas in short Python, and it asks the same two questions about each: is it correct, and how does its cost grow?

## Key Points

- A problem states the inputs and the right outputs, an algorithm is a method that solves it, and a program is that method in one language
- One problem usually has many algorithms, and they can differ enormously in speed
- A method that passes a few tests can still be wrong, so correctness has to hold for any valid input, and proofs are how we show it
- Efficiency is about how cost grows as the input grows, which a table of doubling sizes shows before any notation does
