> A **Gaussian mixture model** describes data as coming from several bell-shaped groups, each with its own center, spread and weight, and gives every point a probability of belonging to each. The **EM algorithm** fits it by alternating between guessing those memberships and re-estimating each group from them. It is a soft, probabilistic version of k-means that can handle groups of different size and shape.

[k-Means Clustering](/data-ai/kmeans) gives each point to exactly one cluster, and assumes clusters are round and equal. A mixture model relaxes both. It is also our first example of a generative model of the kind in [Generative and Discriminative Models](/data-ai/generative-discriminative): a story for how the data was produced.

## The Model

A mixture of K Gaussians says each seller is drawn like this: first pick a group k with probability πₖ, the **weight**, then draw the features from a Gaussian with mean μₖ and covariance Σₖ, as in [The Multivariate Gaussian](/data-ai/multivariate-gaussian).

The density of a point is the weighted sum of the K Gaussian densities. If we knew each seller's group, fitting would be easy: take means and covariances within each group. We don't, so the group is a **latent variable**.

## EM, Step by Step

The expectation-maximization algorithm, in the form presented in Stanford’s CS229 notes, alternates:

- **E step**: for each point, compute the **responsibility** of each group, the probability that the point came from it given the current parameters, by Bayes’ rule from [Conditional Probability and Bayes’ Rule](/data-ai/conditional-bayes)
- **M step**: re-estimate each group's weight, mean and covariance, weighting every point by its responsibility

Repeat until the log-likelihood stops improving. Each full round never decreases the likelihood of the data, a fact CS229 proves with Jensen’s inequality. It converges to a local maximum, so as with k-means we restart from several starting points, often from a k-means solution.

K-means is the limiting case: if all covariances are equal, round and tiny and every responsibility is made 0 or 1, EM becomes k-means.

## Fitting the Seller Segments

On the 1,200 simulated sellers with four true groups, our EM implementation with full covariances behaved as expected. The log-likelihood in the first iterations rose from −1571.9 to −1559.2, −1559.0, and settled at −1558.9, never decreasing.

The recovered group weights were 0.352, 0.283, 0.205 and 0.160, against true weights of 0.35, 0.30, 0.20 and 0.15. The assignment of each seller to its most probable group agreed with the true groups at an ARI of 0.99. Only 1.1 percent of sellers had a top responsibility below 0.9: the groups here are well apart.

## Choosing the Number of Groups

The likelihood always increases with K, as inertia does for k-means. A **penalized** score works instead: the **BIC**, which subtracts a charge for each parameter, 2 times the negative log-likelihood plus the number of parameters times ln n. Lower is better:

| Components K | Log-Likelihood | BIC |
| --- | --- | --- |
| 1 | −3,396.3 | 6,828.0 |
| 2 | −2,348.3 | 4,774.7 |
| 3 | −2,146.2 | 4,412.9 |
| 4 | −1,558.9 | **3,280.9** |
| 5 | −1,555.0 | 3,315.6 |
| 6 | −1,548.7 | 3,345.6 |
| 7 | −1,545.6 | 3,381.9 |

The log-likelihood jumps by 587 from K = 3 to 4 and then by only 4 for the fifth component, which the BIC penalty doesn't repay, so the minimum is at K = 4, the true number. Because the mixture is a probability model, it can be compared by likelihood, which k-means can't.

## Overlapping Groups

The benefits show when groups overlap and differ in spread. We drew 1,000 points from two groups: a wide one with 70 percent of the points and a narrower one centered 1.6 units away. Agreement with the true groups:

| Method | ARI |
| --- | --- |
| k-means | 0.235 |
| Gaussian mixture | 0.543 |

K-means cut the plane halfway between its two centers and ignored that one group is wider, mislabeling the wide group's edge.

The mixture accounted for the spreads and the weights, found centers near the true ones, and was more than twice as close to the truth.

27 percent of the points had a top responsibility below 0.8. That is the model reporting honest uncertainty, as the best possible assignment is imperfect when the groups overlap, and the soft memberships carry that information into later steps, for example a seller who is 60 percent regular and 40 percent high volume.

## Pitfalls

- **Singularities**: a component can collapse onto one point, with variance near zero and likelihood going to infinity. Add a small floor to the covariance, which we did, or regularize
- **Local maxima**: use several initializations
- **Wrong shape**: if groups are not roughly Gaussian, such as the crescents of [Hierarchical and Density-Based Clustering](/data-ai/clustering-more), components are spent covering a curved shape
- **Many dimensions**: full covariance matrices have many parameters. Use diagonal or shared covariances
- **Missing data**: EM extends to it naturally

## Beyond Clustering

EM is a general recipe for models with hidden variables: hidden Markov models in [Hidden Markov Models](/data-ai/hmms), topic models and semi-supervised learning with few labels and many unlabeled examples. The latent-variable idea comes back in [Variational Autoencoders](/data-ai/vaes) with the same E-and-M logic made approximate.

## Key Points

- A Gaussian mixture is a weighted sum of Gaussians, with memberships as latent variables, and EM alternates responsibilities and re-estimates
- Each EM round never lowers the likelihood: ours rose from −1571.9 to −1558.9 and stopped
- BIC picked four components on four-group data, where the likelihood gain for a fifth was 4
- On two overlapping groups of different spread the mixture reached an ARI of 0.54 against 0.24 for k-means, and reported ambiguity for 27 percent of points
- <u>Use a mixture when groups differ in size and spread or when you need memberships as probabilities</u>
