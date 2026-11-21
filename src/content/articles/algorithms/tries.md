> A **trie** (said "try") is a tree that stores strings letter by letter: each edge is a letter, the path from the top spells a prefix, and a mark on a node says that a word ends there. Insert, lookup and deletion cost the length of the word, whatever the number of words, and every word that starts with a given prefix sits in one subtree, which makes it the natural structure for autocomplete and for longest prefix matching.

A search box suggests words as you type. After "pre" it should offer "prefer", "prefix" and "premise", without scanning the whole dictionary on each keystroke. What structure answers "which words start with this?" directly?

A hash table can say whether an exact word exists, and has no idea about prefixes. A trie is built around them.

## One Letter per Step

Start with the words car, card, care and cat. They begin the same way, so store the shared start once.

<figure class="diagram graph">
<svg viewBox="0 0 360 296" role="img" aria-label="A trie holding car, card, care and cat. A path from the top gives the letters of a word: c, a, r is car, and c, a, r, d is card. The nodes where a word ends are outlined: r, t, d and e.">
<line class="e" x1="180.0" y1="24.0" x2="180.0" y2="84.0"/>
<line class="e" x1="180.0" y1="84.0" x2="180.0" y2="144.0"/>
<line class="e" x1="180.0" y1="144.0" x2="110.0" y2="204.0"/>
<line class="e" x1="180.0" y1="144.0" x2="250.0" y2="204.0"/>
<line class="e" x1="110.0" y1="204.0" x2="70.0" y2="264.0"/>
<line class="e" x1="110.0" y1="204.0" x2="150.0" y2="264.0"/>
<rect class="n" x="154" y="10" width="52" height="28" rx="14"/>
<text class="t " x="180" y="24">top</text>
<rect class="n" x="162" y="70" width="36" height="28" rx="14"/>
<text class="t " x="180" y="84">c</text>
<rect class="n" x="162" y="130" width="36" height="28" rx="14"/>
<text class="t " x="180" y="144">a</text>
<rect class="n hl" x="92" y="190" width="36" height="28" rx="14"/>
<text class="t hl" x="110" y="204">r</text>
<rect class="n hl" x="232" y="190" width="36" height="28" rx="14"/>
<text class="t hl" x="250" y="204">t</text>
<rect class="n hl" x="52" y="250" width="36" height="28" rx="14"/>
<text class="t hl" x="70" y="264">d</text>
<rect class="n hl" x="132" y="250" width="36" height="28" rx="14"/>
<text class="t hl" x="150" y="264">e</text>
</svg>
<figcaption>The words car, card, care and cat share the path c, a. Each outlined node is where a word ends, so car is a word and also the start of card and care</figcaption>
</figure>

The path c, a leads to a node with two continuations, r and t. From r, the word car can end, and it can also go on to d or e. To find a word, follow its letters from the top, one step each. If a step is missing, the word is absent.

If every step exists, the word is present only if the last node is marked as a word's end, since the path c, a, r is present because of card and care, and car has its own mark.

```python
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})   # follow the letter, creating the step if missing
        node["$"] = True                     # a word ends here

    def _walk(self, prefix):
        node = self.root
        for ch in prefix:
            node = node.get(ch)
            if node is None:
                return None
        return node

    def contains(self, word):
        node = self._walk(word)
        return node is not None and "$" in node

    def starts_with(self, prefix):
        return self._walk(prefix) is not None
```

Each node is a dictionary from a letter to the next node, and the key `"$"` marks the end of a word. A lookup does one dictionary step per letter, so it costs the length of the word.

## Sharing Prefixes

We built a trie from a word list of 234,454 lowercase English words, from the system dictionary on our machine, with 2,248,642 letters in total. The trie has 758,880 nodes, about a third of the number of letters, because words that start alike share their first nodes.

Most of the sharing is in the first few levels: there are 26 nodes at the first level, 366 at the second, and 3,886 at the third, while 234,454 words are spread over the deeper levels.

So the structure's size depends on how much the words overlap, not directly on how many there are.

## Everything With a Prefix

To list the words that start with a prefix, walk to the node for the prefix and collect everything below it.

```python
def with_prefix(self, prefix):
    node = self._walk(prefix)
    found, stack = [], ([(node, prefix)] if node else [])
    while stack:
        node, text = stack.pop()
        if "$" in node:
            found.append(text)
        for ch in node:
            if ch != "$":
                stack.append((node[ch], text + ch))
    return sorted(found)
```

The walk costs the length of the prefix, and the collection costs the size of the subtree. For "pre" it found 3,032 words, for "qu" 1,141 and for "campus" just one, campus. We compared every result with scanning the whole list and with binary search in a sorted list, for six prefixes including one that matches nothing, and all three agreed.

A prefix that matches nothing costs almost nothing: the walk stops at the first missing step. For 20,000 words cut to their first three letters plus "qzx", the checks took 4 ms in total, which is 0.2 µs for each.

## Longest Prefix Matching

A different question: which stored word is the longest prefix of this input? Walk down the input and remember the last node marked as a word's end.

```python
def longest_prefix_of(self, text):
    node, best = self.root, ""
    for i, ch in enumerate(text):
        node = node.get(ch)
        if node is None:
            break
        if "$" in node:
            best = text[:i + 1]
    return best
```

For "campustour" it returns campus, since campus is a word and nothing longer on that path is. For "internationalization" it returns the whole word, and for "zzz" it returns z. This is the shape of the lookup in routing tables, which match the longest stored prefix of an address, although those tries use bits as the steps.

## Deleting a Word

Deleting unmarks the end and then prunes any steps left with nothing below them.

```python
def delete(self, word):
    path = [self.root]
    for ch in word:
        nxt = path[-1].get(ch)
        if nxt is None:
            return False
        path.append(nxt)
    if "$" not in path[-1]:
        return False
    del path[-1]["$"]
    for i in range(len(word), 0, -1):
        if path[i]:
            break                            # the node is still used by another word
        del path[i - 1][word[i - 1]]
    return True
```

In the trie of car, card, care and cat, which has 7 nodes, deleting card removes the node d and leaves 6. Deleting car then removes nothing, because its last node is still the start of care. We confirmed that car and care were still found after each step.

## What It Costs, Honestly

On a prefix query, the trie in Python lost to something simpler. If the words are kept in a sorted list, the words with a given prefix form one block, found by binary search and then read off in order.

| Question | Trie | Sorted List and `bisect` | Scan the List |
| --- | --- | --- | --- |
| Words starting with "pre" (3,032) | 3.35 ms | 0.18 ms | 2.7 ms |
| Words starting with "qu" (1,141) | 1.10 ms | 0.07 ms | 2.6 ms |
| 20,000 exact lookups | 15 ms | 7 ms | Not run |

A Python set answered the 20,000 lookups in 1 ms. The trie also took far more memory: 141 MB for the word list, against 14 MB for the strings and the list, since each node is a whole dictionary. Dictionaries per node are a poor fit to Python, and the trie's strengths are different.

A trie doesn't need the words sorted, so it accepts an insertion or a deletion in time proportional to the word's length, where a sorted array has to shift. It answers longest prefix and "does anything start with this" questions as part of its walk. And its cost depends on the length of the query and not on the number of words, which makes it steady as a dictionary grows.

In languages with compact arrays, a trie node can be an array with one slot for each letter. Searches are then very fast, and the price is memory, since a node with a few children still carries every slot. The ternary variant keeps three links per node instead, trading some speed for far less space.

## Key Points

- A trie stores words letter by letter along a path, with a mark where a word ends, and lookup, insertion and deletion take the length of the word
- Words with a common start share nodes: 234,454 words of 2,248,642 letters used 758,880 nodes
- The words with a given prefix are one subtree, found after walking the prefix, and a longest prefix match falls out of the same walk
- In our Python test a sorted list with binary search answered prefix queries 19 times faster than the trie, 0.18 ms against 3.35 ms for "pre", and the trie took 141 MB against 14 MB
- Its advantages are cheap updates, prefix questions answered as part of the walk, and a cost that depends on the word length and not on the dictionary size
