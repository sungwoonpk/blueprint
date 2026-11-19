> The **call stack** is the region of memory that holds one **frame** for each function call that has started and not yet finished: its arguments, its local variables and the place to resume when it returns.

The `total` function from [Thinking Recursively](/algorithms/thinking-recursively) is correct, and it still crashes on a list of 5,000 scores in Python. The logic didn't fail, so something else did. While a call waits for the smaller call it made, it has to be remembered somewhere, and that somewhere has a size.

## One Frame for Each Pending Call

When a function is called, the program sets aside a frame for it on top of the stack. When the function returns, its frame is removed and the caller continues from where it left off. Recursion makes this visible because a function waits on copies of itself.

Here is `total([70, 85, 90])` at its deepest point. Each call is waiting for the one above it.

<figure class="diagram">
<p class="rowname">Newest</p>
<div class="frames">
<div class="node hl"><code>total([])</code><small>base case, returns 0</small></div>
<div class="node"><code>total([90])</code><small>waiting, will add 90</small></div>
<div class="node"><code>total([85, 90])</code><small>waiting, will add 85</small></div>
<div class="node"><code>total([70, 85, 90])</code><small>waiting, will add 70</small></div>
</div>
<p class="rowname" style="margin-top: 10px">Oldest</p>
<figcaption>The call stack for total([70, 85, 90]) when the base case is reached</figcaption>
</figure>

The base case answers first. Its frame disappears, and `total([90])` adds 90 to the 0 it receives and returns 90. The frames leave in the reverse order they arrived, which is why the structure is called a stack: the last call in is the first one out.

## Why Depth Is Limited

The stack is not unlimited. In most runtimes, each thread gets a fixed amount of stack memory when it starts, and the frames of a recursion pile up inside it. A call that doesn't fit makes the program fail, with a **stack overflow**. Python adds its own guard, a limit on how many calls may be pending, and raises a `RecursionError` when it is passed.

The depth you can reach is the stack size divided by the frame size, so it differs by language. We recursed as deep as possible with a one argument function on our laptop.

| Runtime | What Stops It | Depth Reached |
| --- | --- | --- |
| Python 3.13 | Recursion limit, 1,000 by default | About 1,000 |
| Node 22 | Stack size | About 9,200 |
| C, no optimization | 8 MB stack | About 74,000 |
| Go | Stack grows on demand up to a cap, 1 GB by default | Over 30 million, where we stopped |

The numbers vary with the machine and the size of each frame, so read them as orders of magnitude. Java depends on the platform and the setting, and the default thread stack is 1 MB on Linux on x86-64, adjustable with the `-Xss` option.

Python's limit can be raised with `sys.setrecursionlimit`. On Python 3.13, raising it to 200,000 let a 150,000 deep `total` finish. The documentation warns that a limit set too high can crash the interpreter, so raising it is a patch and not a design.

## Depth Is the Space Cost

The memory a recursion uses is its **maximum depth** times the frame size, not the number of calls it makes. These two ideas give different numbers.

- `total` on a list of n scores goes n calls deep, so it needs O(n) stack space, even though a loop needs O(1)
- `ways(35)` from the previous topic makes about 30 million calls, but it is never more than about 35 calls deep, because each call finishes before the next one starts. Its stack space is O(n) and its time is exponential
- A recursion that halves the input each time, like merge sort or binary search, goes about log n deep, which is small even for a billion items

A recursion over a balanced structure stays shallow. A recursion over a lopsided structure, like a list or a tree that is one long chain, goes as deep as the input is long. That is where overflows come from in practice.

## Tail Calls

A **tail call** is a call that is the last thing a function does, with nothing left to do afterward. In that case the caller's frame is no longer needed, and a language could reuse it. The accumulator version of `total` is written that way.

```python
def total(scores, i=0, acc=0):
    if i == len(scores):
        return acc
    return total(scores, i + 1, acc + scores[i])    # a tail call
```

Whether this saves anything depends on the language.

- **Scheme** requires it: an implementation must run an unbounded number of active tail calls. Kotlin's `tailrec` and Scala's `@tailrec` mark a function that the compiler rewrites into a loop
- **Python** doesn't do it, by design. Dropping frames would erase the stack traces developers use to debug, so the tail call version hit the same limit of 1,000 in our test
- **C compilers** may do it when optimization is on. Our recursive sum to 100 million crashed when compiled with no optimization and finished instantly with `-O2`, but the language doesn't promise it

So a tail call is a way to write a loop as a recursion where the language cooperates, and a habit to avoid relying on where it doesn't.

## Living With the Limit

When a recursion could run deep, you have three honest options.

- Write a loop, as in the first sum you ever wrote
- Keep your own stack in a list and loop over it, which [Turning Recursion into Iteration](/algorithms/recursion-to-iteration) walks through
- Change the shape of the recursion so the depth is small, which is what dividing the input in half does

A stack overflow in production often means an input arrived that nobody tested, like a list of a million items or a tree that is a single chain. Testing deep inputs is part of [Edge Cases and Testing](/algorithms/edge-cases).

## Key Points

- A call stack holds one frame for each pending call, and the frames leave in the reverse order they arrived
- Stack memory is limited, so recursion depth is limited, with very different caps in Python, Node, C and Go
- A recursion's space cost is its maximum depth, not its number of calls
- A tail call can reuse its frame in some languages, such as Scheme, but Python doesn't, and C compilers only might
- If the depth can grow with the input, use a loop, your own stack, or a recursion that halves the problem
