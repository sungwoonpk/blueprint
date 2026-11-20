> **Divide and conquer** solves a problem by splitting it into smaller subproblems of the same kind, solving each one recursively, and combining their answers. It pays off when the pieces are independent and the cost of splitting and combining is small next to the cost of the whole problem.

A cryptography library multiplies two numbers of 1,024 bits, and a lot of those multiplications happen every second. The method from school multiplies every digit of one number by every digit of the other, so it takes about n² small multiplications for n digits. In 1956 Kolmogorov conjectured that nothing could do better. Four years later Karatsuba showed that it could.

The trick is a good example of divide and conquer, and it shows why the approach is worth knowing.

## Three Steps

Divide and conquer algorithms have the same three parts.

1. **Divide**: split the problem into smaller subproblems of the same kind
2. **Conquer**: solve each subproblem recursively, and solve the smallest ones directly
3. **Combine**: build the answer to the whole from the answers to the parts

The algorithms from earlier in this series fit the pattern, with the work in different places.

| Algorithm | Divide | Combine |
| --- | --- | --- |
| [Merge Sort](/algorithms/merge-sort) | Cut at the middle, no work | Merge two sorted halves, n steps |
| [Quick Sort](/algorithms/quick-sort) | Partition around a pivot, n steps | None, the halves are in place |
| [Binary Search](/algorithms/binary-search) | Compare with the middle, 1 step | None, one half is dropped |

Notice that where the work happens varies, while the recursion looks the same. The total cost depends on how many subproblems there are, how much smaller they get, and how expensive the divide and combine steps are. [Solving Recurrences with the Master Theorem](/algorithms/recurrences) turns those three numbers into a running time.

## Multiplying by Splitting

Write each number as a high half and a low half. For 1234 × 5678, take a = 12 and b = 34 so that the first number is a × 100 + b, and c = 56 and d = 78 for the second. Multiplying out gives

(a × 100 + b)(c × 100 + d) = ac × 10,000 + (ad + bc) × 100 + bd

That is four products of half-size numbers, ac, ad, bc and bd, plus some shifts and additions. In bits the shifts are cheap, so the recursion looks like this.

```python
def mul4(x, y, n):                          # x and y have at most n bits
    if n <= 64:
        return x * y                        # small enough to do directly
    m = (n + 1) // 2
    mask = (1 << m) - 1
    a, b = x >> m, x & mask                 # high and low halves
    c, d = y >> m, y & mask
    ac, bd = mul4(a, c, m), mul4(b, d, m)
    bc, ad = mul4(b, c, m), mul4(a, d, m)
    return (ac << 2 * m) + ((bc + ad) << m) + bd
```

Four recursive calls on half-size numbers is no better than the school method. Counting the products of single bits when the recursion goes all the way down gives 4ᵏ for numbers of 2ᵏ bits, which is n². Splitting alone didn't help. The gain has to come from somewhere else.

## One Product Fewer

The middle term ad + bc is the one we need, and it can come from products we already have. Since (a − b)(c − d) = ac − ad − bc + bd, the middle term is

ad + bc = ac + bd − (a − b)(c − d)

That needs only three products, ac, bd and (a − b)(c − d). For our example, ac = 672, bd = 2,652 and (a − b)(c − d) = (−22)(−22) = 484. The middle term is 672 + 2,652 − 484 = 2,840, which matches ad + bc = 936 + 1,904. The total is 672 × 10,000 + 2,840 × 100 + 2,652 = 7,006,652, the right answer.

```python
def karatsuba(x, y, n):
    if n <= 64:
        return x * y
    m = (n + 1) // 2
    mask = (1 << m) - 1
    a, b = x >> m, x & mask
    c, d = y >> m, y & mask
    ac, bd = karatsuba(a, c, m), karatsuba(b, d, m)
    u, v = a - b, c - d
    sign = -1 if (u < 0) != (v < 0) else 1
    cross = sign * karatsuba(abs(u), abs(v), m)         # (a - b)(c - d)
    return (ac << 2 * m) + ((ac + bd - cross) << m) + bd
```

The absolute values keep the bit tricks on non-negative numbers, and the sign is put back afterward. We checked both functions against Python's own `*` on 2,000 random pairs of up to 200 bits, with base cases of 1, 4 and 16 bits.

Saving one of four recursive calls changes the growth rate, not just a constant. We counted the single-bit products when recursion goes to the bottom.

| Bits | Four Products | Three Products |
| --- | --- | --- |
| 16 | 256 | 81 |
| 64 | 4,096 | 729 |
| 256 | 65,536 | 6,561 |
| 1,024 | 1,048,576 | 59,049 |

At 1,024 bits the three product version does 18 times fewer. Each time the size doubles, the four product count multiplies by 4 and the three product count by 3. Three products on half-size inputs gives n<sup>log₂ 3</sup>, about n<sup>1.585</sup>.

## Timing It

We timed the two functions on random numbers, with a base case of 64 bits.

| Bits | Four Products | Three Products | Python's `*` |
| --- | --- | --- | --- |
| 4,096 | 0.7 ms | 0.2 ms | 16 µs |
| 16,384 | 11.1 ms | 2.0 ms | 144 µs |
| 65,536 | 178 ms | 17.7 ms | 1.3 ms |
| 131,072 | 713 ms | 53 ms | 4.0 ms |

Doubling the bits multiplied the four product time by 3.95 to 4.03, and the three product time by 2.95 to 3.01. That is the 4 and the 3 from the counts. The built-in `*` is faster than both because it is written in C, and its time also grows about 3 times per doubling at these sizes. The reason is in the CPython source: its integer multiplication switches from the school method to Karatsuba when both numbers have more than 70 internal digits, which are 30 bits each in the usual build, or about 2,100 bits.

## Where to Stop Dividing

The recursion has to stop somewhere, and the best place is well above the smallest case. Each call has overhead, so a problem of a few bits is cheaper to solve directly than to split.

We timed the three product version on 16,384 bits while changing the size at which it stops.

| Stops at (bits) | Time |
| --- | --- |
| 1 | 0.82 s |
| 8 | 40 ms |
| 32 | 5.8 ms |
| 64 | 2.0 ms |
| 256 | 0.3 ms |

Going to the bottom was 400 times slower than stopping at 64 bits. Here the base case is a fast hardware multiplication, so a larger cutoff keeps helping until it reaches sizes where the school method itself gets slow. Real libraries make the same choice: [How Standard Library Sorts Work](/algorithms/library-sorts) described sorts that switch to insertion sort for short runs.

## When Divide and Conquer Fits

The method has conditions. The subproblems should be independent, each answer used once. They should be the same kind of problem, smaller by a constant fraction, so the recursion depth is about log n and the stack from [The Call Stack and Recursion Depth](/algorithms/call-stack) stays shallow. The combine step should be cheap enough that the pieces don't cost more to join than to solve.

If subproblems overlap, as in the Fibonacci numbers, a plain recursion solves the same one many times, and the right tool is [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp). Independence has a bonus: separate pieces can run on separate cores.

| Algorithm | Subproblems | Each of Size | Divide and Combine Cost |
| --- | --- | --- | --- |
| Binary search | 1 | n / 2 | Constant |
| Merge sort | 2 | n / 2 | n |
| Karatsuba | 3 | n / 2 | n |
| Strassen matrix multiplication | 7 | n / 2 | n² |

Strassen's method multiplies two matrices by splitting each into four blocks and doing 7 block products instead of 8, in the same spirit as Karatsuba's trick. The next article shows how to turn each row of this table into a running time.

## Key Points

- Divide and conquer splits a problem into smaller independent subproblems, solves each recursively, and combines the answers
- The cost comes from the number of subproblems, how much smaller they are, and the divide and combine work
- Splitting a product into four half-size products gave n², but Karatsuba's identity needs only three, which gives about n<sup>1.585</sup>
- Our counts and timings showed 4 times more work per doubling for four products and 3 times for three
- Stop the recursion at a base case well above the smallest size, since stopping at 64 bits was 400 times faster than going to 1 bit
