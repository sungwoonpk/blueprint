> To compare two groups on a **number**, such as price, use a **t-test** on the difference in means, divided by its standard error. To compare **counts** across categories, such as sold or not by edition, use a **chi-square test**, which weighs the observed counts against those expected if the groups were the same. Both give a p-value and, more usefully, an estimate of the size of the difference.

[Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) built the logic with a shuffle. The standard tests do the same job with a formula, and they cover most group comparisons that come up in analysis and in experiments.

## Two Means: the t-Test

The **t statistic** is the difference between two group means divided by the standard error of that difference: t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂). The version that doesn't assume equal spreads is **Welch's t-test**, and it is a safe default. A large absolute t, beyond about 2, means the gap is large next to the noise in it.

For our old and new edition prices, with 120 and 60 listings:

| Quantity | Value |
| --- | --- |
| Difference in means | $3.41 |
| Standard error of the difference | $4.39 |
| t statistic | 0.78 |
| Degrees of freedom | 166 |
| p-value | 0.44 |

The gap is smaller than its own standard error, so a t of 0.78 is unremarkable. This agrees with the permutation test, which gave 0.52. The two methods agree when the assumptions hold: independent observations, and means that are close to Gaussian, which the central limit theorem provides for samples of this size.

The t-test has relatives. A **paired** t-test compares two measurements on the same unit, such as a price before and after a change, by testing the differences. With three or more groups, analysis of variance asks whether any group differs. When the data is heavy tailed or ordinal, rank based tests such as Mann-Whitney compare the order of values and not their means.

## Counts: the Chi-Square Test

For categories, the data is a table of counts. Take 500 old edition listings and 500 new edition listings, and whether each sold within 14 days:

| | Sold | Not Sold | Share Sold |
| --- | --- | --- | --- |
| Old edition | 352 | 148 | 70.4% |
| New edition | 221 | 279 | 44.2% |

If the edition made no difference, both rows would have the overall sold share of 57.3 percent. The **chi-square statistic** adds up, over the four cells, the squared gap between the observed and the expected count, divided by the expected count. Here it is 70.14, and the p-value is about 5 × 10⁻¹⁷, so a gap of 26 points between 500 and 500 listings is not an accident.

Now a smaller difference: 352 of 500 against 340 of 500, 70.4 percent and 68.0 percent. The chi-square was 0.68 and the p-value 0.41, no evidence of a difference, although there is a gap of 2.4 points. The same size of difference can be significant or not depending on the sample size, which is why the effect is reported next to the p-value.

## Size Matters More Than Significance

A p-value answers whether there is a difference. The next question is how big, and it has several forms:

- **Difference in rates**: 26.2 percentage points in the first table
- **Relative risk**: the ratio of the two sold shares, 70.4 / 44.2 = 1.59, so old editions were 59 percent more likely to sell
- **Standardized difference**: the gap in means divided by the pooled standard deviation, which puts differences on a common scale, often called Cohen's d
- **An interval** for the difference, as in [Estimation and Confidence Intervals](/data-ai/confidence-intervals)

A very large sample makes a trivial difference significant, and a small sample may hide a meaningful one, as the price comparison above showed. Judge a result by its effect size and interval against what would change a decision.

## Assumptions to Check

| Test | Needs | If Violated |
| --- | --- | --- |
| t-test | Independent observations, no extreme skew or outliers at small n | Use ranks, a log scale or a permutation test |
| Paired t-test | Differences from the same units | Don't use an unpaired test, it wastes the pairing |
| Chi-square | Independent rows, expected counts of at least about 5 in each cell | Combine categories or use an exact test |
| Any of them | One planned comparison | Correct for several, as in [Multiple Comparisons](/data-ai/multiple-comparisons) |

Independence is the assumption that fails most in practice: many listings from one seller, many sessions from one student, many reviews of one book. Treating them as independent shrinks the standard error and manufactures significance.

## Which One When

| Outcome | Groups | Test |
| --- | --- | --- |
| A measurement, roughly Gaussian | 2 | Welch's t-test |
| A measurement, skewed or ordinal | 2 | Mann-Whitney or a permutation test |
| A measurement | 3 or more | Analysis of variance |
| Yes or no, or categories | Any | Chi-square, or a test of two proportions |
| Before and after on the same units | 2 | Paired t-test |

## Key Points

- A t-test divides the difference in means by its standard error, and Welch's version doesn't assume equal spreads
- A chi-square test compares observed counts with those expected under no difference: a 26 point gap in sale rates gave 70.1, and a 2.4 point gap gave 0.68
- The same gap can be significant or not depending on sample size, so report the effect and an interval
- Assumptions such as independence matter, and repeated units from one seller or student break it
- <u>Choose the test by the type of outcome and the structure of the data</u>
