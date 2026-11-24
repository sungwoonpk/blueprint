> The **multivariate Gaussian** is the bell curve in many dimensions. It is fully described by a mean vector and a **covariance matrix**, its contours are ellipses along the eigenvectors of that matrix, and the **Mahalanobis distance** measures how far a point is from the center in units of the data's own spread, which makes it the right yardstick for outliers.

[Common Distributions](/data-ai/common-distributions) showed why the Gaussian is everywhere in one dimension. Features come in groups that move together, and the many dimensional version describes the whole group. It is the base of anomaly detection, Gaussian mixtures and much of probabilistic modeling.

## The Density

For a vector x of d numbers, the density is

p(x) = 1 / ((2π)^(d/2) |Σ|^(1/2)) × exp(−½ (x − μ)ᵀ Σ⁻¹ (x − μ))

The mean μ is the center and the covariance matrix Σ, from [Expectation, Variance and Covariance](/data-ai/expectation-variance), sets the shape. The exponent measures squared distance from the center with a twist: the inverse covariance Σ⁻¹ stretches distances so that directions with much spread count for less. Its contours, the sets of points with equal density, are ellipses in two dimensions and ellipsoids in more. The axes of the ellipse follow the eigenvectors of Σ, and their lengths follow the square roots of its eigenvalues, the picture from [Eigenvalues and Eigenvectors](/data-ai/eigen).

## Two Prices That Move Together

We drew 50,000 points of two quantities, a list price with a mean of $50 and a standard deviation of $40, and a sold price with a mean of $28 and a standard deviation of $15, with a correlation of 0.9. The estimated parameters from the sample were:

| Parameter | Value |
| --- | --- |
| Mean | ($50.08, $28.06) |
| Variance of List Price | 1,604.4 |
| Covariance | 539.2 |
| Variance of Sold Price | 223.5 |
| Correlation | 0.901 |

The data lies along a diagonal band, since a high list price comes with a high sold price. A point far out along the band is ordinary. A point off the band, a high list price with a low sold price, is odd even if it isn't far from the center.

## The Right Kind of Distance

The **Mahalanobis distance** is the square root of that exponent: D = √((x − μ)ᵀ Σ⁻¹ (x − μ)). It is the distance from the mean in units of the data's spread in each direction, and it takes the correlation into account. We compared it with the ordinary Euclidean distance for two points:

| Point | Euclidean Distance | Mahalanobis Distance |
| --- | --- | --- |
| Along the band: ($110, $55) | 65.8 | 1.83 |
| Against the band: ($80, $16) | 32.3 | 3.48 |

By Euclidean distance the first point is twice as far, and by Mahalanobis distance it is the ordinary one: a list price of $110 with a sold price of $55 is exactly what the pattern predicts. The second point is only half as far from the center, and it breaks the pattern. In two dimensions, 95 percent of a Gaussian lies within a Mahalanobis distance of 2.447, and in our sample 94.96 percent did, so the distance has a probability meaning that Euclidean distance lacks.

## Outliers by Mahalanobis

We injected 200 points that went against the band but sat close to the center. Their median Euclidean distance was 22.7, smaller than the 29.3 of the normal points, so a distance cutoff cannot see them. Their median Mahalanobis distance was 3.24, against 1.18 for the normal points. At a threshold that flags the top 5 percent of normal data, Euclidean distance missed all 200, 100 percent, and Mahalanobis distance missed 27 percent.

This is a simple **anomaly detector**: fit a Gaussian to normal data and flag points with a large Mahalanobis distance, the idea behind part of [Anomaly Detection](/data-ai/anomaly-detection). It assumes the data is roughly Gaussian and one cluster, which real data often isn't, and the answer is the next step.

## Building Blocks

- **Mixtures**: several Gaussians added together describe data with clusters, fit by [Gaussian Mixtures and the EM Algorithm](/data-ai/gmm-em)
- **Linear models with Gaussian noise**: least squares is the maximum likelihood fit when the errors are independent and Gaussian
- **Marginals and conditionals stay Gaussian**: the marginal of one variable and the conditional of one given another are Gaussian, which makes Bayesian updating tractable
- **Whitening**: multiplying by Σ^(−1/2) turns correlated data into uncorrelated data with unit variance, a step in [Principal Component Analysis](/data-ai/pca)

The number of parameters grows with the square of the dimension: a covariance matrix has d(d + 1)/2 distinct entries. For d = 1,000 features that is about 500,000, and estimating it needs far more than 1,000 examples. Small samples give a covariance matrix that can't be inverted, and a common fix is to shrink it toward a simpler matrix.

## Key Points

- The multivariate Gaussian has a mean vector and a covariance matrix, with elliptical contours along the eigenvectors of the covariance
- The Mahalanobis distance measures distance in units of the data's own spread and accounts for correlation
- On two correlated prices, a point along the band had a Euclidean distance of 65.8 and a Mahalanobis distance of 1.83, and a point against it had 32.3 and 3.48
- Injected outliers against the band were invisible to Euclidean distance, which missed 100 percent of them, and Mahalanobis distance missed 27 percent
- <u>Measure outliers against the data's own shape</u>, and watch the d(d + 1)/2 parameters of the covariance as the dimension grows
