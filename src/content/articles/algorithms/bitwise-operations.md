> **Bitwise operations** work on the bits of integers one position at a time: AND keeps a bit when both inputs have it, OR when either does, XOR when exactly one does, and NOT flips every bit. Shifts slide the whole pattern left or right. With a **mask**, a number whose 1 bits pick positions, these four operations can test, set, clear, toggle and extract bits in a single step.

Every file on a Linux or macOS machine has a permission code like 754. Three digits, one for the owner, one for the group and one for everybody else, and each digit holds three yes or no answers: may read, may write, may execute. Nine yes or no answers live in one small number.

That packing is the reason bitwise operations exist, and the same trick appears in flags, network masks and compact sets.

## Four Operations and Two Shifts

Take two bits and combine them.

| a | b | a AND b | a OR b | a XOR b |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |

On whole numbers, the operations apply to each position independently. In Python they are `&`, `|` and `^`, and `~x` flips every bit, which for signed numbers gives −x − 1, as [How Integers Are Stored](/algorithms/integers-in-binary) showed.

A shift moves every bit by n places. `x << n` moves them left and fills with zeros, and it multiplies by 2ⁿ. `x >> n` moves them right and drops the low bits, and it divides by 2ⁿ, rounding down. We checked both against `x * 2**n` and `x // 2**n` for x from −300 to 299 and n from 0 to 11, including negative numbers, and they agreed everywhere.

## Masks

A **mask** is a number chosen so that its 1 bits mark the positions we care about. ANDing with a mask keeps those positions and clears the others.

<figure class="diagram">
<p class="rowname">x</p>
<div class="cells board"><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">1</div><div class="cell">0</div><div class="cell">1</div><div class="cell">1</div><div class="cell">0</div></div>
<p class="rowname">Mask</p>
<div class="cells board"><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell hl">1</div><div class="cell hl">1</div><div class="cell hl">1</div><div class="cell hl">1</div></div>
<p class="rowname">x and mask</p>
<div class="cells board"><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell hl">0</div><div class="cell hl">1</div><div class="cell hl">1</div><div class="cell hl">0</div></div>
<figcaption>AND with a mask keeps the bits under the mask’s 1s and clears the rest. Here the low 4 bits of x survive, leaving 0110</figcaption>
</figure>

To read a field, shift it down and mask it. For x = 10110110, `(x >> 4) & 0b1111` is 1011, which is 11: the shift moves the high four bits into place, and the mask removes anything above.

The permission code uses this. Each digit of 754 is three bits, read as 4 for read, 2 for write and 1 for execute, so the digit 7 is 111 and means all three.

```python
R, W, X = 4, 2, 1

def describe(mode):
    text = ""
    for shift in (6, 3, 0):                  # owner, group, others
        part = (mode >> shift) & 7           # the three bits for this class
        text += ("r" if part & R else "-") + ("w" if part & W else "-") + ("x" if part & X else "-")
    return text
```

`describe(0o754)` gives `rwxr-xr--`: the owner can do everything, the group can read and execute, and others can only read. The code 644 gives `rw-r--r--`, and 600 gives `rw-------`. The `0o` writes the number in base 8, where each digit is exactly three bits.

## Test, Set, Clear, Toggle

Four small recipes cover most bit work, using `1 << i` as the mask for position i.

| Goal | Expression |
| --- | --- |
| Test bit i | `(x >> i) & 1` |
| Set bit i to 1 | `x \| (1 << i)` |
| Clear bit i to 0 | `x & ~(1 << i)` |
| Toggle bit i | `x ^ (1 << i)` |

OR with the mask can only turn the bit on. AND with the flipped mask keeps everything except position i. XOR with the mask flips the bit and leaves the others, since XOR with 0 changes nothing and XOR with 1 flips.

We checked the recipes against a set of positions. For 300 random sequences of 200 operations on a 64 bit number, each mix of set, clear, toggle and test gave the same answers as an ordinary `set` of integers, and the final contents matched.

One trap for those who also write C: Python ranks `&` above `==`, so `x & 1 == 0` means `(x & 1) == 0` and gives `True` for 6. In C the comparison binds tighter, and the same line would mean `x & (1 == 0)`, which is always 0. Parentheses around every bit test avoid the question in both.

## A Whole Set in One Number

If positions stand for items, a number is a set, and set operations become single bitwise operations: OR for union, AND for intersection, and AND with NOT for difference. Python's integers can be as long as needed, so a set of a million items is one number.

We built two random sets of about half of the numbers below a million, once as lists of booleans and once as integers.

| Representation | Memory | Union | Count the Members |
| --- | --- | --- | --- |
| List of booleans | 8.4 MB | 19.6 ms | 2.0 ms |
| Integer, one bit per item | 133 KB | 10 µs | 10 µs |

The integer took 63 times less memory, and its union ran about 2,000 times faster, since the machine combines many positions in each step while the list visits each item. `x.bit_count()` counts the 1 bits directly. Both versions agreed on the counts of members and of the union.

The same idea is how [Subsets as Bitmasks](/algorithms/bitmask-subsets) will turn the subsets of a small set into the numbers counting up from zero.

## Key Points

- AND, OR and XOR combine two numbers one bit position at a time, NOT flips every bit, and shifting left or right multiplies or divides by a power of 2, rounding down
- A mask has 1s at the positions of interest, and AND with it keeps those bits, and `(x >> k) & mask` reads a field, as `describe` does for the nine permission bits in 754
- Testing, setting, clearing and toggling bit i are `(x >> i) & 1`, `x | (1 << i)`, `x & ~(1 << i)` and `x ^ (1 << i)`, and they matched a set model on 300 random sequences
- Python ranks `&` above `==` and C doesn't, so parenthesize bit tests
- A number can hold a set, with OR, AND and `bit_count` as union, intersection and size, taking 133 KB and 10 µs for a million items against 8.4 MB and 19.6 ms for a list
