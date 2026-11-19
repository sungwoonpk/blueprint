> Reversing a linked list flips its pointers so the last node becomes the first. Merging two sorted lists weaves their nodes into one sorted list. Both are done by relinking the nodes that already exist, without allocating new ones.

Two departments keep waitlists for the same seminar, and each list is sorted by sign-up time. The registrar wants one list, in order, and also a view with the newest sign-ups first. Both are small pointer jobs on [linked lists](/algorithms/linked-lists), and they turn up again and again in bigger algorithms.

## Reversing by Flipping Arrows

Reversing a list means making every `next` pointer point backward. The trap is that flipping a pointer loses the way forward, so the loop saves the rest of the list before it changes anything.

```python
def reverse(head):
    prev, curr = None, head
    while curr is not None:
        nxt = curr.next          # save the rest before overwriting the link
        curr.next = prev         # flip this arrow
        prev, curr = curr, nxt   # step forward
    return prev
```

Two pointers walk the list. `curr` marks the first node not yet handled, and `prev` marks the head of the part already reversed. Here is the loop on Ana, Ben and Cy.

| Step | prev | curr | Reversed So Far | Still to Do |
| --- | --- | --- | --- | --- |
| Start | None | Ana | (empty) | Ana, Ben, Cy |
| 1 | Ana | Ben | Ana | Ben, Cy |
| 2 | Ben | Cy | Ben, Ana | Cy |
| 3 | Cy | None | Cy, Ben, Ana | (empty) |

The table is a loop invariant, in the sense of [Proving Correctness with Loop Invariants](/algorithms/loop-invariants): at each check of the loop condition, the part reversed so far, followed by the part still to do in its original order, hold all the nodes, each one once.

At the start, the reversed part is empty. Each pass moves one node from the second part to the front of the first. When `curr` is `None`, the second part is empty and `prev` heads the whole reversed list.

The loop touches each node once, so it takes O(n) time, and it keeps three pointers, so it needs O(1) extra memory. The empty list and the one node list work without special cases: the loop doesn't run, or runs once, and `prev` is right either way.

## Reversing with Recursion

The same job can be stated recursively, following the pattern from [Thinking Recursively](/algorithms/thinking-recursively). Trust the recursion to reverse everything after the first node, then attach the first node at the end.

```python
def reverse_recursive(head):
    if head is None or head.next is None:
        return head
    new_head = reverse_recursive(head.next)
    head.next.next = head    # the node after head now points back at it
    head.next = None         # head becomes the tail
    return new_head
```

For Ana, Ben and Cy, the recursive call reverses Ben and Cy into Cy, Ben. The node after Ana in the original list is still Ben, and Ben is now the tail of that reversed part, so `head.next.next = head` hangs Ana after Ben. Then `head.next = None` ends the list.

This version is shorter to state and costs a stack frame for each node. We ran it in Python with the default limit: it handled 990 nodes and raised a `RecursionError` at 1,100. The loop reversed a million nodes without trouble, so the iterative form is the one to rely on for long lists. [The Call Stack and Recursion Depth](/algorithms/call-stack) explains the limit.

## Merging Sorted Lists

Merging takes two lists that are each in order and produces one list in order. Look at the front of both lists, take the smaller one, and repeat.

<figure class="diagram">
<p class="rowname">First list</p>
<div class="cells">
<div class="cell hl">1</div>
<div class="cell hl">4</div>
<div class="cell hl">9</div>
</div>
<p class="rowname">Second list</p>
<div class="cells">
<div class="cell">2</div>
<div class="cell">3</div>
<div class="cell">10</div>
</div>
<p class="rowname">Merged</p>
<div class="cells">
<div class="cell hl">1</div>
<div class="cell">2</div>
<div class="cell">3</div>
<div class="cell hl">4</div>
<div class="cell hl">9</div>
<div class="cell">10</div>
</div>
<figcaption>Outlined values came from the first list. Each step takes the smaller of the two fronts</figcaption>
</figure>

```python
def merge(a, b):
    dummy = tail = Node(None)
    while a is not None and b is not None:
        if a.value <= b.value:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next
```

Two details keep the code short. The `dummy` node is a sentinel, like the ones in doubly linked lists: it gives `tail` somewhere to attach the first node, so the first step needs no special case. The last line attaches whichever list still has nodes, because once one list is empty the rest of the other is already in order.

The invariant is that the list built after `dummy` holds the smallest nodes so far, in order, and no node still in `a` or `b` is smaller than the last node placed. Each pass takes the smaller front, which keeps both parts true. The loop runs at most n + m times for lists of lengths n and m, so merging is O(n + m).

Using `<=` takes the first list's node when values are equal, so equal items keep their original order. That property, called stability, matters for sorting, as [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators) explains.

## Where Lists Beat Arrays

Merging two sorted arrays usually needs a third array to write the result into, which costs O(n + m) extra memory. With linked lists the merge only changes pointers, so it needs O(1) extra memory beyond the nodes themselves. This is one of the jobs where a linked list is the better structure: the nodes get woven together without being copied.

The merge step is also the heart of [Merge Sort](/algorithms/merge-sort), and merging many lists at once comes back in [Merging K Sorted Lists](/algorithms/k-way-merge). Reversal is the building block for problems such as checking whether a list reads the same backward, where you reverse the second half and compare.

Both operations have the same edge cases to check. Try the empty list, a one node list and, for merging, one list empty or one list entirely smaller than the other. A list that accidentally loops back on itself breaks the assumption that a walk ends at `None`, and [Fast and Slow Pointers](/algorithms/fast-slow-pointers) shows how to detect that.

## Key Points

- Reverse a list by flipping each pointer, and save the next node first so the rest of the list isn't lost
- The loop invariant is that the reversed part plus the remaining part holds each node once, which gives O(n) time and O(1) extra memory
- The recursive version is short but uses a stack frame for each node, so it fails on long lists in languages with a low recursion limit
- Merging sorted lists repeatedly takes the smaller front node, and a dummy head node avoids a special case for the first one
- Merging linked lists needs no extra memory because it only relinks nodes, while merging arrays usually needs a new array
