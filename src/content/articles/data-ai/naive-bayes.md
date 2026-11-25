> **Naive Bayes** classifies by Bayes’ rule with one strong assumption: given the class, the features are independent. That turns the hard problem of modeling a joint distribution of many features into counting each feature separately. It trains in one pass over the data, works well for text, and gives probabilities that are too extreme when features are correlated.

Naive Bayes is the classic spam filter. It looks at which words appear and asks, for each word, how much more likely it is in a scam listing than in an honest one. The word evidence is multiplied together, which is why the word "naive" is used: words in a real listing are not independent.

## The Model

By Bayes’ rule, the probability of a class given the features is proportional to the class prior times the probability of the features within the class. With the naive assumption, the second factor is a product of one term per feature:

p(class | x) ∝ p(class) · p(x₁ | class) · p(x₂ | class) · … · p(x_d | class)

Each term is estimated by counting. For text, the **multinomial** version counts how often each word appears in each class, and the **Bernoulli** version counts whether it appears at all. For numeric features, the **Gaussian** version fits a mean and variance per class and feature. In practice we add log probabilities instead of multiplying small numbers, which keeps the arithmetic stable, as [Floating Point and Numerical Stability](/data-ai/floating-point) explains.

## A Count by Hand

Suppose 100 past listings, 20 of them scams, and we look at the word "wire". It appears in 8 of the 20 scam listings and in 4 of the 80 honest ones. A new listing contains "wire".

- Prior odds of a scam: 20 to 80, or 0.25
- Likelihood ratio for the word: (8 / 20) divided by (4 / 80) = 0.40 / 0.05 = 8
- Posterior odds: 0.25 × 8 = 2, which is a 67 percent probability of a scam

A second word, say "escrow", with its own ratio, multiplies the odds again. Ten words, each with a ratio of 2, multiply the odds by about 1,000. That is how naive Bayes accumulates evidence, and also how it overcounts: if "wire" and "transfer" nearly always come together, the model counts them as two independent clues.

## Smoothing

A word never seen in the scam training examples would have probability zero and, in a product, would force the score to zero whatever the other words say. **Laplace smoothing** adds a small count, usually 1, to every word in every class. We trained on a small sample of 30 listings, with 200 possible words, and varied the smoothing:

| Added Count | Test AUC | Log Loss |
| --- | --- | --- |
| 0.0001, almost none | 0.752 | 3.192 |
| 0.1 | 0.791 | 1.113 |
| 1.0 | 0.801 | 0.587 |

Smoothing improved both the ranking and, dramatically, the probabilities: the log loss fell from 3.19 to 0.59. It is the same idea as the Beta prior of [Bayesian Inference](/data-ai/bayesian-inference), a small amount of prior belief that protects against rare events.

## A Text Test

We simulated listings of 20 words from a vocabulary of 200, in which 30 words were four times as common in scams, and 20 percent of listings were scams. Trained on 1,000 listings and tested on 5,000:

| Model | Accuracy | AUC | Log Loss |
| --- | --- | --- | --- |
| Always say honest | 80.9% | 0.5 | |
| Naive Bayes | 93.2% | 0.961 | 0.183 |
| Logistic regression on word counts | 92.6% | 0.957 | 0.195 |

Naive Bayes was as good as logistic regression and trained in one counting pass. The independence assumption held here, since the simulated words are drawn independently, and real text is less kind. Even then, naive Bayes tends to do well on ranking.

## Overconfidence From Correlated Features

When features are copies of each other, naive Bayes counts the same evidence repeatedly. We repeated every word's evidence k times, as if each word appeared in k perfectly correlated copies:

| Copies of Each Feature | Accuracy | AUC | Log Loss | Average Confidence |
| --- | --- | --- | --- | --- |
| 1 | 93.2% | 0.961 | 0.183 | 93.9% |
| 2 | 92.5% | 0.961 | 0.252 | 96.6% |
| 5 | 91.6% | 0.961 | 0.570 | 98.5% |
| 10 | 91.0% | 0.961 | 0.988 | 99.2% |

The ranking, AUC 0.961, does not change at all, since duplicating a feature scales every score the same way. The model's confidence climbs to 99.2 percent while its accuracy falls to 91 percent. The decisions are fine and the probabilities are not, which is why naive Bayes scores are usually passed through [Calibrating Probabilities](/data-ai/calibration) before anyone uses them as probabilities.

## Where It Fits

- **Strong baseline for text**: spam, topics, sentiment, with a few lines of code
- **Very little data or very many features**, where its simplicity is protective
- **Streaming and incremental updates**: add counts as new labeled examples arrive
- **Not for** calibrated probabilities or tasks where feature interactions decide the answer

Naive Bayes is the classic generative model of [Generative and Discriminative Models](/data-ai/generative-discriminative), and a good example of a wrong assumption that still works for the job at hand.

## Key Points

- Naive Bayes multiplies the class prior by one likelihood per feature, assuming independence within a class
- A word that is 8 times likelier in scams multiplies the odds by 8, and by hand the posterior of 0.25 prior odds became 2
- Laplace smoothing is essential: the log loss on a small sample fell from 3.19 to 0.59
- Duplicating features left the AUC at 0.961 and pushed average confidence to 99.2 percent while accuracy fell to 91.0 percent
- <u>Trust the ranking, and calibrate the probabilities before using them</u>
