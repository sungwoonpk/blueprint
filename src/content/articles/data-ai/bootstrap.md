> The **bootstrap** estimates how a statistic would vary across samples by resampling the one sample we have: draw n values with replacement, compute the statistic, repeat thousands of times, and read the spread. It gives standard errors and confidence intervals for statistics that have no simple formula, such as a median or a model's accuracy.

[Sampling Distributions and the Central Limit Theorem](/data-ai/sampling-distributions) described the ideal: draw many samples from the population and look at the statistic. We can't draw new samples from the real population, and Bradley Efron's 1979 idea was to treat the sample itself as a stand in for it.

## The Procedure

1. Start with a sample of n observations
2. Draw n observations from it **with replacement**, so that some appear twice and some not at all: a **bootstrap sample**
3. Compute the statistic on it
4. Repeat 1,000 to 10,000 times
5. The collection of statistics is the bootstrap distribution, and its spread estimates the standard error

A **percentile interval** takes the 2.5th and 97.5th percentiles of the collection as a 95 percent interval. The method needs no formula for the statistic. All it needs is the ability to compute it, which is why it spread with computers.

## A Median With No Formula

The median has an awkward standard error. We drew 60 listing prices from a skewed population with a true median of $45.09. The sample median was $40.92, and 5,000 bootstrap resamples gave:

| Quantity | Value |
| --- | --- |
| Sample median | $40.92 |
| Bootstrap standard error | $3.01 |
| 95 percent percentile interval | $36.93 to $49.82 |
| True spread of the median over repeated samples | $3.98 |
| True median | $45.09 |

The interval contains the true median, and it is asymmetric, reaching further above the estimate than below, as the data's skew would suggest. The bootstrap standard error of $3.01 was lower than the true $3.98 for this one sample, since a single sample can look less variable than the population. Over many samples such errors average out.

## Does It Cover

The test of an interval is coverage. We repeated the whole process, drawing a fresh sample and building a bootstrap interval from it, 400 times at each sample size and counting how often the interval contained the true median:

| Sample Size | Coverage of the Nominal 95% Interval |
| --- | --- |
| 20 | 93.8% |
| 60 | 95.8% |
| 200 | 93.8% |

Coverage was close to 95 percent throughout, from a sample of only 20. With 400 repetitions the standard error of each figure is about one point, so these are consistent with 95 percent. The method worked for a statistic with no simple standard error.

## What It Is For

- **Intervals and standard errors** for medians, ratios, correlations, percentiles and differences of anything
- **Model evaluation**: resample the test set to put an interval on accuracy, or to compare two models on the same resamples, as in [Comparing Models Fairly](/data-ai/comparing-models)
- **Bagging**: training many models on bootstrap samples and averaging them, the idea of [Bagging and Random Forests](/data-ai/random-forests)
- **Hypothesis tests**: resample under the null, as the permutation test of [Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) did by shuffling labels
- **Cross validation** is a close relative that splits instead of resampling, as in [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv)

## When It Fails

The bootstrap assumes that the sample resembles the population, and that observations are independent. It breaks down in known cases:

- **Very small samples**: a sample of 5 can't represent the population's tails
- **Extremes**: the maximum of a sample can never exceed the sample's own largest value, so the bootstrap distribution of a maximum is wrong at its core, whatever the number of resamples. In our 60 listings the sample maximum was $204.60, and the bootstrap can never produce a larger value, although the population has many
- **Dependent data**: reviews clustered by seller, or a time series, need a block or cluster bootstrap that resamples whole groups, since resampling single rows would treat them as independent and make the interval too narrow
- **Heavy tails**: infinite variance breaks the theory, and the interval can be unreliable
- **Biased samples**: it faithfully reproduces whatever bias the sample has

Resampling doesn't add information. It reveals how much the sample alone tells us, and the cost of carelessness is the same as for any interval: narrowness without correctness.

## Practical Notes

Use at least 1,000 resamples for a standard error and 5,000 or more for percentile intervals. Fix the random seed and record it for reproducibility. For skewed statistics, improved variants, such as bias corrected intervals, are available in statistical libraries. And resample at the level of the independent unit: the seller, the student, the day.

## Key Points

- The bootstrap resamples the sample with replacement to estimate how a statistic varies across samples
- For a median of 60 prices it gave a standard error of $3.01 and an interval of $36.93 to $49.82 around a true $45.09
- Coverage was 93.8 percent at n = 20, 95.8 percent at 60 and 93.8 percent at 200, with a standard error near one point
- It fails for extremes like the maximum, for dependent data without a block version and for very small samples
- <u>Resample at the level of the independent unit</u>, and don't expect it to fix bias
