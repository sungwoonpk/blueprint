> A **random variable** is a quantity whose value comes from a chance process, such as the price a book sells for or the number of copies sold today. Its **distribution** says how likely each value is: a probability mass function for counts, a probability density for measurements, and a cumulative distribution function for either.

The first four phases of the roadmap treated a sold price as a number. In truth it is one draw from a spread of possible prices, and a model that predicts a single number is summarizing that spread. This page gives the vocabulary for talking about the spread, and later pages build the rest of probability on it.

## Discrete and Continuous

A **discrete** random variable takes separate values, like the copies sold in a day: 0, 1, 2 and so on. Its distribution is a **probability mass function** (PMF) that gives the probability of each value, and the probabilities add to 1.

A **continuous** random variable takes any value in a range, like a price in dollars. The chance of exactly $45.00000 is zero, so the distribution is a **probability density function** (PDF): probability is the area under the curve between two values, and the total area is 1.

A density is not a probability, and it can exceed 1. A price uniformly spread over a $0.50 range has a density of 2 everywhere, and the area under it is still 1. This matters later, when densities and probabilities appear in the same formula.

## The Cumulative Distribution Function

For either kind, the **CDF** gives the probability that the variable is at most a value: F(x) = P(X ≤ x). It rises from 0 to 1, and it answers the questions people actually ask. What share of listings are under $20? What price is only exceeded by 5 percent? The inverse of the CDF gives **quantiles**, such as the median, the 25th percentile and the 95th.

## Two Distributions of the Textbook App

We simulated 100,000 listing prices from a skewed distribution, a lognormal with a median near $45, which looks like real prices: many modest ones and a long tail of expensive ones. The CDF and the quantiles come straight from the sorted sample:

| Quantity | Value |
| --- | --- |
| Median | $45.20 |
| 25th percentile | $31.08 |
| 75th percentile | $65.33 |
| 95th percentile | $111.23 |
| Mean | $52.41 |
| Share at most $20 | 6.98% |
| Share at most $100 | 92.76% |

The mean, $52.41, is above the median, $45.20, because the long tail of expensive books pulls it up. For skewed data the mean and median answer different questions, and reporting both is honest. The lognormal's formula for the share under $20 is 7.02 percent and for under $100 is 92.67 percent, close to what the sample gave.

For a discrete example, copies sold in a day, we simulated 100,000 days with an average of 3 sales. A **Poisson** distribution describes counts of random events, and its PMF is e⁻³ 3ᵏ / k!:

| Copies Sold | Share of Days | Poisson Formula |
| --- | --- | --- |
| 0 | 4.86% | 4.98% |
| 1 | 15.00% | 14.94% |
| 2 | 22.37% | 22.40% |
| 3 | 22.55% | 22.40% |
| 4 | 16.79% | 16.80% |
| 5 | 10.05% | 10.08% |
| 6 | 5.05% | 5.04% |
| 7 | 2.14% | 2.16% |

A day with no sales happens about one day in twenty, even though the average is 3. Knowing the distribution, and not only the mean, tells the app how often to expect a quiet day. [Common Distributions](/data-ai/common-distributions) introduces the Poisson and the others as named families.

## A Model Is a Distribution

The shift in thinking that this page asks for is that a prediction is better described as a distribution than as a number. A model that says "$55" is hiding that the sold price could be $40 or $70. The loss functions of [Loss Functions](/data-ai/loss-functions) are often derived by assuming the error follows a distribution, and [Prediction Intervals and Uncertainty](/data-ai/prediction-intervals) puts a range around a prediction.

Sampling from a distribution means drawing values with these probabilities. The simulations on this roadmap do exactly that, and a dataset can be seen as a sample from an unknown distribution that the model tries to learn about.

## Key Points

- A random variable is a quantity from a chance process, and its distribution says how likely each value is
- Discrete variables have a PMF, continuous ones have a PDF whose area is probability, and a density can exceed 1
- The CDF gives P(X ≤ x), and its inverse gives quantiles such as the median and the 95th percentile
- In our skewed price sample the mean, $52.41, sat above the median, $45.20, and a Poisson with mean 3 gave a day with no sales about 5 percent of the time
- <u>A prediction is better described as a distribution than a single number</u>, which loss functions and prediction intervals both build on
