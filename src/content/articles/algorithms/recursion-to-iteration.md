> A recursive algorithm can be rewritten as a loop by keeping its pending work on a stack of your own, in place of the call stack. The work stays the same, and the depth is limited only by memory.

Recursion has a ceiling, as [The Call Stack and Recursion Depth](/algorithms/call-stack) showed: Python stops at about a thousand nested calls. Some inputs go deeper than that, such as a folder tree nested thousands of levels, a long linked list or a document from an untrusted source. Moving the recursion into a loop removes the ceiling.

## When the Recursion Is a Loop in Disguise

The simplest case is a **tail call**, where the recursive call is the last thing the function does. No work is waiting for the result, so the function can replace its own arguments and start again. Here is binary search written recursively.

```python
def contains_rec(a, target, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo > hi:
        return False
    mid = (lo + hi) // 2
    if a[mid] == target:
        return True
    if a[mid] < target:
        return contains_rec(a, target, mid + 1, hi)
    return contains_rec(a, target, lo, mid - 1)
```

Each recursive call returns whatever its smaller call returns, so the call is a tail call. To remove the recursion, turn the arguments into variables, and the call into an assignment followed by another trip around a loop.

```python
def contains_loop(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return True
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

This is the loop from [Proving Correctness with Loop Invariants](/algorithms/loop-invariants). The invariant there plays the role of the recursive function's precondition: it describes what must be true each time the function is entered or the loop condition is checked.

The base case becomes the loop condition, and the recursive call becomes the update of `lo` and `hi`. We ran both versions against Python's own membership test on 2,000 random lists and every target from −1 to 50, and all three agreed.

## The General Method: Your Own Stack

Most recursions aren't tail calls. A folder's size is its own files plus the sizes of its subfolders, and after each recursive call the function still has an addition to do. The call stack remembers that unfinished work. To do without it, keep the pending work in a list.

```python
def total_size(root):
    size, stack = 0, [root]
    while stack:
        folder = stack.pop()
        size += sum(folder["files"])
        stack.extend(folder["folders"])
    return size
```

The stack holds the folders still to be visited. Each pass takes one off, adds its own files and pushes its subfolders. This works because addition doesn't care about the order. We ran it on a chain of 1,000,000 nested folders and it returned 1,000,000. The recursive version from [Thinking Recursively](/algorithms/thinking-recursively) raised a `RecursionError` on a chain of 2,000.

## Remembering Where to Resume

Some recursions need to do work after the calls return, such as storing each folder's total size on the folder. The function can't finish a folder until its subfolders are done, so each stack entry has to remember whether it has been opened yet.

```python
def annotate_sizes(root):
    stack = [(root, False)]
    while stack:
        folder, children_done = stack.pop()
        if not children_done:
            stack.append((folder, True))        # come back to this folder later
            for sub in folder["folders"]:
                stack.append((sub, False))
        else:
            folder["total"] = (sum(folder["files"])
                               + sum(s["total"] for s in folder["folders"]))
```

The first time a folder is popped, it pushes itself back marked as done, and then its subfolders on top of it. The subfolders are popped and finished first, so by the time the folder is popped again, every subfolder already has its `total`.

The flag is the **resume point**, the part of a call frame that says where to continue. In general, an entry on your own stack is a copy of what the call stack would have held: the arguments, plus a marker for how far the call has got.

We compared this against the recursive version on 300 random trees, and every folder's total matched. On the 1,000,000 chain it finished, where the recursive version fails.

## Order and Cost

Two practical points come up when you convert.

**Order.** A stack gives the last item pushed first. If the recursion visited children left to right, push them in reverse order so the first child ends on top. For a sum, which doesn't care, the order doesn't matter. For [Depth-First Search](/algorithms/depth-first-search), it can.

**Cost.** The time is the same, because the same work happens in the same number of steps. On a wide tree with 200,000 folders, the recursive version took 15.2 ms and the loop 15.6 ms, so there is no speed to gain. Memory is the same order too: the stack holds as many entries as the recursion would have frames. The difference is where it lives. The call stack has a small fixed size, and your list can use as much memory as the machine has.

## When It Matters

Recursion is clearer for most problems, and the loop version earns its keep in a few places.

- **Deep inputs**: nesting or chains that can grow with the input, as in folders, linked lists and trees that degenerate into chains
- **Untrusted input**: Python's `json.loads` handled 5,000 levels of nested arrays in our test, and it raised a `RecursionError` at 100,000. Anything that parses data a stranger can send needs a depth limit or a loop
- **Languages without tail calls**: as in Python, where a tail call still uses a frame

If the depth is small and bounded, such as halving a problem, the recursive form is fine. [Stacks](/algorithms/stacks) covers the structure behind all of this, and [Depth-First Search](/algorithms/depth-first-search) uses it constantly.

## Key Points

- A tail recursive function becomes a loop by turning its arguments into variables and its recursive call into an update
- Other recursions become loops by pushing the pending calls on your own stack, with a flag that records where to resume when work remains after the calls return
- Push children in reverse order if the visiting order matters, because a stack returns the last item pushed first
- The time and the memory are the same order, and the gain is that your stack isn't limited to the call stack's small size
- Convert when depth can grow with the input, especially for input from outside your program
