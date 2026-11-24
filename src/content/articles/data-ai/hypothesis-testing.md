> A **hypothesis test** asks whether data would be surprising if there were no effect. The **null hypothesis** says there is none, the **p-value** is the probability of a result at least as extreme as the one seen if the null were true, and a small p-value says the data are hard to square with the null. It is not the probability that the null is true, and it says nothing about whether an effect matters.

Do new editions of a textbook list for a different price than old editions? In a sample, the averages differ. The test asks whether a difference that large could easily come from the luck of which listings were drawn.

## The Logic

A test has four steps:

1. State a **null hypothesis**, H₀: there is no difference
2. Choose a **test statistic**, a number that measures the difference, such as the gap in mean prices
3. Work out the distribution of that statistic if H₀ were true
4. Compute the **p-value**: the probability, under H₀, of a statistic at least as extreme as the one observed

If the p-value is below a threshold chosen in advance, called the **significance level** α and usually 0.05, we reject H₀. This is proof by contradiction made probabilistic: if the null were true, this data would be rare.

## A Test by Shuffling

A permutation test builds the distribution of step 3 with no formula. If the edition made no difference, the labels "old" and "new" are interchangeable, so shuffling them should give differences just as large. We drew 120 old edition prices and 60 new edition prices from different distributions, with a gap in the population. The sample means were $53.03 and $49.62, a gap of $3.41. We shuffled the labels 20,000 times and counted how often the shuffled gap was at least $3.41 in size:

| Quantity | Value |
| --- | --- |
| Observed gap in means | $3.41 |
| Shuffled gaps at least as large | 51.7% |
| Permutation p-value | 0.517 |
| Welch t-test p-value | 0.437 |

A p-value of 0.52 says that a gap this big is entirely ordinary under no difference. We cannot reject the null. This is not the same as showing there is no effect: in our simulation the two populations really did differ, with typical prices of about $48 and $40, and the samples were simply too small and noisy to show it. **Failing to reject is not accepting.** [Statistical Power and Sample Size](/data-ai/power-sample-size) is about avoiding that situation.

## Errors and the Level

Two mistakes are possible:

| | H₀ True | H₀ False |
| --- | --- | --- |
| Reject H₀ | Type I error, a false alarm | A correct detection |
| Don't reject H₀ | Correct | Type II error, a miss |

The significance level α is the rate of Type I errors we are willing to accept when the null is true. We checked it: over 4,000 comparisons of two groups drawn from the same distribution, 5.9 percent were declared significant at α = 0.05, near the target, with the small excess due to the normal approximation of the t statistic at n = 30. The rate of misses is the other side, governed by the sample size and the true effect.

## What a p-Value Is Not

The American Statistical Association published a statement on p-values in 2016, because they are so often misread. Its main points, in plain words:

- A p-value says how incompatible the data are with a specified model, and nothing more
- It is not the probability that the hypothesis is true, nor the probability that the data came from chance alone
- A decision should not rest only on whether a p-value crosses a threshold such as 0.05
- Proper inference needs full reporting: every analysis tried, not only the ones that worked
- A p-value doesn't measure the size of an effect or its importance: a huge sample can make a trivial difference significant
- By itself, a p-value is a poor measure of evidence about a hypothesis

A p-value of 0.04 and one of 0.06 are practically the same evidence, and treating one as a discovery and the other as nothing is arbitrary. The size of the effect, its interval from [Estimation and Confidence Intervals](/data-ai/confidence-intervals) and the cost of being wrong tell more.

## Using Tests Well

- **Decide the hypothesis, the test and the level before looking**, since choosing after seeing the data inflates false alarms, as [Multiple Comparisons](/data-ai/multiple-comparisons) shows
- **Report an effect size and an interval** along with the p-value
- **Check the assumptions** of the test: independence, shape, sample size
- **Match the test to the data**, which [Comparing Groups with t-Tests and Chi-Square](/data-ai/comparing-groups) does for numbers and for counts
- **Think about power**, so that a non-significant result means something

## Key Points

- A hypothesis test asks how surprising the data would be if there were no effect, and the p-value is the probability of a result at least as extreme under that null
- A permutation test builds the null distribution by shuffling labels: a $3.41 gap in prices gave p = 0.517, entirely ordinary under no difference
- Failing to reject is not showing there is no effect, since the populations really differed and the samples were too small
- The significance level is the false alarm rate: 5.9 percent of null comparisons were significant at 0.05 in our check
- <u>A p-value is not the probability the hypothesis is true, and it says nothing about size or importance</u>
