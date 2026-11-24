> The **sampling distribution** of a statistic is how its value varies across repeated samples from the same population. Its spread is the **standard error**, and for sums and averages it is close to Gaussian once the sample is large enough, which is the **central limit theorem**. It turns "what this sample says" into "how much to trust what this sample says".

A dataset is one sample. A different sample would have given a slightly different average, a different median, a different model. Inference starts by asking how much those numbers would move, and the answer is a distribution, one level up from the data.

## One Sample, Many Possible Samples

Imagine drawing 10 listings at random and computing their mean price, then doing it again and again. The means form a distribution of their own. We simulated a population of 200,000 listing prices, with a mean of $52.36 and a median of $45.01, and drew 2,000 samples of each size:

| Sample Size | Spread of the Sample Mean | Spread of the Sample Median | Average of the Sample Maximum |
| --- | --- | --- | --- |
| 10 | $9.92 | $9.60 | $110.30 |
| 50 | $4.33 | $4.37 | $161.40 |
| 200 | $2.23 | $2.20 | $211.80 |

The spread of the mean, its **standard error**, fell by half when the sample grew four times, from $4.33 to $2.23 between 50 and 200, which is the σ/√n rule of [Expectation, Variance and Covariance](/data-ai/expectation-variance). The median settled down at a similar rate here. The maximum did not settle: it kept growing, from $110 to $212, since a larger sample has more chances to include a rare expensive book. Some statistics have a stable sampling distribution, and some, like the maximum, depend on the sample size itself.

## The Central Limit Theorem

For the mean, the shape of the sampling distribution gets closer to a bell as n grows, whatever the shape of the population. The population here is strongly skewed, with a skewness of 2.02. The skewness of the sample means shrank as the samples grew:

| Sample Size | Skewness of the Sample Mean |
| --- | --- |
| 5 | 0.83 |
| 30 | 0.41 |
| 200 | 0.20 |
| Population | 2.02 |

The rate is slow for a skewed population. The textbook figure of 30 samples is a rule of thumb, and at 30 these averages still leaned right. The more skewed or heavy tailed the data, the more observations the bell shape needs, and for extremely heavy tails the theorem's variance condition fails and the mean never settles into a bell at all. [Common Distributions](/data-ai/common-distributions) showed the effect on uniform draws.

## Standard Error in Practice

The standard error of a mean is s/√n, with s the sample's standard deviation. It is the number that sets the width of every interval and the denominator of most tests. Two reminders:

- **It is not the standard deviation of the data**: the standard deviation describes how much listings differ, and the standard error describes how much the average would differ between samples
- **It assumes independent draws**: 1,000 reviews written by 20 sellers carry the information of fewer than 1,000 independent ones, and treating them as independent gives a standard error that is too small

For a proportion, such as the share of listings that sell, the standard error is √(p(1 − p)/n), largest near 50 percent and smaller at the extremes.

## Why This Matters for Machine Learning

A model's test score is a statistic, and it has a sampling distribution too. A test accuracy of 91 percent on 200 examples has a standard error of about 2 points, so 91 against 93 is not a reliable difference, a point [Comparing Models Fairly](/data-ai/comparing-models) expands. The same logic is behind the intervals of [Estimation and Confidence Intervals](/data-ai/confidence-intervals), the tests of [Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) and the resampling of [Bootstrap and Resampling](/data-ai/bootstrap), which estimate a sampling distribution from the one sample we have.

## Key Points

- The sampling distribution is how a statistic varies from sample to sample, and its spread is the standard error
- The standard error of the mean fell by half when the sample grew four times: $4.33 at 50 listings and $2.23 at 200
- The sample maximum has no stable value and kept growing with the sample, from $110 to $212
- The central limit theorem makes means bell shaped, slowly for skewed data: the skewness of the mean was 0.41 at 30 draws from a population with 2.02
- <u>The standard error describes the average, not the data</u>, and it assumes the draws are independent
