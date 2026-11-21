> A computer stores an integer as a fixed number of bits. Read as **unsigned**, each bit i adds 2<sup>i</sup>. Read as **two's complement**, which most hardware uses for signed numbers, the top bit counts for −2<sup>w−1</sup> instead, so w bits hold the values −2<sup>w−1</sup> to 2<sup>w−1</sup> − 1. Arithmetic wraps around when a result doesn't fit, and Python's own integers avoid that by growing as needed.

A warehouse scanner keeps its box count in a single byte. At 255 boxes, one more shows 0. Nothing crashed. The counter did exactly what a byte does, and the screen is wrong anyway.

Knowing how integers sit in memory explains this, and it explains what the bit operations of the next articles actually touch.

## Place Values

A decimal digit is worth a power of 10 for its position, and a bit is worth a power of 2. The 8 bits 00001101 hold 8 + 4 + 1 = 13. A byte has 8 bits, so it has 2⁸ = 256 patterns, and read as plain counting numbers they stand for 0 to 255. That is the **unsigned** reading, and in general w bits give 0 to 2<sup>w</sup> − 1.

That range is the whole story of the scanner: 255 is 11111111, and adding 1 carries through every bit and leaves 00000000, with the carry out of the top bit thrown away. The result is the sum **modulo** 2⁸, the remainder after dividing by 256.

## Negative Numbers Without a Minus Sign

Memory has no minus sign, so negative numbers need a code in the bits. The code used almost everywhere is **two's complement**: the same place values, except that the top bit counts for a negative power of 2. In 8 bits it counts for −128 instead of +128.

| Pattern | Unsigned | Signed |
| --- | --- | --- |
| 00000101 | 5 | 5 |
| 01111111 | 127 | 127 |
| 10000000 | 128 | −128 |
| 11001000 | 200 | −56 |
| 11111110 | 254 | −2 |
| 11111111 | 255 | −1 |

The small numbers look the same either way. Patterns that start with 1 are the ones that change, and a pattern of all ones is −1. A smaller picture shows the whole code at 4 bits.

<figure class="diagram">
<div class="cells"><div class="cell">0<small>0000</small></div><div class="cell">1<small>0001</small></div><div class="cell">2<small>0010</small></div><div class="cell">3<small>0011</small></div><div class="cell">4<small>0100</small></div><div class="cell">5<small>0101</small></div><div class="cell">6<small>0110</small></div><div class="cell">7<small>0111</small></div></div>
<div class="cells"><div class="cell hl">-8<small>1000</small></div><div class="cell hl">-7<small>1001</small></div><div class="cell hl">-6<small>1010</small></div><div class="cell hl">-5<small>1011</small></div><div class="cell hl">-4<small>1100</small></div><div class="cell hl">-3<small>1101</small></div><div class="cell hl">-2<small>1110</small></div><div class="cell hl">-1<small>1111</small></div></div>
<figcaption>The signed value of every 4 bit pattern, with the pattern under each cell. The outlined row has the top bit set: unsigned it reads 8 to 15, and signed it reads −8 to −1</figcaption>
</figure>

Counting up from 0111, which is 7, the next pattern is 1000, which is −8. The signed numbers sit on a circle, and the top bit marks the half with negatives.

To negate a number, flip every bit and add 1. For 5, which is 00000101, flipping gives 11111010, and adding 1 gives 11111011. Its value is −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5, and in Python, `(-5) & 0xFF` gives 251, which is the same pattern read as unsigned.

Why it works: a number plus its flipped self is all ones, which is −1, so flipping gives −x − 1, and adding 1 gives −x.

The range has a quirk. With 8 bits it runs from −128 to 127, one more negative than positive. The most negative value has no positive partner: negating −128 gives 128, which doesn't fit, and the result is −128 again. In general the signed range of w bits is −2<sup>w−1</sup> to 2<sup>w−1</sup> − 1. For 32 bits that is −2,147,483,648 to 2,147,483,647, and for 64 bits the top is 9,223,372,036,854,775,807.

## Wrapping Around

The hardware that adds two numbers treats the patterns as plain binary, and the same circuit gives the right answer for unsigned and signed readings. We checked that on all 65,536 pairs of 8-bit patterns: the 8 bit sum equals the true sum modulo 256, and read as signed it equals the true signed sum modulo 256 as well.

What changes is when the result is wrong. For unsigned numbers, a sum is wrong when it passes 255. For signed numbers, 127 + 1 gives 10000000, which is −128. Of the 65,536 pairs of signed 8-bit numbers, 16,384 overflow, a quarter of them.

There's a simple test for signed overflow: the two numbers have the same sign, and the sum has a different one. Adding numbers of opposite signs can never overflow. We compared the rule with the true sum for every pair, and it disagreed on none.

## Python Is Different

Python doesn't wrap. An `int` grows as large as memory allows, so `2**100 + 1` is just a big number. That is convenient, and it hides the fixed width problem, so programs written in Python can't overflow by accident, but they can misrepresent how C, Java or a database column will behave.

The cost of that freedom shows in the size. These sizes come from `sys.getsizeof` on CPython 3.13.

| Value | Bits | Bytes in Memory |
| --- | --- | --- |
| 1 | 1 | 28 |
| 2³⁰ | 31 | 32 |
| 2⁶⁰ | 61 | 36 |
| 2¹⁰⁰ | 101 | 40 |
| 2¹⁰⁰⁰ | 1,001 | 160 |

A small integer takes 28 bytes, against 4 in a 32 bit variable, and each extra 30 bits add 4 bytes.

Bitwise operations on negative numbers also work, on the idea that the number is in two's complement with infinitely many sign bits in front. So `-5 & 0xFF` is 251, the low 8 bits of −5. To simulate a fixed width, mask the result and reinterpret.

```python
def to_signed(x, w):
    x &= (1 << w) - 1                  # keep the low w bits
    return x - (1 << w) if x >> (w - 1) else x   # top bit set: subtract 2**w
```

`to_signed(127 + 1, 8)` returns −128, which is what an 8 bit machine gives. A right shift of a negative number rounds down: `-5 >> 1` is −3, since a right shift by n divides by 2ⁿ and rounds toward negative infinity, as `-5 // 2` does.

## Where It Bites

Two classic places. The first is a clock. Many systems count seconds since 1 January 1970 in a signed 32 bit integer. Its largest value, 2,147,483,647, falls on 19 January 2038 at 03:14:07 UTC, and one second later the counter wraps to −2,147,483,648, which reads as December 1901. We computed both dates.

The second is the midpoint of a range, as in [Binary Search](/algorithms/binary-search). The usual `(lo + hi) // 2` adds two numbers before halving. With 32 bit integers, lo = 1,500,000,000 and hi = 2,000,000,000 sum to 3,500,000,000, which doesn't fit. The 32 bit result wraps to −794,967,296, and the midpoint comes out as −397,483,648, a negative index.

The safe form `lo + (hi - lo) // 2` never adds two large numbers, and gives 1,750,000,000. In Python the first form works, which is why the bug is easy to write and hard to see.

## Key Points

- Unsigned bits add 2<sup>i</sup>, so w bits hold 0 to 2<sup>w</sup> − 1, and a sum that passes the top wraps to the remainder modulo 2<sup>w</sup>
- Two's complement gives the top bit a negative weight, so w bits hold −2<sup>w−1</sup> to 2<sup>w−1</sup> − 1, and negating means flipping every bit and adding 1
- The range has one more negative than positive, so negating the most negative value gives itself
- One adder serves both readings, as we verified on all 65,536 pairs of 8 bit patterns, and signed overflow happens when two numbers of the same sign give a sum of the other sign
- Python integers don't wrap, they grow, but a mask and `to_signed` simulate a fixed width, which shows how `(lo + hi) // 2` fails on 32 bits and why 2038 matters
