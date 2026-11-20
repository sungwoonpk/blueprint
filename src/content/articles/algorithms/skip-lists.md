> A **skip list** is a sorted linked list with extra "express lane" pointers, where each item's height is chosen by coin flips. Search, insert and delete take O(log n) expected time, and they need only local pointer changes, with no rotations or rebalancing.

A sorted linked list is easy to update. Once the place is found, adding or removing an item is a couple of pointer changes. Finding the place is the problem, since a list has no way to jump, and a search for the last item walks all n.

A subway solves the same problem in a city. Local trains stop everywhere, express trains stop at a few stations, and a traveler rides the express as far as possible without passing the destination and then changes to a slower line. A skip list builds that for a list.

## Express Lanes

Start with a sorted list. If every other item also has a pointer to the item two ahead, a search follows the fast pointers and visits at most about n / 2 items. Give every fourth item a pointer four ahead, and it drops to about n / 4 plus a few. Keep going, with every 2ⁱ-th item pointing 2ⁱ ahead, and a search takes about log₂ n steps.

That perfect pattern has a flaw: inserting an item shifts everyone's position and spoils it. William Pugh's fix, in a 1990 paper, was to stop planning the pattern and let each new item choose its own height by chance.

## Levels by Coin Flips

When an item is inserted, it starts at level 1. Flip a coin: on heads, it also joins level 2, and flip again to see whether it joins level 3, and so on. With a fair coin, p = 1/2, half of the items stay at level 1, a quarter reach level 2, and an eighth reach level 3. Other values of p work too, with p as the chance of heads. Each level is a sorted list of the items tall enough to be in it, and each item has one forward pointer for each level it belongs to.

We built a skip list of 65,536 keys with p = 1/2 and counted heights: 49.8% of the nodes were level 1, then 25.2%, 12.4%, 6.2% and 3.1% for the next four, close to the halving pattern. On 100,000 keys the average number of pointers per node was 2.00, which is 1 / (1 − p), and with p = 1/4 it was 1.33.

<figure class="diagram">
<div class="cells board">
<div class="cell dim"></div><div class="cell dim"></div><div class="cell dim"></div><div class="cell hl">9</div><div class="cell dim"></div><div class="cell dim"></div><div class="cell dim"></div><div class="cell dim"></div><div class="cell">25</div><div class="cell dim"></div>
</div>
<div class="cells board">
<div class="cell dim"></div><div class="cell">6</div><div class="cell dim"></div><div class="cell hl">9</div><div class="cell dim"></div><div class="cell hl">17</div><div class="cell dim"></div><div class="cell">21</div><div class="cell">25</div><div class="cell dim"></div>
</div>
<div class="cells board">
<div class="cell">3</div><div class="cell">6</div><div class="cell">7</div><div class="cell">9</div><div class="cell">12</div><div class="cell hl">17</div><div class="cell hl">19</div><div class="cell">21</div><div class="cell">25</div><div class="cell">26</div>
</div>
<figcaption>A skip list of ten keys, with level 3 at the top and level 1 at the bottom. Faded cells are levels the key doesn't reach. The outlined cells are the path of a search for 19</figcaption>
</figure>

Choosing a level takes a loop of coin flips, capped at a maximum so that the structure stays bounded.

```python
def _random_level(self):
    level = 1
    while random.random() < self.p and level < self.max_level:
        level += 1                                   # heads: one more level
    return level
```

## Searching

Start at the top level of the list's header. Move right while the next key on this level is smaller than the target. When the next key is the target or larger, drop down one level and repeat. At level 1, the next item is either the target or proof that it is missing.

For 19 in the picture: on level 3, the next key after the start is 9, which is smaller, so move there. The next on level 3 is 25, which is larger, so drop to level 2. From 9 the next is 17, so move, then 21 is larger, so drop to level 1. From 17 the next item is 19. Found. A plain list needs 7 steps to reach 19 here, and the skip list needed 6 comparisons, a gap that widens fast as the list grows.

```python
def contains(self, key):
    node = self.head
    for i in range(self.level - 1, -1, -1):          # top level down to level 1
        while node.next[i] and node.next[i].key < key:
            node = node.next[i]                      # move right on this level
    node = node.next[0]
    return node is not None and node.key == key
```

The invariant is that `node` holds a key smaller than the target at every moment, and that the target, if present, lies after it. Each drop to a lower level refines where the target can be.

## Insert and Delete

To insert, search for the key while remembering, for each level, the last node before the key's position. Choose the new node's level by flipping coins. Then splice the new node into each of its levels, pointing it at what the remembered node pointed to, and pointing the remembered node at it.

```python
def insert(self, key):
    update = [self.head] * self.max_level           # last node before key, per level
    node = self.head
    for i in range(self.level - 1, -1, -1):
        while node.next[i] and node.next[i].key < key:
            node = node.next[i]
        update[i] = node
    nxt = node.next[0]
    if nxt and nxt.key == key:
        return False                                 # already present
    level = self._random_level()
    self.level = max(self.level, level)
    new = Node(key, level)
    for i in range(level):
        new.next[i] = update[i].next[i]
        update[i].next[i] = new
    return True
```

Delete is the reverse: find the node with the same search, point each remembered node past it, and lower the list's level if the top levels became empty. Neither operation moves other items, rotates anything or compares heights. That is why skip lists are easier to implement than the balanced trees of [Balanced Trees and Ordered Maps](/algorithms/balanced-trees).

We tested the full implementation against a sorted list on 200 random sequences of 300 inserts, deletes, searches and range reads, with p = 1/2 and p = 1/4. They agreed on every result.

## How Fast Is It?

Pugh's analysis gives an expected number of comparisons of at most log base 1/p of n, divided by p, plus 1 / (1 − p) plus 1. For p = 1/2 and n = 100,000 that is 36.2. We searched for 2,000 random keys in lists built by inserting keys in random order.

| Keys | Mean at p = 1/2 | Mean at p = 1/4 | Bound at p = 1/2 |
| --- | --- | --- | --- |
| 1,000 | 19.4 | 18.3 | 22.9 |
| 10,000 | 27.3 | 25.7 | 29.6 |
| 100,000 | 32.7 | 32.4 | 36.2 |

Each tenfold increase adds roughly 5 to 8 comparisons for p = 1/2, which is what log n growth looks like. The bound holds, and the means sit a little under it. A smaller p uses fewer pointers, 1.33 per node instead of 2, for similar search cost, which is why Pugh's paper suggests p = 1/4 unless the spread of running times matters most.

Order of insertion doesn't matter, because the heights come from coin flips and not from the keys. We inserted 100,000 keys in sorted order, the input that turns a plain search tree into a chain, as in [Binary Search Trees](/algorithms/binary-search-trees). The mean search cost was 33.8 comparisons, the same as for random order.

The spread is small too. We searched for each of 65,536 keys once. The mean was 33.4 comparisons and the maximum was 62, less than twice the mean. Pugh's analysis puts the chance of a search taking more than three times the expected cost below one in 200 million for p = 1/2 and 4,096 keys. The guarantee assumes that nobody can see the node heights, otherwise deleting all the nodes above level 1 would ruin the structure.

## Ordered Operations

Because the bottom level is a complete sorted list, ordered queries come naturally. To list the keys in a range, search for the first key at least as large as the lower bound, then walk along level 1 until a key passes the upper bound.

```python
def range(self, lo, hi):                            # keys with lo <= key < hi
    node = self.head
    for i in range(self.level - 1, -1, -1):
        while node.next[i] and node.next[i].key < lo:
            node = node.next[i]
    node = node.next[0]
    while node and node.key < hi:
        yield node.key
        node = node.next[0]
```

The cost is one search plus the number of keys returned. Redis uses this idea for its sorted sets: the documentation says they are implemented with both a skip list and a hash table, so adding an element is an O(log N) operation, and listing members in order needs no sorting. In Java, `ConcurrentSkipListMap` is a sorted map built as a concurrent skip list. Its documentation promises expected average log(n) time for `containsKey`, `get`, `put` and `remove`, and says insertion, removal, update and access can safely run at the same time on several threads.

## In Practice

Concurrency is a real strength. An update changes a few nearby pointers, while a balanced tree rotation can touch a whole path, so updates by different threads rarely collide. Pugh's paper describes algorithms for many processors to update a skip list at once that are much simpler than concurrent balanced trees.

In Python the picture is mixed. With 100,000 random keys and p = 1/4, building our skip list took 0.20 s and a sorted list with `bisect.insort` took 0.76 s, since every insert shifts part of the list. But 100,000 searches took 0.21 s in the skip list against 0.02 s for `bisect` on the list, because the list's search runs in C. In the 1990 paper's own timings, on hardware of that day, insertion into a skip list was about 1.5 times faster than into an optimized AVL tree and 3 times faster than a 2–3 tree, with similar search times.

## Key Points

- A skip list is a sorted linked list with extra pointers, where each item's level comes from coin flips, so half the items have level 1, a quarter level 2, and so on
- Search moves right while the next key is smaller, drops down a level otherwise, and takes O(log n) expected time
- Insert and delete change only nearby pointers, with no rotations, and it matched a sorted list on 200 random operation sequences
- Search cost was about 33 comparisons at 100,000 keys, the same for sorted and random insertion order, with the slowest of 65,536 searches under twice the mean
- The bottom level is a sorted list, which gives ordered ranges, and the local updates suit concurrent structures like Java's `ConcurrentSkipListMap` and Redis sorted sets
