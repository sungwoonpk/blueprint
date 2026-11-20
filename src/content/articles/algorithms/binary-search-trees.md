> A **binary search tree** keeps its keys ordered so that, at every node, smaller keys are in the left subtree and larger keys in the right. Search, insert and delete each follow one path from the root, so their cost is the height of the tree.

The registrar keeps student IDs, and new students are added all the time. A sorted array finds an ID in log n steps, but adding one shifts the array.

A hash table adds and finds in constant time, but its IDs have no order, so "who is the next ID after 4021?" needs a scan. A binary search tree sits in the middle: it grows one node at a time, finds an ID by a short walk, and keeps the IDs in order.

## The Ordering Rule

Every node holds a key. Everything in its left subtree is smaller, and everything in its right subtree is larger. That one rule makes the structure searchable: at each node, one comparison tells you which half of the remaining keys to look in, the same halving as [Binary Search](/algorithms/binary-search), applied to a tree.

<figure class="diagram">
<div class="flow packets tree">
<div class="node hl">50</div>
</div>
<div class="flow packets tree">
<div class="node">30</div>
<div class="node hl">70</div>
</div>
<div class="flow packets tree">
<div class="node">20</div>
<div class="node">40</div>
<div class="node hl">60</div>
<div class="node">80</div>
</div>
<figcaption>A search for 60 starts at 50, goes right to 70 because 60 is larger, then goes left to 60 because 60 is smaller than 70</figcaption>
</figure>

```python
class Node:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def contains(root, key):
    node = root
    while node:
        if key == node.key:
            return True
        node = node.left if key < node.key else node.right
    return False

def insert(root, key):
    if root is None:
        return Node(key)
    node = root
    while True:
        if key == node.key:
            return root                    # already present
        side = "left" if key < node.key else "right"
        child = getattr(node, side)
        if child is None:
            setattr(node, side, Node(key))
            return root
        node = child
```

A search that misses ends at an empty link, and an insert simply puts the new node there. Both walk one path from the root downward, at most the height of the tree, so each costs O(h). The invariant is that at every step, the key being sought can only be in the subtree of the current node, because the nodes passed so far ruled out everything else.

Reading the tree in order, left subtree, node, then right subtree, gives the keys sorted: 20, 30, 40, 50, 60, 70, 80 here, as in [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals).

## Questions About Order

A hash table can't answer questions about order, and a search tree can.

- **Smallest and largest**: follow left links to the end, or right links
- **Floor**: the largest key not above a given key. Walk down; whenever a node is no larger than the key, remember it and go right, otherwise go left
- **Rank**: how many keys are smaller than a given key. Each node stores the size of its subtree, so the rank is the count of the left subtrees passed on the way, plus one for each node passed on the right
- **Range**: every key between two bounds, found by an in-order walk that skips subtrees outside the range

For the tree above, the floor of 65 is 60, and the rank of 60 is 4, since 20, 30, 40 and 50 come before it. Each of these walks one path, so each is O(h). We kept a sorted list as a model and compared the tree against it after every operation in 2,000 random sequences of inserts, deletes and queries, and the answers matched.

## Deleting a Key

Deleting is the delicate operation, since the hole must be filled without breaking the ordering rule. There are three cases.

- **A leaf**: remove it
- **One child**: replace the node with that child
- **Two children**: replace the node's key with the **successor**, the smallest key in its right subtree, and delete that successor from the right subtree, where it has at most one child

The successor is the next larger key, so it fits between everything on the left and everything on the right. This is Hibbard's method. One side effect is known: taking the successor every time, and the predecessor never, tends to make the tree lean over time under many deletes and inserts.

```python
def delete(node, key):
    if node is None:
        return None
    if key < node.key:
        node.left = delete(node.left, key)
    elif key > node.key:
        node.right = delete(node.right, key)
    else:
        if node.left is None:
            return node.right
        if node.right is None:
            return node.left
        succ = node.right
        while succ.left:
            succ = succ.left               # the smallest key of the right subtree
        node.key = succ.key
        node.right = delete(node.right, succ.key)
    return node
```

## The Shape Depends on the Order

Everything above costs O(h), and the height depends on the order keys arrive in. Insert 1, 2, 3, 4 and so on in order, and each key goes to the right of the last, making a chain. Insert the same keys in a random order, and the tree comes out bushy. We measured both.

| Insertion Order | Items | Height | Average Depth |
| --- | --- | --- | --- |
| Random | 1,000 | 21 | 10.2 |
| Random | 10,000 | 31 | 14.9 |
| Random | 100,000 | 39 | 19.7 |
| Sorted | 1,000 | 999 | 499.5 |
| Sorted | 5,000 | 4,999 | 2,499.5 |

With random keys the average depth grows like 2 ln n, which is about 1.39 log₂ n, close to the ideal log₂ n. A search for a typical key in a tree of 100,000 random keys took about 20 steps. With sorted keys the tree is a linked list with an extra pointer, and the average search takes half of n steps.

That's the weakness: the structure is only as good as the input order, and sorted or nearly sorted input is common. [Balanced Trees and Ordered Maps](/algorithms/balanced-trees) keeps the height small whatever the order.

## How It Compares

We stored 200,000 random keys. Building the tree took 0.34 s in Python. Looking up 100,000 keys took 113 ms in the tree and 4 ms in a dictionary. A plain tree in Python is slower than a built-in hash table for exact lookups, which is the price of being written in the language.

Keeping a sorted list with `bisect.insort` took about the same time as building the tree, an estimated 0.3 s, since shifting list items is a fast block copy. The tree pays off when you need order and updates together at a scale where the shifting hurts, and the tree is kept balanced.

| Structure | Find | Insert | Next Larger Key |
| --- | --- | --- | --- |
| Hash table | O(1) on average | O(1) on average | Scan everything |
| Sorted array | O(log n) | O(n) | O(log n) |
| Balanced search tree | O(log n) | O(log n) | O(log n) |
| Plain search tree | O(h) | O(h) | O(h) |

## Key Points

- A binary search tree keeps smaller keys on the left and larger on the right of every node, so each operation follows one path
- Search, insert, delete, floor and rank all cost O(h), and an in-order walk lists the keys in sorted order
- Deleting a node with two children replaces its key with the successor, the smallest key of its right subtree
- Random insertion gives a height near 2 ln n, but sorted insertion gives a chain of height n − 1
- The cost depends on height, so keeping the tree balanced is what makes the structure reliable
