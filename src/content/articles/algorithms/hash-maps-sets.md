> A **hash map** stores key-value pairs and finds the value for a key in O(1) time on average. A **hash set** stores only keys and answers "is this key present?" in O(1) time on average.

A course keeps a roster. It needs to look up a student's name by ID, check whether an ID is enrolled, count students for each major and group them by section. All four are the same tool, a hash table used in different ways. [How Hash Tables Work](/algorithms/hash-tables) covered the machinery. This page is about using it well.

## Maps and Sets in Python

Python's `dict` is a hash map and its `set` is a hash set. A set is the same table without the values. Here are the operations you reach for and what they cost on average.

| Operation | Cost |
| --- | --- |
| Get, set or delete a key | O(1) |
| Check whether a key is present | O(1) |
| Add to or remove from a set | O(1) |
| Loop over all keys | O(n) |
| Union of two sets | O(n + m) |
| Intersection of two sets | About O(min(n, m)) |

The gap against a list is large. Checking whether a number is among a million others took 3.88 ms in a list, which scans, and 16 ns in a set. That is about 240,000 times faster, and the gap grows with the size. The price is memory. A million integers took 40 MB in a list, 65.5 MB in a set and 73.9 MB in a dict, since the table keeps empty slots on purpose.

## What Can Be a Key

A key has to be **hashable**: it needs a hash value that never changes while it is in the table, and equal keys must have equal hashes. In Python, immutable values such as numbers, strings and tuples of hashable items qualify. Lists and dictionaries don't, because they can change.

```python
{[1, 2]: "x"}            # TypeError: unhashable type: 'list'
{(0, 1): "wall"}[(0, 1)] # 'wall', a tuple works as a key
```

Tuples make good keys for grid cells, as in the sparse grid from [Working with Matrices](/algorithms/matrices): `walls = {(0, 1), (2, 3)}` stores only the cells that have something in them.

Two details trip people up. First, keys that compare equal are the same key. The numbers `1`, `1.0` and `True` are equal in Python, so a dictionary holding all three ends up with one entry:

```python
d = {1: "int"}
d[1.0] = "float"
d[True] = "bool"
print(d)                 # {1: 'bool'}
```

Second, changing a key's contents after inserting it breaks the table. We stored a `Student` object whose hash comes from its name, then changed the name. The table still held the entry under the old hash, but a lookup now computed a new hash and went to a different slot.

The entry was lost: `s in reg` was `False`, a new `Student("Ana")` was not found either, and the dictionary still reported one entry. If a class defines equality by its contents, keep those contents fixed while it is a key.

## Three Everyday Patterns

**Membership and duplicates.** A set answers "have I seen this?" in one step. It was the key to the roster check in [What is an Algorithm?](/algorithms/what-is-an-algorithm), and `set(items)` removes duplicates in one pass.

**Counting.** A dictionary can hold a count for each key. Look up the current count, add one, and store it.

```python
words = "the cat and the hat and the bat".split()
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1

print(counts)    # {'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}
```

The `Counter` class in `collections` does the same in one line, and `most_common()` sorts by count. Counting characters in [Working with Strings](/algorithms/strings) is the same idea with letters as keys.

**Grouping.** Map each key to a list of everything that shares it, and `defaultdict(list)` creates the empty list on first use.

```python
from collections import defaultdict

by_major = defaultdict(list)
for name, major in [("Ana", "Math"), ("Ben", "CS"), ("Cy", "CS"),
                    ("Dee", "Bio"), ("Eli", "CS")]:
    by_major[major].append(name)

print(dict(by_major))
# {'Math': ['Ana'], 'CS': ['Ben', 'Cy', 'Eli'], 'Bio': ['Dee']}
```

A fourth pattern shows up in problems that search for a partner: store what you have seen, keyed by the thing a later item would need to find it. The gift card problem in [How to Approach a Problem](/algorithms/approaching-problems) keeps a map from price to position, and each new price looks for `budget - price`.

## Order and Iteration

Hash tables scramble keys across slots, so you might expect iteration order to be random. Python dictionaries keep **insertion order**, and the language guarantees it from version 3.7. Updating an existing key keeps its place, and deleting a key and adding it again moves it to the end.

```python
d = {}
d["b"] = 1; d["a"] = 2; d["c"] = 3; d["b"] = 9
print(list(d))           # ['b', 'a', 'c']
del d["a"]; d["a"] = 5
print(list(d))           # ['b', 'c', 'a']
```

CPython gets this by splitting the table in two. A small **index table** is the hash table proper, and each slot holds a position. The **entries** array stores the key-value pairs in the order they arrived. A lookup hashes to an index slot, reads the position, and finds the entry.

<figure class="diagram">
<p class="rowname">Index table, 8 slots</p>
<div class="cells">
<div class="cell dim"><small>0</small></div>
<div class="cell done">2<small>1</small></div>
<div class="cell dim"><small>2</small></div>
<div class="cell done">0<small>3</small></div>
<div class="cell dim"><small>4</small></div>
<div class="cell dim"><small>5</small></div>
<div class="cell done">1<small>6</small></div>
<div class="cell dim"><small>7</small></div>
</div>
<p class="rowname">Entries, in insertion order</p>
<div class="cells">
<div class="cell">Ana<small>0</small></div>
<div class="cell">Ben<small>1</small></div>
<div class="cell">Cy<small>2</small></div>
</div>
<figcaption>A dictionary built from Ana, Ben and Cy. The index table points into the entries, and looping walks the entries in order</figcaption>
</figure>

Looping walks the entries, so it costs O(n) and not O(table size), and the entries array is compact, which also saves memory. Sets don't promise any order, and Java's `HashMap` doesn't either, with `LinkedHashMap` as the ordered variant.

One more rule: don't add or remove keys while looping over a dictionary. Python stops you with `RuntimeError: dictionary changed size during iteration`, because the table could rearrange under the loop.

## What a Hash Map Can't Do

The O(1) is an average, and the worst case is O(n) when many keys collide, which is the lesson of [Best, Average and Worst Cases](/algorithms/best-average-worst). Hashing a key also reads the whole key, so long keys cost more, as [Working with Strings](/algorithms/strings) measured.

A hash map has no sense of order or nearness. It can't tell you the smallest key, the next key after 50, or all keys between 20 and 30 without scanning everything. For those questions, use a sorted structure such as an ordered map, covered in [Balanced Trees and Ordered Maps](/algorithms/balanced-trees), or a heap for the smallest item.

## Key Points

- A hash map stores key-value pairs and a hash set stores keys, each with O(1) average lookup, insert and delete
- Keys must be hashable, which means immutable in practice, and a key that changes after insertion can't be found again
- Equal keys are one key, so `1`, `1.0` and `True` collide in Python
- Sets handle membership and duplicates, and dictionaries handle counting, grouping and looking up a partner
- Python dictionaries keep insertion order by storing entries in an array behind a small index table
- Hash tables don't support order queries, so use an ordered map or a heap when you need the smallest or the nearest key
