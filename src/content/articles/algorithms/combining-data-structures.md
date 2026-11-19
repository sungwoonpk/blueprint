> **Combining data structures** means building a new structure from two or more existing ones, so that each operation uses the part that does it fastest, and the parts are kept in agreement.

Each structure so far is good at some things and bad at others. An array reads by position, a hash table finds by key, a linked list removes a node you hold, and a stack gives the most recent item. Real problems often need operations from several of these at once. [Building an LRU Cache](/algorithms/lru-cache) already did it with a hash map and a linked list. This page turns that into a method, with three more examples.

## The Ingredients

Here is what each structure from this phase does best, and what it can't do quickly.

| Structure | Fast | Slow |
| --- | --- | --- |
| Array | Read by position, add or remove at the end | Find a value, remove from the middle |
| Hash table | Find, add and remove by key | Anything by position or order |
| Doubly linked list | Remove or insert at a node you hold | Reach a node by position or by value |
| Stack | Add and remove the most recent item | Anything else |

A design starts by listing the operations the problem needs and what each should cost. When no single row covers the list, the answer is often two structures with a link between them, so that an item found in one can be reached in the other without searching.

## Example: A Set You Can Pick From at Random

A raffle at a campus event lets people sign in, lets them leave, and draws a winner at random from whoever is present. The operations are add, remove and pick a random member, and each should be O(1).

A hash set handles add and remove but has no positions, so a random pick means copying everything out first. An array can pick a random position in one step, but finding a person to remove means a scan. The combination keeps both: an array of the members, and a hash map from each member to their position in the array.

```python
import random

class RandomSet:
    def __init__(self):
        self.items = []          # the members, in no particular order
        self.index = {}          # member -> position in items

    def add(self, x):
        if x in self.index:
            return False
        self.index[x] = len(self.items)
        self.items.append(x)
        return True

    def remove(self, x):
        if x not in self.index:
            return False
        i = self.index.pop(x)
        last = self.items.pop()          # take the last member off the end
        if i < len(self.items):          # if x was elsewhere, move last into its place
            self.items[i] = last
            self.index[last] = i
        return True

    def pick(self):
        return random.choice(self.items)
```

Removing from the middle of an array shifts everything after it, which is O(n). The trick is to avoid the shift: overwrite the removed member with the last one, then shorten the array by one.

<figure class="diagram">
<p class="rowname">Remove b</p>
<div class="cells">
<div class="cell">a<small>0</small></div>
<div class="cell bad">b<small>1</small></div>
<div class="cell">c<small>2</small></div>
<div class="cell hl">d<small>3</small></div>
</div>
<p class="rowname">After: d takes b's place</p>
<div class="cells">
<div class="cell">a<small>0</small></div>
<div class="cell hl">d<small>1</small></div>
<div class="cell">c<small>2</small></div>
</div>
<figcaption>The order changes, which doesn't matter for a set. The index map must record that d now lives at position 1</figcaption>
</figure>

The hash map is what makes this safe: it says where each member lives, and the move updates one entry. The two structures agree if `index[x] == i` exactly when `items[i] == x`, and every method has to keep that true. We checked it after every step in 3,000 random sequences of adds and removes against a plain Python set. On 100,000 members, picking one at random by copying the set to a tuple first took 0.40 ms, and `RandomSet` took 0.19 µs, about 2,000 times less.

## Example: A Stack That Knows Its Minimum

Suppose a stack must also report its smallest item at any moment, in O(1). A plain stack can't, since finding the minimum means looking at everything. The fix is to store, with each item, the smallest value at or below it.

```python
class MinStack:
    def __init__(self):
        self.stack = []                  # pairs: (value, smallest so far)

    def push(self, x):
        smallest = x if not self.stack else min(x, self.stack[-1][1])
        self.stack.append((x, smallest))

    def pop(self):
        return self.stack.pop()[0]

    def minimum(self):
        return self.stack[-1][1]
```

<figure class="diagram">
<p class="rowname">After push 5, push 3, push 7</p>
<div class="frames">
<div class="node hl"><code>7</code><small>smallest so far: 3</small></div>
<div class="node"><code>3</code><small>smallest so far: 3</small></div>
<div class="node"><code>5</code><small>smallest so far: 5</small></div>
</div>
<figcaption>Each entry carries the smallest value at or below it, so the top entry knows the minimum</figcaption>
</figure>

Popping 7 leaves 3 on top, whose entry already says the minimum is 3, and nothing needs recomputing. The second value is a second structure in disguise: a stack of minimums running in step with the stack of values. Each operation does O(1) work, and we tested it against `min` on 2,000 random sequences.

## Example: A Queue Made of Two Stacks

Sometimes the missing piece is a restriction. Suppose only stacks are available, but you need a queue. Two stacks will do it. New items go onto an **inbox** stack. Items leave from an **outbox** stack, and when the outbox is empty, the whole inbox is poured into it. The pour reverses the order, so the oldest item ends up on top.

```python
class TwoStackQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []

    def enqueue(self, x):
        self.inbox.append(x)

    def dequeue(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())
        return self.outbox.pop()
```

One dequeue can take O(n) when it triggers a pour. The total is small, because each item is moved from inbox to outbox at most once in its life. In a run of 100,000 enqueues and 100,000 dequeues, items moved 100,000 times in all, half a move for each operation. The cost per operation is O(1) amortized, the argument from [Amortized Analysis](/algorithms/amortized-analysis).

## A Method for Designing Them

Here are the four designs side by side.

| Combination | What It Gains | How the Parts Link |
| --- | --- | --- |
| Hash map and doubly linked list | O(1) lookup and O(1) move or evict | Each map value is a node |
| Array and hash map | O(1) random pick and delete by value | Each map value is an array position |
| Stack and a stack of minimums | O(1) minimum | An entry for each value |
| Two stacks | A queue from stacks | Inbox and outbox |

They all follow the same steps.

1. List the operations and the cost you want for each
2. Pick the structure that serves each operation, and notice where one can't serve another
3. Link the structures so an item found in one can be reached in the other without searching: a pointer, a position, or a parallel entry
4. State the invariant that says the parts agree, and make every operation restore it before it returns
5. Test against a simple slow version, as we did here, since bugs in these designs hide in the cases where the parts drift apart

The costs of combining are memory, since each item is stored or referenced twice, and care, since an update has to change both structures. Later chapters build on the same method: [Heaps and Priority Queues](/algorithms/heaps) can keep a position map so that a key can be changed in place, and [Running Medians with Two Heaps](/algorithms/two-heaps) keeps the lower and upper halves of a stream in two heaps to track the median as items arrive.

## Key Points

- When no single structure supports all the operations you need, combine two and link them
- The link is a pointer, a position or a parallel entry, so an item found in one is reached in the other without searching
- An invariant states that the parts agree, and every operation has to restore it
- Examples: hash map and linked list for LRU, array and hash map for random pick, a stack of minimums, and two stacks for a queue
- Test each design against a simple slow one, since the bugs appear where the parts drift apart
