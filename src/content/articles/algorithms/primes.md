> A **prime** is an integer above 1 whose only divisors are 1 and itself. To test one number, dividing by every candidate up to its square root is enough. To list every prime up to n, the **sieve of Eratosthenes** crosses off the multiples of each prime it finds, in O(n log log n) time and one byte for each number, and a version that records each number's smallest prime factor factors numbers quickly.

Many number problems start the same way: count the divisors of a number, factor it, or find the primes in a range. Two different questions hide here. Is this one number prime? And which numbers up to a limit are?

They have different best answers, and using the wrong one makes a program slow.

## What a Prime Gives Us

Every integer above 1 is a product of primes, and the product is the same in any order, which is called the **fundamental theorem of arithmetic**. So 360 is 2 × 2 × 2 × 3 × 3 × 5 and nothing else. Primes are the building blocks of the integers.

There are infinitely many of them, by an argument that Euclid gave. Take any list of primes and multiply them, then add 1. The new number leaves remainder 1 when divided by each prime in the list, so none of them divides it, and it has a prime factor outside the list.

With the primes 2, 3, 5, 7, 11 and 13, the number is 30,031. It isn't prime, since it is 59 × 509, but both of its factors are new.

## Testing One Number

If n has a divisor, it has one no larger than √n, since divisors come in pairs d and n ÷ d and the two can't both exceed √n. So to test n, try the divisors 2, 3, 4, and so on while d × d is at most n.

```python
def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False                  # found a divisor
        d += 1
    return True
```

A prime pays the full price. The primes starting at 1,000,003 each took 999 tests, the divisors from 2 up to 1,000, which is √1,000,000. Over 20,000 numbers just above a million, trial division took 0.09 s.

That works for a number or two, and for a whole range it is wasteful: testing 5 and then 7 and then 9 repeats work that the earlier answers could have shared.

## The Sieve

Eratosthenes' idea is to go the other way. Write down the numbers. The first one not crossed off, 2, is prime, so cross off all its multiples. The next one not crossed off, 3, is prime, so cross off its multiples. A number that survives every earlier prime has no smaller divisor, so it is prime.

<figure class="diagram">
<div class="cells board"><div class="cell dim">1</div><div class="cell hl">2</div><div class="cell hl">3</div><div class="cell dim">4</div><div class="cell hl">5</div><div class="cell dim">6</div><div class="cell hl">7</div></div>
<div class="cells board"><div class="cell dim">8</div><div class="cell dim">9</div><div class="cell dim">10</div><div class="cell hl">11</div><div class="cell dim">12</div><div class="cell hl">13</div><div class="cell dim">14</div></div>
<div class="cells board"><div class="cell dim">15</div><div class="cell dim">16</div><div class="cell hl">17</div><div class="cell dim">18</div><div class="cell hl">19</div><div class="cell dim">20</div><div class="cell dim">21</div></div>
<div class="cells board"><div class="cell dim">22</div><div class="cell hl">23</div><div class="cell dim">24</div><div class="cell dim">25</div><div class="cell dim">26</div><div class="cell dim">27</div><div class="cell dim">28</div></div>
<div class="cells board"><div class="cell hl">29</div><div class="cell dim">30</div><div class="cell hl">31</div><div class="cell dim">32</div><div class="cell dim">33</div><div class="cell dim">34</div><div class="cell dim">35</div></div>
<div class="cells board"><div class="cell dim">36</div><div class="cell hl">37</div><div class="cell dim">38</div><div class="cell dim">39</div><div class="cell dim">40</div><div class="cell hl">41</div><div class="cell dim">42</div></div>
<div class="cells board"><div class="cell hl">43</div><div class="cell dim">44</div><div class="cell dim">45</div><div class="cell dim">46</div><div class="cell hl">47</div><div class="cell dim">48</div><div class="cell dim">49</div></div>
<figcaption>The numbers 1 to 49 after the sieve. Primes are outlined, and the faded numbers were crossed off by 2, 3, 5 or 7, the only primes whose squares are at most 49</figcaption>
</figure>

We can stop early. Once p × p is larger than n, every composite number up to n has already been crossed off by a smaller prime, since a composite number has a factor of at most its square root. For n = 49 only 2, 3, 5 and 7 need to cross anything off.

And a prime p can start crossing at p × p, because its smaller multiples such as 2p and 3p have smaller prime factors and were crossed already.

```python
import math

def sieve(n):
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0:2] = b"\x00\x00"                      # 0 and 1 are not prime
    for p in range(2, math.isqrt(n) + 1):
        if is_prime[p]:
            count = len(range(p * p, n + 1, p))
            is_prime[p * p:n + 1:p] = bytes(count)  # cross off p*p, p*p+p, ...
    return is_prime
```

The array holds one byte for each number, 1 for prime, and the slice assignment crosses off a whole run of multiples in one step. We checked it against trial division for every number up to 100,000.

For n = 49 it finds 15 primes. In Python on one machine, the sieve reached 10⁶ in under 5 milliseconds, 10⁷ in 0.01 s, and 10⁸ in 0.41 s, using 100 MB for the 10⁸ bytes.

## How Much Work

Each prime p crosses off about n ÷ p numbers, and the sum of n ÷ p over the primes up to n grows like n log log n. That is almost linear: log log n is about 3 for n = 10⁸. We counted the crossing offs.

| n | Numbers Crossed Off | n × ln ln n |
| --- | --- | --- |
| 100,000 | 193,078 | 244,347 |
| 1,000,000 | 2,122,048 | 2,625,792 |
| 10,000,000 | 22,850,051 | 27,799,426 |

The count stayed about 80% of n ln ln n at each size, the shape the bound predicts. Starting at p × p instead of 2p saved less than 5% of the crossings, for example 2,122,048 against 2,197,839 at a million, though it also avoids touching numbers that were already crossed.

Compare this with testing: the sieve to 1,020,000 took 1 millisecond in our run and answered every number in that range, while trial division of just the 20,000 numbers above a million took 90 milliseconds.

## How Many Primes Are There

Primes thin out, slowly. We counted them with the sieve.

| n | Primes up to n | n ÷ ln n | Ratio |
| --- | --- | --- | --- |
| 100 | 25 | 22 | 1.15 |
| 10,000 | 1,229 | 1,086 | 1.13 |
| 1,000,000 | 78,498 | 72,382 | 1.08 |
| 10,000,000 | 664,579 | 620,421 | 1.07 |

The ratio drifts toward 1, which is the prime number theorem: the count of primes up to n is close to n ÷ ln n. A random number near n is prime with chance about 1 ÷ ln n, so near a million about 1 in 14, and the gap to the next prime averages about ln n. Gaps can be much larger. The widest gap below a million is 114, between 492,113 and 492,227.

## Factoring Many Numbers

A small change turns the sieve into a factoring tool. Instead of marking a number as composite, record its **smallest prime factor**. Then to factor x, divide by its smallest prime factor, look up the next, and repeat.

```python
def smallest_factors(n):
    spf = list(range(n + 1))                 # each number starts as its own factor
    for p in range(2, math.isqrt(n) + 1):
        if spf[p] == p:                      # p is prime
            for m in range(p * p, n + 1, p):
                if spf[m] == m:
                    spf[m] = p
    return spf

def factor(x, spf):
    primes = []
    while x > 1:
        primes.append(spf[x])
        x //= spf[x]
    return primes
```

Factoring costs one step for each prime factor, at most about log₂ x. Building the table to one million took 0.08 s, and then factoring 100,000 random numbers below a million took 0.04 s, against 0.82 s by trial division, about 20 times faster. The results matched trial division, and multiplied back to the original, for every number from 2 to 19,999.

## Which Tool

| Question | Use |
| --- | --- |
| Is this one number prime | Trial division up to its square root |
| All primes up to n | The sieve |
| Factor many numbers up to n | The smallest prime factor table |
| Very large single numbers | Faster tests exist, and they are beyond this article |

## Key Points

- A prime has only 1 and itself as divisors, every number above 1 factors into primes in one way, and there are infinitely many
- Trial division up to √n tests one number, and a prime near a million took 999 tests
- The sieve of Eratosthenes crosses off multiples starting at p × p, and makes about 0.8 × n ln ln n crossings and uses one byte for each number, reaching 10⁸ in 0.41 s
- The count of primes up to n is close to n ÷ ln n, 78,498 up to a million against 72,382
- Recording each number's smallest prime factor makes factoring 100,000 numbers 20 times faster than trial division
