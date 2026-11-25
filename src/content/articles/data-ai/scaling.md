> **Scaling** puts numeric features on comparable ranges, usually by subtracting the mean and dividing by the standard deviation. Models that use distances, or that train by gradient descent with penalties, treat a column in thousands as more important than a column in single digits unless we intervene. Scaling is cheap, and the statistics must come from the training set only.

The price model's features come in very different sizes: a list price between $40 and $180, an age between 0 and 6, and a new-edition flag of 0 or 1. Some algorithms care about this and some don't.

## Who Needs Scaling

| Method | Scale-Sensitive? | Why |
| --- | --- | --- |
| k-nearest neighbors, k-means, kernel methods | Yes | They compare distances, and big columns dominate |
| Gradient descent training, as in [Gradient Descent](/data-ai/gradient-descent) | Yes | The loss surface becomes a narrow canyon |
| Penalties such as L1 and L2 | Yes | The penalty depends on the weight size, which depends on the feature unit |
| Neural networks | Yes | Optimization is unstable otherwise |
| Plain linear regression by the normal equations | No, for predictions | The fit is the same, only the weights' units change |
| Decision trees and forests | No | Splits depend on order, not size |

## Standardization and Min-Max

The two common methods:

- **Standardization**, or z-scoring: x′ = (x − mean) / standard deviation. The result has mean 0 and spread 1, and it keeps the shape of the distribution
- **Min-max scaling**: x′ = (x − min) / (max − min). The result lies between 0 and 1

Others: **robust scaling** uses the median and interquartile range, and a **log transform** compresses skewed quantities, such as prices that stretch over orders of magnitude. [Distributions and Their Shapes](/data-ai/distribution-shapes) explains when to take logs.

## Distances Need It

In our simulated sales the raw feature spreads are very different: standard deviations of 41.5 for list price, 2.0 for age, 1.1 for condition and 0.43 for new edition. For a nearest-neighbor model, the distance between two listings is then almost entirely the difference in list price, and the age and edition barely register. We predicted the price-to-list ratio of 500 unseen listings from their 10 nearest neighbors in the training data:

| Feature Scaling | Mean Error on Unseen Sales |
| --- | --- |
| None | $8.03 |
| Standardized | $3.78 |
| Min-max | $3.75 |

Scaling cut the error by more than half, since the neighbors found were now similar in age and edition too. Both methods worked equally well here. [k-Nearest Neighbors](/data-ai/knn) uses the same idea.

## Gradient Descent Needs It

[Gradient Descent](/data-ai/gradient-descent) showed the effect on training speed: with the price model's raw features the best learning rate we tried needed about 3,000 iterations, and with standardized features it needed 40. The safe range of learning rates also went from one narrow value to a wide window.

## Penalties Need It

A penalty on the size of the weights, as in [Regularization with L1 and L2](/data-ai/regularization), treats all weights alike. If one feature is measured in dollars and another in thousands of dollars, the second needs a weight a thousand times smaller to do the same job, and the penalty barely touches it. Standardizing makes the penalty treat the features fairly. Don't penalize the intercept.

## Outliers Break Min-Max

Min-max scaling uses the extremes, so one wild value distorts it. We added a single listing with a list price of $5,000, a typo, to the 3,000 sales. After min-max scaling, the ordinary listings' spread shrank from 0.296 to 0.008, and all of them were squeezed into a sliver near 0, with no room left to tell them apart.

Robust scaling, built from the median and the interquartile range, kept the ordinary listings' spread at 0.56 and sent the typo off to 66. Standardization is in between, since the standard deviation is also inflated by the outlier. Handle outliers first, as [Outliers and Noise](/data-ai/outliers) advises.

## Fit on Training Data Only

The mean and standard deviation are learned from data, and must be learned from the **training set**. Computing them on all the data lets information about the test rows seep into the model, a mild form of [Data Leakage](/data-ai/data-leakage). The procedure:

1. Split the data
2. Compute the scaling statistics on the training set
3. Apply those same numbers to the validation, test and live data

In production, the model must be served with the training statistics saved alongside the weights, or features arrive on a different scale and predictions silently break, a case of [Feature Stores and Training-Serving Skew](/data-ai/feature-stores). Pipelines in common libraries bundle scaling and model together to prevent this.

## Key Points

- Distance-based methods, gradient-trained models and penalized models need comparable feature scales, and trees do not
- Scaling cut nearest-neighbor error on our sales from $8.03 to about $3.78
- A single $5,000 typo squeezed min-max scaled list prices from a spread of 0.296 to 0.008, and robust scaling resisted it
- Compute scaling statistics on the training set only, and ship them with the model
- <u>Scale inside the training pipeline so the same numbers apply everywhere</u>
