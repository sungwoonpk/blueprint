> A **random forest** trains many deep decision trees, each on a bootstrap sample of the rows and with only a random subset of features considered at each split, and averages their votes. Averaging cancels much of the variance of individual trees, and the random feature choice keeps the trees from all looking alike.

[Decision Trees](/data-ai/decision-trees) are accurate on training data and unstable. The fix has a simple logic: if many models make different mistakes, their average is better than any one of them.

## Bagging and the Forest

**Bagging**, short for bootstrap aggregating, trains each model on a resample of the training rows, drawn with replacement as in [Bootstrap and Resampling](/data-ai/bootstrap), and averages the predictions. Each tree sees about 63 percent of the distinct rows, and the rest, the **out-of-bag** rows, make a free test set for that tree.

Leo Breiman's 2001 paper on random forests adds the second ingredient: at each split, consider only a random subset of the features. His analysis shows that the generalization error of a forest depends on two things, the **strength** of the individual trees and the **correlation** between them. Lower correlation means more cancellation of errors when averaging. 

Random feature selection lowers the correlation, at a small cost in strength, and he reports error rates that compare favorably with AdaBoost and are more robust to noise. The error also converges as the number of trees grows, so adding trees doesn't cause overfitting.

## Variance Falls

For one test listing, we retrained 20 times on different bootstrap samples and recorded the prediction:

| Model | Spread of the Prediction Across 20 Retrainings (Standard Deviation) |
| --- | --- |
| One deep tree | 0.297 |
| Forest of 25 trees | 0.055 |

The forest's prediction moved less than a fifth as much. That is the whole mechanism: each tree is noisy and unbiased enough, and the average is steady.

## How Many Trees, How Many Features

On the 14-day sales task with 3,000 training listings and 5,000 test listings:

| Trees | Features Tried Per Split | Test AUC | Test Accuracy | Out-of-Bag AUC |
| --- | --- | --- | --- | --- |
| 1 | 6 of 6 | 0.639 | 72.9% | 0.560 |
| 10 | 3 | 0.724 | 77.9% | 0.685 |
| 50 | 3 | 0.743 | 79.2% | 0.725 |
| 200 | 3 | 0.745 | 79.3% | 0.735 |
| 200 | 6 | 0.737 | 79.1% | 0.725 |
| 200 | 1 | 0.754 | 78.9% | 0.748 |

A single tree scores 0.639, ten trees 0.724, and 50 trees 0.743, after which gains are tiny, the diminishing returns Breiman describes.

Considering fewer features at each split did better here: trying just one random feature gave 0.754. The trees became less alike, and with only six features, a full search at every split makes all trees pick the same strong feature first. With 50 or more trees, the out-of-bag AUC tracks the test AUC within about 0.01 to 0.02, so it works as a free estimate without a separate validation set.

For these data, logistic regression's 0.766 still edges out the forest. The forest is not magic: where the true relationship is a smooth additive one, a model built for that shape wins. Forests shine when relationships are irregular, with interactions and thresholds, and the features are many and mixed.

## Which Features Matter

Permutation importance shuffles one feature in the test data and measures how much the AUC drops:

| Feature | AUC Drop When Shuffled |
| --- | --- |
| Log of asking price over fair | 0.162 |
| Age | 0.043 |
| Condition | 0.018 |
| Photos | 0.017 |
| New edition | 0.013 |
| List price | 0.002 |

The price ratio dominates, and the order of the others is the same as in the logistic model's coefficients. Permutation importance is more trustworthy than the impurity-based importance that comes built in to many libraries, which favors features with many distinct values. With correlated features, importance gets split between them, as [Interpreting Linear Regression](/data-ai/interpreting-regression) warned for coefficients.

## Practical Notes

- **Defaults work**: a few hundred trees, deep trees, and about the square root of the number of features per split for classification
- **No scaling needed**, little tuning and few ways to overfit make it a strong first model for tables
- **Costs**: the model is large, predictions are slower than a linear model and the result is harder to explain than one tree
- **Extra Trees** pick split thresholds at random, adding more randomness
- **Limits**: forests can't extrapolate beyond the training range, and they average over the whole training set, so a shifted distribution hurts them like any model

## Key Points

- A random forest averages many deep trees trained on bootstrap samples with random feature subsets
- Breiman showed that error depends on tree strength and the correlation between trees, and that adding trees doesn't overfit
- The spread of one listing's prediction fell from 0.297 for a tree to 0.055 for a forest of 25
- On our data a forest reached an AUC of 0.745, below logistic regression's 0.766, since the relationship was smooth
- <u>Use out-of-bag scores for a free estimate and permutation importance for a trustworthy ranking of features</u>
