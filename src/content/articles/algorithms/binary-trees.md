> A **binary tree** is a structure of nodes where each node has at most two children, called left and right, and one node at the top, the root, has no parent. It fits anything that splits into two parts, and its height decides how fast it is.

The campus holds a single-elimination chess tournament with four players. Ana plays Ben and Cy plays Dee in the semifinals, and the two winners meet in the final. Draw it from the top and the final sits above two semifinals, each of which sits above two players. Every match has exactly two sources, and every result feeds exactly one match above. That shape is a binary tree.

## Parts of a Tree

<figure class="diagram">
<div class="flow packets tree">
<div class="node hl">Final</div>
</div>
<div class="flow packets tree">
<div class="node">Semi 1</div>
<div class="node">Semi 2</div>
</div>
<div class="flow packets tree">
<div class="node">Ana</div>
<div class="node">Ben</div>
<div class="node">Cy</div>
<div class="node">Dee</div>
</div>
<figcaption>The tournament as a binary tree. Each row is one depth, and each match sits above the two nodes that feed it</figcaption>
</figure>

A few words name the parts, and the rest of this phase uses them.

| Term | Meaning | In the Tournament |
| --- | --- | --- |
| Root | The top node, with no parent | The final |
| Child and parent | A node below another, and the one above | Semi 1 is a child of the final |
| Leaf | A node with no children | The four players |
| Depth of a node | Edges from the root down to it | The final is 0, the players are 2 |
| Height of a tree | Edges on the longest path from the root to a leaf | 2 |
| Subtree | A node with everything below it | Semi 2 with Cy and Dee |

Heights count edges, so a single node has height 0, and by convention an empty tree has height −1. Each node is a small object with a value and two links, either of which can be empty.

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

final = TreeNode("Final",
                 TreeNode("Semi 1", TreeNode("Ana"), TreeNode("Ben")),
                 TreeNode("Semi 2", TreeNode("Cy"), TreeNode("Dee")))
```

Counting things in a tree is naturally recursive, since a tree is a node plus two smaller trees, as in [Thinking Recursively](/algorithms/thinking-recursively).

```python
def size(node):
    if node is None:
        return 0
    return 1 + size(node.left) + size(node.right)

def height(node):
    if node is None:
        return -1
    return 1 + max(height(node.left), height(node.right))
```

For the tournament, `size` is 7 and `height` is 2. We compared these functions with the expected counts on 500 random trees.

## Height Is What Matters

Almost every cost in this phase depends on the height. Walking from the root to any node takes at most height steps, so a tree with a small height is fast to search and update.

A **perfect** tree has every level full, so each level doubles: 1 node, then 2, then 4. A perfect tree of height h has 2^(h+1) − 1 nodes, of which 2^h are leaves. We counted the nodes of trees we built.

| Height | Nodes | Leaves |
| --- | --- | --- |
| 3 | 15 | 8 |
| 10 | 2,047 | 1,024 |
| 20 | 2,097,151 | 1,048,576 |

Two million nodes fit in a tree only 20 steps tall. The other extreme is a chain, where each node has one child, which is just a linked list with height n − 1. For any tree with n nodes the height lies between those two ends: at least ⌊log₂ n⌋ and at most n − 1. We checked that by listing every shape of binary tree for n up to 8, which come to 1, 2, 5, 14, 42, 132, 429 and 1,430 shapes, and the shortest and tallest of each size matched.

A tree is **balanced** when its height stays close to log₂ n, however loosely that is defined. [Balanced Trees and Ordered Maps](/algorithms/balanced-trees) shows how to keep a tree balanced as it changes.

## Other Names for Shapes

Some shapes have names that later articles use.

- **Full**: every node has zero or two children
- **Complete**: every level is full except possibly the last, which is filled from the left. Heaps are complete trees
- **Perfect**: every level is full, so all leaves sit at the same depth

## Trees in an Array

A complete tree needs no node objects at all. Store it level by level in an array, and let the position show the structure. With zero based indexes, the children of position `i` are at `2i + 1` and `2i + 2`, and its parent is at `(i − 1) // 2`.

| Position | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Children | 1, 2 | 3, 4 | 5, 6 | 7, 8 | 9, 10 | 11, 12 | 13, 14 |
| Parent | None | 0 | 0 | 1 | 1 | 2 | 2 |

Positions past the end of the array don't exist, so the last row's children simply aren't there. The array form saves the two links for each node and keeps neighbors close in memory. [Heaps and Priority Queues](/algorithms/heaps) and [Segment Trees](/algorithms/segment-trees) both use it.

## Trees Beyond Two Children

Not every tree is binary. A file system is a tree where a folder can have any number of children, as in the folder examples in [Thinking Recursively](/algorithms/thinking-recursively). The same vocabulary applies, and most of the ideas carry over. Binary trees are the base case because two children are enough for splitting, ordering and halving.

## Key Points

- A binary tree has a root, and each node has at most two children, left and right
- Depth counts edges from the root and height is the longest root to leaf path, with a single node at height 0
- A perfect tree of height h has 2^(h+1) − 1 nodes, so two million nodes fit in 20 levels
- For n nodes the height is between ⌊log₂ n⌋ and n − 1, and balance is about staying near the low end
- A complete tree can be stored in an array, with children at 2i + 1 and 2i + 2
