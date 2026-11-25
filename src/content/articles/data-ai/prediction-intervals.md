> A point prediction hides how sure the model is. A **prediction interval** gives a range that should contain the true value of a new case with a stated probability, such as 90 percent. It is wider than a confidence interval for the average, because it must cover the case's own noise. **Conformal prediction** builds intervals around any model using held-out errors, with a coverage guarantee that holds without assuming Gaussian noise.

A seller told "$37" is told nothing about risk. "Between $30 and $44, with 90 percent confidence" is something to act on. [Linear Regression](/data-ai/linear-regression) gave a point estimate, and this article adds the range.

## Confidence Versus Prediction

Two intervals are easy to confuse:

- A **confidence interval** is a range for a model quantity, such as the average price of books with these features. It narrows as data grows, as in [Estimation and Confidence Intervals](/data-ai/confidence-intervals)
- A **prediction interval** is a range for a new individual outcome. It includes the noise of single cases, and it stays wide however much data we have

We trained the price model on 2,000 simulated sales. The residual spread was $4.69. A 95 percent confidence interval for the mean price is only $0.41 wide, since the average is pinned down tightly. Using it as a prediction interval, we asked how often a fresh sale's price fell inside, and the answer was **4.7 percent**. The right interval, for 90 percent coverage, is about $15 wide.

Mixing the two up gives intervals that look precise and are wrong about 19 times in 20.

## A Normal Interval and Its Failure

The simplest recipe: prediction ± 1.645 times the residual standard deviation, for a 90 percent interval. It assumes the same spread everywhere. In our simulation the noise grows with the list price, as real price noise does. On 5,000 fresh sales:

| List Price | Coverage of the Constant-Width Normal Interval |
| --- | --- |
| $40 to $80 | 99.7% |
| $80 to $120 | 94.7% |
| $120 and over | 79.7% |
| All | 89.8% |

The average coverage matches the 90 percent target, and for expensive books it is only 80 percent while cheap books are covered 99.7 percent of the time, with intervals far wider than they need. An average guarantee hides a group failure, the same lesson as for averages everywhere. The residual plots from [Linear Regression](/data-ai/linear-regression) would show the funnel.

## Conformal Prediction

**Split conformal prediction** is simple and general:

1. Fit the model on a training set
2. On a separate **calibration** set, compute the absolute error of each example
3. Take the error value q below which 90 percent of those errors fall, with a small correction for the finite sample
4. The interval for a new case is the prediction ± q

If the new case is like the calibration cases, then the interval contains its true value with probability at least 90 percent, whatever the model is and without assuming any noise distribution. We used 1,000 calibration sales and got q = $7.60, so the interval is ± $7.60. It is the same constant-width recipe, and it has the same problem: overall coverage of 89.3 percent, and 78.8 percent for expensive books.

Fixing it means using a score that fits the noise. We scaled each error by the list price, took the 90th percentile of the scaled errors (0.0632) and made intervals of ± 6.32 percent of the list price:

| List Price | Coverage | Average Interval Width |
| --- | --- | --- |
| $40 to $80 | 88.2% | $7.6 |
| $80 to $120 | 89.3% | $12.6 |
| $120 and over | 88.8% | $19.0 |
| All | 88.8% | $13.9 |

Now coverage is near 90 percent in every band, and the widths adapt: narrow for cheap books and wide for expensive ones. The average width is also smaller than the constant-width interval's $15.2, so the intervals are both more honest and tighter. The guarantee is exact for the overall population, and the within-group evenness here comes from choosing a sensible scale.

## Other Ways to Get Intervals

- **Quantile regression**: train a model to predict the 5th and 95th percentiles directly, with a loss that weights the two directions unequally
- **Ensembles**: the spread of several models' predictions, though it measures disagreement, not noise
- **Bayesian models**: a posterior predictive distribution, as in [Bayesian Inference](/data-ai/bayesian-inference)
- **Bootstrap**: resampling, from [Bootstrap and Resampling](/data-ai/bootstrap), covers uncertainty in the model but needs noise added for single outcomes
- **Distribution outputs**: a model whose output is a distribution with a mean and a spread, trained by likelihood, as in [From Likelihood to Loss Functions](/data-ai/mle-losses)

## Using Intervals

- Show sellers a range, not only a number
- Route wide-interval cases to review, or refuse to answer
- Judge intervals by **coverage**, how often the truth falls inside, and by **width**. A good interval is as narrow as it can be while keeping coverage at its level
- Check coverage by group and over time, since drift breaks it. The guarantee needs the future to look like the calibration data, which [Data Distribution Shifts](/data-ai/distribution-shift) warns against assuming

## Key Points

- A prediction interval covers a single new outcome, and a confidence interval for the mean is far narrower and covers it only 4.7 percent of the time
- A constant-width normal interval had 89.8 percent coverage overall and 79.7 percent for expensive books
- Split conformal prediction takes the 90th percentile of held-out errors as its width and needs no noise assumption
- Scaling errors by the list price gave 88 to 89 percent coverage in every band with a narrower average width
- <u>Check coverage by group, and choose an error scale that matches how the noise varies</u>
