> **k-nearest neighbors** predicts for a new case by finding the k most similar training cases and averaging their labels, or taking a vote. There is no training step: the data is the model. It is a clear way to see the idea of similarity, and its quality depends entirely on the distance used, on k and on how many features dilute the distance.

Most models compress the training data into weights. k-nearest neighbors keeps all of it. To predict whether a listing will sell within 14 days, it finds the past listings most like this one and reports how many of them sold.

## The Method

1. Choose a distance, usually Euclidean after scaling, from [Norms, Distances and Similarity](/data-ai/norms-distances)
2. For a new case, compute its distance to every training case
3. Take the k closest
4. Predict the average label, or the majority class, optionally weighting closer cases more

No weights are fitted, so training is instant, and prediction does the work: it needs the whole training set in memory and a search at every query. Brute force costs time proportional to the number of examples. The scikit-learn documentation describes trees that speed up the search, and notes that they lose their advantage as the number of dimensions grows.

## Choosing k

k controls the flexibility, as the bias-variance tradeoff of [Bias and Variance](/data-ai/bias-variance) would suggest. We ran it on 3,000 simulated listings with five standardized features, testing on 1,000 unseen listings:

| k | Test AUC | Test Accuracy |
| --- | --- | --- |
| 1 | 0.574 | 70.2% |
| 5 | 0.634 | 75.1% |
| 15 | 0.692 | 76.7% |
| 50 | 0.730 | 77.3% |
| 150 | 0.739 | 77.4% |
| 400 | 0.738 | 76.6% |

With k = 1 the prediction copies the single nearest listing, which is a noisy label, so the model has low bias and high variance and its AUC is barely above chance.

Larger k averages out the noise, and the AUC rises to 0.74 around k = 150, then flattens as the neighborhoods become so wide that they stop being local. A sensible k is found on validation data. For comparison, logistic regression on the same data reached 0.766, and the true ranking of the simulation 0.77: when the real relationship is smooth and simple, a simple parametric model is hard to beat.

## Scaling Decides Everything

A distance adds up differences across features, so a feature measured in large units dominates. [Scaling and Normalizing Features](/data-ai/scaling) showed nearest neighbors on price data erring by $8.03 raw and $3.78 standardized. Choosing which features enter, and how much each counts, is the real modeling work in this method.

## The Curse of Dimensionality

As features are added, the nearest neighbor is no longer much nearer than the farthest. We drew 300 random points in a cube and compared the distance to the nearest with the distance to the farthest:

| Dimensions | Nearest Distance as a Share of the Farthest |
| --- | --- |
| 2 | 1.3% |
| 10 | 33% |
| 100 | 72% |
| 1,000 | 91% |

In two dimensions the closest point is much closer than the most distant one. In a thousand, everything is nearly the same distance away and "nearest" means little. Irrelevant features do the same damage on a smaller scale. We added columns of pure noise to the listing features:

| Noise Features Added | Test AUC at k = 15 |
| --- | --- |
| 0 | 0.692 |
| 5 | 0.669 |
| 20 | 0.617 |
| 50 | 0.622 |

Twenty useless columns cost eight points of AUC, since the noise now decides which listings count as similar. Methods that learn which features matter, such as trees and penalized linear models, avoid this. For nearest neighbors, select features first, or reduce dimension with [Principal Component Analysis](/data-ai/pca).

## Where It Fits

- **A baseline** that needs no training and is easy to explain: "your listing is like these ten"
- **Recommendation and retrieval**, where finding similar items is the product, using embeddings and approximate search, as in [Embeddings](/data-ai/embeddings)
- **Small data with a good distance**, such as a learned embedding
- **Not for** large data with strict latency, many features, or when the label depends on a few features among many

## Key Points

- k-nearest neighbors stores the training data and predicts from the k most similar cases
- Small k gives low bias and high variance: AUC was 0.574 at k = 1 and 0.739 at k = 150
- Scale the features first, since large units dominate the distance
- With 1,000 dimensions the nearest point is 91 percent as far as the farthest, and 20 noise features cost 8 AUC points
- <u>Choose k on validation data, and select or learn the features that define similarity</u>
