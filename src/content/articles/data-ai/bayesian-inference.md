> **Bayesian inference** starts with a **prior** distribution over an unknown quantity, updates it with the data through Bayes’ rule, and ends with a **posterior** distribution that holds everything known about the quantity, including its uncertainty. The prior matters most when data is scarce and fades as data accumulates.

[Maximum Likelihood Estimation](/data-ai/mle) gives one best value. Often a range of plausible values, and a way to bring in what was already known, serves better. A new feature sells 3 of its first 10 listings. Is its sale rate 30 percent, and how much would we believe that? The Bayesian answer is a distribution.

## Updating a Belief

Bayes’ rule, from [Conditional Probability and Bayes’ Rule](/data-ai/conditional-bayes), applied to a parameter θ is: posterior ∝ likelihood × prior. The prior states what we believed before the data. The likelihood says how well each value of θ explains the data. The posterior is their product, rescaled to sum to 1.

For a yes or no outcome with unknown rate θ, a convenient prior is the **Beta distribution**, Beta(a, b), which lives on 0 to 1 and can be read as having already seen a successes and b failures. When k out of n listings sell, the posterior is again a Beta distribution, Beta(a + k, b + n − k). The update is just adding the counts, which makes this the standard worked example.

## What the Data and the Prior Each Contribute

We used two priors. A **flat** prior, Beta(1, 1), says every rate from 0 to 1 is equally plausible. A **skeptical** prior, Beta(20, 80), says that similar features have sold about 20 percent of the time, and that the belief is worth about 100 listings. We observed the same data with each, with a true rate of 30 percent:

| Listings Sold of Observed | Maximum Likelihood | Flat Prior: Mean, 95% Interval | Skeptical Prior: Mean, 95% Interval |
| --- | --- | --- | --- |
| 0 of 5 | 0.000 | 0.143, 0.004 to 0.458 | 0.190, 0.122 to 0.270 |
| 3 of 10 | 0.300 | 0.333, 0.109 to 0.609 | 0.209, 0.139 to 0.289 |
| 30 of 100 | 0.300 | 0.304, 0.219 to 0.397 | 0.250, 0.193 to 0.313 |
| 300 of 1,000 | 0.300 | 0.300, 0.272 to 0.329 | 0.291, 0.265 to 0.318 |

Four things show. With 0 of 5, the maximum likelihood estimate is 0, an impossible sale rate, and the Bayesian posteriors give sensible nonzero ranges. With flat priors the posterior follows the data and is wide when data is scarce, from 0.109 to 0.609 at n = 10. The skeptical prior pulls estimates toward 20 percent: after 30 of 100 it says 0.250 and the data alone says 0.300. And as data grows, the two posteriors converge: at 1,000 they are 0.300 and 0.291, with similar intervals. Enough data overrules a reasonable prior.

## Credible Intervals

A 95 percent **credible interval** is a range that contains the parameter with posterior probability 95 percent, given the model and the prior. Unlike the confidence interval of [Estimation and Confidence Intervals](/data-ai/confidence-intervals), it can be read as "there is a 95 percent chance the rate is in this range". That is a statement about belief, and it is as good as the prior and the model. For large samples with weak priors, credible and confidence intervals are numerically close.

## Choosing a Prior

- **Weakly informative**: a broad prior that rules out only absurd values, such as a sale rate of 99 percent, a safe default
- **Informative**: built from earlier data, as the skeptical prior was, and justified when the history is relevant
- **Sensitivity**: rerun with different priors, as the table does, and if the conclusion changes, say that the data is not strong enough to settle it

Priors are visible assumptions. Critics call them subjective, and defenders note that every method has assumptions, including the choice of likelihood and of the test, and that the Bayesian ones are stated in the open.

## Where This Appears in Machine Learning

- **Regularization**: a Gaussian prior on a model's weights gives an L2 penalty, and a Laplace prior gives L1, so the penalty of [Regularization with L1 and L2](/data-ai/regularization) is a prior and the fit is the posterior's most probable point
- **Naive Bayes and spam filters** use Bayes’ rule directly, as in [Naive Bayes](/data-ai/naive-bayes)
- **A/B tests**: a posterior over the lift gives "the probability that B is better", which many teams find easier to act on than a p-value
- **Bandits**: Thompson sampling in [Adaptive Experiments and Bandits](/data-ai/bandits) draws from the posterior to decide what to try next
- **Uncertainty in predictions**: posterior distributions over parameters give predictions with ranges

For models without a clean formula, the posterior is approximated by sampling, with methods such as Markov chain Monte Carlo, which this roadmap does not cover in depth.

## Key Points

- Bayesian inference multiplies a prior by the likelihood of the data to get a posterior distribution over the unknown
- For a rate, a Beta prior updates by adding counts: Beta(a, b) becomes Beta(a + k, b + n − k)
- Scarce data gives a wide posterior, and a skeptical prior pulled 30 of 100 sold to 0.250: with 1,000 listings the priors agreed within 0.01
- A credible interval can be read as a probability about the parameter, given the prior and the model
- <u>The prior matters most with little data, so test how sensitive the answer is to it</u>
