> The **Rabin-Karp algorithm** finds a pattern in a text by comparing numbers instead of letters. It turns each window of the text into a **hash**, a number computed from its characters, and updates that number in constant time as the window slides one place, a **rolling hash**. Only windows whose hash equals the pattern's are checked letter by letter, so the expected time is O(n + m), and many patterns of one length can be searched in the same pass.

The markdown of the 109 articles written so far on this site, text and code together, is 845,999 characters long. Where does the word "invariant" appear? The obvious plan is to slide the word along the text and compare it at every position.

That plan is usually cheap, and it has a bad case. Rabin-Karp keeps the plan and replaces the comparison with something that costs the same at every position.

## Comparing at Every Position

The plain search checks the pattern against the text starting at position 0, then 1, then 2, and so on, and stops each check at the first letter that disagrees. On our text, "invariant" appeared 81 times, and the whole scan made 895,412 letter comparisons for 845,991 positions, about 1.06 for each position. Most positions fail on the first letter.

The worst case is a text that agrees with the pattern for a long time before it fails. We searched a text of n letters "a" for a pattern of n ÷ 10 − 1 letters "a" followed by one "b". Each position matches almost to the end.

| Text Length | Pattern Length | Comparisons | Text Length × Pattern Length |
| --- | --- | --- | --- |
| 1,000 | 100 | 90,100 | 100,000 |
| 2,000 | 200 | 360,200 | 400,000 |
| 4,000 | 400 | 1,440,400 | 1,600,000 |

Doubling both lengths made the work 4 times bigger, since it grows as the text length times the pattern length. Rabin-Karp has no such cliff, because it doesn't compare letters at every position.

## A Window as a Number

Treat a window of m characters as a number in some base R, the way decimal digits make a number. The text 2718281828 read in windows of 4 digits gives 2718, 7182, 1828, 8281, 2818 and 8182. Two windows are equal exactly when their numbers are equal, so the search for 8182 becomes a search for the number 8182.

Real windows are too long for that, so each number is kept small by taking the remainder after dividing by a modulus Q, and the remainder is the window's **hash**. Equal windows always give equal hashes. Different windows usually give different hashes, but not always, so a hash match must be confirmed.

The point of the number view is the update. To slide the window by one, subtract the leading digit's contribution, shift everything one place, and add the new digit. For digits in base 10, the new value is (old − leading digit × 10³) × 10 + new digit, taken mod Q after each step. That is a constant amount of work, however long the window is.

| Start | Window | Hash mod 101 |
| --- | --- | --- |
| 0 | 2718 | 92 |
| 1 | 7182 | 11 |
| 2 | 1828 | 10 |
| 3 | 8281 | 100 |
| 4 | 2818 | 91 |
| 5 | 8182 | 1 |
| 6 | 1828 | 10 |

The pattern 8182 has the hash 1, and only the window at start 5 shares it. The windows at starts 2 and 6 are the same text and give the same hash, as they must.

## The Code

For characters, the base is 256 or any number at least as big as the alphabet, and the modulus is a large prime.

```python
def rabin_karp(text, pat, base=256, mod=(1 << 61) - 1):
    n, m = len(text), len(pat)
    if m > n:
        return []
    high = pow(base, m - 1, mod)                       # weight of the leading character
    hp = ht = 0
    for k in range(m):
        hp = (hp * base + ord(pat[k])) % mod           # hash of the pattern
        ht = (ht * base + ord(text[k])) % mod          # hash of the first window
    found = []
    for i in range(n - m + 1):
        if hp == ht and text[i:i + m] == pat:          # a hash match is confirmed
            found.append(i)
        if i + m < n:
            ht = ((ht - ord(text[i]) * high) * base + ord(text[i + m])) % mod
    return found
```

The setup costs m steps and each slide costs a few operations, so the scan is O(n + m) plus the cost of confirming matches. We compared it with a plain search and with `str.find` repeated from each hit on 300 random strings of up to 60 letters from the two letters "a" and "b", where overlapping matches are common. All three found the same positions each time.

## Why the Modulus Is Large

With a small modulus, many different windows share a hash, and each such false match costs a confirmation. We searched our text for "invariant" with different moduli and counted the false matches.

| Modulus | False Matches Among 845,991 Windows |
| --- | --- |
| 97 | 8,612 |
| 997 | 642 |
| 10,007 | 46 |
| 1,000,003 | 0 |
| 2⁶¹ − 1 | 0 |

Every run found the same 81 true matches. The false matches shrink as the modulus grows, roughly like the number of windows divided by the modulus, a little fewer in practice. With a modulus near 2⁶¹ a false match is not something to expect in a text of this size, though it remains possible.

The code above confirms every hash match, so it never returns a wrong answer, and a bad run only costs time. That is a **Las Vegas** algorithm, as in [Randomized Algorithms](/algorithms/randomized). A version that trusts the hash is **Monte Carlo**: always fast, and wrong with a small probability. Choosing the base or modulus at random keeps an adversary from building a text that makes many windows collide.

## Many Patterns at Once

A single pattern is not where the fingerprint pays. We timed it on our text: the plain scan took 0.05 s, Rabin-Karp 0.12 s, and Python's built in `str.find` 0.34 ms, since it runs in C. In Python, `find` is the tool for one pattern. The plain scan won over Rabin-Karp here because it failed on the first letter at almost every position, so each step was cheaper than one hash update.

The hash helps when there are many patterns of the same length. Keep all their hashes in a table. Slide one window through the text, and at each position look up the window's hash in the table, confirming only on a hit.

We took 1,000 different words of 8 letters from the text and searched for all of them. One rolling pass took 0.16 s, and 1,000 separate runs of `find` took 0.38 s, with identical results. The gap grows with the number of patterns, since the pass costs the same however many are in the table, and the separate searches cost one scan each.

The same idea extends to patterns in two dimensions, and to comparing every chunk of one document against every chunk of another.

## Key Points

- Rabin-Karp turns each window of the text into a hash and updates it in constant time as the window slides, so only windows whose hash equals the pattern's need a letter by letter check
- The plain scan costs about the text length times the pattern length in the worst case, 1,440,400 comparisons for a text of 4,000 against a pattern of 400
- A hash is the window read as a number in some base, taken mod a large Q, and a small Q gave 8,612 false matches in a text of 845,991 windows while Q near 2⁶¹ gave none
- Confirming every hash match makes it a Las Vegas algorithm, and it matched the plain search on 300 random strings
- In Python, `str.find` is faster for one pattern, 0.34 ms against 0.12 s, and a rolling pass over 1,000 patterns took 0.16 s against 0.38 s
