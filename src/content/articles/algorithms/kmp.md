> The **Knuth-Morris-Pratt algorithm** (KMP) finds a pattern in a text without ever moving backward in the text. A failure table, built from the pattern alone, says how much of the pattern is still matched when a letter disagrees, so a mismatch falls back inside the pattern instead of restarting. It makes at most about 2n comparisons for a text of n letters, however repetitive the text is.

Search for ababaca in the text abababaca. The pattern matches five letters, a b a b a, and then fails: the pattern wants c and the text has b. A plain search shrugs, moves the pattern one place right, and starts over, rereading letters it already saw.

But those five letters told us something. We know what the text looks like at this point, and the pattern can use that.

## What a Mismatch Leaves Behind

When the match fails after five letters, the text just read is ababa. A new attempt one place to the right is hopeless, since the text there starts with b and the pattern starts with a. An attempt two places to the right is still alive, because the text there reads aba, which is exactly the start of the pattern. So the next attempt can begin with three letters, aba, already matched.

That is what the failure table records. For every prefix of the pattern, it holds the length of its longest **border**: a piece that is both a start and an end of that prefix, shorter than the prefix itself. The prefix ababa has the borders a and aba, and the longest is aba, of length 3.

<figure class="diagram">
<p class="rowname">Pattern</p>
<div class="cells"><div class="cell">a<small>0</small></div><div class="cell">b<small>1</small></div><div class="cell">a<small>2</small></div><div class="cell">b<small>3</small></div><div class="cell">a<small>4</small></div><div class="cell">c<small>5</small></div><div class="cell">a<small>6</small></div></div>
<p class="rowname">Border length</p>
<div class="cells"><div class="cell">0</div><div class="cell">0</div><div class="cell hl">1</div><div class="cell hl">2</div><div class="cell hl">3</div><div class="cell">0</div><div class="cell hl">1</div></div>
<figcaption>For each prefix of the pattern, the length of its longest border, a part that is both the start and the end of that prefix. The prefix ababa, ending at position 4, has the border aba of length 3</figcaption>
</figure>

The table reads, from left to right, 0, 0, 1, 2, 3, 0, 1. The 3 under the fifth letter is the border of ababa. The 0 under c says that no border of ababac exists, since no earlier piece of the pattern ends in c.

## Falling Back Inside the Pattern

Keep a number j, the length of the pattern prefix that matches the text just read. A new letter either extends the match, with j going up by one, or disagrees. On a disagreement, the next best match is the longest border of the current prefix, so j drops to the table entry just before it, and the letter is compared again. This repeats until the letter fits or j reaches 0.

| Text Position | Letter | Matched Before | After |
| --- | --- | --- | --- |
| 0 | a | 0 | 1 |
| 1 | b | 1 | 2 |
| 2 | a | 2 | 3 |
| 3 | b | 3 | 4 |
| 4 | a | 4 | 5 |
| 5 | b | 5 | 4 |
| 6 | a | 4 | 5 |
| 7 | c | 5 | 6 |
| 8 | a | 6 | 7 |

At position 5, j was 5 and the letter b disagreed with c. j fell to 3, the border of ababa, and then b matched the fourth pattern letter, giving 4. The text pointer never moved back. At position 8, j reaches 7, the length of the pattern, so the pattern was found, starting at position 8 − 7 + 1 = 2.

```python
def kmp_search(text, pat):
    fail = failure_table(pat)
    found, j = [], 0
    for i, ch in enumerate(text):
        while j and ch != pat[j]:
            j = fail[j - 1]                  # fall back to the longest border
        if ch == pat[j]:
            j += 1
        if j == len(pat):
            found.append(i - j + 1)
            j = fail[j - 1]                  # keep going, so overlapping matches are found
    return found
```

## Building the Table

The table is built by the same idea, matching the pattern against itself. For each position, ask how long a border the prefix ending there has, using the border of the one before.

```python
def failure_table(pat):
    fail = [0] * len(pat)
    k = 0
    for i in range(1, len(pat)):
        while k and pat[i] != pat[k]:
            k = fail[k - 1]
        if pat[i] == pat[k]:
            k += 1
        fail[i] = k
    return fail
```

For ababaca it returns the table above. For aabaaab it returns 0, 1, 0, 1, 2, 2, 3, and for abcabcabc it returns 0, 0, 0, 1, 2, 3, 4, 5, 6.

## Why It Takes Linear Time

The inner `while` loops look dangerous, but the number of falls is limited. The count j goes up by at most one for each letter of the text and falls at most as far as it has risen, so over the whole text the number of falls is at most n.

Together with the one comparison for each letter, that is at most 2n comparisons. The table, by the same argument, takes at most 2m steps for a pattern of m letters. We saw that on a pattern of 20,000 letters taken from our text: 424 falls in all.

We compared the search with the plain one and with `str.find` on 300 random strings over the letters a and b, where matches overlap constantly, and all found the same positions.

On the text where the plain search struggled, a text of n letters a and a pattern of n ÷ 10 − 1 letters a and then a b, the difference was large.

| Text Length | Pattern Length | Plain Search | KMP | 2n |
| --- | --- | --- | --- | --- |
| 1,000 | 100 | 90,100 | 1,901 | 2,000 |
| 2,000 | 200 | 360,200 | 3,801 | 4,000 |
| 4,000 | 400 | 1,440,400 | 7,601 | 8,000 |

The plain search grew by 4 each time the sizes doubled and KMP by 2, just below the bound of 2n.

## On Ordinary Text

On ordinary text there's little to gain from it. Searching our 845,999 letters for "invariant", KMP made 885,335 comparisons and the plain search 895,412, about 1% fewer. Almost every position fails on the first letter in either method, and there is little to reuse. KMP took 0.05 s in Python, the same as the plain scan, against a fraction of a millisecond for the built in `str.find`.

KMP matters for the guarantee. It never does more than about 2n comparisons whatever the input, and it never moves back in the text, which allows searching a stream that can't be rewound.

## Other Uses of the Table

The table holds more than search steps. The **smallest period** of a string is the shortest piece that repeats to make the whole. If the table's last entry is b, then m − b is the length of the shortest repeating piece when it divides m evenly.

```python
def smallest_period(s):
    border = failure_table(s)[-1]
    p = len(s) - border
    return p if len(s) % p == 0 else len(s)
```

For abcabcabc it gives 3, for ababab it gives 2, and for abcab it gives 5, because abcab isn't built from a repeated piece. We checked it against trying every period on 2,000 random strings of up to 12 letters.

A second use is the rotation test. A string b is a rotation of a, as puscam is of campus, exactly when b occurs inside a followed by a. We searched for puscam in campuscampus and found it, and mapcus wasn't found. For 1,000 random pairs of strings of up to 8 letters, the test agreed with trying every rotation.

## Key Points

- KMP never moves backward in the text, because a table built from the pattern says how much of it is still matched after a mismatch
- The table holds, for each prefix of the pattern, the length of its longest border, a piece that is both its start and its end, as 3 for ababa
- Falls are bounded by the rises, so the search makes at most about 2n comparisons, 7,601 for n = 4,000 where the plain search made 1,440,400
- On ordinary text it gained about 1%, 885,335 comparisons against 895,412, and it is the guarantee that matters, along with reading the text once
- The same table gives the smallest period of a string as m minus the last entry, and a rotation test by searching a doubled string
