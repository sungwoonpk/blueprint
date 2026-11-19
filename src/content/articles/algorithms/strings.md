> A **string** is a sequence of characters stored as an array of numbers under an encoding. Most string algorithms treat it as an array, with two twists: strings are usually immutable, and "character" is a slippery word.

A campus sign-up form checks whether a name is already registered. José registers from his laptop. A week later he opens the app on his phone, types the same name, and the form treats him as someone new. Both spellings looked identical on screen, so what did the program see?

## What a Computer Sees

A string is stored as numbers. Each character, or more exactly each **code point**, is a number from Unicode's table, and an **encoding** turns code points into bytes. The common encoding, UTF-8, uses one byte for the first 128 code points (plain ASCII) and two to four bytes for the rest.

That gives three different lengths for the same text. A Python `str` is a sequence of code points, so `len` counts those. The file on disk or the data on the network holds bytes, so its size is the byte count.

| Text | What You See | Code Points | UTF-8 Bytes |
| --- | --- | --- | --- |
| a | One letter | 1 | 1 |
| é as one code point | One letter | 1 | 2 |
| e followed by a combining accent | One letter | 2 | 3 |
| 한 | One letter | 1 | 3 |
| 😀 | One symbol | 1 | 4 |
| A family emoji | One symbol | 5 | 18 |

We counted these in Python. The last row is three person symbols joined by two invisible joiner code points, and the screen draws them as one picture.

José's problem is the third row. "José" can be written with the single code point é, or with an e followed by a combining accent. The two draw the same and compare unequal: lengths 4 and 5, different code points.

<figure class="diagram">
<p class="rowname">é as one code point</p>
<div class="cells">
<div class="cell">C3</div>
<div class="cell">A9</div>
</div>
<p class="rowname">e plus a combining accent</p>
<div class="cells">
<div class="cell">65</div>
<div class="cell">CC</div>
<div class="cell">81</div>
</div>
<figcaption>The UTF-8 bytes of two spellings that look the same. A plain comparison sees different bytes and says they are unequal</figcaption>
</figure>

## What Counts as a Character

When someone says "character", they may mean a byte, a code point, or what a reader perceives as one letter. These disagree, so an algorithm has to say which one it works on. A reverse function that flips code points will put an accent in front of the wrong letter: reversing "café" written with a combining accent gives the accent first, attached to nothing sensible.

Most algorithm problems quietly assume the simplest case, such as lowercase English letters. State that assumption, and the algorithm stays honest about where it applies.

For real names and text, the fix is **normalization**: convert both strings to one standard form before comparing. Case needs the same care, because lowercasing isn't always enough. `casefold` is the stronger version meant for comparing.

```python
import unicodedata

def key(name):
    return unicodedata.normalize("NFC", name).casefold()

key("José") == key("José")    # True
key("JOSÉ") == key("josé")     # True
```

The form now sees both spellings as the same name. Normalization turns a messy comparison into an exact one, which is what lets a [hash table](/algorithms/hash-tables) or a sort treat the key properly afterward.

## Strings Are Usually Immutable

In Python, Java, Go and JavaScript, a string can't be changed in place. Assigning to `name[0]` is an error in Python, and any change builds a new string. That makes strings safe to share and to use as keys, since nothing can alter them under a [hash table](/algorithms/hash-tables). The price is that changing one costs a copy.

The price shows up when building a string piece by piece. Joining n single characters with `+=` copies the growing string each time, so the total work is quadratic. We measured it, with and without a second reference to the string:

| Characters | += in a Simple Loop | += with a Second Reference | Join |
| --- | --- | --- | --- |
| 50,000 | 1.7 ms | 19 ms | 0.7 ms |
| 100,000 | 3.6 ms | 108 ms | 1.4 ms |
| 200,000 | 6.6 ms | 403 ms | 2.6 ms |
| 400,000 | 13 ms | 1,215 ms | 5.4 ms |

The simple loop looks linear because CPython has a shortcut that grows a string in place when nothing else refers to it. Hold on to the old string for a moment and the shortcut disappears: doubling the length makes the loop three to six times slower. The shortcut is a detail of one implementation, and Python's style guide, PEP 8, tells you not to rely on it and to use `join` instead.

The dependable way is to collect the pieces in a list and join them once, which copies each character one time.

```python
parts = []
for word in words:
    parts.append(word.upper())
line = " ".join(parts)
```

The same rule applies in Java with `StringBuilder` and in Go with `strings.Builder`. Slicing also costs a copy in Python, proportional to the slice. Go's substrings share the original bytes instead, so slicing there is cheap.

## Comparing and Hashing Cost the Length

Comparing two strings is not one step either. It compares from the start until the first difference, or to the end if they are equal. On two 10 million character strings, equality took 0.22 ms, and a comparison that differed at the first character took 33 ns.

Hashing reads the whole string. We hashed new random strings and measured the first call and the next one.

| String Length | First Hash | Hash Again |
| --- | --- | --- |
| 10 | 0.08 µs | 0.06 µs |
| 10,000 | 2.5 µs | 0.05 µs |
| 1,000,000 | 271 µs | 0.2 µs |

The first hash grows with the length. Python then remembers the answer on the string, so repeated lookups with the same string object are fast. This matters for an idea we call "O(1) lookup" in [How Hash Tables Work](/algorithms/hash-tables): it assumes short keys. A key that is a million characters long makes its first lookup a million steps.

## Counting Characters

Many string problems come down to counting. Are two words anagrams, meaning the same letters in a different order? Sorting both and comparing takes O(n log n). Counting letters is faster.

```python
def is_anagram_lowercase(a, b):
    counts = [0] * 26
    for ch in a:
        counts[ord(ch) - ord("a")] += 1
    for ch in b:
        counts[ord(ch) - ord("a")] -= 1
    return not any(counts)
```

The array has one slot for each letter, so reading and writing a slot is one step, and the whole check is O(n) with 26 slots of extra memory. It works for lowercase English letters. For any other alphabet, use a dictionary or `Counter`, which pays a hash for each character and handles any code point.

A string is an array of characters, so the techniques for arrays apply: two pointers to check a palindrome, a sliding window for substrings and prefix counts for ranges. The Array Techniques phase covers them, from [Two Pointers](/algorithms/two-pointers) for a palindrome check to [Variable Size Sliding Window](/algorithms/variable-window) for substrings, and the Strings phase builds on them with pattern matching.

## Key Points

- A string is an array of numbers under an encoding, and its length depends on whether you count bytes, code points or visible letters
- The same visible text can have different code points, so normalize before comparing text that comes from people
- Strings are usually immutable, so build long ones by collecting pieces and joining them once
- Comparing and hashing a string cost up to its length, which matters for hash table keys
- Counting characters in an array, or in a dictionary for larger alphabets, turns many string problems into one pass
