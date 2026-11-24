> A **generalized linear model** keeps the linear core of linear regression, a weighted sum of features, and changes two things: the distribution of the label, such as Poisson for counts or Bernoulli for yes or no, and a **link function** connecting the weighted sum to that distribution's mean. Linear, logistic and Poisson regression, and softmax regression, are all special cases.

[Linear Regression](/data-ai/linear-regression) assumes a label that can be any number, with Gaussian noise. Logistic regression handled yes or no. Both follow one recipe, and with it we can build the right model for counts, positive amounts and more.

## The Recipe

A generalized linear model has three parts:

1. **A distribution** for the label given the features, chosen from a family called the exponential family, which includes the Gaussian, Bernoulli, Poisson, gamma and categorical distributions
2. **A linear predictor**: η = w·x, a weighted sum of the features
3. **A link function** g that connects the mean of the label to the linear predictor: g(mean) = η, or equivalently mean = g⁻¹(η)

Stanford's CS229 notes, by Andrew Ng and Tengyu Ma, present GLMs this way and show that choosing the distribution fixes the model and its training rule.

| Label | Distribution | Link | Model |
| --- | --- | --- | --- |
| Any real number | Gaussian | Identity | Linear regression |
| Yes or no | Bernoulli | Logit | Logistic regression |
| One of K classes | Categorical | Softmax | Softmax regression |
| Count of events | Poisson | Log | Poisson regression |
| Positive, skewed amount | Gamma | Log or inverse | Gamma regression |

The link guarantees a sensible output. The logit keeps the probability between 0 and 1. The log link keeps a predicted count positive, since the mean is the exponential of the linear predictor.

## An Example: Counting Sales

How many copies of a course's textbooks sell on a day? That is a count: 0, 1, 2, and so on. We simulated 3,000 course-days. The features were the log of the number of available listings, an indicator for exam week and one for weekends. The true model had mean = exp(−0.4 + 0.55·log(listings) + 0.7·exam − 0.35·weekend).

We fitted a Poisson regression, by a Newton-style procedure called iteratively reweighted least squares, and an ordinary linear regression for comparison:

| Term | True Weight | Poisson Fit | Linear Fit |
| --- | --- | --- | --- |
| Intercept | −0.40 | −0.434 | −0.932 |
| Log of listings | 0.55 | 0.562 | 1.687 |
| Exam week | 0.70 | 0.662 | 2.746 |
| Weekend | −0.35 | −0.337 | −1.052 |

The Poisson weights recover the truth. The linear weights are on a different scale, since they act on the count directly, and not on its logarithm. On fresh data:

| Measure | Poisson Fit | Linear Fit |
| --- | --- | --- |
| Poisson deviance per row, lower is better | 1.10 | 1.43 |
| Mean absolute error | 1.36 | 1.52 |
| Predictions below zero | 0% | 3.8%, down to −0.82 |

The linear model predicts negative sales for 3.8 percent of the days, which is impossible, and its fit is worse on both measures. Poisson regression avoids both problems.

## Multiplicative Effects

With a log link, the coefficients act on the mean **multiplicatively**. Exponentiating a Poisson weight gives a rate ratio:

- Exam week multiplies expected daily sales by exp(0.662) = **1.94**, nearly doubling them
- A weekend multiplies them by exp(−0.337) = **0.71**
- Doubling the number of listings multiplies them by 2^0.562 = **1.48**, so sales grow less than in proportion to supply

Effects on rates are often multiplicative in the real world, and the model says so directly. In linear regression the same effects would be additive and would need interactions to express a proportional change.

## The Same Training Rule

GLMs share a feature that is both elegant and practical: for the natural choice of link, the gradient of the log-likelihood has the form

∑ (label − predicted mean) × feature

For linear regression, logistic regression and Poisson regression alike, the training step nudges each weight in proportion to the prediction error times the feature. This is the reason the gradient formulas of this chapter look the same.

## Cautions

- **Overdispersion**: a Poisson distribution has variance equal to its mean. Real counts often vary more, and the standard errors are then too small. Negative binomial regression allows extra spread. In our data the counts had a mean of 3.29 and a variance of 9.03 overall, which comes mostly from the means differing between days, and the Poisson model accounts for that through its features
- **Zeros**: many zeros beyond what a Poisson expects call for a zero-inflated model
- **Exposure**: if observations cover different time spans, include the log of the span as an offset
- **Correct form still matters**: the link and the features must fit the data, so check residuals

## Where GLMs Sit

GLMs are often the first and best model for tabular problems with clear structure, such as insurance claims, click counts and epidemiology, and they remain interpretable. A neural network with a softmax or exponential output layer is a GLM whose features are learned.

## Key Points

- A GLM is a linear predictor, an exponential-family distribution for the label and a link function between them
- Linear, logistic, softmax and Poisson regression are special cases, and the distribution chosen fixes the loss
- On simulated daily sales, Poisson regression recovered the true weights, while linear regression predicted negative sales on 3.8 percent of days
- With a log link, coefficients are multiplicative: exam week multiplied expected sales by 1.94
- <u>Match the distribution and link to the label, and check for extra spread in counts</u>
