> **Huffman coding** compresses data by giving common symbols short bit codes and rare symbols long ones, with no code a prefix of another so that a stream decodes without separators. Repeatedly merging the two least frequent symbols builds the code, and no other prefix code makes the message shorter.

Text stored with one byte per character gives the letter e, which appears constantly, the same 8 bits as the letter z, which rarely appears. That is a waste. Morse code noticed this long ago, giving the common E a single dot. But Morse needs pauses between letters, because the dot for E also begins the codes for I, S and H. A pause is a third symbol, and it costs space too.

Huffman coding keeps the idea and removes the pauses.

## Prefix Codes

A **prefix code** gives each symbol a string of bits so that no code is the beginning of another. Then a decoder can read bits one at a time and stop the moment it has matched a code, with no separators needed.

Any prefix code is a binary tree. Each symbol is a leaf, the code is the path from the root to it, with 0 for a left step and 1 for a right step, and the length of a code is the depth of its leaf. The total size of a message is the sum, over symbols, of how often it occurs times its depth.

Take a message of 25 symbols from the alphabet A to E, with counts A 10, B 6, C 4, D 3 and E 2. Five symbols need 3 bits each in a fixed length code, so the message takes 75 bits. A tree that puts A near the top and E near the bottom should do better, and the question is which tree is best.

## Merge the Two Rarest

Huffman's rule is greedy. Look at the symbols with the smallest counts and join them under a new node whose count is their sum. The new node replaces them in the list, and the process repeats until one node is left. A min-heap, from [Heaps and Priority Queues](/algorithms/heaps), finds the two smallest each time.

```python
import heapq, itertools

def huffman_codes(freq):                      # freq maps symbol -> count
    tie = itertools.count()                   # breaks ties, so symbols are never compared
    heap = [(f, next(tie), s) for s, f in freq.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        f1, _, left = heapq.heappop(heap)
        f2, _, right = heapq.heappop(heap)
        heapq.heappush(heap, (f1 + f2, next(tie), (left, right)))
    codes = {}
    def walk(node, prefix):
        if isinstance(node, tuple):
            walk(node[0], prefix + "0")
            walk(node[1], prefix + "1")
        else:
            codes[node] = prefix or "0"       # a one-symbol alphabet still needs a bit
    walk(heap[0][2], "")
    return codes
```

On our message the merges go like this.

| Step | Merge | New Node |
| --- | --- | --- |
| 1 | E (2) and D (3) | 5 |
| 2 | C (4) and the node of 5 | 9 |
| 3 | B (6) and the node of 9 | 15 |
| 4 | A (10) and the node of 15 | 25 |

<figure class="diagram">
<div class="flow packets tree">
<div class="node">25</div>
</div>
<div class="flow packets tree">
<div class="node hl">A 10</div>
<div class="node">15</div>
</div>
<div class="flow packets tree">
<div class="node hl">B 6</div>
<div class="node">9</div>
</div>
<div class="flow packets tree">
<div class="node hl">C 4</div>
<div class="node">5</div>
</div>
<div class="flow packets tree">
<div class="node hl">E 2</div>
<div class="node hl">D 3</div>
</div>
<figcaption>The code tree built by the merges. Outlined nodes are the symbols, and the other nodes are merged counts. Frequent symbols end up near the top</figcaption>
</figure>

Reading the paths with 0 for left gives A = 0, B = 10, C = 110, E = 1110 and D = 1111. The message now costs 10 × 1 + 6 × 2 + 4 × 3 + 2 × 4 + 3 × 4 = 54 bits, against 75 for the fixed length code, an average of 2.16 bits per symbol.

With a heap the whole construction takes O(n log n) for n symbols.

## Why It Is Optimal

The proof is an exchange argument, like those in [Exchange Arguments for Greedy Proofs](/algorithms/exchange-arguments). Two facts carry it.

First, some optimal tree has the two rarest symbols as siblings at the deepest level. If a rare symbol sits higher than a more common one, swapping them moves the common symbol up and the rare one down, which can only shorten the message. So the two rarest can be pushed to the bottom, next to each other.

Second, once they are siblings, treat the pair as one symbol with their combined count. The tree for the smaller alphabet, plus the two extra steps for the pair, costs exactly the pair's total count more. So an optimal tree for the small problem gives an optimal tree for the large one, which is the structure a greedy proof needs.

We checked the result against brute force. For each of 300 random alphabets of 2 to 7 symbols we listed every set of code lengths that fills a binary tree completely, found the cheapest, and compared it with the Huffman cost. They matched every time. Ties can lead to different trees, but they all give the same total length.

The method comes from 1952, when Huffman was a graduate student at MIT. The earlier method of Fano and Shannon, which split the symbols into two groups of nearly equal total count and then split each group again, was known not to be optimal.

## On Real Text

We measured it on 542,064 bytes of text, the earlier articles in this series, which use 141 different byte values. Code lengths ran from 3 bits for the space, the most common character, to 4 bits for e, t, s, a and o, up to 19 bits for characters that appear once.

| Method | Bits per Byte | Share of Original |
| --- | --- | --- |
| Fixed 8 bits | 8.00 | 100% |
| Huffman | 4.82 | 60% |
| Entropy of the byte counts | 4.77 | 60% |
| zlib at level 9 | 2.63 | 33% |

The entropy row is the limit from information theory for coding each byte on its own, using only how often it appears. Huffman came within 1% of it. We also encoded the first 50,000 bytes and decoded them back to confirm the text came out unchanged.

The last row is a reminder of what Huffman alone can't do. It looks at single bytes and never at repeated words and phrases. DEFLATE, the format used by gzip and zlib, combines the LZ77 method for repeated strings with Huffman coding of the result, and it compressed the same text to a third of its size.

## Sending the Code

A decoder needs the code, and sending a whole tree costs space. DEFLATE sends only the length of each symbol's code, and both sides rebuild the same codes from the lengths using two rules: codes of one length are consecutive numbers in alphabet order, and shorter codes come before longer ones.

```python
def canonical_codes(lengths):                 # symbol -> code length, symbols in alphabet order
    codes, code, prev = {}, 0, 0
    for sym in sorted(lengths, key=lambda s: (lengths[s], s)):
        code <<= lengths[sym] - prev          # a longer length appends zeros
        prev = lengths[sym]
        codes[sym] = format(code, f"0{prev}b")
        code += 1
    return codes
```

The specification's example gives the letters A to H the lengths 3, 3, 3, 3, 3, 2, 4 and 4. The function returns F = 00, then A = 010, B = 011, C = 100, D = 101, E = 110, and G = 1110, H = 1111, exactly the table in RFC 1951.

For our five symbols it reorders D and E to 1110 and 1111, with the same lengths and the same total.

The specification also requires that codes not exceed certain maximum lengths, which complicates computing the lengths from the counts. Our 19 bit codes for symbols seen once show why a limit is needed.

## Limits

- **Whole bits only**: every symbol costs at least one bit. If A appears 99% of the time and B 1%, Huffman uses 1 bit per symbol, while the entropy is 0.08 bits, a gap of about 12 times
- **Needs the counts**: the counts must be known before coding, either by reading the data twice or by sending a table
- **Blind to repetition**: it can't use the fact that a phrase appeared earlier, which is where the third row of the table came from

## Key Points

- A prefix code gives each symbol a bit string that no other code begins with, and it is a binary tree whose leaves are the symbols
- Huffman's algorithm merges the two least frequent nodes with a min-heap until one tree remains, in O(n log n)
- It is optimal because the two rarest symbols can always be siblings at the bottom, and a tree for the merged alphabet extends to the full one
- On 542,064 bytes of text it used 4.82 bits per byte, 60% of the original and within 1% of the entropy bound
- DEFLATE sends only code lengths and rebuilds the codes in canonical order, and it adds LZ77 to reach a third of the size
