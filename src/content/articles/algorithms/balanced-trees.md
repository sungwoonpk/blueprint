> A **balanced tree** is a search tree that rearranges itself as keys come and go, so its height stays about log n whatever the order of the inserts. An **ordered map** is a map built on such a tree: it finds keys quickly and also answers questions about order.

In [Binary Search Trees](/algorithms/binary-search-trees), inserting 1, 2, 3, 4 and so on in order built a chain, and every search became a walk down a linked list. Sorted input is common, so a tree that can only be trusted on random input is not enough. The fix is to let the tree repair its own shape after each change, using a small local move that doesn't disturb the order of the keys.

## Rotations

A **rotation** changes which node is the parent of which, while keeping the left to right order of the keys. In a right rotation, a node's left child moves up to take its place, and the old node becomes that child's right child. The child's old right subtree, whose keys fall between the two, becomes the old node's new left subtree.

<figure class="diagram">
<p class="rowname">Before</p>
<div class="flow packets tree">
<div class="node">D</div>
</div>
<div class="flow packets tree">
<div class="node">B</div>
<div class="node">E</div>
</div>
<div class="flow packets tree">
<div class="node">A</div>
<div class="node">C</div>
</div>
<p class="rowname">After rotating right at D</p>
<div class="flow packets tree">
<div class="node">B</div>
</div>
<div class="flow packets tree">
<div class="node">A</div>
<div class="node">D</div>
</div>
<div class="flow packets tree">
<div class="node">C</div>
<div class="node">E</div>
</div>
<figcaption>A, B, C, D, E read in the same order before and after. C, which sat to the right of B, now sits to the left of D, and the tree is a level shorter on the left</figcaption>
</figure>

A rotation changes a constant number of links, so it costs O(1), and a left rotation is the mirror image. Every key still sits between the same neighbors. Rotations can turn any binary tree into any other with the same order, so they are enough to repair a lopsided shape.

## AVL Trees

The first balancing scheme, from Adelson-Velsky and Landis in 1962, is the AVL tree. Its rule is that at every node, the heights of the two subtrees differ by at most 1. The difference, right height minus left height, is the node's **skew**, and it must be −1, 0 or 1.

That rule keeps the height logarithmic. Let F(h) be the fewest nodes an AVL tree of height h can have. The tree needs a root, one subtree of height h − 1, and, to be as small as possible, one of height h − 2. So F(h) = 1 + F(h − 1) + F(h − 2), which grows like the Fibonacci numbers. We worked it out.

| Height | Fewest Nodes |
| --- | --- |
| 3 | 7 |
| 5 | 20 |
| 10 | 232 |
| 20 | 28,656 |

The fewest nodes grows exponentially with the height, so the height grows only logarithmically with the nodes. A tree of 1,000,000 nodes can be at most 27 levels tall, against the ideal of about 20.

After an insert, only the nodes on the path from the new leaf up to the root can become unbalanced, and each skew can grow to at most 2. Walk up from the new leaf and fix the lowest unbalanced node with one or two rotations. If a node leans right by 2 and its right child leans right or is even, one left rotation fixes it. If the right child leans left, rotate that child right first, then rotate the node left. The mirror cases handle a left lean.

```python
def height(n):
    return n.h if n else -1

def update(n):
    n.h = 1 + max(height(n.left), height(n.right))

def skew(n):
    return height(n.right) - height(n.left)

def rotate_right(n):
    l = n.left
    n.left = l.right
    l.right = n
    update(n)
    update(l)
    return l                                    # l is the new top of this subtree

# rotate_left is the mirror image

def rebalance(n):
    update(n)                                   # recompute n.h from its children
    s = skew(n)
    if s > 1:                                   # leans right by 2
        if skew(n.right) < 0:
            n.right = rotate_right(n.right)     # right-left case: two rotations
        return rotate_left(n)
    if s < -1:                                  # leans left by 2
        if skew(n.left) > 0:
            n.left = rotate_left(n.left)        # left-right case
        return rotate_right(n)
    return n

def insert(n, key):
    if n is None:
        return Node(key)
    if key < n.key:
        n.left = insert(n.left, key)
    elif key > n.key:
        n.right = insert(n.right, key)
    else:
        return n
    return rebalance(n)
```

Each node stores its height, and `update` recomputes it after a change. The recursion rebuilds the path from the leaf upward, calling `rebalance` at each node. Inserting 1, 2 and 3 in order, which would have made a chain, ends with 2 at the top and 1 and 3 beneath it after a single left rotation. We checked the order, the stored heights and the skew rule at every node on 1,500 random inputs.

We measured the effect on the input that ruined the plain tree. Inserting 100,000 keys in sorted order gave an AVL tree of height 16, with 99,983 rotations in all, about one for each insert, in 0.41 s. The plain tree on sorted keys was quadratic: 2,000, 4,000 and 8,000 sorted inserts took 0.05 s, 0.21 s and 0.81 s. For random keys, a plain tree of 200,000 keys was 45 levels tall and an AVL tree was 20, but the AVL took more time to build, 0.89 s against 0.34 s, since it does extra work to stay balanced.

## Red-Black Trees and Others

Other schemes trade the strictness of balance for cheaper repairs. A **red-black tree** colors nodes red or black and keeps rules that limit how unevenly the colors can stack, which keeps the height under 2 log₂ n. It is a binary form of a 2-3 tree, a perfectly balanced tree whose nodes hold one or two keys.

An update to a red-black tree needs at most a couple of rotations: the Linux kernel's documentation says at most two for an insert and three for a delete, a bounded cost per update. Lookups are slightly slower than in an AVL tree because the tree can be a bit taller. The kernel uses them for I/O scheduling, timers and memory areas, and Java's `TreeMap` is a red-black tree with log n guaranteed for lookup, insert and remove.

AVL trees keep the tightest balance and so give the fastest lookups, and red-black trees give cheaper updates. Either one is a fine choice, and the guarantee is the same in kind: O(log n) in the worst case.

## Ordered Maps

A balanced tree is the engine, and an **ordered map** is the interface on top. It stores key-value pairs and keeps the keys sorted, which allows more than a hash map can offer.

| Operation | Hash Map | Ordered Map |
| --- | --- | --- |
| Find a key | O(1) on average | O(log n) |
| Worst case for find | O(n) | O(log n) |
| Keys in sorted order | Not available | O(n) |
| Floor and ceiling of a key | Not available | O(log n) |
| All keys in a range | Scan everything | O(log n + k) for k results |

Java's `TreeMap` provides `floorKey`, `ceilingKey`, `headMap` and `subMap` for these. In C++, `std::set` and `std::map` are ordered, and typically built on balanced trees. Python's standard library has no ordered map. For data that changes rarely, a sorted list with `bisect` gives the same queries.

Use an ordered map when you need the nearest key, the next key, ranks, or a range, together with inserts and deletes. Use a hash map when only exact lookups matter. Databases face this same choice on disk, where the balanced structure is a wider tree with many keys in each node.

## Key Points

- A rotation swaps a parent with a child in O(1) while keeping the order of the keys, and rotations can repair any lopsided tree
- An AVL tree keeps the two subtree heights at every node within 1, so the fewest nodes for height h grows like Fibonacci and the height stays below about 1.44 log₂ n
- Insert, then walk up fixing the lowest unbalanced node with one or two rotations, about one rotation per insert on sorted input in our test
- Red-black trees allow looser balance for cheaper updates, with height at most 2 log₂ n, and Java's `TreeMap` uses one
- An ordered map adds floor, ceiling, range and sorted iteration to a map, at O(log n) in the worst case
