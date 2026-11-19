> A **linked list** keeps each item in its own **node**, which also holds a pointer to the next node. A **doubly linked list** adds a pointer to the previous node. The nodes can sit anywhere in memory.

A seminar is full, so the department keeps a waitlist. Students join at the back, and the first on the list gets the next open seat. Now and then someone in the middle gives up and drops off. With an array, removing a student from the middle shifts everyone behind them. A linked list handles that differently: it lets you unhook one node without touching the rest.

## Nodes and Pointers

An array finds items by position. A linked list finds them by following arrows. Each node holds a value and a pointer to the next node, the list keeps a pointer to the first node, called the **head**, and the last node points to nothing.

<figure class="diagram">
<div class="flow">
<div class="node">head<small>first</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Ana</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Ben</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Cy</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">None</div>
</div>
<figcaption>A singly linked waitlist of three students</figcaption>
</figure>

```python
class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

def length(head):
    count = 0
    while head is not None:
        count += 1
        head = head.next
    return count
```

Reaching the fifth student means following four arrows, so reading by position costs O(n). That is the price of giving up the address arithmetic from [Arrays and Dynamic Arrays](/algorithms/arrays).

## What Gets Cheap

The gain is in changing the list. To add a student after one you already hold, rewire two pointers and leave every other node where it is.

<figure class="diagram">
<p class="rowname">Before</p>
<div class="flow packets">
<div class="node">Ana</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Cy</div>
</div>
<p class="rowname">After adding Ben after Ana</p>
<div class="flow packets">
<div class="node">Ana</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Ben</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Cy</div>
</div>
<figcaption>Two pointers changed, and the other nodes didn't move</figcaption>
</figure>

```python
def insert_after(node, value):
    new = Node(value)
    new.next = node.next      # first remember the rest of the list
    node.next = new           # then link the new node in
```

The order of those two lines matters. If you point `node.next` at the new node first, the only record of the rest of the list is gone, and the new node ends up pointing at itself.

Removing a node is the same kind of edit: make its predecessor skip over it. The cost is O(1) once you hold the predecessor, with no shifting of anything.

## Doubly Linked Lists

A singly linked list can only move forward, so removing a node you hold needs its predecessor, which means walking from the head. A **doubly linked list** keeps a `prev` pointer too. A node can then remove itself, and the list can be walked in both directions, at the cost of one more pointer for each node.

The code is shorter if the list has two **sentinel** nodes, empty placeholders at both ends, because then no node has a missing neighbor and there are no special cases for the first and last items.

```python
class Node:
    def __init__(self, value=None):
        self.value, self.prev, self.next = value, None, None

class DoublyLinkedList:
    def __init__(self):
        self.head, self.tail = Node(), Node()      # sentinels
        self.head.next, self.tail.prev = self.tail, self.head

    def insert_after(self, node, value):
        new = Node(value)
        new.prev, new.next = node, node.next
        node.next.prev = new
        node.next = new
        return new

    def remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev
```

We checked this against a Python list over 500 random sequences of inserts and removals, and the contents matched at every step. Here is how the structures compare, where "holding a node" means you already have a reference to it.

| Operation | Array | Singly Linked | Doubly Linked |
| --- | --- | --- | --- |
| Read the i-th item | O(1) | O(n) | O(n) |
| Insert or delete at the front | O(n) | O(1) | O(1) |
| Add at the end | O(1) on average | O(1) with a tail pointer | O(1) |
| Insert after a node you hold | O(n) | O(1) | O(1) |
| Delete a node you hold | O(n) | O(n), needs its predecessor | O(1) |
| Find a value | O(n) | O(n) | O(n) |

## The Catch

On paper the linked list looks like a winner for edits. In practice it often loses, because the table counts steps and not the cost of each step.

Each node is a separate object with a pointer, and a pointer costs memory. A Python node with two attributes took 48 bytes in our run, even in its leanest form and before counting the value it points to, while an array slot is 8 bytes.

Then there is where the nodes live. An array's neighbors are neighbors in memory, so the processor's cache brings several items at once. Nodes can be anywhere, and following a pointer to a distant address is slow. We built a list of 10 million nodes in C and added up the values.

| Layout | Time to Add Up 10 Million Values |
| --- | --- |
| Array | 1.1 ms |
| List, nodes in memory order | 3.3 ms |
| List, nodes in random memory order | 1,009 ms |

The same list, with the same arrows, went from 3 ms to a full second after its nodes were scattered. A list that has lived through many inserts and deletes looks more like the last row than the middle one.

The advantage on edits is not as clear as it seems either. Inserting at a random position needs the position first, and a linked list finds it by walking. We inserted 20,000 items at random positions in a list of 100,000. The array shifted items with a block copy and took 162 ms. The linked list walked to each position and took 1,426 ms, nearly nine times longer, even though its nodes sat in mostly sequential memory. Rust's documentation for its own linked list gives similar advice: reach for a vector or a ring buffer first, because array based containers are usually faster and use less memory.

## Where Linked Lists Win

Linked lists earn their place when you already hold the node and want to edit around it, or when other code holds pointers to nodes that shouldn't move.

- **Edit at a node you hold**: unlink it or insert next to it in O(1), with no search. A cache that moves the most recently used entry to the front does this on every access, as in [Building an LRU Cache](/algorithms/lru-cache)
- **Stable addresses**: nodes stay where they are when others are added or removed, so a pointer to one stays valid
- **Several lists at once**: the Linux kernel embeds the link fields inside its own structures, so one object can sit on several lists and no separate node has to be allocated. Its documentation warns about poor locality too, and calls a plain array the better choice where one would do
- **Joining lists**: connecting the end of one list to the head of another is a pointer change

[Reversing and Merging Linked Lists](/algorithms/reversing-merging-lists) works with the pointer edits in this article, and [Stacks](/algorithms/stacks) and [Queues and Deques](/algorithms/queues-deques) show structures that are often built on top of them.

## Key Points

- A linked list stores each item in a node with a pointer to the next one, and a doubly linked list adds a pointer to the previous one
- Reading by position costs O(n), but insert and delete at a node you hold cost O(1), with no shifting
- When relinking, set the new node's pointer before changing the old one, or the rest of the list is lost
- Sentinel nodes at both ends remove the special cases for the first and last item
- Pointers cost memory and scatter the nodes, so arrays are often faster in practice, even for inserts in the middle
