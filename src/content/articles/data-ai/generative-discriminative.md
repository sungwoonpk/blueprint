> A **discriminative** model learns the probability of the label given the features, p(y | x), and goes straight to the decision. A **generative** model learns how the features arise within each class, p(x | y), and the class frequencies p(y), then uses Bayes’ rule to get p(y | x). Generative models can need less data and can create new examples, and discriminative ones usually win when there is plenty of data.

Two ways to build a spam filter show the split. One looks at labeled examples and learns which words push a message toward spam, with no opinion about how messages get written. The other learns what a typical spam message looks like and what a typical normal one looks like, and judges a new message by which description fits better.

## The Two Recipes

| | Discriminative | Generative |
| --- | --- | --- |
| Learns | p(y given x) | p(x given y) and p(y) |
| Decision rule | Compare p(y given x) across classes | Bayes’ rule: p(y given x) is proportional to p(x given y) times p(y) |
| Examples | Logistic regression, support vector machines, trees, neural networks | Naive Bayes, Gaussian discriminant analysis, Gaussian mixtures, language models |
| Can sample new data | No | Yes |
| Handles missing features | Awkwardly | Naturally, by summing them out |
| Assumes | Little about how x looks | A form for p(x given y), which may be wrong |

Bayes’ rule is from [Conditional Probability and Bayes’ Rule](/data-ai/conditional-bayes). Stanford’s CS229 notes introduce the contrast through Gaussian discriminant analysis, which models each class's features as a Gaussian with a shared covariance, and show that its posterior takes exactly the form of logistic regression.

So the two families can land on the same kind of decision boundary by different routes. The generative route makes a stronger assumption, and if it is right it extracts more from the same data.

## Which Wins With Little Data

In 2001, Ng and Jordan compared logistic regression with naive Bayes, a generative model, and reported that the generative model tends to reach its best error with fewer examples, while the discriminative model has the lower error given plenty of data. We tested the claim ourselves on two simulated problems.

First, 40 weak features, each shifted slightly by the class and independent of each other given the class, which is exactly the assumption naive Bayes makes. Test AUC by training size:

| Training Examples | Naive Bayes | Logistic, Light Penalty | Logistic, No Penalty |
| --- | --- | --- | --- |
| 20 | 0.664 | 0.738 | 0.712 |
| 40 | 0.739 | 0.774 | 0.735 |
| 100 | 0.825 | 0.810 | 0.762 |
| 300 | 0.879 | 0.878 | 0.876 |
| 1,000 | 0.899 | 0.898 | 0.898 |
| 3,000 | 0.905 | 0.904 | 0.904 |

Against logistic regression with no penalty, the generative model was far ahead at 100 examples, 0.825 against 0.762, because the unpenalized model must estimate 41 free weights from little data. By 300 examples the three are equal.

But a lightly regularized logistic regression was as good or better at every size, so the claim holds against a weak discriminative baseline and mostly vanishes against a regularized one. Regularization, from [Regularization with L1 and L2](/data-ai/regularization), does for the discriminative model what the strong assumption does for the generative one: it limits what the model can fit.

Second, the 14-day sales data, whose features aren't independent or Gaussian given the class:

| Training Examples | Gaussian Naive Bayes | Logistic Regression |
| --- | --- | --- |
| 10 | 0.571 | 0.628 |
| 100 | 0.706 | 0.729 |
| 1,000 | 0.744 | 0.751 |
| 5,000 | 0.749 | 0.754 |

Logistic regression led at every size, by about five points at 10 examples and half a point at 5,000, and both flattened toward similar ceilings. Here the generative assumptions were wrong, and the model paid for it from the start.

## Strengths of Generative Models

- **Few labels, many unlabeled examples**: a generative model can learn the class descriptions partly from unlabeled data, as in [Gaussian Mixtures and the EM Algorithm](/data-ai/gmm-em)
- **Missing features**: marginalize them out of p(x given y)
- **New classes and anomalies**: a model of p(x) can flag cases that are unlikely under every class, as in [Anomaly Detection](/data-ai/anomaly-detection)
- **Creating data**: sampling from p(x) is the basis of [Variational Autoencoders](/data-ai/vaes), [Generative Adversarial Networks](/data-ai/gans), diffusion and language models
- **Inspection**: the learned class descriptions can be examined

## Strengths of Discriminative Models

- **Accuracy with enough data**, since they spend their capacity on the decision boundary and not on modeling every feature
- **Fewer assumptions** about the shape of the features
- **Robust to correlated features**, where naive Bayes double counts, as [Naive Bayes](/data-ai/naive-bayes) shows
- **Simple to train** for most tasks

## Choosing

Use a discriminative model by default for prediction with labeled data. Reach for a generative one when labels are scarce and a reasonable model of the features exists, when features are often missing, or when the goal includes generating or detecting unusual data. Modern generative AI blurs the line, since large language models are generative models of text that are then adapted to follow instructions.

## Key Points

- Discriminative models learn p(y given x), and generative models learn p(x given y) and p(y), then apply Bayes’ rule
- Gaussian discriminant analysis gives a logistic regression form of posterior, so the two can share a boundary
- With 40 independent weak features, naive Bayes beat unpenalized logistic regression at 100 examples, 0.825 to 0.762, and a penalized logistic regression matched or beat it at every size
- On our sales data, with dependent features, logistic regression led at every size
- <u>Default to discriminative models, and use generative ones for scarce labels, missing features or generation</u>
