> **Principal component analysis** finds the directions along which the data varies most and re-expresses each point by its position along the first few of them. It is an eigendecomposition of the covariance matrix, and keeping the leading components compresses correlated features into a few uncorrelated ones with little loss. Standardize first, or the largest-unit feature wins.

Features often overlap. A book's page count, weight, thickness and number of chapters all mostly measure one thing, how big the book is. Using all four adds noise and redundancy, as [Interpreting Linear Regression](/data-ai/interpreting-regression) showed for correlated features. PCA discovers such overlaps and replaces them with a few combined features.

## The Idea

Center the data and look at its covariance matrix, from [Expectation, Variance and Covariance](/data-ai/expectation-variance). The **principal components** are its eigenvectors, as in [Eigenvalues and Eigenvectors](/data-ai/eigen), ordered by eigenvalue.

The first points along the direction of greatest variance, the second along the greatest variance at right angles to the first, and so on. Each eigenvalue is the variance along its component. The new coordinates, the **scores**, are projections of the data onto these directions, and dropping the weak components gives a lower-dimensional approximation.

The same result comes from the [Singular Value Decomposition](/data-ai/svd) of the centered data, which is how libraries compute it. Stanford’s CS229 notes derive it as the projection that keeps the most variance.

## An Example With Redundant Columns

We simulated 3,000 listings with eight standardized features: list price, pages, weight, number of chapters, thickness, age, condition and new edition. The first five all track the size of the book, and the last three are unrelated to size and to each other. We built the covariance matrix and decomposed it with our own eigenvalue routine:

| Component | Share of Variance | Cumulative |
| --- | --- | --- |
| 1 | 60.3% | 60.3% |
| 2 | 13.0% | 73.3% |
| 3 | 12.4% | 85.7% |
| 4 | 12.1% | 97.8% |
| 5 | 1.9% | 99.6% |
| 6 to 8 | 0.4% | 100% |

The five size features collapsed into one component: its loadings were 0.43 to 0.45 on all five, and about zero on age, condition and edition, so it means "size". Components 2 to 4 are each about 12 percent, since the three independent features each need a direction of their own, and one of them mixes age, condition and new edition.

After four components, 97.8 percent of the variance remains. This is the signature of redundancy: eight columns carry about four columns of information.

## What Is Lost

Reconstructing the standardized data from the first k components leaves an error:

| Components Kept | Share of Variance Lost |
| --- | --- |
| 1 | 39.7% |
| 2 | 26.7% |
| 3 | 14.3% |
| 4 | 2.2% |
| 6 | 0.2% |

How many to keep is a choice: enough for a chosen share of variance, 90 or 95 percent, or at the elbow of the variance plot, or whatever gives the best result in the downstream task, checked by cross-validation.

## PCA Is Unsupervised

PCA keeps variance, not relevance to a label. A direction with huge variance may say nothing about the target, and a small-variance direction may be the only one that matters. We fitted a linear price model on the principal components and on the original features, in a setup where the model is a plain linear fit (error in dollars on 1,000 listings):

| Features Used | Test MAE |
| --- | --- |
| All 8 original features | $6.56 |
| First 1 component | $17.67 |
| First 2 | $11.67 |
| First 3 | $9.46 |
| First 4 | $8.23 |
| First 6 | $6.55 |

Four components, 98 percent of the variance, still cost $1.67 of error, because the price depended on the low-variance directions of age, condition and edition. Six components matched the full set. Variance is not importance. [Selecting Features](/data-ai/feature-selection) uses the label, and methods that combine both exist.

## Scale First

PCA maximizes variance, so units decide.

On the raw listing features, the first component took 99.4 percent of the variance and was almost entirely the page count, with a loading of 0.99, since pages are numbers in the hundreds and the other columns are small. Standardizing, as in [Scaling and Normalizing Features](/data-ai/scaling), puts the features on an equal footing. When features are on the same natural scale, such as pixel intensities, skipping standardization may be right.

## Uses

- **Compression and denoising**: keep the main components, drop the rest
- **Decorrelating features** for a method that dislikes correlation
- **Visualization** in two dimensions, with the cautions of [Visualizing High-Dimensional Data](/data-ai/high-dim-visualization)
- **Speeding up** nearest-neighbor search and clustering in many dimensions
- **Whitening**: dividing each component by its spread, a common preprocessing step

## Limits

- It is **linear**: a curved structure, such as points on a spiral, needs nonlinear methods, such as autoencoders and the kernel methods of [The Kernel Trick](/data-ai/kernels)
- Components are mixtures of all the features, which makes them hard to name
- Outliers distort the variance directions
- Signs of components are arbitrary, and components with nearly equal eigenvalues are unstable

## Key Points

- PCA finds orthogonal directions of maximum variance, the eigenvectors of the covariance matrix
- Five size-related features collapsed into one component, and 4 of 8 components held 97.8 percent of the variance
- Variance is not relevance: 4 components cost $1.67 of error in a price model, and 6 matched all 8 features
- Unscaled, the page count took 99.4 percent of the first component
- <u>Standardize first, and choose the number of components by the downstream task</u>
