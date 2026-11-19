> **Recursion** solves a problem by solving smaller instances of the same problem and combining their answers, until an instance is small enough to answer directly.

You are standing in a long line at the registrar's office, and you can't see the front. How many people are ahead of you? You tap the person in front and ask them. They tap the person in front of them and ask the same thing. The question travels up the line until it reaches the first person, who answers 0. Then each person adds one and passes the answer back.

Nobody in that line counted the whole line. Each person did one small job and trusted the answer they were handed. That is the whole idea of recursion.

## Three Parts of a Recursive Solution

The line story has three parts, and most recursive solutions do too.

- **Base case**: an instance small enough to answer without asking anyone, like the first person in line
- **Reduction**: a way to turn the instance into a smaller one of the same problem, like asking the person ahead
- **Combination**: what to do with the smaller answer, like adding one

Here they are for the total of a list of exam scores.

```python
def total(scores):
    if not scores:                 # base case: nothing to add
        return 0
    return scores[0] + total(scores[1:])   # reduction and combination
```

`total([70, 85, 90])` asks for the total of `[85, 90]`, adds 70 to the answer, and returns. A loop would do this job better. The point here is the way of thinking, which matters once the structure stops being a flat list.

## Trust the Smaller Answer

The hardest habit is to stop tracing. When you write the recursive step, assume the call on the smaller input already works, and ask only: given a correct answer for the smaller problem, how do I build the answer for this one?

For `total`, the assumption is that `total(scores[1:])` correctly returns the sum of the rest. Then the answer for the whole list is the first score plus that. Nothing else is needed, and unrolling the calls in your head only gets in the way.

This is not hand waving. It is the same induction that proves a loop correct in [Proving Correctness with Loop Invariants](/algorithms/loop-invariants): the base case is where the induction starts, and the reduction assumes the claim for smaller inputs and proves it for this one. The recursion is correct if two things hold.

- The base case returns the right answer
- If the smaller call is right, the combination is right for the full input

One more thing is needed for the question to ever reach the first person in line: each call must get a strictly smaller input, so the instances run out. `scores[1:]` is one score shorter each time, so they do.

## When the Problem Has a Tree Shape

Recursion earns its place when the input is nested. Say a course folder holds files and subfolders, and we want the total size.

```python
def total_size(folder):
    size = sum(folder["files"])
    for sub in folder["folders"]:
        size += total_size(sub)
    return size
```

A folder's size is its own files plus the size of each subfolder, and each subfolder is a smaller instance of the same question. The depth of nesting is not known in advance, so a fixed set of loops can't express it. A folder with no subfolders skips the loop, which acts as the base case. No `if` appears in the code, and the recursion still stops.

The same shape appears in [Solving Tree Problems with Recursion](/algorithms/tree-recursion), and in any structure defined in terms of smaller copies of itself.

## When Smaller Problems Overlap

Not every recursion has a free ride. Take a staircase of n steps that you climb one or two at a time. How many different ways are there to reach the top? The last move was one step or two, so the ways to reach step n are the ways to reach n − 1 plus the ways to reach n − 2.

```python
def ways(n):
    if n <= 1:                     # one way to stand still, one way to reach step 1
        return 1
    return ways(n - 1) + ways(n - 2)
```

Each call makes two smaller calls, so the calls form a tree. Here is the tree for four steps.

<figure class="diagram">
<div class="flow packets tree">
<div class="node">ways(4)</div>
</div>
<div class="flow packets tree">
<div class="node">ways(3)</div>
<div class="node hot">ways(2)</div>
</div>
<div class="flow packets tree">
<div class="node hot">ways(2)</div>
<div class="node">ways(1)</div>
<div class="node">ways(1)</div>
<div class="node">ways(0)</div>
</div>
<div class="flow packets tree">
<div class="node">ways(1)</div>
<div class="node">ways(0)</div>
</div>
<figcaption>Each row holds the calls made by the row above it, left to right. ways(2) is worked out twice from scratch</figcaption>
</figure>

At four steps the repeat is a small waste. It doesn't stay small, because the number of calls grows about 1.6 times with each extra step. We counted the calls.

| Steps | Number of Ways | Calls Made | Time |
| --- | --- | --- | --- |
| 10 | 89 | 177 | under 1 ms |
| 20 | 10,946 | 21,891 | about 1 ms |
| 30 | 1,346,269 | 2,692,537 | 0.14 s |
| 35 | 14,930,352 | 29,860,703 | 1.5 s |

For 35 steps there are only 36 different questions, `ways(0)` through `ways(35)`, yet the code asks about 30 million. Remembering each answer after the first time cuts the work to 36 computations. The same function with a small cache took 14 microseconds on our machine. That idea is the subject of [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp).

## How Recursion Goes Wrong

Three mistakes show up again and again.

- **No base case**: the calls never reach a smallest instance. Python raises a `RecursionError` at its default limit of 1,000 calls, and other languages raise a stack overflow. See [The Call Stack and Recursion Depth](/algorithms/call-stack) for why
- **No progress**: the call receives an instance that isn't smaller, such as `total(scores)` instead of `total(scores[1:])`, so the question circles forever
- **Overlapping calls**: each call is correct and the answer is right, but the same subproblem is solved many times, as with `ways`

The first two are found by asking, for any recursive function, what the smallest input is and why each call is smaller than the last. The third is found by counting calls, or by working out the recurrence that describes the cost, as [Solving Recurrences with the Master Theorem](/algorithms/recurrences) does.

Any recursion can also be rewritten as a loop with an explicit stack, as [Turning Recursion into Iteration](/algorithms/recursion-to-iteration) shows. Recursion is often the clearer way to say it first.

## Key Points

- A recursive solution has a base case, a reduction to a smaller instance of the same problem, and a way to combine the answers
- Write the recursive step by assuming the smaller call is correct, which is the induction hypothesis in disguise
- Each call must get a strictly smaller input, or the calls never reach the base case
- Recursion fits nested and tree shaped inputs, where the number of levels isn't known in advance
- Two calls on overlapping smaller problems can repeat work exponentially, which counting calls reveals
