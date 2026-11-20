> A **heap** is a complete binary tree stored in an array, where every parent is no larger than its children (a min-heap) or no smaller (a max-heap). A **priority queue** is the structure it implements: add items in any order, and always take the one with the highest priority next.

The registrar's help desk serves students in order of urgency, not arrival: a student locked out of an exam portal is helped before one asking about a parking permit. New requests arrive all day, and each time a desk frees up, the most urgent waiting request must be found fast. Sorting the whole list after each arrival is wasteful. A heap keeps just enough order that the most urgent item is always on top.

## One Rule, Stored in an Array

In a **min-heap**, each node is less than or equal to both of its children. Nothing is said about how a node compares with its siblings or cousins, so a heap is only partly sorted. The rule still guarantees one thing: the smallest item is at the root.

The tree is complete, so it fits in an array with no links, as in [Binary Trees](/algorithms/binary-trees): the children of position `i` are at `2i + 1` and `2i + 2`, and its parent is at `(i − 1) // 2`.

<figure class="diagram">
<div class="flow packets tree">
<div class="node hl">1</div>
</div>
<div class="flow packets tree">
<div class="node">3</div>
<div class="node">2</div>
</div>
<div class="flow packets tree">
<div class="node">5</div>
<div class="node">9</div>
<div class="node">8</div>
<div class="node">7</div>
</div>
<div class="cells">
<div class="cell hl">1<small>0</small></div>
<div class="cell">3<small>1</small></div>
<div class="cell">2<small>2</small></div>
<div class="cell">5<small>3</small></div>
<div class="cell">9<small>4</small></div>
<div class="cell">8<small>5</small></div>
<div class="cell">7<small>6</small></div>
</div>
<figcaption>A min-heap as a tree and as the array underneath. Position 1 holds 3, and its children at positions 3 and 4 hold 5 and 9, both larger</figcaption>
</figure>

## Adding and Removing

Both operations break the rule locally and then repair it along one path of the tree, whose length is the height, about log₂ n.

**Push** puts the new item in the first free slot at the end of the array, which keeps the tree complete, and then **sifts it up**: while it is smaller than its parent, swap them.

**Pop** takes the smallest item from the root. To keep the tree complete, the last item in the array moves into the root's place, and then it **sifts down**: while it is larger than its smaller child, swap with that child.

```python
class MinHeap:
    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)
        i = len(a) - 1
        while i > 0:                                  # sift up
            parent = (i - 1) // 2
            if a[i] < a[parent]:
                a[i], a[parent] = a[parent], a[i]
                i = parent
            else:
                break

    def pop(self):
        a = self.a
        top = a[0]
        last = a.pop()
        if a:
            a[0] = last
            i, n = 0, len(a)
            while True:                               # sift down
                child = 2 * i + 1
                if child >= n:
                    break
                if child + 1 < n and a[child + 1] < a[child]:
                    child += 1                        # the smaller child
                if a[child] < a[i]:
                    a[i], a[child] = a[child], a[i]
                    i = child
                else:
                    break
        return top
```

Starting from the heap above, pushing 0 puts it at the end, and it floats up through 5 and 3 and 1 to the root, ending as `0, 1, 2, 3, 9, 8, 7, 5`. Popping returns 0 and moves the 5 from the end to the top, where it sinks back down to give `1, 3, 2, 5, 9, 8, 7`. Peeking at the minimum is O(1), and push and pop are O(log n). We pushed random numbers into the heap and popped them all, and the results came out sorted on 2,000 random lists.

## Building a Heap

To make a heap from n items, the obvious way is n pushes, which costs O(n log n). A better way is **heapify**: treat the array as a complete tree already, and sink each non-leaf node, from the last one back to the root. Every node below the one being sunk is already the root of a valid heap, so one sink makes its subtree valid too.

The surprise is that this is O(n) in total. Half of the nodes are leaves and need no work, a quarter are one level above the leaves and sink at most one step, an eighth sink at most two steps, and the sum of that series stays proportional to n. We counted comparisons.

| Items | n Pushes | Heapify |
| --- | --- | --- |
| 1,000 | 2.20 per item | 1.87 per item |
| 100,000 | 2.28 per item | 1.88 per item |

Heapify stays under about 2 comparisons per item however large the input grows, and Python's `heapq.heapify` is documented as linear. On random data the pushes were also cheap, because a random item rarely floats far. The cost is worse on adversarial input: pushing numbers in descending order, so each new one is the smallest so far, cost 8.0 comparisons per item at 1,000 items and 14.7 at 100,000, close to log₂ n. For a million numbers, `heapify` took 18 ms and pushing one by one took 44 ms.

## Priority Queues in Practice

Most languages ship a heap. Python's `heapq` is a min-heap on a list: `heappush`, `heappop` and `heapify`. Java's `PriorityQueue` has offer and poll in O(log n) and peek in O(1). Neither keeps equal priorities in insertion order, and Java's documentation says ties are broken arbitrarily.

To get first-in order among equal priorities, add a counter as a second part of the key, which Python's documentation recommends.

```python
import heapq, itertools

counter = itertools.count()
pq = []
for priority, task in [(2, "b"), (1, "a"), (2, "c"), (1, "d")]:
    heapq.heappush(pq, (priority, next(counter), task))
# popping gives a, d, b, c: by priority, and by arrival within a priority
```

The counter also fixes a crash. When two entries have the same priority, Python compares the next field, and if the tasks can't be compared, it raises an error. We saw `'<' not supported between instances of 'dict' and 'dict'` until the counter went in.

A heap isn't good at everything. Finding an arbitrary item or removing one from the middle takes O(n), since only the top is easy to reach. To change the priority of a waiting task, the usual trick is **lazy deletion**: mark the old entry as removed, push a new one, and skip removed entries when they reach the top. Go's `container/heap` takes the other route, keeping each item's position so that an update can repair the heap in O(log n).

| Operation | Cost |
| --- | --- |
| Peek at the top | O(1) |
| Push | O(log n) |
| Pop the top | O(log n) |
| Build from n items | O(n) |
| Find or remove an arbitrary item | O(n) |

## Where Heaps Appear

Heaps run schedulers that pick the next job, event simulations that process the earliest event, and shortest path searches that take the nearest unvisited place, as in [Dijkstra's Algorithm](/algorithms/dijkstra). The next articles use them directly: [Heap Sort](/algorithms/heap-sort) sorts with one, [Top K Elements](/algorithms/top-k) keeps the best k with one, and [Running Medians with Two Heaps](/algorithms/two-heaps) uses two.

## Key Points

- A heap is a complete binary tree in an array, with each parent no larger than its children in a min-heap, so the smallest item is at the root
- Push adds at the end and sifts up, and pop moves the last item to the root and sifts down, both along one path of length log₂ n
- Heapify builds a heap in O(n) by sinking nodes from the middle backward, about 1.9 comparisons per item in our test
- Equal priorities come out in no particular order unless a counter breaks the ties, which also avoids comparing the tasks themselves
- Finding or removing an arbitrary item is O(n), and updating a priority uses lazy deletion or a position index
