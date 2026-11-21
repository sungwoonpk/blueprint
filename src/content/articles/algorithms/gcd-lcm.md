> The **greatest common divisor** (GCD) of two integers is the largest number that divides both, and the **least common multiple** (LCM) is the smallest positive number that both divide. **Euclid's algorithm** finds the GCD by replacing the pair (a, b) with (b, a mod b) until the second number is 0, in about 2 steps for each decimal digit, and the LCM follows as a ÷ gcd(a, b) × b.

A tiler has a floor of 252 by 105 centimeters and wants the largest square tile that covers it exactly, with no cutting. The tile's side has to divide both 252 and 105, and the biggest such number is the GCD.

The method for finding it is one of the oldest algorithms we know, and it doesn't need to factor anything.

## Tiling With Squares

Start with the biggest squares that fit. A 105 centimeter square fits twice along the 252 centimeter side, leaving a strip 42 centimeters wide and 105 tall. Any tile that covers the whole floor must also cover that strip, since it covers the squares exactly. So the tile has to fit the strip, whose sides are 42 and 105.

Repeat on the strip: two squares of 42 fit along the 105 side, leaving a strip 42 by 21. Repeat again: two squares of 21 fit along the 42 side and leave nothing.

<figure class="diagram graph">
<svg viewBox="0 0 252 105" role="img" aria-label="A floor 252 by 105 tiled by squares: two squares of 105, then two of 42, then two of 21, which fill it exactly"><rect class="n " x="1" y="1" width="103" height="103" rx="3"/><text class="t" x="52.5" y="52.5">105</text><rect class="n " x="106" y="1" width="103" height="103" rx="3"/><text class="t" x="157.5" y="52.5">105</text><rect class="n done" x="211" y="1" width="40" height="40" rx="3"/><text class="t" x="231.0" y="21.0">42</text><rect class="n done" x="211" y="43" width="40" height="40" rx="3"/><text class="t" x="231.0" y="63.0">42</text><rect class="n hl" x="211" y="85" width="19" height="19" rx="3"/><text class="t" x="220.5" y="94.5">21</text><rect class="n hl" x="232" y="85" width="19" height="19" rx="3"/><text class="t" x="241.5" y="94.5">21</text></svg>
<figcaption>A 252 by 105 floor. The biggest squares that fit are two of 105, the leftover strip takes two of 42, and what is left of that takes two of 21, with nothing over</figcaption>
</figure>

The last square, 21 centimeters, tiles every earlier piece, so it tiles the floor, and every tile that works had to fit every strip along the way. So 21 is the largest. That is Euclid's algorithm: at each step the long side is replaced by the leftover after as many squares as fit, which is the remainder.

## Why Remainders Keep the Answer

Any number that divides both a and b divides a − b too, and any number that divides a − b and b divides a. So a, b and b, a − b have the same common divisors. Subtracting b as many times as it fits is the same as taking the remainder, so

gcd(a, b) = gcd(b, a mod b)

and the pair gets smaller each time until the remainder is 0. A pair (x, 0) has gcd x, since every number divides 0, so the largest divisor of x is x itself.

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
```

On the floor, the steps are these.

| a | b | a mod b |
| --- | --- | --- |
| 252 | 105 | 42 |
| 105 | 42 | 21 |
| 42 | 21 | 0 |

The last non zero remainder, 21, is the answer. The same three rows are the three strips of the picture. We checked the function against `math.gcd` on 20,000 random pairs of numbers up to 10¹², and they agreed on all of them.

## How Fast Is It

Taking remainders matters. The older form of the idea subtracts one number from the other each time, and that is slow when one is far bigger. For gcd(1,000,002, 5) the subtracting version takes 200,003 steps, and the remainder version takes 3. Over 200 calls on 1,000,000 + i and 7, subtracting took 816 ms and remainders took 0.03 ms.

For remainders, the number of steps grows with the number of digits, not with the numbers. On random pairs, we counted the average number of steps.

| Digits in Each Number | Average Steps | Most Steps Seen |
| --- | --- | --- |
| 3 | 5.9 | 12 |
| 6 | 11.6 | 21 |
| 12 | 23.5 | 35 |
| 24 | 46.6 | 67 |
| 48 | 93.4 | 121 |

The average is about 2 steps for each digit, and doubling the digits doubles the steps. A guarantee comes from a simple argument: after two steps, the larger number is at most half what it was, since the remainder is under half the previous larger number. So the number of steps is bounded by the number of bits in the two inputs added together. It held in every one of our runs.

The worst inputs are neighbors in the Fibonacci sequence, where every quotient is 1 and each step just peels one number off the next. Of all pairs below 1,000, the most steps, 14, came from 987 and 610, which are consecutive Fibonacci numbers. For consecutive Fibonacci numbers near 6 × 10¹⁶, it took 80 steps.

## Writing the GCD From the Inputs

There's a stronger fact hiding in the steps. Every number reached is a combination of the two inputs, a multiple of one plus a multiple of the other, with whole number multipliers that may be negative. **Bézout's identity** says the GCD itself can be written as gcd(a, b) = a × s + b × t for some whole numbers s and t.

Euclid's algorithm can carry s and t along, which is called the extended version.

```python
def extended_gcd(a, b):
    x, y, s, t, u, v = a, b, 1, 0, 0, 1     # x = a*s + b*t and y = a*u + b*v throughout
    while y:
        q, r = divmod(x, y)
        x, y, s, t, u, v = y, r, u, v, s - q * u, t - q * v
    return x, s, t
```

For 252 and 105 it returns 21, −2 and 5, and indeed 252 × (−2) + 105 × 5 = −504 + 525 = 21. We tested it on the same 20,000 pairs, and every result satisfied a × s + b × t = gcd.

Bézout has a practical meaning. Suppose we can move forward by 12 or by 18, and backward by either. The distances we can reach are exactly the multiples of 6, the GCD. When we tried every combination 12s + 18t with s and t between −30 and 30, the positive values up to 40 were 6, 12, 18, 24, 30 and 36.

It is the same fact that two jugs can measure only multiples of their GCD. The extended version is also how [Modular Arithmetic](/algorithms/modular-arithmetic) finds an inverse.

## The Least Common Multiple

Two buses leave a stop, one every 12 minutes and one every 18, both at minute 0. They next leave together at minute 36, then 72. The 36 is the LCM.

The GCD and LCM fit together: gcd(a, b) × lcm(a, b) = a × b. We checked this for all pairs from 1 to 199. So the LCM is a × b divided by the GCD, and it is better to divide first, a ÷ gcd(a, b) × b, since the division is exact and the intermediate number stays smaller, which matters in a language with fixed width integers.

```python
def lcm(a, b):
    return a // gcd(a, b) * b
```

For three or more numbers, apply the function to a pair at a time. The GCD of 84, 126 and 210 is `gcd(gcd(84, 126), 210)`, which is 42. Python's `math.gcd` and `math.lcm` accept any number of arguments, and both are equivalent to the functions above.

## Key Points

- The GCD is the largest number dividing both, and Euclid's algorithm replaces (a, b) by (b, a mod b) until the second is 0, because the pairs share the same common divisors
- The tiling picture shows it: 252 by 105 leaves strips 42 by 105 and 42 by 21, and 21 tiles all of them
- Taking remainders needs about 2 steps for each decimal digit, against 200,003 steps by subtraction for gcd(1,000,002, 5), and consecutive Fibonacci numbers are the worst case
- The extended version also gives s and t with a × s + b × t = gcd, as 252 × (−2) + 105 × 5 = 21, and the reachable amounts are exactly the multiples of the GCD
- The LCM is a ÷ gcd(a, b) × b, since gcd × lcm = a × b, and a list is reduced a pair at a time
