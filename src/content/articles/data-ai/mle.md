> **Maximum likelihood estimation** picks the parameter values under which the observed data was most probable. It turns "fit a model" into "maximize a function of the parameters", gives the sample mean for a Gaussian mean and the observed rate for a Poisson, and shows that squared error and cross-entropy are not arbitrary but come from assumptions about how data is generated.

A model with a distribution in it, a Poisson for daily sales or a Gaussian for noise, has parameters to choose. Maximum likelihood is the standard rule for choosing them, and the same rule is hiding behind most loss functions in this roadmap.

## The Likelihood

Given data x₁, …, xₙ and a model with a parameter θ, the **likelihood** L(θ) is the probability of the observed data as a function of θ, and for independent observations it is a product: L(θ) = ∏ p(xᵢ | θ). The **maximum likelihood estimate** is the θ that makes L largest. Products of many small numbers underflow, so we maximize the **log-likelihood**, a sum, which has the same maximizer, the trick of [Floating Point and Numerical Stability](/data-ai/floating-point).

The likelihood is not the probability of the parameter. It varies the parameter with the data fixed, and it need not add to 1 over θ. That reversal is what [Bayesian Inference](/data-ai/bayesian-inference) addresses.

## A Rate From 30 Days

Daily copies sold follow a Poisson distribution with some rate λ, as [Random Variables and Distributions](/data-ai/random-variables) showed. In 30 days, the average number sold was 2.50. We computed the log-likelihood of the 30 observed counts for several values of λ:

| Rate λ | Log-Likelihood |
| --- | --- |
| 2.0 | −53.18 |
| 2.5, the sample mean | −51.44 |
| 3.5 | −56.20 |
| 4.0 | −61.19 |

The curve peaks at 2.5, exactly the sample mean. For a Poisson, calculus gives the same answer in one line: set the derivative of the log-likelihood to zero and λ̂ is the average of the data. For the Gaussian, the maximum likelihood mean is the sample mean, and for a coin, the maximum likelihood probability is the observed share of heads. Much of what we do by habit is maximum likelihood.

## Loss Functions Are Likelihoods

The link to losses is direct. Maximizing the log-likelihood is the same as minimizing its negative, and for common models the negative log-likelihood is a familiar loss:

| Assumed Distribution of the Outcome | Negative Log-Likelihood Is |
| --- | --- |
| Gaussian noise with fixed variance | Squared error |
| Laplace noise | Absolute error |
| Bernoulli, yes or no | Cross-entropy, or log loss |
| Categorical, one of several | Cross-entropy with a softmax |
| Poisson counts | The Poisson loss |

So least squares is the right fit if the errors are Gaussian and independent, and cross-entropy is the right fit for labels. Choosing a loss is a modeling statement about the data, and [From Likelihood to Loss Functions](/data-ai/mle-losses) takes this further. In [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl) the same quantity appeared as the cost of coding with a wrong model.

## Properties and Caveats

For a large sample and a well specified model, the maximum likelihood estimate is **consistent**, converging on the truth, and nearly the most precise possible. For small samples it has faults.

**It can be biased.** For a Gaussian, the maximum likelihood estimate of the variance divides by n, and that underestimates. We drew many samples from a distribution with variance 4 and averaged the estimates:

| Sample Size | Maximum Likelihood Variance, Dividing by n | Unbiased, Dividing by n − 1 |
| --- | --- | --- |
| 5 | 3.22 | 4.03 |
| 10 | 3.60 | 4.00 |
| 30 | 3.87 | 4.00 |
| True value | 4 | 4 |

At n = 5 the maximum likelihood estimate averaged 3.22, 20 percent too low, and the bias fades as n grows. The usual n − 1 formula corrects it. Bias matters less when the sample is large, and a good estimator can trade a little bias for less variance, which is the idea of [Regularization with L1 and L2](/data-ai/regularization).

**It can overfit.** With 0 sales out of 10 listings, the maximum likelihood probability of a sale is 0, and the model then calls a sale impossible. A model with many parameters fits the noise. A prior, or a penalty, supplies sensible caution.

**It needs the right model.** Maximum likelihood finds the best parameters within the assumed family, even a poor one, and says nothing about whether the family fits.

## Finding the Maximum

For simple models there is a formula. For most, there isn't, and the log-likelihood is maximized numerically, with the gradient methods of [Gradient Descent](/data-ai/gradient-descent). Training a logistic regression or a neural network is maximum likelihood estimation by gradient descent, usually with the sign flipped to a loss.

## Key Points

- The likelihood is the probability of the observed data as a function of the parameters, and maximum likelihood picks the parameters that make the data most probable
- For a Poisson rate the maximum is the sample mean: the log-likelihood peaked at 2.5 for 30 days averaging 2.50
- Squared error comes from Gaussian noise and cross-entropy from Bernoulli and categorical outcomes, so a loss states an assumption about the data
- It can be biased in small samples: dividing by n gave a variance of 3.22 at n = 5 against a true 4
- <u>Choosing a loss is choosing a model of the noise</u>
