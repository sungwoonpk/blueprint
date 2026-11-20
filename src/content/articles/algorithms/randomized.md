> A **randomized algorithm** uses random choices so that its behavior depends on luck instead of on the input. A **Las Vegas** algorithm always gives the right answer and takes a random amount of time. A **Monte Carlo** algorithm takes a bounded amount of time and is wrong with a small probability, which repeating it makes tiny.

A quick sort that always picks the first item as its pivot is fast on shuffled data. Feed it a list that is already sorted, and every pivot is the smallest item left, so each pass peels off one item. On 2,000 sorted items it made 1,999,000 comparisons, which is every pair, while the same function on shuffled data needed about 24,600.

The input was legal, and perhaps common. Someone who knows which pivot you pick can find an input that is bad for you. Randomness takes that power away.

## Why Roll Dice at All?

A fixed rule for choosing the pivot has a worst input, and that input exists whether or not anyone looks for it. A fixed middle pivot avoids the sorted list, where it made 17,964 comparisons, but any fixed rule has some input it handles badly.

If the pivot is chosen at random, no input is bad in advance. The running time becomes a random variable whose distribution depends only on the size of the input. A bad run is still possible, but it comes from unlucky coin flips, not from a particular list, and it can't be arranged by an adversary who doesn't see the flips.

## Las Vegas: Always Right, Time Varies

Randomized quick sort changes one line of [Quick Sort](/algorithms/quick-sort): before partitioning, swap a randomly chosen item into the pivot position.

```python
pivot_index = random.randint(lo, hi)
a[pivot_index], a[hi] = a[hi], a[pivot_index]    # then partition around a[hi] as usual
```

The output is always sorted, so the algorithm is always correct. Only the number of steps is random. We ran it 100 times on the same sorted list of 20,000 items, counting comparisons.

| Input | Runs | Mean | Lowest | Highest |
| --- | --- | --- | --- | --- |
| Sorted | 100 | 340,344 | 318,910 | 388,970 |
| Shuffled | 50 | 336,444 | 318,209 | 387,926 |

On sorted input the mean was 340,344 comparisons, and the unluckiest run was only 14% above it. On shuffled lists the mean was 336,444, about the same. The cost no longer depends on the order of the input. The mean is below the estimate 2 n ln n, which is 396,140 here, because that formula drops lower-order terms.

This is what an **expected** running time means: an average over the algorithm's own coin flips, for a fixed worst-case input. It is stronger than an average over random inputs, because it holds for each input. [Quickselect](/algorithms/quickselect) gets its O(n) expected time the same way, and [Skip Lists](/algorithms/skip-lists) will use random levels to stay balanced.

Sometimes a statement is made **with high probability**, meaning the chance of failure is a small power of n, such as 1 / n². That is a firmer promise than a bound on the average, because it says the bad case is rare, and not only that its cost is averaged away.

## Monte Carlo: Fast, Probably Right

A student hands in a matrix C and claims it equals A times B. Checking by recomputing the product takes about n³ steps for n by n matrices with the schoolbook method. Here is a much cheaper test that can be wrong.

Pick a random vector r of zeros and ones. Compute A(Br) and Cr, which are three matrix-vector products and cost about n². If C really is the product, both sides are equal for every r. If it isn't, they differ for at least half of the vectors r.

```python
def probably_equal(A, B, C):
    n = len(A)
    r = [random.randint(0, 1) for _ in range(n)]
    Br  = [sum(B[i][j] * r[j] for j in range(n)) for i in range(n)]
    ABr = [sum(A[i][j] * Br[j] for j in range(n)) for i in range(n)]
    Cr  = [sum(C[i][j] * r[j] for j in range(n)) for i in range(n)]
    return ABr == Cr                          # False is certain, True is probable
```

The "at least half" claim has a short proof. If C is wrong, then D = AB − C has a nonzero entry, say D[i][j]. The i-th entry of Dr is D[i][j] × r[j] plus a sum of terms that don't involve r[j]. Fix the other coordinates of r. Of the two possible values of r[j], at most one makes that sum equal zero, so at most half of the vectors r let the wrong C pass.

We tried it on 150 by 150 matrices. The full product took 69 ms and one check took 2.1 ms. We made a C with a single wrong entry and ran 3,000 tries for each number of checks. One check missed the error about half the time, as the bound allows, and repeating the check with fresh random vectors shrinks that quickly.

| Checks | Missed | Bound |
| --- | --- | --- |
| 1 | 50.4% | 50% |
| 3 | 13.3% | 12.5% |
| 5 | 2.9% | 3.1% |
| 10 | 0.1% | 0.098% |

This is the one-sided error of a Monte Carlo algorithm. A "different" answer is always right, since the two vectors really did differ. An "equal" answer is probably right, and after k independent checks the chance that it is wrong is at most 2⁻ᵏ. Thirty checks give odds of about one in a billion at a cost of 90 matrix-vector products, about 90 n² steps, which beats the n³ of a full product once n is large.

Repeating an algorithm to push down its error is called **amplification**. Karger's contraction algorithm for the minimum cut of a graph is a classic user of it: a single run finds the minimum cut with probability at least 2 / (n(n − 1)), which is small, and repeating it c × n(n − 1) / 2 × ln n times brings the chance of failure below 1 / nᶜ.

## Randomness in Practice

- **Seeds**: a generator started from a fixed seed repeats its numbers, so a test that fails can be rerun exactly. Use a fixed seed in tests and a fresh one in production
- **Not cryptographic**: Python's `random` is the Mersenne Twister, which is completely deterministic. The documentation says to use the `secrets` module for security uses
- **Independence**: repeated trials must use fresh random choices, or the error bound doesn't multiply
- **Cost of a rare failure**: choose the number of repetitions so the chance of failure is far below the chance of other faults, like a hardware error

## Key Points

- A fixed pivot rule has bad inputs, such as the sorted list that cost 1,999,000 comparisons on 2,000 items, and a random pivot has no bad input in advance
- A Las Vegas algorithm is always correct and takes random time, as randomized quick sort does with 340,344 comparisons on average for 20,000 sorted items and a worst run only 14% higher
- A Monte Carlo algorithm is fast and may be wrong, and the matrix product check is wrong at most half the time, 2⁻ᵏ after k repetitions
- Expected time averages over the algorithm's own coin flips for each input, which is stronger than averaging over inputs
- Use seeds to reproduce runs, and use `secrets` rather than `random` for anything about security
