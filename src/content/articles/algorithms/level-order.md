> **Level order traversal** visits a tree one level at a time: the root, then all of its children, then all of their children. It uses a queue, and it reaches the nodes nearest the root first.

A company's org chart is a tree, and the head of HR wants it printed by rank: the CEO, then the vice presidents, then the directors, then everyone below. The depth-first orders from [Preorder, Inorder and Postorder Traversals](/algorithms/depth-first-traversals) don't do that. They follow one branch to the bottom before they touch the next, so a director from the first department comes out before a vice president of the second. To print by rank, a tree has to be read across, not down.

## A Queue Reads Across

A queue serves items in arrival order. If every node adds its children to the back of a queue when it is visited, the nodes come out in order of depth: all the nodes at depth 1 were queued before any node at depth 2, because they were queued by the root, and depth 2 nodes are queued by their parents later.

Here is the seven letter tree from the previous article and the queue as each node is visited.

| Visit | Queue After |
| --- | --- |
| D | B, F |
| B | F, A, C |
| F | A, C, E, G |
| A | C, E, G |
| C | E, G |
| E | G |
| G | (empty) |

The order of visits is D, B, F, A, C, E, G, which is the levels read from top to bottom and left to right. To keep the levels apart, process the queue one level at a time: when a level starts, the queue holds exactly that level's nodes.

```python
from collections import deque

def level_order(root):
    levels, queue = [], deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):          # exactly the nodes of the current level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels
```

For the seven letters it returns `[['D'], ['B', 'F'], ['A', 'C', 'E', 'G']]`. The invariant is that at the start of each round the queue holds all the nodes of one depth and nothing else. Each node is queued and removed once, so the traversal is O(n). We checked the levels against depths computed another way on 1,000 random trees. The queue is the one from [Queues and Deques](/algorithms/queues-deques), and a plain list's `pop(0)` would make this quadratic.

## What Reading by Levels Gives You

Once the tree is cut into levels, several questions are one line each.

- **Print by rank**: join each level on its own line
- **The widest level**: the longest list
- **Sum or average of each level**: aggregate each list
- **What is visible from the right**: the last node of each level
- **How deep it goes**: the number of levels

## Nearest First

The most useful property of level order is that it finds the nearest match first. To find the shallowest leaf, the nodes at the least depth with no children, level order can stop as soon as it sees one, since no leaf at a smaller depth can come later. A depth-first search can't stop early, because a shallower leaf might hide in a branch it hasn't opened yet.

We tested this on a deliberately lopsided tree: a root with a chain of 100,000 nodes down its left side and a single leaf as its right child. The level order search stopped after visiting 3 nodes and reported a depth of 1. A depth-first search that finds the shallowest leaf had to visit all 100,002 nodes, since it started down the long chain. Both reached the same answer.

This is the tree version of a general idea. In a graph, searching by levels finds the fewest steps from a start to every node, which is the subject of [Breadth-First Search](/algorithms/breadth-first-search).

## The Cost: Memory

Depth-first and level order take the same O(n) time but use memory differently. A depth-first traversal's stack holds a path from the root, so it is as large as the height. Level order's queue holds a whole level, which for a bushy tree is a large share of all the nodes.

We measured both on a perfect tree of height 19, which has 1,048,575 nodes.

| Traversal | Largest Number of Items Held |
| --- | --- |
| Depth-first, with a stack | 20 |
| Level order, with a queue | 524,288 |

The widest level of a perfect tree holds about half of the nodes, so the queue can hold half the tree at once, while the stack stays within a single root-to-leaf path. For a very wide and shallow tree, depth-first is the lighter choice. For a tall thin tree, the queue stays small and the stack can grow large.

## Choosing Between Them

| Question | Better Fit |
| --- | --- |
| Is the answer near the root? | Level order, which can stop early |
| Does a node need its children's answers? | Postorder |
| Is the tree wide and shallow, with memory tight? | Depth-first |
| Do you need the nodes grouped by depth? | Level order |

Several tree problems can use either, and the choice is about which cost you can live with.

## Key Points

- Level order visits a tree by depth, using a queue that gets each node's children added at the back
- Processing the queue one round at a time, with `len(queue)` as the round size, separates the levels
- It runs in O(n) time and finds the nearest nodes first, so it can stop early on questions like the shallowest leaf
- The queue can hold a whole level, about half the tree for a perfect one, while a depth-first stack holds only a path
- The same idea on graphs finds shortest paths measured in steps
