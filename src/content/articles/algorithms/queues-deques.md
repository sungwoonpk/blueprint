> A **queue** is a collection where the first item added is the first one removed, known as first in, first out. A **deque**, short for double-ended queue, lets you add and remove at both ends.

At the registrar's office, the person who arrived first is served first. Print jobs, support tickets and office hour sign-ups work the same way. The structure behind all of them is the queue, and it has one rule: items leave in the order they came.

## First In, First Out

A queue has two main operations. **Enqueue** adds an item at the back, and **dequeue** removes the item at the front. Like the operations of [Stacks](/algorithms/stacks), each should take O(1) time, since they only touch the ends.

The natural first attempt in Python is a list, with `append` at the back and `pop(0)` at the front. It works, and it is slow, because removing the first item shifts every other item one slot, the same cost as inserting at the front of an array in [Arrays and Dynamic Arrays](/algorithms/arrays). We emptied queues of three sizes both ways.

| Items in the Queue | list.pop(0) | deque.popleft() |
| --- | --- | --- |
| 50,000 | 166 ms | 1.2 ms |
| 100,000 | 694 ms | 2.2 ms |
| 200,000 | 2,676 ms | 4.4 ms |

The list column quadruples when the size doubles, the O(n²) pattern in total. The `deque` column roughly doubles, which is linear in total and O(1) for each dequeue.

## Two Ways to Build One

A queue needs fast access at both ends. There are two standard designs.

**A linked list with two pointers.** Keep a pointer to the head and one to the tail. Enqueue attaches a node after the tail, and dequeue removes the head. Both are O(1), and the size can grow without any copying. The cost is the usual one for the lists of [Singly and Doubly Linked Lists](/algorithms/linked-lists): a pointer for each item and scattered memory.

**A circular buffer.** Use an array, and a **head** index that says where the oldest item is. New items go at the position `head + size`, and when an index runs off the end of the array it wraps around to the start.

<figure class="diagram">
<div class="cells ptrs">
<div class="cell done">e<small>0</small></div>
<div class="cell done">f<small>1</small></div>
<div class="cell dim" data-ptr="next"><small>2</small></div>
<div class="cell dim"><small>3</small></div>
<div class="cell hl" data-ptr="head">c<small>4</small></div>
<div class="cell done">d<small>5</small></div>
</div>
<figcaption>A circular buffer with room for six. The queue holds c, d, e, f in that order and has wrapped around the end of the array. The next item will be written at the slot marked next</figcaption>
</figure>

```python
class RingQueue:
    def __init__(self, capacity):
        self.items = [None] * capacity
        self.head = 0                  # index of the oldest item
        self.size = 0

    def enqueue(self, x):
        if self.size == len(self.items):
            raise OverflowError("queue is full")
        self.items[(self.head + self.size) % len(self.items)] = x
        self.size += 1

    def dequeue(self):
        if self.size == 0:
            raise IndexError("queue is empty")
        x = self.items[self.head]
        self.items[self.head] = None
        self.head = (self.head + 1) % len(self.items)
        self.size -= 1
        return x
```

No item moves when one leaves: only the head index advances, and the slot gets reused later. The `size` counter settles an ambiguity, since a full buffer and an empty one can look the same if you only compare the head and the next write position. We tested this against Python's `deque` on 2,000 random sequences of enqueues and dequeues and the results matched.

Rust's `VecDeque` is a growable circular buffer, and Java's `ArrayDeque` is a resizable array used the same way, so growing one follows the doubling idea from [Amortized Analysis](/algorithms/amortized-analysis). Operating system code uses fixed size buffers of this kind between a producer and a consumer. When the size is a power of two, the wrap around can use a bit mask instead of a remainder, which is a little faster.

## Deques

A **deque** allows adding and removing at both ends, so it can act as a queue, a stack or both at once. Python's `collections.deque` has `append` and `pop` at the right end, and `appendleft` and `popleft` at the left, all O(1). Reading by index is fast near either end and O(n) in the middle, so it is not a replacement for a list when you need random access.

A deque can also remember only the most recent items. With `maxlen`, adding to a full deque pushes out an item from the opposite end.

```python
from collections import deque

recent = deque(maxlen=3)
for student in ["Ana", "Ben", "Cy", "Dee", "Eli"]:
    recent.append(student)

print(list(recent))        # ['Cy', 'Dee', 'Eli']
```

That is the last three check-ins at the library door, with no code to drop old entries. Java's `ArrayDeque` plays the same role, and its documentation says it is likely faster than `LinkedList` as a queue and faster than `Stack` as a stack.

## Example: Office Hours Round Robin

A queue also fits turn taking. In office hours, each student gets five minutes at a time. A student who isn't finished goes to the back of the line, so a single long question doesn't block the rest.

```python
def round_robin(jobs, quantum):
    q = deque(jobs)
    order = []
    while q:
        name, left = q.popleft()
        used = min(quantum, left)
        order.append((name, used))
        if left > used:
            q.append((name, left - used))
    return order
```

For Ana needing 12 minutes, Ben 4 and Cy 9, with turns of 5, the order is Ana 5, Ben 4, Cy 5, Ana 5, Cy 4, Ana 2. Ben is done after his first turn, and the long jobs keep returning to the back. This is the **round robin** scheduling idea used by operating systems to share a processor.

## Where Queues Run

Queues connect parts of a system that work at different speeds. Python's asyncio event loop keeps the callbacks that are ready to run in a deque, and `call_soon` runs them in first in, first out order. [Breadth-First Search](/algorithms/breadth-first-search) uses a queue to visit nodes in order of distance from the start, and message queues between services apply the same idea at larger scale.

When the order should depend on priority and not arrival time, a queue is the wrong tool, and [Heaps and Priority Queues](/algorithms/heaps) is the next step.

## Key Points

- A queue is first in, first out, with enqueue at the back and dequeue at the front, each O(1)
- A Python list is a poor queue because `pop(0)` shifts every item, and `collections.deque` fixes it
- Queues are built from a linked list with head and tail pointers, or from an array used as a circular buffer
- A deque works at both ends, and a deque with `maxlen` keeps only the most recent items
- Queues fit turn taking and breadth-first search, wherever things should be handled in arrival order
