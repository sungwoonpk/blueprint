> **Tree recursion** solves a problem about a tree by solving it for the left and right subtrees and combining those two answers with the node itself. When the combination needs more than one fact, the recursive call returns several values.

A tree is a node with two smaller trees below it, so the recursion from [Thinking Recursively](/algorithms/thinking-recursively) fits it naturally: trust the call on each subtree, then work out the answer for this node. That one idea solves a long list of tree problems. The skill is in deciding what each call should hand back to its parent.

## The Shape of the Recursion

Every tree recursion has the same skeleton. The base case is the empty tree, `None`, which has a simple answer. The recursive case asks about the left and right subtrees, then combines.

```python
def height(node):
    if node is None:
        return -1                              # an empty tree has height -1
    return 1 + max(height(node.left), height(node.right))
```

The functions `size`, `leaves` and the sum of all values follow the same pattern with a different base value and a different combination: add instead of take the maximum. This is **bottom-up** information flow. Each node asks its children a question and uses their answers, so the answer climbs from the leaves to the root, the same order as a postorder traversal in [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals).

## Passing Information Down

Some questions need information to flow the other way. Is there a path from the root to a leaf whose values add up to a target? The answer for a node depends on how much of the target is already used up by the nodes above it. So pass the remaining target down as an argument.

```python
def has_path_sum(node, target):
    if node is None:
        return False
    if node.left is None and node.right is None:
        return node.val == target              # at a leaf, nothing remains to add
    remaining = target - node.val
    return has_path_sum(node.left, remaining) or has_path_sum(node.right, remaining)
```

This is **top-down** information flow, and it matches a preorder traversal. Many problems use both directions at once: arguments carry what is known from above, and return values carry what is learned below. We checked `has_path_sum` against collecting every root to leaf sum, on 1,500 random trees and a range of targets.

## Returning More Than One Thing

The harder case is when the answer for a node depends on facts that the parent doesn't need. Take the **diameter**, the number of edges on the longest path between any two nodes.

The longest path that bends at a node goes down its left side and down its right side, so its length is the left height plus the right height plus 2. The longest path overall bends at some node, so the answer is the largest of these values over all nodes.

The recursion has to return the height, since the parent needs it, and also look at the path through this node. It can hand back the height and record the best path in a variable outside the call.

```python
def diameter(root):
    best = 0
    def depth(node):                           # returns the height, updates the best path
        nonlocal best
        if node is None:
            return -1
        l, r = depth(node.left), depth(node.right)
        best = max(best, l + r + 2)            # the longest path that bends here
        return 1 + max(l, r)
    depth(root)
    return best
```

Take the tree whose root is 1, with children 2 and 3. Node 2 has children 4 and 5, and 4 has a child 7. Node 3 has a right child 6, and 6 has a left child 8.

<figure class="diagram graph">
<svg viewBox="0 0 330 196" role="img" aria-label="A binary tree with root 1 whose longest path runs from 7 through the root to 8">
<line class="e hl" x1="180.0" y1="24.0" x2="100.0" y2="72.0"/>
<line class="e hl" x1="180.0" y1="24.0" x2="260.0" y2="72.0"/>
<line class="e hl" x1="100.0" y1="72.0" x2="60.0" y2="120.0"/>
<line class="e" x1="100.0" y1="72.0" x2="140.0" y2="120.0"/>
<line class="e hl" x1="260.0" y1="72.0" x2="300.0" y2="120.0"/>
<line class="e hl" x1="60.0" y1="120.0" x2="30.0" y2="168.0"/>
<line class="e hl" x1="300.0" y1="120.0" x2="270.0" y2="168.0"/>
<rect class="n hl" x="166" y="10" width="28" height="28" rx="14"/>
<text class="t hl" x="180" y="24">1</text>
<rect class="n hl" x="86" y="58" width="28" height="28" rx="14"/>
<text class="t hl" x="100" y="72">2</text>
<rect class="n hl" x="246" y="58" width="28" height="28" rx="14"/>
<text class="t hl" x="260" y="72">3</text>
<rect class="n hl" x="46" y="106" width="28" height="28" rx="14"/>
<text class="t hl" x="60" y="120">4</text>
<rect class="n" x="126" y="106" width="28" height="28" rx="14"/>
<text class="t " x="140" y="120">5</text>
<rect class="n hl" x="286" y="106" width="28" height="28" rx="14"/>
<text class="t hl" x="300" y="120">6</text>
<rect class="n hl" x="16" y="154" width="28" height="28" rx="14"/>
<text class="t hl" x="30" y="168">7</text>
<rect class="n hl" x="256" y="154" width="28" height="28" rx="14"/>
<text class="t hl" x="270" y="168">8</text>
</svg>
<figcaption>The tree of the diameter example. The longest path, 7, 4, 2, 1, 3, 6, 8, is outlined. It has 6 edges and passes through the root</figcaption>
</figure>

For each node, the table lists the heights of its two subtrees and the path that bends there.

| Node | Left Height | Right Height | Path Through It |
| --- | --- | --- | --- |
| 7 | −1 | −1 | 0 |
| 4 | 0 | −1 | 1 |
| 5 | −1 | −1 | 0 |
| 2 | 1 | 0 | 3 |
| 8 | −1 | −1 | 0 |
| 6 | 0 | −1 | 1 |
| 3 | −1 | 1 | 2 |
| 1 | 2 | 2 | 6 |

The root's path is the longest, 6 edges: 7, 4, 2, 1, 3, 6, 8. Notice that the winning path passes through the root here, but it needn't: a tree with a huge subtree on one side can have its longest path entirely inside that subtree. Taking the best over all nodes covers both cases. We compared the function with a search from every node on 1,500 random trees.

Another version returns a pair instead of using an outside variable, which is the cleaner choice when the facts all flow upward.

## Do Each Job Once

A common slip is to call one recursive function from inside another, and repeat work as a result. Checking whether a tree is **balanced**, where every node's two subtrees differ in height by at most 1, shows it. The obvious version computes the height of each subtree at every node.

```python
def is_balanced_slow(node):
    if node is None:
        return True
    return (abs(height(node.left) - height(node.right)) <= 1
            and is_balanced_slow(node.left) and is_balanced_slow(node.right))
```

Each node recomputes heights that its children computed already. The fix is to have one recursion return the height, with a marker for "unbalanced below", so each node is visited once.

```python
def is_balanced(root):
    def check(node):                           # the height, or None if unbalanced below
        if node is None:
            return -1
        l = check(node.left)
        if l is None:
            return None
        r = check(node.right)
        if r is None or abs(l - r) > 1:
            return None
        return 1 + max(l, r)
    return check(root) is not None
```

On a balanced tree of 200,000 nodes the slow version took 171 ms and the one pass version took 15 ms. The slow one costs about n log n, because heights are recomputed at each level, and the one pass costs n, with an early exit as soon as an imbalance shows.

We checked that both agree on 1,500 random trees. The lesson is general: when a function needs a fact that the recursion already computes, return the fact.

## When the Tree Is Tall

Tree recursion goes as deep as the tree is tall. A balanced tree is fine, and a chain is a problem. At Python's default limit, `height` on a chain of 3,000 nodes raised a `RecursionError`. In that case, use an explicit stack and a postorder traversal, as [Turning Recursion into Iteration](/algorithms/recursion-to-iteration) describes, storing each node's result in a dictionary until its parent needs it.

## A Recipe

For a tree problem, ask these questions in order.

1. What does the empty tree contribute, and is the single node just a special case of that?
2. What does a node need to know from each child, and does it need one fact or several?
3. Does a node also need information from above, such as a running total or a bound?
4. How are the pieces combined, and is anything recorded along the way, like the best path?
5. Test on the empty tree, one node, a chain and a bushy tree

## Key Points

- A tree recursion has a base case for the empty tree and a recursive case that combines the answers for the two subtrees
- Bottom-up flow returns answers from children, as height and size do, and top-down flow passes information in arguments, as the remaining sum does
- When a node needs several facts, return the one the parent needs and record the other in a variable or a pair, as the diameter does
- Reuse what the recursion already computes: returning the height made the balance check O(n), where recomputing it cost 11 times more in our test
- Recursion depth equals tree height, so a chain needs an explicit stack
