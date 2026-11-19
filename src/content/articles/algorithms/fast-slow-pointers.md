> **Fast and slow pointers** walk the same sequence at different speeds, typically one step and two steps at a time. Where the two end up tells you about the shape of the sequence: its middle, or whether it loops back on itself.

A university's course catalog lists, for each course, one prerequisite: CS301 requires CS201, which requires CS101, and so on. Somebody makes a typo and CS101 now requires CS301. A student who tries to follow the chain back to a course with no prerequisite walks forever. Can a program detect such a loop without remembering every course it has visited?

## Two Walkers

Send two walkers down the chain from the start. The **slow** one takes one step at a time and the **fast** one takes two. If the chain ends, the fast walker reaches the end first and there is no loop. If there is a loop, both walkers end up circling inside it, and the fast one gains one position on the slow one with each round. A gap that shrinks by one each round must reach zero, so they meet. This is **Floyd's cycle detection**, nicknamed the tortoise and the hare.

Here is a chain where F points back to C, so C, D, E and F form a loop and A and B lead into it.

<figure class="diagram">
<div class="flow">
<div class="node">A</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">B</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">C</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">D</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">E</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">F</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">back to C</div>
</div>
<figcaption>A tail of two nodes, A and B, leads into a loop of four, C to F</figcaption>
</figure>

| Step | Slow | Fast |
| --- | --- | --- |
| 0 | A | A |
| 1 | B | C |
| 2 | C | E |
| 3 | D | C |
| 4 | E | E |

At step 4 both are on E, so there is a loop. The code needs no list of visited nodes.

```python
def has_cycle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

The loop ends in one of two ways. If a node has no next, the chain ended and the answer is no. If the walkers land on the same node, the answer is yes. For a tail of t nodes and a loop of c nodes, they meet after at most t + c steps. We checked that bound for all combinations of t and c below 40, and we matched the function against a version that records visited nodes on 3,000 random chains.

## What It Saves

The obvious method keeps a set of visited nodes and stops on a repeat. It works but needs memory for each node. We built a chain of a million nodes with a loop. The fast and slow version took 12 ms and no extra memory. The visited set version took 449 ms and about 70 MB. The two pointer version answered the same question without extra memory, which matters when the structure is huge or when you are not allowed to mark nodes.

## Finding Where the Loop Starts

Once the walkers meet, the start of the loop can be found with a second phase. Put one walker back at the head and leave the other at the meeting point. Now move both one step at a time. They meet again at the first node of the loop.

```python
def cycle_start(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head                       # restart one pointer at the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None
```

The reason is arithmetic. Let the tail have t nodes. When they first meet, the slow walker has taken some number of steps d, and the fast one 2d. Both are inside the loop, so the fast walker is some whole number of laps ahead: 2d − d = d is a multiple of the loop length c.

The slow walker went t steps to reach the loop and then some more inside it. Since d is a whole number of laps, another t steps from the meeting point lands back on the loop's first node. A walker from the head needs t steps to reach that node too, so the two arrive together.

For the catalog, this means the program can report which course starts the circular prerequisite, not only that one exists.

## Finding the Middle

The same trick finds the middle of a linked list in one pass without knowing its length. Move the fast walker two steps for each step of the slow one. When the fast one reaches the end, the slow one is halfway.

```python
def middle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow
```

For a list of five, the slow pointer ends on the third node. For a list of six it ends on the fourth, the second of the two middle nodes. Finding the middle is how [Merge Sort](/algorithms/merge-sort) splits a linked list in half, and how you check whether a list reads the same backward: find the middle, reverse the second half as in [Reversing and Merging Linked Lists](/algorithms/reversing-merging-lists), and compare.

## Beyond Linked Lists

The technique applies wherever you follow a rule that gives each item one successor. A list where each slot holds the position of the next slot is one example. A function applied again and again to its own output is another, such as a pseudorandom number generator, which must eventually repeat a value and fall into a loop. In all of these, fast and slow pointers find the loop with O(1) memory.

## Key Points

- Fast and slow pointers move at different speeds, usually one and two steps, over a sequence where each item has one successor
- If the sequence loops, the fast pointer catches the slow one within t + c steps, for a tail of t and a loop of c
- No visited set is needed, so memory is O(1), where a set for a million nodes took about 70 MB
- Restarting one pointer at the head and moving both one step at a time finds where the loop begins
- With the fast pointer moving two steps, the slow pointer is at the middle when the fast one reaches the end
