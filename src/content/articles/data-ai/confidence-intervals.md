> A **confidence interval** is a range computed from a sample by a procedure that, over many repeated samples, captures the true value a stated share of the time, such as 95 percent. It says how precisely a sample pins down a quantity. It is not the probability that the true value lies in this particular interval.

A report that says "the average price is $52" invites the question of how sure that is. An interval answers it: "$50 to $55" says the sample is informative, and "$30 to $75" says it barely is. This page builds the standard interval, checks what its confidence level means by simulation, and shows what it can't promise.

## The Standard Interval

For a mean, the 95 percent interval is the sample mean plus and minus a multiple of the standard error: x̄ ± t × s/√n. The multiple t comes from the t distribution and is about 2 for moderate samples, a little larger for small ones, since the standard deviation itself is estimated. For a sample of 50 listings, the multiple is 2.01.

The interval gets narrower with more data and wider with more variation or a higher confidence level. Halving its width takes four times the data, the same square root as before. A 99 percent interval is about a third wider than a 95 percent one.

## What 95 Percent Means

The 95 percent describes the procedure and not one interval. We drew 1,000 samples at each size from a skewed price population and built a 95 percent interval from each, counting how often it contained the true mean:

| Sample Size | Intervals That Caught the True Mean | Average Width |
| --- | --- | --- |
| 5 | 91.0% | $67.83 |
| 10 | 92.8% | $40.43 |
| 30 | 94.0% | $22.38 |
| 100 | 94.7% | $12.17 |
| 200 | 94.0% | $8.65 |

At moderate and large sizes the coverage is close to 95 percent, and the interval narrows steadily. At very small sizes the coverage fell short, 91 percent at n = 5, since the data was skewed and the method's assumptions were strained. Roughly one interval in 20 misses the truth, and nothing in a single interval says whether it is the one that missed.

## Common Misreadings

- **"There is a 95 percent chance the true mean is in this interval"**: the true mean is a fixed number, and the interval is the random thing. The statement belongs to a different framework, the credible interval of [Bayesian Inference](/data-ai/bayesian-inference), which does carry that meaning given a prior
- **"95 percent of the data lies in the interval"**: the interval is about the average and not about individual listings. A prediction interval for a single new listing is much wider, as [Prediction Intervals and Uncertainty](/data-ai/prediction-intervals) shows
- **"A new sample's average will fall inside it"**: we checked, and a fresh sample of 50 had its mean inside an earlier interval only 85.4 percent of the time, since the new average has its own noise
- **"Overlapping intervals mean no difference"**: two intervals can overlap and the difference between the means can still be clearly nonzero. Compare the difference directly, as [Comparing Groups with t-Tests and Chi-Square](/data-ai/comparing-groups) does

## Intervals for Other Quantities

The same idea applies to any statistic. For a proportion, such as the share of listings that sell within two weeks, the standard error is √(p(1 − p)/n), and an interval such as the Wilson interval behaves better near 0 and 1 than the simple formula. For a difference between two groups, the standard error combines the two. For a median or a model's accuracy, a formula is awkward, and [Bootstrap and Resampling](/data-ai/bootstrap) gives the interval by resampling.

An interval is only as good as its assumptions: independent observations, a representative sample and enough data for the approximation. It captures random error. It does nothing for bias, and a perfectly narrow interval around a number from a biased sample is precisely wrong, as [Collecting Data and Sampling Bias](/data-ai/sampling-bias) showed with volunteers who settled at 4.1.

## Reporting

An estimate should travel with its interval, written plainly, such as "average sold price $56.40, 95 percent interval $54.10 to $58.70, from 500 sales". The interval's width is also a statement about sample size: a very wide one means the analysis should be treated as a lead. In an experiment the useful form is the interval for the effect, which tells not only whether there is an effect but also how small or large it could be, and whether the whole range is worth acting on.

## Key Points

- A 95 percent interval is a procedure that catches the true value in about 95 percent of repeated samples
- The standard interval is the estimate plus or minus about two standard errors, and it narrows with the square root of the sample size
- In simulation, coverage was 94.0 percent at 30 listings and 94.7 percent at 100, and fell to 91.0 percent at 5 for skewed data
- It is not the chance that the truth is in this interval, not a range for individual values and not a guard against bias
- <u>Report the interval with every estimate</u>, and compare groups through the interval for their difference
