> **Learning theory** asks why a model that fits its training data should work on new data, and how much data is enough. For a finite set of candidate models, a bound says that the gap between training and true error shrinks like the square root of the logarithm of the set's size divided by the number of examples. The cost of searching a richer set is measured and, with enough examples, paid for.

[Overfitting and Underfitting](/data-ai/overfitting) showed the problem by experiment. This article gives the guarantee behind the practice: why held-out checks work, why more data helps and why a bigger search needs more examples.

## One Model: Hoeffding

Take a single model fixed before seeing the data, and measure its error on n independent examples. The Hoeffding inequality, a tail bound for averages of independent bounded values, says that the measured error is within ε of the true error except with probability 2·exp(−2nε²). More data makes the measured number tighter around the truth. 

This is why a held-out set gives an honest estimate: the model never saw it, so for the model it is one fixed draw.

## Many Models: The Union Bound

Training chooses among many candidates, the best on the training data. The measured error of the winner is no longer an honest estimate, because we picked the lucky one. With K candidates, the **union bound** makes all K measured errors within ε of their truth at once, except with probability 2K·exp(−2nε²). Setting this equal to a failure probability δ, the gap for every candidate, the winner included, is at most

ε = √( ln(2K/δ) / (2n) )

Stanford's CS229 notes derive this for finite hypothesis classes. The gap grows only with ln K, so doubling the number of candidates costs a tiny amount, and shrinks with the square root of n.

## Watching the Bound Work

We built the worst case, K classifiers that are pure coin flips with a true error of 0.5, took the one with the lowest training error and measured how far its training error fell below the truth. With δ = 0.05:

| Examples n | Candidates K | Average Gap | 95th Percentile of the Gap | Bound |
| --- | --- | --- | --- | --- |
| 100 | 1 | 0.001 | 0.09 | 0.136 |
| 100 | 10 | 0.077 | 0.13 | 0.173 |
| 100 | 1,000 | 0.160 | 0.19 | 0.230 |
| 1,000 | 100 | 0.039 | 0.052 | 0.064 |
| 1,000 | 1,000 | 0.051 | 0.060 | 0.073 |
| 10,000 | 1,000 | 0.016 | 0.019 | 0.023 |

The observed gaps stay under the bound, and the bound is not far above the worst cases. Picking the best of 1,000 coin flips on 100 examples makes a model look 16 points better than it is, as the test set size table in [Training, Validation and Test Sets](/data-ai/train-val-test) found. Ten times more examples cut the gap by about a factor of three.

## How Much Data

Solving the bound for n gives the sample size needed so that every candidate's training error is within ε of its true error: n ≥ ln(2K/δ) / (2ε²). For ε = 0.05 and δ = 0.05:

| Candidate Models | Examples Needed |
| --- | --- |
| 100 | 1,659 |
| 1 million | 3,501 |
| 2¹⁰⁰, a class set by 100 yes or no choices | 14,601 |

A million times more candidates needs only about twice the data, since only the logarithm counts. A class with 2¹⁰⁰ members, which is huge, needs about 14,600. The need grows linearly with the number of parameters, when each is a bit, and that matches the rule of thumb that you want many more examples than parameters.

## Infinite Classes: VC Dimension

Models with real-valued weights have infinitely many candidates, so K is useless.

The **VC dimension** replaces ln K. It is the size of the largest set of points that the class can label in every possible way, as Stanford's CS229 notes define it. A line in the plane can separate three points in any labeling, but not every labeling of four, so its VC dimension is 3. For linear classifiers in d dimensions it is d + 1.

 If a class has VC dimension D, the gap between training and true error is controlled by roughly the square root of D divided by n, up to logarithmic factors.

The picture matches the finite case: the cost of richness grows with a measure of flexibility and shrinks with data.

## What the Theory Gets Right and Wrong

- **Right in direction**: richer classes need more data, held-out data is honest and bigger searches inflate the winner's score
- **Loose in size**: bounds are worst-case and conservative, and real models often generalize far better than they promise
- **Silent about big networks**: deep networks have enormous capacity, yet they generalize, and very large models show the double descent of the CS229 notes, which classical bounds don't explain. This is an active research area, taken up again in the deep learning chapters
- **Assumes the same distribution**: if the future differs, as in [Data Distribution Shifts](/data-ai/distribution-shift), none of this applies

## Key Points

- A model fixed before seeing the data has a measured error within about √(ln(2/δ)/(2n)) of the truth, and picking the best of K candidates adds only a ln K term
- With coin-flip classifiers the best of 1,000 on 100 examples looked 16 points better than chance, inside a bound of 23 points
- Needing 1,659 examples for 100 candidates and 14,601 for 2¹⁰⁰ shows data needs growing with the log of the class size
- VC dimension extends the idea to infinite classes, and a line in a plane has VC dimension 3
- <u>Think of held-out data as the guarantee, and of model richness as a cost paid in examples</u>
