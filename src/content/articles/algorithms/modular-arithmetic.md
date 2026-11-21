> **Modular arithmetic** treats numbers as the same when they differ by a multiple of n, written a ≡ b (mod n), so only the remainders 0 to n − 1 matter. Addition, subtraction and multiplication can be done on remainders at any point of a calculation, which keeps numbers small. Division works only by multiplying with an inverse, and a has an inverse mod n exactly when gcd(a, n) = 1.

Today is Wednesday. What day of the week is it a hundred days from now? You don't count a hundred days. A week is seven days, so only the leftover days matter: 100 leaves 2 after dividing by 7, and two days past Wednesday is Friday.

Ignoring whole turns of a cycle is the idea of modular arithmetic, and programs use it for clocks, for indices that wrap around, and for keeping huge answers small.

## Clock Arithmetic

Number the days Monday to Sunday as 0 to 6. A day plus a hundred is the remainder after dividing the total by 7.

<figure class="diagram">
<div class="cells"><div class="cell">Mon<small>0</small></div><div class="cell">Tue<small>1</small></div><div class="cell done">Wed<small>2</small></div><div class="cell">Thu<small>3</small></div><div class="cell hl">Fri<small>4</small></div><div class="cell">Sat<small>5</small></div><div class="cell">Sun<small>6</small></div></div>
<figcaption>The seven days as remainders mod 7. Starting on Wednesday (2), a hundred days later is (2 + 100) mod 7 = 4, which is Friday (outlined)</figcaption>
</figure>

We say a and b are **congruent mod n**, written a ≡ b (mod n), when n divides a − b. Then 2 ≡ 9 ≡ 16 ≡ −5 (mod 7). Every integer is congruent to exactly one of 0, 1, up to n − 1, its remainder when divided by n, and two numbers are congruent exactly when their remainders match. In Python, `a % n` gives that remainder.

A warning about negative numbers. Python's `%` always gives a result between 0 and n − 1 for a positive n, so `-7 % 5` is 3. Some other languages, C and JavaScript among them, give the remainder the sign of the dividend, so the same expression is −2 there. We emulated that rule with truncating division and got −2 for −7 and 5, and −3 for −43 and 10, against Python's 3 and 7.

A `%` on a possibly negative number is a place to check what the language does, and to fix a negative result with `(a % n + n) % n`.

## Which Operations Are Safe

The useful fact is that congruent numbers behave the same under addition, subtraction and multiplication, so each can be replaced by its remainder at any point. We tested this on 20,000 random cases, with a modulus from 2 to 60 and a pair of congruent numbers that were up to a million in size and sometimes negative.

For a third number c, a + c, a − c and a × c gave the same remainders as b + c, b − c and b × c every time.

The same goes for the base of a power. `pow(a, k, n)` gave the same result for congruent bases, and also matched (a % n) ** k % n.

The exponent is different. 1 and 6 are congruent mod 5, but 2¹ is 2 and 2⁶ is 4 mod 5. A power can't be reduced in the exponent by the modulus.

| Operation | Can we reduce first |
| --- | --- |
| Add, subtract | Yes |
| Multiply | Yes |
| Base of a power | Yes |
| Exponent of a power | No |
| Divide | Only by an inverse, below |

## Keeping Numbers Small

The payoff is size. The Fibonacci numbers grow quickly, and computing them exactly means adding numbers with thousands of digits. If only the remainder modulo 1,000,000,007 is wanted, each step can reduce.

```python
def fib_mod(n, m):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, (a + b) % m           # reduce after each addition
    return a
```

We compared it with exact addition. For the 400,000th Fibonacci number, which has about 83,600 digits, exact addition took 1.49 s, and the modular loop 0.013 s, about 115 times faster. Doubling n made the exact time grow about 3.6 to 4 times, from 0.104 s at 100,000 to 0.371 s at 200,000 and 1.49 s at 400,000, since the numbers grow, while the modular loop stayed linear.

The exact value, reduced afterward, matched in every case.

The modulus 1,000,000,007 appears so often in problems that it is worth knowing why. It is prime, which we checked, it is below 2³¹, and the product of two numbers below it is at most 1,000,000,012,000,000,036, under the 64 bit limit of 9,223,372,036,854,775,807. So a multiplication followed by `%` never overflows a signed 64 bit integer.

In Python it doesn't matter, but in other languages that is the reason. We checked the factorial too: 100! mod 1,000,000,007 computed with a reduction after each multiplication is 437,918,130, the same as reducing the exact 100!.

## Dividing: Inverses

Division is the trouble. Can we divide both sides of 3x ≡ 3 by 3 in mod 6? The numbers x = 1, 3 and 5 all solve 3x ≡ 3 (mod 6), so no single answer comes out of "dividing". We found this by trying every x.

Dividing by a means multiplying by an **inverse** a⁻¹, a number with a × a⁻¹ ≡ 1. The inverse of 3 mod 7 is 5, since 3 × 5 = 15 = 2 × 7 + 1. Then 3x ≡ 4 (mod 7) gives x ≡ 4 × 5 = 20 ≡ 6, and 3 × 6 = 18 ≡ 4. Trying all seven values, 6 is the only solution.

An inverse exists exactly when gcd(a, n) = 1, the numbers share no factor. That is why 3 has no inverse mod 6, where the GCD is 3, and why every number from 1 to 6 has one mod a prime like 7.

We confirmed it for every modulus below 80: the numbers with an inverse, found by search, were exactly those with GCD 1, and Python's `pow(a, -1, n)` returned a correct inverse for each of them. For 3 mod 6 it raises an error, "base is not invertible for the given modulus".

The inverse comes from the extended Euclidean algorithm of [GCD, LCM and the Euclidean Algorithm](/algorithms/gcd-lcm): if a × s + n × t = 1, then a × s ≡ 1 (mod n), so s is the inverse. [Fast Exponentiation](/algorithms/fast-exponentiation) will give a second route when n is prime.

## Where You Meet It

- **Wrapping indices**: the next slot of a circular buffer of size n is `(i + 1) % n`, and the previous is `(i - 1) % n`, which is safe in Python even at 0
- **Hash buckets**: a hash value is reduced mod the table size to pick a slot, as in [How Hash Tables Work](/algorithms/hash-tables)
- **Cycles**: the last digit of 7ᵏ repeats 7, 9, 3, 1 forever, since each step multiplies by 7 mod 10, so the pattern repeats with period 4
- **Large answers**: counting problems often ask for the answer modulo 1,000,000,007, so that the number fits

## Key Points

- a ≡ b (mod n) means n divides a − b, every integer is congruent to its remainder 0 to n − 1, and Python's `%` always gives that, while C and JavaScript can give a negative result
- Addition, subtraction, multiplication and the base of a power can use remainders at any step, which held on 20,000 random cases, but the exponent can't be reduced
- Reducing at each step kept the 400,000th Fibonacci number 115 times cheaper than exact addition, 0.013 s against 1.49 s
- A number has an inverse mod n exactly when it shares no factor with n, confirmed for every modulus below 80, and the extended Euclidean algorithm computes it
- Without an inverse, division fails: 3x ≡ 3 (mod 6) has the three solutions 1, 3 and 5
