> **XOR** (exclusive or) gives 1 where its two bits differ. It has three properties that make it unusual: x ^ x = 0, x ^ 0 = x, and the order of operands doesn't matter. Together they mean that XORing a list of numbers cancels every pair of equal values, which finds the one value that has no partner, recovers a missing block, and splits two unknowns apart, all in a single pass with almost no memory.

A lab door logs a badge ID each time someone swipes, in or out. At closing time every student who entered has left, except one who forgot to swipe out. The log holds each ID twice, apart from one ID that appears once. Which?

Counting each ID in a dictionary works. XOR does it with one variable.

## Pairs Cancel

Two things happen when a number meets itself under XOR: every bit is the same, so every bit comes out 0, and x ^ x = 0. Meeting 0 changes nothing: x ^ 0 = x. And XOR is commutative and associative, so the order of a long chain doesn't matter.

So XOR the whole log, in any order. Each ID that appears twice cancels itself, wherever its two swipes are, and what remains is the one that appeared once. On a small log of IDs 7, 3, 5, 3, 7:

| Swipe | ID | Running XOR |
| --- | --- | --- |
| 1 | 7 (111) | 111 |
| 2 | 3 (011) | 100 |
| 3 | 5 (101) | 001 |
| 4 | 3 (011) | 010 |
| 5 | 7 (111) | 101 |

The result 101 is 5, the ID that swiped once. The running values wander, but once both copies of 3 and of 7 have been absorbed, they are gone.

```python
def lone_id(log):
    result = 0
    for badge in log:
        result ^= badge
    return result
```

We checked it on 1,000 random logs of up to 50 IDs, with the swipes shuffled, and it found the lone ID every time. For scale, we built a log of two million swipes, a million IDs twice and one extra, and compared it with counting.

| Method | Time | Peak Extra Memory |
| --- | --- | --- |
| XOR of everything | 105 ms | 112 bytes |
| Counter of IDs | 360 ms | 63 MB |

Both found the same ID. XOR was 3.4 times faster and needed no memory beyond the running value. The method relies on every other ID appearing an even number of times, so it can't handle a log where some IDs appear three times.

## The Missing Number

The same idea finds a missing value. A list holds the numbers from 0 to n with one missing. XOR together all the numbers 0 to n and all the numbers in the list. Every number except the missing one appears twice, once in each group, and cancels.

```python
def missing(values, n):
    result = n
    for i, v in enumerate(values):
        result ^= i ^ v            # i supplies 0..n-1 and v is what we have; n is added at the start
    return result
```

This is the variation promised in [Using Values as Indices](/algorithms/values-as-indices), which used the sum instead. It matched the true missing number on 1,000 random lists with n up to 200. XOR can't overflow, since the result never has more bits than the largest input, so it suits fixed width integers where the sum might, as [How Integers Are Stored](/algorithms/integers-in-binary) showed. Python's integers don't overflow, so this matters in other languages.

## Two Odd Ones Out

Now two IDs appear once and the rest twice. XORing everything gives a ^ b, where a and b are the two lone IDs, since all the pairs cancel. We can't read a and b out of that directly, but we know something about it: a ^ b is nonzero, since a and b differ, so some bit is 1, and at that bit a and b disagree.

Pick that bit, say the lowest set bit of the XOR, which `x & -x` isolates from [Common Bit Tricks](/algorithms/bit-tricks). Split the log into two groups by whether each ID has that bit. a goes in one group and b in the other.

Every other ID goes entirely into one group with its partner, since both copies share the same bit. XORing each group cancels the pairs and leaves a in one and b in the other.

```python
def two_lone_ids(log):
    total = 0
    for badge in log:
        total ^= badge                 # a ^ b
    low = total & -total               # a bit where a and b differ
    a = b = 0
    for badge in log:
        if badge & low:
            a ^= badge
        else:
            b ^= badge
    return a, b
```

It found both IDs on 1,000 random logs, with up to 40 pairs of other IDs, in two passes and a constant amount of memory.

## Parity and Recovery

XOR of bits is **parity**: the result is 1 when an odd number of the inputs are 1. That makes it a way to protect data. Take four blocks of data and store a fifth block, the XOR of the four.

If any one block is lost, XORing the other four blocks and the parity block gives it back, since everything except the lost block cancels. Storage systems such as RAID level 5 use this idea across disks.

We tried it on four blocks of 4,096 random bytes with a parity block. For each of the four blocks, we removed it and rebuilt it from the rest, and each rebuilt block was identical to the original. The parity block costs one extra block, not a whole copy, and it survives the loss of any one block, but not two.

## A Swap That Needs Care

A classic trick swaps two variables without a third: `a ^= b; b ^= a; a ^= b`. After the first line a holds a ^ b, the second makes b equal the old a, and the third makes a equal the old b. With the values 3 and 9 it gives 9 and 3.

It has a trap. If both names refer to the same place, such as `a[i]` and `a[j]` with i equal to j, the first line sets the element to x ^ x, which is 0, and the value is lost. We tried it with i and j both 0 on the list `[3, 9]`, and got `[0, 9]`.

In Python, `a, b = b, a` has no such problem, so the XOR swap gains nothing there and is best kept as a puzzle. The cancellation idea is the part worth keeping.

## Key Points

- XOR is 1 where bits differ, x ^ x = 0, x ^ 0 = x, and the order doesn't matter, so XORing a list cancels every value that appears an even number of times
- That finds the one ID with no partner in one pass and constant memory, 105 ms and 112 bytes against 360 ms and 63 MB for counting on two million swipes
- XOR of the indices and the values finds a missing number with no overflow, and for two lone values, splitting on a bit where they differ separates them
- A parity block, the XOR of the data blocks, rebuilt each of four lost blocks, and it protects against one loss
- The XOR swap loses the value when both names point at the same place, as `[3, 9]` became `[0, 9]`, so use it for the idea and not in practice
