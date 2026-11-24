> A **norm** assigns a length to a vector, and a **distance** is the norm of a difference. Machine learning uses them to measure error, to find similar examples and to keep weights small, and the choice of norm and the scale of the features decide what "close" means.

A student looks at one listing and asks for similar ones. The app has to decide which listings are close, and the answer depends on how closeness is measured. This page covers the common measures and two ways they mislead.

## Lengths of a Vector

The **L2 norm**, or Euclidean length, is the square root of the sum of squares. The **L1 norm** is the sum of absolute values, and the **L∞ norm** is the largest absolute value. For listings A = [120, 3, 3, 0] and B = [80, 1, 4, 0] in price, age, condition and edition, the difference is [40, 2, −1, 0]:

| Norm of the Difference | Value | What It Counts |
| --- | --- | --- |
| L1 | 43 | The total gap, feature by feature |
| L2 | 40.06 | The straight line distance |
| L∞ | 40 | The largest single gap |

All three say the listings differ mostly in price. They agree here, and they disagree on the weighting of many small gaps against one large gap: L1 treats them alike, L2 gives the large gap more weight, and L∞ looks only at the largest. In machine learning the same choice shows up in losses.

The squared L2 norm of the errors is the least squares loss, and the L1 norm of the errors, as in [Measuring Regression Error](/data-ai/regression-metrics), punishes a big miss less. Applied to the weights, L2 shrinks them evenly and L1 pushes some to zero, the subject of [Regularization with L1 and L2](/data-ai/regularization).

## Similarity as an Angle

The **cosine similarity** of two vectors is their dot product divided by the product of their lengths, the cosine of the angle between them. It ignores length. A and B have a cosine similarity of 0.9996 because both are dominated by the price direction.

For texts and embeddings, direction carries the meaning and length is noise, which is why [Semantic Search with Embeddings](/system-design/embeddings) ranks by cosine. When vectors have length 1 the dot product equals the cosine, and the L2 distance is a function of it, so the two rankings agree.

## Scale Decides Everything

Features are in different units, and a distance adds them up as if they were not. Over 500 simulated listings, we measured the share of the squared distance to a query that came from each feature: 99.6 percent from the price, 0.29 percent from the age and 0.09 percent from the condition. The age and condition, which also matter for the price, hardly counted.

The standard fix is to rescale each feature before measuring, for example by its standard deviation, which [Scaling and Normalizing Features](/data-ai/scaling) covers. With rescaled features, the standard deviations of price, age and condition were 40.81, 1.99 and 1.12, and each contributes in proportion to how much it varies. Methods that rely on distance, such as [k-Nearest Neighbors](/data-ai/knn) and [k-Means Clustering](/data-ai/kmeans), are only as good as this step.

## Distances in Many Dimensions

Intuition from two or three dimensions fails in a thousand. We drew 200 random points in a unit cube and compared the farthest point from a random query with the nearest, as a ratio:

| Dimensions | Farthest Divided by Nearest |
| --- | --- |
| 2 | 27.6 |
| 10 | 2.34 |
| 100 | 1.39 |
| 1,000 | 1.09 |

In two dimensions the farthest point is 28 times as far as the nearest. In a thousand dimensions it is only 9 percent farther, so "nearest" is barely different from "any".

This is the **concentration of distances**, and it is why raw distance in high dimensions needs care. Real data lies on lower dimensional shapes, which is how [Embeddings](/data-ai/embeddings) and [Principal Component Analysis](/data-ai/pca) get useful neighbors, and the effect is a warning against distance on many unscaled, uninformative features.

## Key Points

- A norm is the length of a vector: L1 sums absolute values, L2 is the straight line, L∞ is the largest gap, and each corresponds to a loss or a penalty used later
- Cosine similarity compares direction and ignores length, which suits embeddings
- Scale decides what close means: in our listings, 99.6 percent of the squared distance came from the price until the features were rescaled
- Distances concentrate in many dimensions: the farthest point was 27.6 times the nearest in 2 dimensions and 1.09 times in 1,000
- <u>Rescale the features, and don't trust raw distance in high dimensions</u>
