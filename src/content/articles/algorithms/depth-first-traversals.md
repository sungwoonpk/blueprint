> **Depth-first traversal** visits every node of a tree by going all the way down one branch before moving to the next. The three classic orders, **preorder**, **inorder** and **postorder**, differ only in when a node is visited compared with its two subtrees.

In [Stacks](/algorithms/stacks), the postfix expression `3 4 + 2 *` was evaluated with one stack and no brackets. Write the same arithmetic as a tree, with the operator above its two operands, and the expression `(3 + 4) × 2` becomes a multiplication whose left child is an addition.

Reading that tree in three different orders gives three ways of writing the expression, and one of them is the postfix form. The orders are worth knowing as a set.

## Three Moments to Visit

A tree is a node with a left subtree and a right subtree, so a recursive traversal has three things to do at each node: visit the node itself, traverse the left subtree and traverse the right subtree. The three orders differ in where the visit goes.

```python
def preorder(node, out):
    if node:
        out.append(node.val)            # the node first
        preorder(node.left, out)
        preorder(node.right, out)

def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.val)            # the node between its subtrees
        inorder(node.right, out)

def postorder(node, out):
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.val)            # the node last
```

Take this tree of seven letters.

<figure class="diagram">
<div class="flow packets tree">
<div class="node">D</div>
</div>
<div class="flow packets tree">
<div class="node">B</div>
<div class="node">F</div>
</div>
<div class="flow packets tree">
<div class="node">A</div>
<div class="node">C</div>
<div class="node">E</div>
<div class="node">G</div>
</div>
<figcaption>B and F are the children of D, and A and C hang under B, E and G under F</figcaption>
</figure>

| Order | Rule | Visit Sequence |
| --- | --- | --- |
| Preorder | Node, left, right | D B A C F E G |
| Inorder | Left, node, right | A B C D E F G |
| Postorder | Left, right, node | A C B E G F D |

Each node appears once in each sequence, so the traversal takes O(n) time. The inorder sequence came out alphabetical because the tree was arranged so that, at every node, smaller letters are on the left and larger ones on the right. That is no accident, and [Binary Search Trees](/algorithms/binary-search-trees) builds on it.

## What Each Order Is For

- **Preorder** visits a node before anything below it. Use it to copy a tree, to print a folder listing where each folder appears before its contents, and to save a tree so it can be rebuilt, as in [Building and Serializing Trees](/algorithms/building-serializing-trees)
- **Inorder** visits left, then the node, then right. For a search tree it produces the keys in sorted order. For an expression tree it gives the usual notation with the operator between its operands
- **Postorder** visits a node after its subtrees. Use it when a node's answer needs its children's answers first, such as the total size of a folder, evaluating an expression, or freeing memory from the leaves up

The expression `(3 + 4) × 2` shows all three.

| Order | Reading of the Expression |
| --- | --- |
| Preorder | × + 3 4 2 |
| Inorder | 3 + 4 × 2, which needs brackets to mean the same thing |
| Postorder | 3 4 + 2 ×, which is the postfix form |

The postfix form is why a stack could evaluate it: postorder visits both operands before their operator, so by the time the operator comes, its two values are ready. Evaluating the tree recursively does the same job with the call stack, and the result is 14.

## Without Recursion

The recursive versions use the call stack, which has a limit, as [The Call Stack and Recursion Depth](/algorithms/call-stack) showed. Each order can use an explicit stack, in the manner of [Turning Recursion into Iteration](/algorithms/recursion-to-iteration).

```python
def preorder_iter(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.right: stack.append(node.right)   # right first, so left comes off first
        if node.left: stack.append(node.left)
    return out

def inorder_iter(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:                                # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.val)
        node = node.right
    return out

def postorder_iter(root):
    out, stack = [], [root] if root else []
    while stack:                                   # node, right, left, and then reverse it
        node = stack.pop()
        out.append(node.val)
        if node.left: stack.append(node.left)
        if node.right: stack.append(node.right)
    return out[::-1]
```

The postorder trick is to visit in the order node, right, left, which is a mirrored preorder, and reverse the result. We checked all three against the recursive versions on 1,000 random trees.

The stack matters on tall trees. We built a chain of 100,000 nodes, each with only a right child. The recursive inorder raised a `RecursionError`, and the iterative one finished in 5 ms. On a balanced tree of a million nodes both took about the same time: 59 ms recursive and 50 ms iterative. A balanced tree is only about 20 levels deep, so the stack stays small.

The stack holds at most the height of the tree, so the memory is O(height): about log n for a balanced tree and n for a chain.

## Which Orders Pin Down a Tree

If you are given only a traversal, can you rebuild the tree? It depends on which one. For the two-node trees with a child on the left and with a child on the right, preorder is 1, 2 for both, and postorder is 2, 1 for both, so those two orders can't tell the shapes apart.

Inorder differs, 2, 1 for the left child and 1, 2 for the right child. In general, preorder with inorder, or postorder with inorder, determines the tree when the values are distinct. Preorder with postorder doesn't. [Building and Serializing Trees](/algorithms/building-serializing-trees) uses this.

## Key Points

- A tree is a node plus two subtrees, so a traversal chooses when to visit the node: before, between or after the subtrees
- Preorder is for copying and saving, inorder gives sorted order in a search tree, and postorder is for work that needs the children's results first
- Each takes O(n) time and O(height) memory, and the postfix form of an expression is its postorder
- An explicit stack avoids the recursion limit, which a chain of 100,000 nodes breaks
- Inorder with preorder or postorder rebuilds a tree with distinct values, and preorder with postorder doesn't
