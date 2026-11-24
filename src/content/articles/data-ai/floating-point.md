> Computers store real numbers as **floating point**: a sign, a fixed number of significant bits and an exponent, so most numbers are only approximated and every operation rounds. **Numerical stability** is writing calculations so that those small errors don't grow into wrong answers. It is the reason for the odd looking tricks in model code, such as subtracting the maximum before a softmax.

Every number on this roadmap has been computed on a machine that can't store 0.1. That is usually harmless, and occasionally it ruins a result silently. This page covers the format, the four places it bites machine learning, and the standard fixes.

## What a Float Holds

An IEEE 754 number has a sign, an exponent and a **significand** with a fixed number of bits. Double precision, 64 bits, has 53 significant bits, about 16 decimal digits, and single precision, 32 bits, has 24, about 7 digits. Most deep learning uses 32, 16 or even fewer bits to save memory and time, so the limits matter more there.

The smallest gap above 1 is the **machine epsilon**. We measured it: 2.22 × 10⁻¹⁶ in double precision and 1.19 × 10⁻⁷ in single, which are 2⁻⁵² and 2⁻²³. Any relative change smaller than about half of that is lost.

The spacing between floats grows with their size, so large numbers have coarse gaps. In single precision, 16,777,216 plus 1 gives 16,777,216 again, and in double precision 2⁵³ plus 1 does the same, which is why a counter in a float stops counting.

| Format | Significant Bits | Epsilon | Largest Integer Counted Exactly |
| --- | --- | --- | --- |
| Single, 32 bit | 24 | 1.19 × 10⁻⁷ | 16,777,216 |
| Double, 64 bit | 53 | 2.22 × 10⁻¹⁶ | 9,007,199,254,740,992 |

## Most Decimals Are Not Exact

A computer stores numbers in binary, and 0.1 has no finite binary form, just as one third has none in decimal. The stored double is 0.1000000000000000055511151231257827…, and 0.1 + 0.2 gives 0.30000000000000004, not 0.3. The difference, 5.6 × 10⁻¹⁷, is tiny, and a comparison with `==` fails. The rule is to compare floats with a tolerance, never for equality.

Small errors add up. Summing 0.1 ten times gives 0.9999999999999999. Summing it 10 million times in double precision gave 999,999.99984 instead of 1,000,000, an error of 1.6 × 10⁻⁴.

In single precision, adding 0.1 a million times gave 100,958.3 instead of 100,000, off by nearly 1 percent, since each addition rounds and the rounding errors drift in one direction as the total grows. A careful summation, such as Python's `math.fsum`, got exactly 1,000,000.0. Sums of many numbers, like losses over a large dataset, deserve this care.

## Overflow and Underflow

Floats have a largest and a smallest value. In double precision, `exp(710)` overflows, and `exp(−746)` underflows to exactly 0. A **softmax** computes eˣ for each score and divides by the total, which is where it bites. We ran it on three sets of scores:

| Scores | Naive Softmax | With the Maximum Subtracted |
| --- | --- | --- |
| [2, 1, 0.1] | [0.659, 0.242, 0.099] | [0.659, 0.242, 0.099] |
| [1000, 999, 998] | OverflowError | [0.665, 0.245, 0.090] |
| [−1000, −1001, −1002] | Division by zero | [0.665, 0.245, 0.090] |

For ordinary scores both agree. For large scores, e¹⁰⁰⁰ overflows, and for very negative scores every exponential underflows to 0 and the total is 0. The fix is a mathematical identity: subtracting the same number from every score doesn't change the softmax, so subtract the maximum, which makes the largest exponent 0 and the rest negative.

The result is the same and can't overflow. The related **log-sum-exp** trick computes log Σ eˣ as m + log Σ e^(x − m) with m the maximum, and it gave 1,000.41 for [1000, 999, 998] where the direct formula fails. Library functions for cross-entropy do this for you, which is why they take raw scores and not probabilities.

## Catastrophic Cancellation

Subtracting two nearly equal numbers cancels the leading digits that agree and leaves only the digits that were already wrong. A textbook example is the variance computed as E[x²] − E[x]². We drew 100,000 values with true variance 1 around different centers:

| Center of the Data | Naive Formula | Stable Formula |
| --- | --- | --- |
| 0 | 1.005 | 1.005 |
| 10,000 | 1.005 | 1.005 |
| 100,000,000 | 2.000 | 1.003 |
| 1,000,000,000 | 128.000 | 1.000 |

When the mean is a billion, E[x²] is about 10¹⁸ and the variance is the difference of two huge, nearly equal numbers, so the answer is garbage: 128 instead of 1.

The stable method, Welford's, updates the mean and the sum of squared deviations one value at a time and never subtracts large numbers. The same effect gave [Derivatives and Gradients](/data-ai/derivatives-gradients) its rising error when the finite difference step got too small. The cure is to restructure the formula, not to use more digits.

## Habits for Model Code

- **Prefer library functions** for softmax, log-softmax, cross-entropy and normalization, which already use the stable forms
- **Work in logs** when multiplying many probabilities, since a product of hundreds of small numbers underflows to 0 and a sum of logs doesn't
- **Compare with tolerances**, and watch for `nan` and `inf`, which spread through a computation and show up as a loss that suddenly reads `nan`
- **Scale features** so that values are of similar size, as in [Scaling and Normalizing Features](/data-ai/scaling)
- **Know the precision**: half precision has a very narrow range, so training in it uses loss scaling and keeps a master copy of the weights in higher precision, as [Training and Debugging Deep Networks](/data-ai/training-deep-nets) discusses

## Key Points

- Floats keep a fixed number of significant bits: 53 in double precision and 24 in single, with epsilons of 2.22 × 10⁻¹⁶ and 1.19 × 10⁻⁷
- Most decimals aren't exact, so 0.1 + 0.2 isn't 0.3, and compare with a tolerance
- Errors accumulate in long sums: a single precision sum of a million 0.1s was off by nearly 1 percent
- Overflow and underflow break the naive softmax at scores of ±1,000, and subtracting the maximum fixes it with the same answer
- <u>Cancellation of nearly equal numbers destroys accuracy</u>: the naive variance gave 128 for data with true variance 1, and a restructured formula gave 1.000
