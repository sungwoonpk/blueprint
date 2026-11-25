> **Softmax** turns a vector of scores, one per class, into probabilities that are positive and sum to 1, by exponentiating each score and dividing by the total. Softmax regression, also called multinomial logistic regression, uses one weight vector per class and is trained with cross-entropy. The same layer ends nearly every neural network that classifies among many options.

[Logistic Regression](/data-ai/logistic-regression) answers yes or no. Many questions have more than two answers. The textbook app might predict how quickly a listing sells: within a week, within two weeks, within a month, or not at all.

## The Function

Given scores z₁, …, z_K, one per class, softmax gives class k the probability

pₖ = eᶻᵏ / (e^z₁ + … + e^z_K)

Exponentiating makes every probability positive, and dividing by the sum makes them add to 1. Larger scores get more probability, and the biggest score wins most of it. For two classes it reduces to the sigmoid of logistic regression, so softmax regression is a generalization, with one weight vector w_k per class. The prediction is the class with the highest score, and the probabilities say how confident the model is.

## A Four-Class Example

We simulated a listing's selling time as one of four classes and trained softmax regression on 3,000 listings with the usual features, using the loss that matches this setup, the cross-entropy of [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl). The class shares in the training data were:

| Class | Share of Listings |
| --- | --- |
| Sold within 7 days | 8.4% |
| 8 to 14 days | 15.2% |
| 15 to 30 days | 27.4% |
| Not sold | 49.0% |

On 5,000 unseen listings, the model's accuracy was 58.6 percent, against 47.5 percent for always predicting the most common class. Its log loss was 0.923, against 1.213 for a model that only knows the class shares. Log loss is the sharper measure here, because it rewards getting the probabilities right and not only the winning class.

For one listing the model produced scores of −0.71, 0.00, 0.67 and 0.04, and so probabilities of 0.11, 0.22, 0.44 and 0.23. The model's top choice, 15 to 30 days, has a probability of only 44 percent. The other 56 percent is spread across the other classes, which is what an honest answer looks like when selling time is uncertain.

## Temperature

Dividing the scores by a **temperature** T before the softmax changes how peaked the distribution is, without changing the order:

| Temperature | Probabilities for the Example Listing |
| --- | --- |
| 0.5 | 0.04, 0.16, 0.62, 0.18 |
| 1 | 0.11, 0.22, 0.44, 0.23 |
| 2 | 0.17, 0.24, 0.34, 0.25 |
| 5 | 0.22, 0.25, 0.28, 0.25 |

Low temperature sharpens toward the top class, and a high one flattens toward equal shares. Temperature is used to adjust a model's confidence after training, as in [Calibrating Probabilities](/data-ai/calibration), and to control randomness when generating text, as in [Decoding and Sampling](/data-ai/decoding).

## Numerical Stability

The formula as written breaks for large scores. With scores of 1000, 1001 and 1002, computing e¹⁰⁰⁰ overflows floating point and the program fails.

The fix is to subtract the largest score from all scores first, which changes nothing mathematically and keeps the exponents at 0 or below. With it, the same scores give probabilities of 0.09, 0.24 and 0.67. Libraries compute the loss together with the softmax, in the log-sum-exp form, for the same reason. [Floating Point and Numerical Stability](/data-ai/floating-point) explains why this matters.

## Training

The gradient of the cross-entropy loss for class k is the predicted probability minus the actual one, times the features: (pₖ − yₖ)·x, where y is 1 for the true class and 0 otherwise. The same simple form as for linear and logistic regression is no accident, and [Generalized Linear Models](/data-ai/glm) explains why. Use [Gradient Descent](/data-ai/gradient-descent) on standardized features, with regularization if features are many.

## Choices That Matter

- **Mutually exclusive classes**: softmax assumes each example has exactly one label. If an item can have several labels at once, such as a book that is both a textbook and a workbook, use an independent sigmoid for each label instead
- **Ordered classes**: selling time has an order that plain softmax ignores. Ordinal methods use it, and with few classes plain softmax usually does fine
- **Many classes**: with thousands, as in language models over a vocabulary, the sum over all classes is expensive, and approximations exist
- **Class imbalance**: rare classes need attention, see [Imbalanced Data](/data-ai/imbalanced-data)

## Where Softmax Appears Later

The output layer of an image classifier, a language model predicting the next token, and the attention weights of a transformer in [Self-Attention](/data-ai/self-attention) are all softmaxes. Once the idea is clear here, it appears everywhere.

## Key Points

- Softmax converts scores into positive probabilities that sum to 1, and softmax regression gives each class its own weights
- Trained with cross-entropy, our four-class model had 58.6 percent accuracy against 47.5 percent for the majority class, and a log loss of 0.923 against 1.213
- Temperature sharpens or flattens the probabilities without changing the ranking
- Subtract the largest score before exponentiating, since e¹⁰⁰⁰ overflows
- <u>Use softmax for one label out of many and independent sigmoids when labels can overlap</u>
