> **Cross-entropy** H(p, q) is the average number of bits needed to describe outcomes drawn from the true distribution p using a code built for a model q. **KL divergence** is the extra, the cross-entropy minus the entropy, and it measures how far the model q is from the truth p. Minimizing cross-entropy loss is how nearly every classifier is trained.

[Entropy and Information](/data-ai/entropy) assumed that the code was built for the true distribution. A model is always a guess at it. This page measures the price of the guess, and arrives at the loss function that [Logistic Regression](/data-ai/logistic-regression) and a transformer's training both use.

## Coding With the Wrong Model

The condition of a book follows the distribution p = [0.50, 0.25, 0.15, 0.10], with entropy 1.743 bits. Suppose a code is built from a model q that is different. The average length under the true p is the cross-entropy, H(p, q) = −Σ pᵢ log₂ qᵢ, and the excess is the KL divergence, D(p ‖ q) = H(p, q) − H(p). We computed both for several models:

| Model q | Cross-Entropy H(p, q) | KL Divergence D(p ‖ q) |
| --- | --- | --- |
| The truth, [0.50, 0.25, 0.15, 0.10] | 1.743 | 0 |
| Close, [0.45, 0.25, 0.18, 0.12] | 1.753 | 0.010 |
| Uniform, [0.25 each] | 2.000 | 0.257 |
| Wrong, [0.1, 0.1, 0.1, 0.7] | 3.041 | 1.299 |

A model that is close costs one hundredth of a bit more per symbol. A uniform model, which ignores everything about the condition, costs a quarter of a bit. A confident wrong model costs 1.3 bits, nearly twice what the truth needs. The KL divergence is never negative and is zero only when q equals p.

## It Is Not Symmetric

D(p ‖ q) and D(q ‖ p) differ. For the uniform model, one is 0.257 and the other 0.265, and for the wrong model 1.299 and 1.542. KL divergence is not a distance in the geometric sense, and the order matters: D(p ‖ q) penalizes a model for giving low probability to something that happens, since that makes −log q large.

It forgives a model for putting probability where nothing occurs, which is the opposite of the reversed order. Which order to use is a design choice in methods such as [Variational Autoencoders](/data-ai/vaes).

## From Cross-Entropy to a Loss

A classifier outputs a distribution q over the classes for each example, and the true label is a point mass, a distribution p with all its probability on one class. The cross-entropy then collapses to a single term: H(p, q) = −log q(true class). Averaged over a dataset, this is the **cross-entropy loss** or log loss.

We confirmed it with samples. Drawing 200,000 conditions from p, the average of −log₂ q(label) was 2.000 for the uniform model and 1.753 for the close one, matching the formula. The loss measured on data is an estimate of the cross-entropy with the unknown true distribution.

For a yes or no label with a true rate of 80 percent, we scored four constant predictions of the probability of yes:

| Predicted Probability of Yes | Average Log Loss in Bits |
| --- | --- |
| 0.80 | 0.723 |
| 0.90 | 0.788 |
| 0.99 | 1.344 |
| 0.50 | 1.000 |

The best score, 0.723, is at the true rate, and it equals the entropy of the label, 0.722, since the model is exactly right.

Overconfidence is punished hard: at 0.99 the loss almost doubles, because each of the 20 percent of cases that came out no costs −log₂ 0.01 = 6.64 bits. A single confident mistake contributes more loss than many modest errors, which is why log loss rewards calibration, the topic of [Calibrating Probabilities](/data-ai/calibration).

## Why Minimize It

Minimizing cross-entropy over the model's parameters is the same as minimizing KL divergence from the data distribution, since the entropy of the data is a constant the model can't change.

It is also the same as **maximum likelihood**: the likelihood of the data under the model is the product of the model's probabilities for the observed labels, and its negative log, averaged, is the cross-entropy. [From Likelihood to Loss Functions](/data-ai/mle-losses) builds this in full, and [Loss Functions](/data-ai/loss-functions) lists the cases.

The gradient is also well behaved. For a softmax output the gradient of the loss with respect to the raw scores is simply the predicted probabilities minus the true labels, which does not vanish when the model is confidently wrong, unlike squared error. That makes cross-entropy the default for classification.

Language models use exactly this loss, one next token at a time. **Perplexity**, defined in [Language Modeling and Perplexity](/data-ai/language-modeling), is 2 raised to the cross-entropy in bits, the effective number of equally likely choices the model is torn between.

## Key Points

- Cross-entropy is the average code length when using a model q for data from p, and KL divergence is the excess over the entropy
- KL is never negative, is zero only for a perfect model, and is not symmetric: for the uniform model the two orders gave 0.257 and 0.265
- A label is a point mass, so the loss collapses to −log of the probability given to the right class: our samples reproduced 2.000 and 1.753 bits
- Overconfidence is punished: predicting 0.99 for a 0.80 event raised the log loss from 0.723 to 1.344 bits
- <u>Minimizing cross-entropy is minimizing KL divergence from the data, and it equals maximum likelihood</u>
