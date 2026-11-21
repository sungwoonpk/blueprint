> **Linear DP** solves problems on a sequence by taking the state to be a position, usually the length of the prefix handled so far. The answer for a prefix is built from the answers for shorter prefixes, either a few steps back or any number of steps back. It takes one table with n entries, and the time is n times the number of earlier entries each one looks at.

Two small puzzles on text. First, a message of digits has to be read as letters, with 1 for A up to 26 for Z, and 226 can be read as BZ, VF or BBF. How many ways are there to read a string? Second, a message arrives with the spaces removed, such as campusbus, and a dictionary says which words are allowed. Can it be split back into words?

Both are problems on a sequence, and both fall to the same shape of solution.

## Reading Digits as Letters

Define ways(i) as the number of ways to read the first i digits. The last letter of such a reading is either the last digit alone, or the last two digits together. A single digit counts if it isn't 0, since there is no letter 0. Two digits count if they make a number from 10 to 26. So:

ways(i) = ways(i − 1) when digit i is not 0, plus ways(i − 2) when digits i − 1 and i make 10 to 26

The empty string has one reading, so ways(0) = 1.

```python
def decode_ways(s):
    n = len(s)
    ways = [0] * (n + 1)
    ways[0] = 1
    for i in range(1, n + 1):
        if s[i - 1] != "0":
            ways[i] += ways[i - 1]                   # the last digit stands alone
        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:
            ways[i] += ways[i - 2]                   # the last two digits form one letter
    return ways[n]
```

<figure class="diagram">
<p class="rowname">Digits</p>
<div class="cells"><div class="cell">1<small>1</small></div><div class="cell">1<small>2</small></div><div class="cell">1<small>3</small></div><div class="cell bad">0<small>4</small></div><div class="cell">6<small>5</small></div></div>
<p class="rowname">Ways to read the first i digits</p>
<div class="cells"><div class="cell">1<small>0</small></div><div class="cell">1<small>1</small></div><div class="cell">2<small>2</small></div><div class="cell">3<small>3</small></div><div class="cell">2<small>4</small></div><div class="cell hl">2<small>5</small></div></div>
<figcaption>The digits 11106 and the number of ways to read each prefix as letters, where 1 is A and 26 is Z. The 0 cannot stand alone, so after it the count only comes from reading 10 as one letter, and the whole string can be read 2 ways</figcaption>
</figure>

For 11106, the counts are 1, 1, 2, 3, 2, 2. At the fourth digit, 0, there is no single reading, so only the pair 10 counts, and ways(4) = ways(2) = 2. At the fifth digit, 6, the pair 06 isn't a letter, so only the single digit counts.

The whole string can be read 2 ways: AAJF and KJF. The string 226 gives 3, and 100 gives 0, since after the 1 there are two 0s and 00 is not a letter.

We compared the function with a search that tries every reading, on 2,000 random strings of up to 14 digits, many with 0s. The counts agreed on every one. When every digit is 1, the count follows the Fibonacci numbers: 8 for 5 digits, 89 for 10 digits and 2,504,730,781,961 for 60 digits. A search listing every reading would never finish on that last one, while the table takes 60 steps.

## Splitting Text Into Words

Define can(i) as true when the first i letters can be split into dictionary words. The last word of such a split starts somewhere before i, at j, with the first j letters splittable and the piece from j to i a word.

can(i) = true if some j before i has can(j) true and the letters from j to i form a word

The empty text can be split, so can(0) = true.

```python
def word_break(text, words):
    n = len(text)
    longest = max(map(len, words))
    can = [False] * (n + 1)
    can[0] = True
    prev = [-1] * (n + 1)                    # where the last word of a split starts
    for i in range(1, n + 1):
        for j in range(max(0, i - longest), i):      # a word is never longer than the longest one
            if can[j] and text[j:i] in words:
                can[i] = True
                prev[i] = j
                break
    if not can[n]:
        return None
    pieces, i = [], n
    while i:
        pieces.append(text[prev[i]:i])
        i = prev[i]
    return pieces[::-1]
```

With the words cam, pus, campus, bus, bu, s, a, cab, us, ca and mp, `word_break("campusbus", words)` returns campus and bus. For campusx it returns `None`. Looking back only as far as the longest word keeps the work to n times that length. For a text of 18,000 letters it took 0.006 s.

The `prev` array is the choice record from [Reconstructing the Solution](/algorithms/reconstructing-solutions), used to list the words and not only to say yes or no. We checked it against a memoized search on 3,000 random strings of up to 12 letters from a small alphabet. The yes or no agreed each time, and every split it returned joined back to the text and used only dictionary words.

## Why Greedy Fails Here

A natural shortcut is to take the longest word at the start, then repeat. We tried it with the words cam, campu, pus and bus. For campusbus, the longest word at the start is campu, which leaves sbus, and that cannot be split, so the greedy method gives up. The correct split is cam, pus and bus.

We built 3,000 texts that can be split, by joining 1 to 5 random words. Greedy longest first failed on 385 of them, about 13%, while the table found a split for every one. This is the warning from [Recognizing a Dynamic Programming Problem](/algorithms/recognizing-dp): a rule that commits to the locally best piece is wrong when the choice affects what can follow.

## The Shape of Linear DP

Both problems have the same skeleton: a table over prefix lengths, a base case for the empty prefix, and a transition that looks back to earlier prefixes. They differ in how far back it looks.

| Problem | State | Looks Back | Work for Each State |
| --- | --- | --- | --- |
| Climbing steps | Steps reached | 1 and 2 positions | Constant |
| Reading digits | Digits read | 1 and 2 positions | Constant |
| Splitting into words | Letters split | Up to the longest word | Up to that length |
| Days with no two in a row | Days considered | 1 and 2 positions | Constant |

When the look back is a fixed small number, each state costs a constant, and the total is O(n). When it can reach back over the whole prefix, as in a word dictionary with no length limit, each state costs up to n and the total is O(n²), though a bound on the piece length, as the code uses, brings it back down.

The table also can run in the other direction: define the state as the suffix still to be handled and fill from the end. It is the same idea and sometimes more natural, as when a recursion works from the front.

## Key Points

- In linear DP the state is a prefix length, and each answer comes from answers for shorter prefixes, a fixed number back or any number back
- Reading digits as letters uses ways(i) = ways(i − 1) when the last digit isn't 0, plus ways(i − 2) when the last two make 10 to 26, and it matched a full search on 2,000 random strings
- Splitting text into words uses can(i) true when some can(j) is true and the letters from j to i are a word, with a back pointer to recover the words, 18,000 letters in 0.006 s
- Taking the longest word first failed on 385 of 3,000 splittable texts, while the table found every split
- The cost is the number of positions times how far back each one looks, which is constant for a fixed look back and bounded by the longest word for splitting
