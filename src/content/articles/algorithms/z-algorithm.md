> The **Z algorithm** computes, for each position i of a string, the length Z[i] of the longest match between the string's start and the part that starts at i. It does this in O(n) time by remembering the rightmost match found so far, a box, and copying from the start of the string wherever the box already knows the answer. Searching for a pattern becomes one pass over the Z values of the pattern, a separator and the text.

Stand at position i of a string and look at what follows. How many letters in a row agree with the very beginning of the string? That number, for every i, is the Z array, and it answers more questions than it seems to: where a pattern occurs, which pieces repeat, how long the shortest period is.

Computing it by comparing from scratch at each position costs O(n²) in the worst case. The Z algorithm computes all of it in about 2n comparisons.

## Z Values

For the string abacabab, position 4 holds abab, and the string starts abac. They agree for abab against abac, which is 3 letters, so Z[4] = 3.

<figure class="diagram">
<p class="rowname">String</p>
<div class="cells"><div class="cell">a<small>0</small></div><div class="cell">b<small>1</small></div><div class="cell">a<small>2</small></div><div class="cell">c<small>3</small></div><div class="cell">a<small>4</small></div><div class="cell">b<small>5</small></div><div class="cell">a<small>6</small></div><div class="cell">b<small>7</small></div></div>
<p class="rowname">Z value</p>
<div class="cells"><div class="cell">8</div><div class="cell">0</div><div class="cell hl">1</div><div class="cell">0</div><div class="cell hl">3</div><div class="cell">0</div><div class="cell hl">2</div><div class="cell">0</div></div>
<figcaption>Z[i] is how many letters from position i match the start of the string. At 4 the text reads abab against abac, so 3 letters match. The first value is the whole length by convention</figcaption>
</figure>

The values 0, 1, 0, 3, 0, 2, 0 follow position 0. The first value is set to the full length by convention. A value of 0 means the letter at that position differs from the first letter.

A brute force computation compares at each position until a letter disagrees. It does as much work as the sum of the Z values, plus one failure for each position, which can be quadratic, as for a string of the letter a repeated n times, where Z[i] = n − i.

## Reusing What Is Known

The saving comes from a **box**: the match found so far that reaches furthest to the right. If the box covers positions l up to r − 1, then the text from l to r − 1 equals the start of the string, from 0 to r − l − 1.

So for a position i inside the box, the letters starting at i are a copy of the letters starting at i − l, and we already know Z[i − l].

That gives a starting value for Z[i]: the smaller of Z[i − l] and the room left in the box, r − i. If Z[i − l] is less than the room, the answer is exactly that, and the one comparison the code still makes fails at once. If it reaches the box's edge, the match may continue past r, and we extend it letter by letter, moving the box to the right.

| i | Start From the Box | Z[i] | Box After |
| --- | --- | --- | --- |
| 1 | Outside, start at 0 | 0 | None |
| 2 | Outside, start at 0 | 1 | 2 to 2 |
| 3 | Outside, start at 0 | 0 | 2 to 2 |
| 4 | Outside, start at 0 | 3 | 4 to 6 |
| 5 | min(2, Z[1] = 0) = 0 | 0 | 4 to 6 |
| 6 | min(1, Z[2] = 1) = 1 | 2 | 6 to 7 |
| 7 | min(1, Z[1] = 0) = 0 | 0 | 6 to 7 |

At i = 5, we are inside the box that started at 4, so the answer comes from Z[1] = 0, and one comparison confirms it. At i = 6 the copied value 1 reaches the box's edge, so the match is extended one more letter: the text at 7 is b and the pattern has b at 1. That moves the box.

```python
def z_function(s):
    n = len(s)
    z = [0] * n
    z[0] = n
    l = r = 0                                  # the box: s[l:r] equals s[0:r - l]
    for i in range(1, n):
        if i < r:
            z[i] = min(r - i, z[i - l])        # copy from the start of the string
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1                          # extend past the box
        if i + z[i] > r:
            l, r = i, i + z[i]                 # move the box right
    return z
```

## Why It Is Linear

Each successful comparison moves the right edge r of the box one place right, and r never moves left. So the successful comparisons total at most n over the whole run. Each position also has at most one failing comparison, which gives at most n more. Altogether there are at most about 2n comparisons.

We confirmed the values against a brute force on 500 random strings of up to 40 letters over the alphabet a and b. On strings built to be hard, the comparisons counted were these.

| String | Length | Comparisons | 2n |
| --- | --- | --- | --- |
| aaaa and so on | 1,000 | 999 | 2,000 |
| aaaa and so on | 16,000 | 15,999 | 32,000 |
| abab and so on | 1,000 | 1,498 | 2,000 |
| abab and so on | 16,000 | 23,998 | 32,000 |

On ordinary prose, the first 200,000 characters of our article text took 201,543 comparisons, about 1 for each character.

## Searching With Z

To find a pattern in a text, join them as pattern, separator, text, where the separator is a character that appears in neither. A position in the text that has Z at least the length of the pattern starts a match, because the separator stops any match from extending past the pattern.

```python
def z_search(text, pat):
    s = pat + "\x00" + text
    z = z_function(s)
    m = len(pat)
    return [i - m - 1 for i in range(m + 1, len(s)) if z[i] >= m]
```

For "invariant" in our 845,999 characters it found 81 matches, the same as the other methods, in 0.11 s, which is dominated by building the long string and the list of Z values. The results matched `str.find` on 300 random strings where matches overlap.

This is the same job as [Pattern Matching with KMP](/algorithms/kmp), in the same O(n + m) time. The two are close relatives: KMP's table answers "how long a border does each prefix of the pattern have?" and the Z array answers "how far does each position agree with the start?". Z has one fewer idea to carry, a box, and is often the easier one to write from memory.

## What the Values Tell You

A border of a string is a piece that is both its start and its end. A border of length k exists exactly when some position i has i + Z[i] = n, with k = n − i, since then the end of the string agrees with its start. For abacabaabacaba the borders have lengths 7, 3 and 1, found that way, and for aaaa they are 3, 2 and 1.

The smallest period follows: the shortest p that divides n and has p + Z[p] = n. For abcabcabc the answer is 3, for abcab it is 5, and for aaaa it is 1. We checked the borders and the periods against trying every length on 2,000 random strings of up to 12 letters.

The largest Z value past position 0 is the longest piece at the start of the string that appears again later. For abracadabra it is 4, abra.

## Key Points

- Z[i] is the length of the longest match between the string's start and the part starting at i, and a brute force computation is quadratic for a string like aaaa
- The box is the match that reaches furthest right, and inside it Z[i] starts at min(Z[i − l], r − i), with extension only at the box's edge
- Each successful comparison moves the box edge right and each position fails at most once, so at most about 2n comparisons, 1,498 for 1,000 letters of abab
- Searching is one Z computation on pattern, separator and text, found 81 occurrences of invariant, the same as KMP and `find`
- A border of length k exists where i + Z[i] = n, and the smallest period is the shortest dividing p with p + Z[p] = n
