> The **expectation** of a random variable is its probability weighted average, the long run mean. The **variance** measures the spread around that mean, and the **covariance** of two variables measures how they move together. Together they summarize a distribution in a few numbers, and they decide how much data a measurement needs.

[Joint Distributions and Independence](/data-ai/joint-independence) described relationships fully, with a table. These summaries compress that table to a mean, a spread and a number for the relationship.

## Expectation

The expectation, or mean, E[X], is the sum of each value times its probability, or an integral for a continuous variable. In the simulated textbook market, with 200,000 sales, the mean sold price was $56.65. The expectation is **linear**: E[aX + b] = aE[X] + b, and E[X + Y] = E[X] + E[Y] always, whether or not X and Y are independent. That last fact is the most useful sentence in probability, since it lets averages of complicated things be computed piece by piece.

## Variance and Standard Deviation

The variance is the expected squared distance from the mean: Var(X) = E[(X − E[X])²] = E[X²] − E[X]². Its square root is the **standard deviation**, in the units of the data. The sold prices had a standard deviation of $27.72, so most sales landed within about $28 of the mean.

Unlike the mean, variance is not linear. Var(aX + b) = a² Var(X), and for a sum, Var(X + Y) = Var(X) + Var(Y) + 2 Cov(X, Y), where the covariance term is zero only if the two are uncorrelated.

## Covariance and Correlation

The **covariance** is Cov(X, Y) = E[(X − E[X])(Y − E[Y])]. It is positive when the two tend to be above their means together, negative when one is high as the other is low, and its size depends on the units. The **correlation** divides by both standard deviations, giving a number between −1 and 1: r = Cov(X, Y) / (σₓ σᵧ).

From the same 200,000 sales, the list price and the sold price had a covariance of 843.2 and a correlation of 0.752: expensive books sell for more. The identity for sums held exactly. The variance of list price plus sold price was 4,090.9, equal to the two variances plus twice the covariance, and far from 2,404.5, the two variances alone. Ignoring the covariance would have understated the variance by 41 percent.

For many variables the covariances form the **covariance matrix**, symmetric, with the variances on its diagonal. It is the matrix of [Eigenvalues and Eigenvectors](/data-ai/eigen) and the parameter of [The Multivariate Gaussian](/data-ai/multivariate-gaussian). Correlation measures only a straight line relationship: a variable can depend strongly on another and have a correlation of zero, as with a U shaped relationship.

## How Averages Settle Down

An average of n independent draws has the same mean as one draw and a variance n times smaller, so its standard deviation shrinks by the square root of n. We drew repeated samples of sold prices and measured how much the sample mean wandered:

| Sample Size | Spread of the Sample Mean | Formula σ/√n |
| --- | --- | --- |
| 10 | $9.36 | $8.76 |
| 100 | $2.76 | $2.77 |
| 1,000 | $0.85 | $0.88 |
| 10,000 | $0.28 | $0.28 |

This is the **law of large numbers** at work, and the formula σ/√n, the **standard error**, is what [Estimation and Confidence Intervals](/data-ai/confidence-intervals) is built on. It also shows the cost of precision: to halve the uncertainty, a sample must be four times as large, and to cut it tenfold, a hundred times.

## What Models Do With This

- **Loss functions**: a mean squared error is the expectation of a squared deviation, and the mean of a loss over a batch estimates the expectation over all data
- **Bias and variance**: [Bias and Variance](/data-ai/bias-variance) splits a model's expected error into a systematic part and a part that comes from the particular sample
- **Standardizing features**: subtracting the mean and dividing by the standard deviation gives features a mean of 0 and a variance of 1, as in [Scaling and Normalizing Features](/data-ai/scaling)
- **Noise in gradients**: the minibatch gradient is an average, so its noise shrinks by the square root of the batch size

## Key Points

- The expectation is the weighted average, and it is linear even for dependent variables
- Variance measures spread, standard deviation puts it in the data's units, and the variance of a sum includes twice the covariance
- Correlation is covariance scaled to between −1 and 1, and it captures only straight line relationships: ours was 0.752 for list and sold prices
- A sample mean's spread shrinks as σ/√n, so four times the data halves the uncertainty
- <u>Don't add variances of related quantities without the covariance</u>: ours would have been off by 41 percent
