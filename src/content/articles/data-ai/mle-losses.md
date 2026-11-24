> Common loss functions are not arbitrary: each is the negative log-likelihood of a model of how the labels were generated. Squared error assumes Gaussian noise, absolute error assumes Laplace noise, and log loss assumes a yes or no outcome with a probability. Seeing this lets us pick a loss from what we believe about the data, and explains why one loss beats another on heavy-tailed data.

[Maximum Likelihood Estimation](/data-ai/mle) introduced the idea of choosing parameters that make the observed data most probable. This article applies it to the models of the chapter and shows that the losses we have been using fall out of it.

## From Likelihood to Loss

Suppose a model gives a probability distribution to each label: p(y | x, w). For independent examples, the likelihood is a product, and its logarithm is a sum. Maximizing the log-likelihood is the same as minimizing the **negative log-likelihood**, an average of −ln p(yᵢ | xᵢ, w). What we call the loss is that average, for a particular choice of distribution.

## Gaussian Noise Gives Squared Error

If the label equals the model's prediction plus Gaussian noise of fixed spread σ, then −ln p(y | x) is (y − w·x)² / (2σ²) plus a constant. Summed over examples, it is proportional to the sum of squared errors. So least squares is maximum likelihood under Gaussian noise. The constant and σ don't change where the minimum lies.

Check: we fitted one number, the price as a share of list price, on 2,000 sales. We maximized the Gaussian log-likelihood over a grid of rates, and separately minimized the sum of squared errors. Both gave **0.475**. They are the same objective.

## Laplace Noise Gives Absolute Error

If the noise follows a Laplace distribution, with a sharp peak and heavier tails, −ln p is proportional to |y − w·x|. So least absolute deviations is maximum likelihood under Laplace noise, and the optimum is a median. On the same sales, minimizing absolute error gave 0.466, slightly lower than the least-squares 0.475, as the mean and the median of the price ratios differ a little.

## Bernoulli Outcomes Give Log Loss

For a yes or no label with predicted probability p, the probability of the observed outcome is p if y = 1 and 1 − p if y = 0. 

Its negative log is the **log loss**, the loss of [Logistic Regression](/data-ai/logistic-regression).

We minimized it for the 14-day sales model. Nudging any weight by 2 percent from the fitted value raised the loss, by 0.01 to 0.09 in total over 3,000 listings, which confirms a minimum. A categorical outcome with a softmax gives the multiclass version, covered in [Multiclass Classification and Softmax](/data-ai/softmax), and a count with a Poisson distribution gives the Poisson loss of [Generalized Linear Models](/data-ai/glm).

| Assumed Distribution of the Label | Negative Log-Likelihood | Fitted Quantity |
| --- | --- | --- |
| Gaussian | Squared error | Mean |
| Laplace | Absolute error | Median |
| Bernoulli | Log loss | Probability |
| Categorical | Cross-entropy with softmax | Class probabilities |
| Poisson | Poisson deviance | Rate |

## When the Assumption Fails

The loss is only as good as the assumed noise. We simulated 300 repeats of a fit with 100 sales each, where the true rate was 0.5 and the noise came from two sources, and recorded the spread of the estimated rate. A smaller spread means a more reliable method:

| Noise | Least Squares | Absolute Error | Student-t Likelihood |
| --- | --- | --- | --- |
| Gaussian | 0.0035 | 0.0045 | 0.0038 |
| Heavy tails (t with 3 degrees of freedom) | 0.0063 | 0.0051 | 0.0044 |

With Gaussian noise least squares is best, as theory says, since it is the maximum likelihood method for that noise.

With heavy-tailed noise, where occasional huge errors occur, least squares is the worst, and the estimator that assumes heavy tails, the Student-t likelihood, has a spread 30 percent smaller than least squares. The data decides which model of noise is right, and a loss matched to it extracts more from the same rows. This connects to the sensitivity to outliers seen in [Loss Functions](/data-ai/loss-functions).

## Why It Matters

- **Choosing a loss** becomes modeling: what distribution does the label follow?
- **Regularization** is a prior on the weights, in the Bayesian reading of [Bayesian Inference](/data-ai/bayesian-inference)
- **Deep learning** inherits the same recipe: a network outputs the parameters of a distribution and training maximizes likelihood
- **Language models** minimize the cross-entropy of the next word, the same quantity as [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl)

When the noise is far from the assumption, the likelihood says what is lost, and sometimes a different distribution is a better start than a different algorithm.

## Key Points

- A loss is a negative log-likelihood: squared error for Gaussian noise, absolute error for Laplace, log loss for yes or no
- Maximizing the Gaussian likelihood and minimizing squared error both gave a rate of 0.475 on our sales
- Least squares is best under Gaussian noise and worst under heavy-tailed noise, where a t likelihood cut the spread of the estimate by about 30 percent
- Regularization and neural network training fit the same maximum likelihood recipe
- <u>Pick the loss by asking what distribution the label follows</u>
