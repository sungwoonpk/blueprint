> An **LRU cache** holds a fixed number of items and, when it is full, discards the **least recently used** one. A hash map and a doubly linked list together make both lookup and eviction O(1).

The campus course catalog looks up a course's details in a slow database. A few courses get requested over and over during registration week, so the app keeps recent answers in memory and skips the database when it can. Memory is limited, so the cache can hold only so many courses. When it fills up, something has to go. Which one?

## Why Recency

A **cache** keeps copies of results that are slow to get, so repeat requests are fast. The choice of what to throw away is the **eviction policy**. LRU bets on a simple pattern: what was used recently is likely to be used again soon, and what hasn't been touched for a while is the safest to drop.

The bet isn't always right, but it often is. We simulated requests for 10,000 courses where a few are far more popular than the rest, the course ranked k being requested in proportion to 1/k, with a cache holding 500, and compared policies.

| Eviction Policy | Share of Requests Served from the Cache |
| --- | --- |
| Evict the oldest arrival (FIFO) | 54.1% |
| Evict a random item | 54.1% |
| Evict the least recently used | 58.8% |

Keeping the recently used items is worth nearly five points here, which in a busy system means many fewer slow database calls.

## What the Cache Must Do

A cache needs two operations, and both should be fast.

- **get(key)** returns the cached value and marks that item as the most recently used
- **put(key, value)** stores an item, marks it as most recent, and if the cache is over capacity, removes the least recently used item

Each job needs a different structure. To find an item by key quickly, use a hash map. To know which item is oldest, and to move an item to "newest" after a use, you need an ordering that can be edited quickly.

A list kept in order of use fits, but an array makes a move O(n), and a singly linked list can't unlink a node without its predecessor. A doubly linked list, from [Singly and Doubly Linked Lists](/algorithms/linked-lists), can: given a node, it removes it and relinks it at the front in O(1).

The way to get both is to use the two together. The list keeps the order of use, with the most recent at the front and the least recent at the back. The hash map maps each key to its node in the list, so the node is reached without walking.

<figure class="diagram">
<div class="flow">
<div class="node">A<small>most recent</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">C</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">B<small>least recent</small></div>
</div>
<figcaption>The list, ordered by use. The hash map holds one entry for each key, pointing at that key's node. The cache evicts B first</figcaption>
</figure>

## Walking Through It

Take a cache with room for three items. The list is shown with the most recent item first.

| Operation | List After | Evicted |
| --- | --- | --- |
| put A | A | |
| put B | B, A | |
| put C | C, B, A | |
| get A | A, C, B | |
| put D | D, A, C | B |
| get C | C, D, A | |
| put E | E, C, D | A |

The `get A` step moved A to the front, which saved it. When D arrived, B was at the back, so B went. Each operation made a constant number of changes: a hash lookup, a node unlinked, and a node linked at the front.

## The Code

The list uses sentinel nodes at both ends, as in the doubly linked list from earlier, so there are no special cases for an empty list or the ends.

```python
class Node:
    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self.map = {}                          # key -> node
        self.head, self.tail = Node(), Node()  # head side is most recent
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _push_front(self, node):
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return None
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key, value):
        node = self.map.get(key)
        if node is not None:
            node.value = value
            self._unlink(node)
        else:
            if len(self.map) == self.capacity:
                oldest = self.tail.prev
                self._unlink(oldest)
                del self.map[oldest.key]
            node = Node(key, value)
            self.map[key] = node
        self._push_front(node)
```

Three details are easy to get wrong. A node stores its own key, so when the oldest node is evicted, the code knows which map entry to delete. Updating a key that exists must not evict anything, which is why `put` checks for an existing node first. And a capacity of zero would make the eviction code remove a sentinel, so it is rejected up front.

We ran this against a second implementation built on Python's `OrderedDict`, on 2,000 random sequences of gets and puts with capacities from 1 to 5, and compared the contents and the order after each step. They matched on all of them.

## What the Libraries Give You

Writing it once is the way to understand it. In real code, use the library. Python's `OrderedDict` is a hash map that remembers order and can move a key to the end in O(1), so it is nearly all of an LRU cache by itself, with `move_to_end` on each use and `popitem` to evict.

Java's `LinkedHashMap` can be built in access order, and its `removeEldestEntry` hook lets a subclass drop the oldest item when the map grows past a limit.

For caching the results of a function, Python's `functools.lru_cache` does the whole job in one line.

```python
from functools import lru_cache

@lru_cache(maxsize=3)
def course(code):
    ...    # the slow lookup

for code in ["CS101", "MA201", "CS101", "BIO110", "CS101", "MA201"]:
    course(code)

print(course.cache_info())   # CacheInfo(hits=3, misses=3, maxsize=3, currsize=3)
```

Its implementation is the same structure: a dictionary from keys to links in a circular doubly linked list, with a lock around the updates so threads can share it. The arguments must be hashable, as with any dictionary key, and `cache_info()` reports hits and misses so you can see whether the cache is paying for itself.

## Exact LRU Isn't Always Used

Strict LRU has a cost. Each read changes the list, which in a cache shared by many threads means taking a lock on each read, and each entry carries two extra pointers. Large systems often approximate it instead.

Redis, an in-memory database, doesn't track exact recency. When it needs to evict, it samples a few random keys and removes the one that has gone unused the longest. Its documentation says the exact version would cost more memory, and that sampling about ten keys gets very close to true LRU. PostgreSQL's buffer manager uses a related idea, a clock sweep with a small usage counter for each page.

Sampling is cheap, and we tested how well it works on the same course requests.

| Eviction Policy | Cache Served |
| --- | --- |
| Random item | 54.1% |
| Least recently used of 5 random items | 58.3% |
| Least recently used of 10 random items | 58.7% |
| Exact least recently used | 58.8% |

Looking at five random items recovered nearly all of the benefit of exact LRU, with no list and no pointers to maintain.

LRU also has a weakness. A single pass over a huge set of items, such as a scan through every course, pushes out the popular items that were being reused, even though the scan items won't be requested again. Systems guard against it in different ways, and some prefer to count how often an item is used and not only how recently, a policy called least frequently used.

## Key Points

- An LRU cache evicts the least recently used item, on the bet that recent use predicts reuse
- A hash map finds items by key, and a doubly linked list orders them by use, so get and put are both O(1)
- Each node stores its key so the map entry can be removed on eviction, and updating an existing key doesn't evict
- `OrderedDict`, `LinkedHashMap` and `lru_cache` give you the same structure ready made
- Large systems often sample a few items and evict the least recent of those, which approaches exact LRU for much less bookkeeping
