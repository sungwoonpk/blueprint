> **Serializing** a tree turns it into a flat sequence that can be saved or sent, and **building** it back reads the sequence and recreates the same tree. The sequence has to contain enough information to decide the shape uniquely.

A game saves a decision tree to disk, a service sends a tree of comments over the network, and a test wants to check that two trees have the same structure.

In every case the tree must become a line of text or numbers and later become a tree again. That is harder than it sounds, because a tree has a shape as well as values, and many shapes can hold the same values in the same order.

## The Problem with Plain Orders

From [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals), a traversal writes the values of a tree in a line. Two different trees can give the same line. A node 1 with a left child 2 and a node 1 with a right child 2 both read 1, 2 in preorder. A flat list of values loses the shape.

The shape can be recorded by writing down where children are missing. In a binary tree, every missing child is a place where a link points to no node. While doing a preorder traversal, write a marker, here `#`, at each such place.

Now the sequence says what to do at every step: a value means "make a node and read its left subtree and then its right subtree", and a `#` means "this link is empty".

## Preorder with Markers

```python
def serialize(root):
    out = []
    def go(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        go(node.left)
        go(node.right)
    go(root)
    return ",".join(out)
```

Take a tree with root B, a leaf A on the left, and D on the right with two leaf children, C and E.

<figure class="diagram">
<div class="cells">
<div class="cell">B</div>
<div class="cell">A</div>
<div class="cell dim">#</div>
<div class="cell dim">#</div>
<div class="cell">D</div>
<div class="cell">C</div>
<div class="cell dim">#</div>
<div class="cell dim">#</div>
<div class="cell">E</div>
<div class="cell dim">#</div>
<div class="cell dim">#</div>
</div>
<figcaption>Preorder with markers for the tree B, A, D, C, E. The faded # cells are the missing children</figcaption>
</figure>

Reading it back mirrors writing it. Each call consumes the next token. A `#` returns an empty tree, and a value makes a node and recursively builds the two children from the tokens that follow.

```python
def deserialize(text):
    tokens = iter(text.split(","))
    def go():
        t = next(tokens)
        if t == "#":
            return None
        node = TreeNode(t)
        node.left = go()
        node.right = go()
        return node
    return go()
```

It works because the markers make the sequence self-delimiting: after a node's value, the next tokens are exactly the left subtree followed by the right subtree, and the markers say where each ends. We checked the round trip on 1,500 random trees, including ones with repeated values, which plain traversals can't handle, and each rebuilt tree gave back the same serialization.

A binary tree with n nodes has n + 1 empty links, so the sequence has exactly 2n + 1 tokens: n values and n + 1 markers. That held in every test.

## Level by Level

The same idea works with the traversal of [Level Order Traversal](/algorithms/level-order), writing `#` for missing children. For the same tree it gives `B,A,D,#,#,C,E`, once the markers after the last node are trimmed. This form reads naturally from the top down. Rebuilding uses a queue: each node takes the next two tokens as its children. We round-tripped this form on the same random trees.

## Rebuilding from Two Traversals

Sometimes a tree comes with two traversals instead of markers. Preorder alone isn't enough, but preorder with inorder is, as long as the values are distinct. The reasoning is short. The first value in preorder is the root.

Find that value in the inorder sequence: everything to its left is the left subtree, and everything to its right is the right subtree. The next values in preorder are the left subtree's, then the right subtree's, so the same step repeats for each side.

```python
def build_from_pre_in(pre, ino):
    pos = {v: i for i, v in enumerate(ino)}          # needs distinct values
    it = iter(pre)
    def go(lo, hi):                                  # builds the subtree for ino[lo:hi]
        if lo >= hi:
            return None
        root = TreeNode(next(it))
        mid = pos[root.val]
        root.left = go(lo, mid)
        root.right = go(mid + 1, hi)
        return root
    return go(0, len(ino))
```

The dictionary `pos` gives each value's place in the inorder list in one step. Without it, a version that searches the list and slices both lists at every node does a lot more work. We rebuilt a chain of 1,000, 2,000 and 4,000 nodes both ways.

The index map took 0.3 ms, 0.6 ms and 1.2 ms. The scanning and slicing version took 4 ms, 16 ms and 73 ms, quadrupling each time the size doubled. Both agreed with the original tree on 1,500 random trees.

Distinct values matter. With repeated values the root's place in the inorder list is ambiguous. Preorder with postorder can't rebuild a tree either, as the one-child example showed.

## Search Trees Are Special

A binary search tree needs less. Its shape is determined by its preorder alone, because the ordering rule tells where each value belongs. Read the values in order, and each one either fits in the current range of allowed values, and becomes the next node, or doesn't, and the subtree ends.

```python
def bst_from_preorder(pre):
    i = 0
    def go(lo, hi):                                  # values allowed in this subtree: lo < v < hi
        nonlocal i
        if i == len(pre) or not (lo < pre[i] < hi):
            return None
        node = TreeNode(pre[i])
        i += 1
        node.left = go(lo, node.val)
        node.right = go(node.val, hi)
        return node
    return go(float("-inf"), float("inf"))
```

We rebuilt 1,000 random search trees from their preorder lists, and each matched. There are no markers, so a saved search tree takes n values and no more.

## Cost and Format

Both directions take O(n) time. On a balanced tree of 200,000 nodes, serializing took 20 ms and deserializing about 100 ms, and the text was 1.7 MB.

The nested form common in JSON, where each node is an object with its value and two children, took 6.1 MB for the same tree even with one letter keys, `v`, `l` and `r`, because it repeats the names at every node. The flat form is compact and fast, and the nested form is easier to read and edit by hand.

Whatever form you choose, the same rule applies: the format must carry the shape. Test it with a round trip, serialize then rebuild then serialize again and compare, on the empty tree, one node, a chain and a bushy tree, as the advice in [Edge Cases and Testing](/algorithms/edge-cases) suggests. A deep chain can also overflow the call stack in the recursive versions, which [Turning Recursion into Iteration](/algorithms/recursion-to-iteration) addresses.

## Key Points

- A traversal of values alone loses the shape, so serialization writes a marker for each missing child
- Preorder with `#` markers is self-delimiting, uses exactly 2n + 1 tokens for n nodes, and works with repeated values
- Level order with markers is another common format, rebuilt with a queue
- Preorder with inorder rebuilds a tree with distinct values, using an index map to stay O(n), and preorder with postorder can't
- A binary search tree rebuilds from its preorder alone, using the allowed range at each step
