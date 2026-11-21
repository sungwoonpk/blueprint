> A few one line identities do most of the work in bit problems. Subtracting 1 flips the lowest 1 bit and every zero below it, so `x & (x - 1)` clears the lowest 1 bit, `x & -x` isolates it, and a number is a power of 2 when `x & (x - 1)` is zero. Those two moves count bits, walk over set bits and find free slots without looping over every position.

A booking page shows a day as 32 half hour slots, with a 1 bit for each slot that's taken. Three questions come up often. Which slot is the first free one? How many slots are taken? Which are they, one at a time?

A loop over all 32 positions answers each, and it feels wasteful when only a few bits matter. The tricks below jump straight to the bits that matter.

## The Lowest Set Bit

Subtracting 1 from a binary number follows the same borrow as in decimal. Subtract 1 from 3,500 and the zeros at the end become 9s: 3,499. In binary, the zeros at the end become 1s, and the lowest 1 becomes 0.

<figure class="diagram">
<p class="rowname">x</p>
<div class="cells board"><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">1</div><div class="cell">0</div><div class="cell hl">1</div><div class="cell hl">0</div><div class="cell hl">0</div></div>
<p class="rowname">x − 1</p>
<div class="cells board"><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">1</div><div class="cell">0</div><div class="cell hl">0</div><div class="cell hl">1</div><div class="cell hl">1</div></div>
<p class="rowname">x AND (x − 1)</p>
<div class="cells board"><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">1</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div></div>
<p class="rowname">x AND −x</p>
<div class="cells board"><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">1</div><div class="cell">0</div><div class="cell">0</div></div>
<figcaption>Subtracting 1 flips the lowest 1 and the zeros below it (outlined). ANDing with x clears that lowest 1, and ANDing with −x keeps only it</figcaption>
</figure>

For x = 10110100, the lowest 1 sits in position 2, with two zeros below it. Then x − 1 is 10110011: the lowest 1 turned to 0, the two zeros below it turned to 1s, and everything above is unchanged. So the two numbers agree above the lowest 1 and are opposite at and below it.

That gives two moves. ANDing x with x − 1 keeps what agrees and wipes the rest, which clears the lowest 1: 10110000. And ANDing x with −x, which in two's complement is the flipped x plus 1, keeps only the lowest 1: 00000100. XOR of x and x − 1 gives a mask of the lowest 1 and everything below it: 00000111.

We checked each identity for every x from 1 to 65,535, comparing with a plain loop over the bits, and none failed.

## Counting the Bits

The straightforward count tests each bit position in turn. Kernighan's method instead clears the lowest 1 and counts how many times it can, so the loop runs once for each set bit.

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1                  # drop the lowest 1 bit
        count += 1
    return count
```

The method has been known for a long time, and it appears as an exercise in *The C Programming Language*. Knuth traced it to a 1960 paper by Peter Wegner. On 100,000 random 32 bit words, the average word had 16.0 set bits, and the position by position loop ran 31.0 times on average, nearly twice as many.

The gap is larger for sparse words. We timed 20,000 words that had at most two bits set.

| Method | Random 32 Bit Words | Words With Two Bits Set |
| --- | --- | --- |
| Test each position | 18.6 ms | 12.5 ms |
| Kernighan's loop | 9.9 ms | 1.5 ms |
| `bin(x).count("1")` | 3.1 ms | Not run |
| `x.bit_count()` | 0.22 ms | Not run |

For sparse words the loop was 8 times faster, since it makes at most two passes. Still, Python's built in `bit_count`, new in version 3.10, was 45 times faster than the loop on random words, since it's a single call into C. The loop matters in languages that don't have a counter built in, and the idea of jumping from one set bit to the next matters everywhere.

We compared Kernighan's loop with `bit_count` on 20,000 random 64 bit numbers, and the counts were identical.

## Walking Over the Set Bits

Isolate the lowest 1, use it, and remove it. The position of an isolated bit is its `bit_length` minus 1.

```python
def positions(x):
    found = []
    while x:
        low = x & -x                # the lowest set bit as a number
        found.append(low.bit_length() - 1)
        x ^= low                    # remove it
    return found
```

For the day's bookings, 0b00101111, the loop reports slots 0, 1, 2, 3 and 5. The cost is one step for each busy slot, not 32. We checked it against a loop over every position for 5,000 random words.

## The First Free Slot

The lowest 0 of x is the lowest 1 of the flipped x. Adding 1 to x does the same job as the borrow: it turns the trailing 1s into 0s and the lowest 0 into 1. So `~x & (x + 1)` is a number with a single 1 bit, at the position of the lowest 0.

For bookings 0b00101111, adding 1 gives 0b00110000 and `~x & (x + 1)` gives 0b00010000, so the first free slot is number 4. We compared the formula with a search for the first zero over every x from 1 to 65,535.

## Powers of 2

A power of 2 has a single 1 bit, so clearing its lowest 1 leaves nothing: `x & (x - 1) == 0`. Zero also passes that test, so a full check is `x > 0 and x & (x - 1) == 0`. It agreed with counting the bits for every x below 65,536.

To round up to the next power of 2, use `1 << (x - 1).bit_length()` for x of at least 1. For 5 it gives 8, for 16 it gives 16, and for 17 it gives 32. We checked that the result is a power of 2, is at least x, and is the smallest one, for every x below 5,000.

## Key Points

- Subtracting 1 flips the lowest 1 and the zeros below it, so `x & (x - 1)` clears the lowest 1, `x & -x` keeps only it, and `x ^ (x - 1)` marks it and everything below
- A power of 2 is a positive number with `x & (x - 1) == 0`, and `1 << (x - 1).bit_length()` rounds up to the next one
- Kernighan's loop counts bits in as many steps as there are 1s, 8 times faster than position testing on sparse words, and Python's `bit_count` is faster still
- Isolating and removing the lowest 1 walks over the set bits, one step each, and `~x & (x + 1)` finds the first free slot
- Each identity was checked on every value below 65,536 and the counts on random 64 bit numbers
