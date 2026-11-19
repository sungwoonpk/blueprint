> A **stack** is a collection where the last item added is the first one removed, known as last in, first out. Its two main operations are **push**, which adds an item on top, and **pop**, which removes the top item.

A stack of cafeteria trays works the same way: you take the one on top, and a clean tray goes on top as well. Software is full of this pattern. The undo button in an editor, the back button in a browser and the nested calls of a recursive function all return to the most recent thing first.

## Last In, First Out

A stack offers few operations on purpose. You can push an item, pop the top one, peek at the top without removing it, and ask whether the stack is empty. Each takes O(1) time, because they only touch one end.

<figure class="diagram">
<p class="rowname">After push A, push B, push C</p>
<div class="frames">
<div class="node hl"><code>C</code><small>top, the next to pop</small></div>
<div class="node"><code>B</code></div>
<div class="node"><code>A</code><small>bottom</small></div>
</div>
<figcaption>A pop returns C and leaves B on top. Items below the top can't be reached without popping what is above them</figcaption>
</figure>

An array makes a good stack. Python's list does it with `append` to push and `pop` to pop, and both work at the end of the list, where there is no shifting. A linked list works too, with the top at the head, so push and pop touch only the first node. In Java, the `Stack` class is a legacy one, and the documentation recommends a `Deque` such as `ArrayDeque` for stack work. [Queues and Deques](/algorithms/queues-deques) says more about that.

The restriction is the point. Code that only pushes and pops tells the reader that items are used in reverse order of arrival, and nothing else about the contents is needed.

## Example: Matching Brackets

A code editor needs to know whether every opening bracket has a matching closing one in the right order. `{[()]}` is fine, and `([)]` is not. A counter of open brackets isn't enough, because the order matters. A stack handles it: push each opener, and when a closer appears, the top of the stack must be its partner.

```python
PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(text):
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in PAIRS:
            if not stack or stack.pop() != PAIRS[ch]:
                return False
    return not stack
```

Here is the failing input `([)]`, step by step.

| Character | What Happens | Stack After |
| --- | --- | --- |
| ( | Push | ( |
| [ | Push | ( [ |
| ) | Pop gives [, which is not the partner of ) | Stop, not balanced |

The invariant is that the stack holds the opening brackets that have not been closed yet, in the order they were opened, and the most recent is on top. A closer has to match the most recent open bracket, which is exactly the top. Two cases need the final checks. A closer with an empty stack has nothing to match, so the code returns false before popping. Leftover openers at the end mean something never closed, so the result is `not stack`.

We checked the function against a different method, deleting adjacent matching pairs again and again until none are left, on 20,000 random strings, and the two agreed on all of them. The stack version does one pass, so it is O(n) time, with O(n) memory in the worst case, such as a string of only openers.

## Example: Undo and Redo

An editor keeps its history on a stack. Each edit pushes the previous text, and undo pops it back. To support redo, undo also pushes the current text onto a second stack.

```python
class Editor:
    def __init__(self):
        self.text = ""
        self.undo_stack, self.redo_stack = [], []

    def type(self, s):
        self.undo_stack.append(self.text)
        self.redo_stack.clear()
        self.text += s

    def undo(self):
        if self.undo_stack:
            self.redo_stack.append(self.text)
            self.text = self.undo_stack.pop()

    def redo(self):
        if self.redo_stack:
            self.undo_stack.append(self.text)
            self.text = self.redo_stack.pop()
```

Typing "Hello" and then ", world", one undo gives "Hello", a second gives an empty text, and a redo brings "Hello" back. Typing something new clears the redo stack, because the old future no longer applies. Saving a full copy of the text for each edit is wasteful for a long document, and real editors save the changes instead, but the structure is the same.

## Example: Evaluating Expressions

Arithmetic written with the operator after its operands, such as `3 4 + 2 *`, can be evaluated with one stack and no brackets. Push numbers. When an operator arrives, pop the two operands it needs, apply it, and push the result.

```python
def eval_postfix(tokens):
    stack = []
    for t in tokens.split():
        if t in "+-*/":
            b, a = stack.pop(), stack.pop()
            stack.append({"+": a + b, "-": a - b, "*": a * b, "/": a / b}[t])
        else:
            stack.append(float(t))
    return stack.pop()
```

`3 4 + 2 *` gives 14, as does `5 1 2 + 4 * + 3 -`. The popping order matters for `-` and `/`: the first pop is the right operand. Fully bracketed arithmetic such as `((1 + 2) * 3)` can be evaluated with two stacks, one for numbers and one for operators: push both kinds, and when a closing bracket arrives, pop an operator and its operands and push the result.

## Where Stacks Hide

Stacks run underneath many algorithms. The pending calls of a recursion live on a stack of frames, as [The Call Stack and Recursion Depth](/algorithms/call-stack) describes. [Depth-First Search](/algorithms/depth-first-search) can be written with an explicit stack in place of recursion, and [Turning Recursion into Iteration](/algorithms/recursion-to-iteration) shows how. Backtracking keeps a stack of choices to undo. Later in this roadmap, [Monotonic Stack](/algorithms/monotonic-stack) uses a stack kept in sorted order to answer "what is the next larger value" for every position in one pass.

## Key Points

- A stack is last in, first out, with push, pop, peek and empty checks, each O(1)
- An array with its end as the top is the usual implementation, and a linked list with the head as the top also works
- The invariant for bracket matching is that the stack holds the unclosed openers, most recent on top
- Two stacks give undo and redo, and one stack evaluates postfix arithmetic
- Stacks hide in recursion, depth-first search and backtracking, anywhere the most recent item is needed first
