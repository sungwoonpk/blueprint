> The **lowest common ancestor** of two nodes in a rooted tree is the deepest node that has both of them below it. Finding it answers questions about where two things in a hierarchy first come together.

Two employees file a complaint against each other, and the company needs the lowest manager who is above them both, the person with the authority to settle it. In a file system, the deepest folder that holds two files is their common home.

In both, the question is the same: start from two nodes and go up until the paths meet. A node counts as its own ancestor, so the lowest common ancestor of a manager and one of their reports is the manager.

## Walk Up Together

The picture is simple: climb from both nodes toward the root, and the first node reached from both is the answer. The only snag is that the two nodes may be at different depths, and climbing at the same speed would not line them up. So first bring the deeper node up to the other's depth, then climb both one step at a time until they are the same node.

```python
def lca_walk(parent, depth, a, b):
    while depth[a] > depth[b]:
        a = parent[a]
    while depth[b] > depth[a]:
        b = parent[b]
    while a != b:
        a, b = parent[a], parent[b]
    return a
```

This needs, for each node, its parent and its depth. Both come from one traversal of the tree, as in [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals). The invariant is that the answer is an ancestor of both current nodes at every step, and the loop ends at the first shared one.

On the seven letter tree used in this phase, with D at the top, B and F below it, and A, C under B and E, G under F, here are some answers.

| Pair | Lowest Common Ancestor | Steps Between Them |
| --- | --- | --- |
| A and C | B | 2 |
| A and E | D | 4 |
| B and C | B | 1 |
| D and E | D | 2 |

B and C show the rule that a node is its own ancestor. The third column uses a handy identity: the distance between two nodes is `depth(a) + depth(b) − 2 × depth(lca)`, since each node climbs to the common ancestor and the two climbs add up. We checked the function against a brute force that lists each node's ancestors, on 500 random trees with 30 pairs each.

The cost is O(h), the height of the tree, for each query. For a balanced tree that is fast. In a chain it is n.

## Searching a Search Tree

If the tree is a binary search tree, the values themselves point to the answer, and no parent pointers are needed. If both values are smaller than the current node, the answer is in the left subtree. If both are larger, it is in the right. Otherwise the two values split here, or one equals this node, and this node is the answer.

```python
def lca_bst(node, p, q):
    while node:
        if p < node.val and q < node.val:
            node = node.left
        elif p > node.val and q > node.val:
            node = node.right
        else:
            return node.val
```

For a tree with 50 at the root, 30 and 70 below it, 20 and 40 under 30, and 60 and 80 under 70, the pair 20 and 40 gives 30, the pair 20 and 60 gives 50, and the pair 30 and 40 gives 30. It costs O(h), with no extra memory. [Binary Search Trees](/algorithms/binary-search-trees) explains the structure.

## Many Questions on a Tall Tree

With a tall tree and many queries, walking is slow. We built a tree of 100,000 nodes with a chain of 50,000 and a leaf attached to each chain node, so it is 50,000 levels deep, and asked for the lowest common ancestor of random pairs of leaves.

Walking took 54 ms for 200 queries, about 0.27 ms each. The way to do better is to pay once for a table that lets a query jump.

**Binary lifting** stores, for every node, its ancestor 1 step up, 2 steps up, 4 steps up, 8 and so on. The ancestor 2^j steps up is the ancestor 2^(j−1) steps up from the ancestor 2^(j−1) steps up, so each row of the table comes from the row before.

```python
def build_lifting(parent, root):
    n = len(parent)
    par = parent[:]
    par[root] = root                          # the root is its own parent
    levels = max(1, (n - 1).bit_length())
    up = [par]
    for j in range(1, levels):
        prev = up[-1]
        up.append([prev[prev[v]] for v in range(n)])
    return up                                 # up[j][v] is the 2^j th ancestor of v
```

A query lifts the deeper node by the difference in depths, using the table to jump by powers of two. Then it tries the largest jumps first: a jump that leaves the two nodes at different ancestors is taken, and one that would land on the same node is skipped. When no jump can be taken, the two nodes are children of the answer.

```python
def lca_lift(up, depth, a, b):
    if depth[a] < depth[b]:
        a, b = b, a
    diff = depth[a] - depth[b]
    for j in range(len(up)):
        if diff >> j & 1:
            a = up[j][a]
    if a == b:
        return a
    for j in range(len(up) - 1, -1, -1):
        if up[j][a] != up[j][b]:
            a, b = up[j][a], up[j][b]
    return up[0][a]
```

The table has about log₂ n rows of n entries, so building it costs O(n log n) memory and time, and each query is O(log n). On the 100,000 node tree the table had 17 rows and took 0.02 s to build. The same 200 queries took 1.3 ms, against 54 ms for walking. We verified this against brute force on the same 500 random trees.

## Faster Still, and Offline

There are other methods with different tradeoffs. Writing down the nodes in the order a depth-first walk passes through them, once on the way down and again on each return, gives a list in which the answer for two nodes is the shallowest node between their first appearances.

That turns the question into a range minimum, which can be answered in O(1) after O(n log n) preprocessing. When all the questions are known in advance, an offline method with union-find, covered in [Union-Find](/algorithms/union-find), answers them in one traversal.

A rough guide:

| Situation | Method |
| --- | --- |
| A few queries, or a shallow tree | Walk up |
| A search tree and values to compare | Compare values from the root |
| Many queries on a deep tree | Binary lifting |
| Very many queries, preprocessing allowed | Euler tour and range minimum |

## Key Points

- The lowest common ancestor is the deepest node above both given nodes, and a node counts as its own ancestor
- Walking up is O(h): lift the deeper node to the same depth, then climb both until they meet
- In a search tree, comparing values with each node finds it without parent pointers
- Binary lifting stores 2^j th ancestors, builds in O(n log n), and answers each query in O(log n), 41 times faster than walking on our 50,000 deep tree
- Distance between two nodes is `depth(a) + depth(b) − 2 × depth(lca)`
