> **Fast exponentiation**, or exponentiation by squaring, computes aⁿ with about 2 log₂ n multiplications instead of n − 1. It repeatedly squares the base and multiplies it into the result for each 1 bit of the exponent, and with a modulus every number stays below m. The same loop gives modular inverses through Fermat's little theorem, and works on matrices to find Fibonacci numbers in O(log n) steps.

How do you compute 7 to the power 10¹⁸, modulo 1,000,000,007? The obvious loop multiplies 7 by itself a quintillion times. At a nanosecond each, that is thirty years.

Squaring does it in about 80 multiplications, and the saving comes from the binary digits of the exponent.

## Squaring Instead of Repeating

Repeated multiplication builds a³ as a × a × a, then a⁴ by one more step. Squaring jumps: a² is a × a, a⁴ is a² squared, a⁸ is a⁴ squared. Each squaring doubles the exponent. So the powers a, a², a⁴, a⁸ and so on cost one multiplication each.

Any exponent is a sum of those. 13 is 8 + 4 + 1, which is the binary number 1101, so a¹³ = a⁸ × a⁴ × a¹. The binary digits say which powers to multiply in.

<figure class="diagram">
<p class="rowname">Bits of 13, lowest first</p>
<div class="cells"><div class="cell">1<small>2<sup>0</sup></small></div><div class="cell">0<small>2<sup>1</sup></small></div><div class="cell">1<small>2<sup>2</sup></small></div><div class="cell">1<small>2<sup>3</sup></small></div></div>
<p class="rowname">Squares of 3, mod 1000</p>
<div class="cells"><div class="cell hl">3<small>3<sup>1</sup></small></div><div class="cell dim">9<small>3<sup>2</sup></small></div><div class="cell hl">81<small>3<sup>4</sup></small></div><div class="cell hl">561<small>3<sup>8</sup></small></div></div>
<figcaption>13 is 1 + 4 + 8, so 3<sup>13</sup> is 3 × 81 × 561 mod 1000. The outlined squares are the ones whose bit is 1, and the faded one is skipped</figcaption>
</figure>

For 3¹³ mod 1000 the squares are 3, 9, 81 and 561 (6,561 mod 1000), and the bits of 13 from the low end are 1, 0, 1, 1. Multiply 3, 81 and 561 and skip the 9: 3 × 81 = 243, and 243 × 561 = 136,323, which is 323 mod 1000. That matches 3¹³ = 1,594,323, whose last three digits are 323.

## The Loop

The loop reads the bits of n from the low end, using the shift and mask of [Bitwise Operations](/algorithms/bitwise-operations).

```python
def power(a, n, m):
    result = 1
    a %= m
    while n:
        if n & 1:                       # this bit of n is 1
            result = result * a % m     # multiply in the current square
        a = a * a % m                   # next square: a^(2^(i+1))
        n >>= 1
    return result
```

| Bit | Square a | Result After |
| --- | --- | --- |
| 1 | 3 | 3 |
| 0 | 9 | 3 |
| 1 | 81 | 243 |
| 1 | 561 | 323 |

Each of the log₂ n bits costs one squaring, and each 1 bit one more multiplication. Since every product is reduced mod m, no number grows beyond m².

We compared it with Python's built in `pow(a, n, m)` for 20,000 random triples with a up to 10⁹, n up to 10⁶ and m up to 10⁹, and with plain `a ** n` for small values without a modulus. All matched.

## How Much It Saves

| Exponent n | Bits | Ones | Squarings + Multiplications | Repeated Multiplication |
| --- | --- | --- | --- | --- |
| 10 | 4 | 2 | 4 + 2 | 9 |
| 1,000 | 10 | 6 | 10 + 6 | 999 |
| 1,000,000 | 20 | 7 | 20 + 7 | 999,999 |
| 10⁹ | 30 | 13 | 30 + 13 | 999,999,999 |
| 10¹⁸ | 60 | 24 | 60 + 24 | 10¹⁸ − 1 |

The number of multiplications is at most about 2 log₂ n. Timing it with m = 1,000,000,007 and base 7:

| Exponent | Repeated Multiplication | Squaring |
| --- | --- | --- |
| 10⁵ | 3 ms | 2.4 µs |
| 10⁶ | 32 ms | 5.5 µs |
| 10⁷ | 310 ms | 5.9 µs |

Repeated multiplication grew with n, tenfold for each row, while squaring stayed near 6 microseconds. For 7 to the power 10¹⁸ + 9 it took 6.7 µs and gave 379,356,206, equal to Python's `pow`.

Without a modulus the numbers themselves grow, and the multiplications get more expensive. Squaring still helps a great deal. For 7²⁰⁰⁰⁰, 20,000 repeated multiplications took 25 ms, and Python's `7 ** 20000` took 0.35 ms, about 70 times less. The result of `7 ** 1000000` has 2.8 million bits and took 0.17 s, since that last multiplication handles huge numbers. The modulus is what keeps each step cheap.

## Inverses by Powers

[Modular Arithmetic](/algorithms/modular-arithmetic) left open how to find the inverse of a number. When the modulus p is prime, **Fermat's little theorem** says that aᵖ⁻¹ ≡ 1 (mod p) for any a not divisible by p. Then a × aᵖ⁻² ≡ 1, so a^(p − 2) is the inverse of a.

```python
def inverse_mod_prime(a, p):
    return power(a, p - 2, p)
```

For p = 1,000,000,007 and 2,000 random values of a, this agreed with Python's `pow(a, -1, p)`, and a times the result was 1 mod p every time.

It needs a prime modulus. With the modulus 6, the same recipe gives a⁴ mod 6, which is 1, 4, 3, 4, 1 for a = 1 to 5. For a = 5, whose inverse is 5 because 25 ≡ 1, the recipe gives 1, which is wrong.

Only a = 1 satisfied a × a⁴ ≡ 1. The extended Euclidean algorithm from [GCD, LCM and the Euclidean Algorithm](/algorithms/gcd-lcm) works for any modulus where an inverse exists.

## Powers of a Matrix

Squaring works for anything with an associative multiplication, and one famous case is the Fibonacci numbers. The pair (F(n+1), F(n)) is the pair (F(n), F(n−1)) times the matrix with rows (1, 1) and (1, 0). So F(n) is an entry of that matrix to the power n.

```python
def mat_mul(A, B, m):
    return [[(A[0][0] * B[0][0] + A[0][1] * B[1][0]) % m, (A[0][0] * B[0][1] + A[0][1] * B[1][1]) % m],
            [(A[1][0] * B[0][0] + A[1][1] * B[1][0]) % m, (A[1][0] * B[0][1] + A[1][1] * B[1][1]) % m]]

def fib_matrix(n, m):
    result, base = [[1, 0], [0, 1]], [[1, 1], [1, 0]]   # identity, and the Fibonacci step
    while n:
        if n & 1:
            result = mat_mul(result, base, m)
        base = mat_mul(base, base, m)
        n >>= 1
    return result[0][1]
```

The loop is the same as for numbers, with the identity matrix as the starting result. We checked it against the step by step loop and against a third method, based on doubling formulas for Fibonacci numbers, for every n below 600.

Then, modulo 1,000,000,007, F(10⁶) came out as 918,091,266 in 11 µs, the same as the step by step loop gives, and F(10¹⁸) as 209,783,453 in 34 µs, which the doubling method confirmed. The linear loop would take decades for 10¹⁸.

The recipe is general: any sequence where the next terms are a fixed linear mix of the last few can be advanced n steps with a matrix power, in log n multiplications of small matrices.

## Key Points

- Squaring doubles the exponent each time, and the binary digits of n say which squares to multiply, so aⁿ takes about 2 log₂ n multiplications, 84 for n = 10¹⁸
- The loop reads the bits of n, squares the base each time and multiplies it into the result for each 1 bit, reducing mod m at each step
- Against repeated multiplication it took 6 µs where the plain loop took 310 ms for n = 10⁷, and it matched `pow` on 20,000 random cases
- For a prime modulus p, a^(p−2) is the inverse of a by Fermat's little theorem, and the recipe fails for a composite modulus like 6
- With 2 by 2 matrices the same loop computes Fibonacci numbers, F(10¹⁸) mod 1,000,000,007 in 34 µs
