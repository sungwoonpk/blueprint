> A **palindrome** reads the same forward and backward. Finding the longest palindrome inside a string by growing a palindrome outward from every possible center takes O(n²) time in the worst case. **Manacher's algorithm** does it in O(n): it records how far a palindrome extends around each center, and inside a big palindrome it copies the answer from the mirror position instead of comparing again.

Of the 128,714 words in the prose of this site's algorithm articles, a few read the same both ways. "Level" appears 114 times, "ana" 56 times, which is a student, and "pop", "did", "non" and "sees" show up too. What is the longest palindrome hiding anywhere inside a text, not just a whole word?

The answer is a string problem that looks like it needs a lot of comparing. Careful bookkeeping removes almost all of it.

## Growing From a Center

Every palindrome has a middle: a letter for an odd length, like the e of level, or a gap between two letters for an even length, like the middle of noon. A string of n letters has n letters and n − 1 gaps, so 2n − 1 possible centers. From each center, compare the letters on its two sides, step outward while they agree, and stop at the first mismatch.

```python
def longest_palindrome(s):
    best_start, best_end = 0, 0
    for center in range(2 * len(s) - 1):
        left = center // 2
        right = left + center % 2              # a letter, or a gap between two letters
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        if right - left - 1 > best_end - best_start:
            best_start, best_end = left + 1, right
    return s[best_start:best_end]
```

It is simple, and on normal text it is fast, since most centers stop after a comparison or two. The bad case is a string where every center extends a long way. In a string of n letters a, the center in the middle extends n ÷ 2 steps, and so do many of its neighbors.

| String | Length | Plain Growth | Manacher |
| --- | --- | --- | --- |
| a repeated | 500 | 125,250 | 999 |
| a repeated | 1,000 | 500,500 | 1,999 |
| a repeated | 2,000 | 2,001,000 | 3,999 |
| ab repeated | 500 | 63,249 | 1,497 |
| ab repeated | 2,000 | 1,002,999 | 5,997 |

The comparisons of the plain method quadruple when the length doubles. For 20,000 letters a it took 11.4 s, against 0.01 s for the other column.

## Remembering Radii

Manacher's idea: don't throw away what a big palindrome already shows. Inside a palindrome, the left half is the mirror of the right half. A smaller palindrome in the right half has a twin in the left half, and the twin's length is already known.

First, make odd and even centers alike. Put a separator, say #, between all letters and at both ends, so abaab becomes #a#b#a#a#b#. Now every palindrome of the original has a letter of the new string as its center, a real letter for odd lengths and a # for even ones. Define the **radius** at a position as how many letters the palindrome centered there extends on each side, not counting the center.

<figure class="diagram">
<p class="rowname">With separators</p>
<div class="cells"><div class="cell">#<small>0</small></div><div class="cell">a<small>1</small></div><div class="cell">#<small>2</small></div><div class="cell">b<small>3</small></div><div class="cell">#<small>4</small></div><div class="cell">a<small>5</small></div><div class="cell">#<small>6</small></div><div class="cell">a<small>7</small></div><div class="cell">#<small>8</small></div><div class="cell">b<small>9</small></div><div class="cell">#<small>10</small></div></div>
<p class="rowname">Radius</p>
<div class="cells"><div class="cell">0</div><div class="cell">1</div><div class="cell">0</div><div class="cell">3</div><div class="cell">0</div><div class="cell">1</div><div class="cell hl">4</div><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">0</div></div>
<figcaption>abaab with a # between letters and at both ends. The radius at each position is how far a palindrome centered there extends. The outlined 4 at position 6 is baab, the longest palindrome</figcaption>
</figure>

The radius at position 6, a #, is 4: the palindrome there is #b#a#a#b#, which is baab with separators. The radius is also the length of the palindrome in the original string, 4 letters. A radius of 0 happens at a # between two different letters, where only the empty palindrome fits.

Keep the palindrome that reaches furthest right, with its center c and its right edge r. For a position i inside it, the mirror position is 2c − i. The palindrome around i matches the one around the mirror, as far as it stays inside the big palindrome. So radius[i] starts at the smaller of the mirror's radius and the room left, r − i, and only a growth beyond r needs fresh comparisons.

```python
def manacher(s):
    t = "#" + "#".join(s) + "#"
    n = len(t)
    radius = [0] * n
    c = r = 0                                   # the palindrome reaching furthest right
    for i in range(n):
        if i < r:
            radius[i] = min(r - i, radius[2 * c - i])    # copy from the mirror
        while i - radius[i] - 1 >= 0 and i + radius[i] + 1 < n \
                and t[i - radius[i] - 1] == t[i + radius[i] + 1]:
            radius[i] += 1                      # grow past what the mirror knew
        if i + radius[i] > r:
            c, r = i, i + radius[i]
    return radius
```

The bookkeeping has the same shape as the box of [The Z Algorithm](/algorithms/z-algorithm): the right edge r only moves right, every successful comparison moves it, and each position has one failing comparison. So the total number of comparisons is at most about 2n in the separated string, which is why the right column of the table is so small.

For abaab it returns 0, 1, 0, 3, 0, 1, 4, 1, 0, 1, 0. The largest value, 4 at position 6, tells us the longest palindrome has 4 letters, and it starts at (6 − 4) ÷ 2 = 1 in the original string: baab.

```python
def longest_from(s):
    radius = manacher(s)
    i = max(range(len(radius)), key=lambda k: radius[k])
    start = (i - radius[i]) // 2
    return s[start:start + radius[i]]
```

We checked it against two other ways on 500 random strings of up to 30 letters from a and b: the plain growth, and a brute force over every substring. All three gave the same longest length, and the answer returned was a palindrome found inside the string. `longest_from("babad")` gives bab, `longest_from("forgeeksskeegfor")` gives geeksskeeg, and for campus it gives c.

## Counting Every Palindrome

The radii hold more than the longest one. Each center holds a palindrome of every length up to its radius that has the center's parity, so a letter with radius 3, as in aba, holds b and aba, and a gap with radius 4, as in baab, holds aa and baab. In general a radius of k gives (k + 1) ÷ 2 palindromes, rounded down.

```python
def count_palindromes(s):
    return sum((k + 1) // 2 for k in manacher(s))
```

For abaab it gives 8: the five single letters, and aba, aa and baab. We compared it with testing every substring on the same 500 strings, and it agreed on every one.

## Hidden in the Text

We ran it on the letters of the prose, dropping everything but a to z, which left 357,888 letters, and it took 0.20 s. The longest palindrome was arrayarra, 9 letters, which comes from the end of one sentence, "array.", and the start of the next, "Arra".

On the whole 845,999 characters of text and code together, Manacher took 0.41 s, and the longest palindrome there was a 55 character stretch of table markup, mostly dashes and bars, so a palindrome can be dull and still be the longest.

## When to Use Which

The plain growth is short enough to write in an interview, and it is fine for normal text. Manacher is for guaranteed linear time. A table with one cell for each pair of start and end positions costs n² cells, which is 400 million for 20,000 letters, so the dynamic programming version doesn't scale as far.

## Key Points

- A palindrome has a center, a letter or a gap, so a string has 2n − 1 centers, and growing outward from each one is simple but costs O(n²) in the worst case, 2,001,000 comparisons for 2,000 letters a
- Manacher's algorithm puts a separator between letters, so every palindrome has a letter as its center, and stores the radius at each position
- Inside the palindrome that reaches furthest right, a radius starts from the mirror position's radius, so the right edge only moves right and the total is about 2n comparisons
- It matched the plain method and a brute force on 500 random strings, and took 0.01 s where the plain method took 11.4 s on 20,000 letters a
- The same radii count all palindromic substrings with the sum of (radius + 1) ÷ 2 over the positions, 8 for abaab
