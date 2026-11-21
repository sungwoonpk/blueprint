> A **suffix array** lists the starting positions of all suffixes of a string in alphabetical order of the suffixes. Any substring is the start of some suffix, so the places where a pattern occurs form one contiguous block of the array, found by binary search. Paired with an **LCP array**, which holds how many letters each suffix shares with the one before it, it answers repeated substring questions too.

We have 845,999 characters of text from this site, and we expect many questions about it: how many times does a phrase occur, where, and what is the longest passage that appears twice? Scanning the text for each question costs a pass over all of it each time.

If the text will be asked about many times, it pays to organize it once. The organization is sorting, but of an unusual list: every suffix of the text.

## Sorting the Suffixes

A suffix is the text from some position to the end. banana has six: banana, anana, nana, ana, na and a. Add a final $ that sorts before every letter, so no suffix is a prefix of another, and sort them.

| Rank | Start | Suffix | LCP With the Previous |
| --- | --- | --- | --- |
| 0 | 6 | $ | 0 |
| 1 | 5 | a$ | 0 |
| 2 | 3 | ana$ | 1 |
| 3 | 1 | anana$ | 3 |
| 4 | 0 | banana$ | 0 |
| 5 | 4 | na$ | 0 |
| 6 | 2 | nana$ | 2 |

The **suffix array** is the Start column: 6, 5, 3, 1, 0, 4, 2. The suffixes themselves aren't stored, just their positions, one number for each character of the text.

The right column is the **LCP array**: for each suffix, the number of letters it shares with the one just above it. ana$ and anana$ share 3 letters, ana.

Two facts make the sorted list useful. Every substring is a prefix of some suffix, so an occurrence of a pattern is a suffix that starts with it. And suffixes that start with the same pattern are neighbors in sorted order, just as all words starting with "pre" are neighbors in a dictionary.

## Building It

The direct way is to sort the suffixes as strings.

```python
def suffix_array_naive(s):
    return sorted(range(len(s)), key=lambda i: s[i:])
```

It is short, and it costs memory: the key function creates every suffix as a separate string, about n²/2 characters in all. For 2,000, 5,000 and 10,000 characters of our text the peak memory was 3 MB, 15 MB and 98 MB, and 402 MB at 20,000. At these sizes it grows about 4 times for each doubling, so 200,000 characters would take tens of gigabytes. The time stayed small, since Python compares strings in C, but the memory settles it.

The standard remedy is **prefix doubling**. Sort the suffixes by their first letter only, and give each suffix a rank for that. Then sort by the pair (rank of the suffix, rank of the suffix that starts one place later). That orders the suffixes by their first 2 letters, since the second rank covers the second letter.

Replace the ranks, and sort by pairs of ranks k places apart, with k doubling each round: 1, 2, 4, 8. After about log₂ n rounds, the ranks cover whole suffixes.

```python
def suffix_array(s):
    n = len(s)
    rank = [ord(c) for c in s]                   # round zero: rank by the first letter
    sa = list(range(n))
    k = 1
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key)
        new = [0] * n
        for j in range(1, n):
            new[sa[j]] = new[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = new
        if rank[sa[-1]] == n - 1:                # all ranks differ: fully sorted
            break
        k *= 2
    return sa
```

Each round sorts n pairs, so the total is O(n log² n) with an ordinary sort, or O(n log n) if the pairs are sorted by radix. Linear time constructions exist and are more intricate.

We compared it with the direct sort on 500 random strings of up to 30 letters over a, b and c, each ended with $, and the arrays were identical. On our text, it took 0.17 s for 50,000 characters, 0.82 s for 200,000 and 6.29 s for all 845,999, with memory growing only with the number of characters.

## Searching

To count the occurrences of a pattern of m letters, binary search the suffix array for the block of suffixes whose first m letters equal the pattern. Each probe compares the pattern with the first m letters of one suffix.

```python
import bisect

def occurrences(text, sa, pat):
    m = len(pat)
    key = lambda i: text[i:i + m]               # the first m letters of a suffix
    lo = bisect.bisect_left(sa, pat, key=key)
    hi = bisect.bisect_right(sa, pat, key=key)
    return sa[lo:hi]                            # the start of every occurrence
```

The cost is O(m log n) with this plain comparison. We checked the counts against repeated `str.find` for 100 patterns taken from the text, and they matched.

After building the array once, we searched for 500 patterns of 4 to 12 letters. The suffix array took 2 ms in all, and a loop of `str.find` over the text took 235 ms. The find loop averaged 0.47 ms for a pattern and the suffix array 0.004 ms, so with a build cost of 6.2 s the index pays for itself after about 13,000 patterns.

## Counting Shared Letters

The LCP array can be computed after the suffix array in linear time. Kasai's algorithm walks through the suffixes in text order, not sorted order. If suffix i shares h letters with its neighbor above, then suffix i + 1, which is suffix i with its first letter removed, shares at least h − 1 letters with its own neighbor.

So h can start from the previous value minus 1, and it never has to be rebuilt from zero.

```python
def lcp_array(s, sa):
    n = len(s)
    rank = [0] * n
    for i, p in enumerate(sa):
        rank[p] = i                              # where each suffix sits in sorted order
    lcp = [0] * n                                # lcp[r]: letters shared with the suffix above
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]                  # the suffix just above suffix i
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h:
                h -= 1                           # the next suffix shares at least one fewer
        else:
            h = 0
    return lcp
```

The loop increases h at most 2n times in total and decreases it at most once for each i, so the time is O(n). For banana$ it returns 0, 0, 1, 3, 0, 0, 2, the column in the table above. We checked it against comparing neighbors by hand on the 500 random strings. On our text it took 0.35 s after the 6.29 s build.

## What the Two Arrays Tell You

The longest substring that occurs twice is the largest value in the LCP array: two suffixes that share that many letters. For banana$ the largest value is 3, and the passage is ana.

For the prose of our articles, 475,894 characters once the code and tables are removed, the longest repeated passage had 115 characters, and it was a sentence we reused across articles: "The invariant, in the sense of Proving Correctness with Loop Invariants, is that". Repeated text isn't always a mistake, as a template is repeated on purpose.

The number of distinct substrings of a string of n letters is n(n + 1) ÷ 2 minus the sum of the LCP values, because each suffix adds its prefixes, minus the ones its neighbor above already supplied. For banana the sum is 6, and the count is 21 − 6 = 15. We checked this and the longest repeat against brute force on 300 random strings of up to 25 letters.

For our whole text, there were 357,846,676,923 distinct substrings out of 357,857,577,000 possible start and end pairs, which is 99.997%. Nearly all substrings occur once, and a small amount of repetition lives in the long shared passages.

## Where It Sits

A suffix array holds the same information as a **suffix tree**, which is a compressed trie of all the suffixes, as in [Tries](/algorithms/tries). The tree answers questions in time proportional to the pattern length, and the array is smaller, one number for each character, which is why arrays are the more common choice for large texts. Both can be built in linear time, though not by the short code here.

Compared with the other tools of this phase, the array is for a text that is searched many times, and the pattern-matching algorithms of [Pattern Matching with KMP](/algorithms/kmp) and [The Z Algorithm](/algorithms/z-algorithm) are for a single pass, where no index is worth building.

## Key Points

- A suffix array stores the starting positions of a string's suffixes in sorted order, one number for each character, and a pattern's occurrences form one block of it
- Sorting the suffixes as strings needs about n²/2 characters of memory, 98 MB at 10,000 characters, and prefix doubling sorts by 1, 2, 4, 8 letters in about log₂ n rounds, taking 6.29 s for 845,999 characters
- Binary search counted 500 patterns in 2 ms where `str.find` loops took 235 ms, so the index pays back after about 13,000 patterns
- Kasai's algorithm builds the LCP array in O(n), because the next suffix shares at least one letter fewer than the last
- The largest LCP value is the longest repeated substring, and the sum of the LCP values gives the number of distinct substrings, n(n + 1) ÷ 2 minus the sum
