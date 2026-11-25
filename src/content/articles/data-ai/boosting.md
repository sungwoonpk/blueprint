> **Boosting** builds a model as a sum of many small models, added one at a time, each trained to correct the errors of the sum so far. **Gradient boosting** does this by fitting each new tree to the gradient of the loss. With small steps and shallow trees it is one of the most accurate methods for tabular data, and it overfits if allowed to run too long.

Random forests average independent trees to reduce variance. Boosting goes the other way: it builds trees in sequence, and each one targets what the earlier ones got wrong, which reduces bias.

## The Idea

Start with a constant prediction, the average label. Then repeat:

1. Compute how the loss would change if each prediction moved: the **gradient** of the loss at each example. For squared error that is just the residual, the true value minus the prediction
2. Fit a small tree to those gradients, so that it learns which examples need pushing up or down
3. Add the tree to the model, multiplied by a small **learning rate**, also called shrinkage

The model is a sum of trees, F(x) = F₀ + η·tree₁(x) + η·tree₂(x) + …. This is gradient descent, as in [Gradient Descent](/data-ai/gradient-descent), carried out in the space of functions instead of weights. For classification the model's output is a log-odds, passed through the sigmoid as in [Logistic Regression](/data-ai/logistic-regression), and the loss is log loss. The older **AdaBoost** reweights examples that were misclassified, and is a special case of this view.

## XGBoost and Its Relatives

Chen and Guestrin's 2016 paper on XGBoost describes what made gradient boosting practical at scale: a regularized objective that penalizes the number of leaves and the size of leaf weights, a second-order approximation of the loss for choosing splits, shrinkage and column subsampling borrowed from earlier work and forests, a sparsity-aware algorithm for missing and zero values, and an engineered system for speed.

LightGBM and CatBoost make related choices. These libraries are the usual first tool for competitions and production models on tables.

## How Many Rounds

We boosted trees of depth 3 on the 3,000 simulated listings and tracked log loss, where lower is better. Logistic regression had a test log loss of 0.443:

| Rounds | Train Log Loss | Test Log Loss | Test AUC |
| --- | --- | --- | --- |
| 10 | 0.476 | 0.473 | 0.740 |
| 50 | 0.432 | 0.450 | 0.759 |
| 100 | 0.418 | 0.455 | 0.755 |
| 200 | 0.401 | 0.463 | 0.749 |
| 400 | 0.383 | 0.473 | 0.742 |
| 600 | 0.370 | 0.484 | 0.735 |

Training loss falls forever, and test loss bottoms out at 0.450 near 50 rounds, then rises as the trees fit noise. The number of rounds is a hyperparameter, chosen by validation loss with **early stopping**: stop when the validation loss hasn't improved for some rounds.

## Learning Rate and Tree Size

| Setting | Best Test Log Loss Seen | Behavior |
| --- | --- | --- |
| Depth 3, learning rate 0.1 | 0.450 at 50 rounds | Gentle rise afterward |
| Depth 3, learning rate 0.5 | 0.456 at 10 rounds | Overfits within a few dozen rounds, 0.537 by 300 |
| Depth 6, learning rate 0.1 | 0.459 at 20 rounds | Overfits fast, 0.522 by 200 |
| Depth 1 stumps, learning rate 0.1 | 0.444 at 400 rounds | Keeps improving, slowly |

Smaller steps and more rounds are safer, since each tree makes a small correction, and deeper trees overfit sooner because each tree can fit more noise.

The depth 1 stumps are the interesting case. Stumps, trees of one split, give an **additive** model, a sum of one-feature functions.

Our simulated data has exactly that structure, with the log-odds a sum of separate feature effects, and stump boosting reached a test log loss of 0.444 and an AUC of 0.766, matching logistic regression. A rule of thumb follows: tree depth sets how many features may interact, so use the smallest depth that captures the interactions you believe exist.

## Boosting Versus Forests

| | Random Forest | Gradient Boosting |
| --- | --- | --- |
| Trees | Independent, deep | Sequential, shallow |
| Reduces | Variance | Bias, and some variance |
| Tuning | Few parameters, forgiving | Learning rate, rounds, depth, regularization: sensitive |
| Noise | Robust | Can overfit noisy labels |
| Parallel training | Easy | Sequential across trees |
| Typical accuracy | Strong | Often the best on tables |

Neither beats a well-specified simple model on data where the simple model is right, as our simulations showed. Both win when the relationships are irregular.

## Practical Habits

- Use a small learning rate, 0.05 to 0.1, and pick the rounds by early stopping on a validation set
- Start with shallow trees, depth 3 to 6
- Regularize with subsampling of rows and columns, minimum leaf size and penalties on leaf weights
- Watch for leakage, since boosting exploits any feature that predicts the label
- Use [Calibrating Probabilities](/data-ai/calibration) if probabilities matter, because boosted scores are often miscalibrated

## Key Points

- Boosting adds small trees one at a time, each fit to the gradient of the loss at the current predictions
- Training loss kept falling while test log loss bottomed out at 0.450 near 50 rounds and rose to 0.484 by 600
- Smaller learning rates and shallower trees overfit more slowly, and depth-1 stumps matched logistic regression on additive data
- Chen and Guestrin's XGBoost added regularization, second-order splits and sparsity handling
- <u>Choose the number of rounds by early stopping, and keep trees only as deep as the interactions require</u>
