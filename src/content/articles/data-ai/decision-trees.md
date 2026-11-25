> A **decision tree** predicts by asking a sequence of yes or no questions about the features, such as "is the asking price above fair?", and following the answers to a leaf that holds the prediction. It is learned greedily: at each node, choose the question that best separates the labels. Trees are easy to read and handle mixed features, and a single deep tree overfits badly.

Trees mirror how people reason through rules. The textbook app's rulebook of [From Writing Rules to Learning from Data](/data-ai/rules-to-learning) was a hand-built tree. Here the tree writes itself from data.

## How a Tree Is Grown

At each node, with the examples that reach it:

1. Try each feature and each possible threshold, such as "asking price ratio under 1.1"
2. Score each split by how much it reduces **impurity** in the two groups it creates
3. Pick the best split, divide the examples and repeat on each side
4. Stop at a maximum depth, a minimum group size or when a group is pure

For classification, the impurity is commonly the **Gini index**, 2p(1 − p) for a yes or no label with positive share p. It is 0 for a pure group and 0.5 for an even mix. For regression, the impurity is the variance of the label. The leaf predicts the group's average, which means a regression tree is a **piecewise constant** function, as the scikit-learn documentation puts it.

The search is **greedy**: each split is the best at that moment, with no look ahead, and finding the best whole tree is a much harder problem that is not attempted.

## Depth Is the Dial

We grew trees of increasing depth on 3,000 simulated listings to predict a sale within 14 days, and tested on 5,000:

| Max Depth | Train AUC | Test AUC | Train Accuracy | Test Accuracy |
| --- | --- | --- | --- | --- |
| 1, one split | 0.657 | 0.642 | 77.0% | 78.2% |
| 2 | 0.700 | 0.686 | 78.0% | 78.7% |
| 3 | 0.727 | 0.707 | 78.4% | 78.9% |
| 4 | 0.754 | 0.727 | 79.0% | 78.6% |
| 6 | 0.800 | 0.720 | 80.9% | 78.2% |
| 8 | 0.859 | 0.687 | 83.0% | 77.0% |
| 12 | 0.912 | 0.649 | 85.1% | 74.5% |

Training AUC climbs steadily to 0.91, and test AUC peaks at depth 4 with 0.727, then falls to 0.649, worse than a stump with two leaves. The deep tree has memorized training listings: its leaves hold a handful of examples each. This is the overfitting of [Overfitting and Underfitting](/data-ai/overfitting), and the cure is to limit depth, require a minimum number of examples per leaf, or **prune** the tree after growing it.

Even the best tree here, at 0.727, is below logistic regression's 0.766. The listing data has a smooth relationship, in which the log of the price ratio shifts the odds steadily, and a tree can only approximate a slope with steps.

## Reading a Tree

A shallow tree can be read like a flowchart, which makes it popular for explanations and for checking a model against domain knowledge. A depth-3 tree on these data splits first on the asking price relative to the fair price, at about 3 percent below fair, then splits on price again, then on age or condition.

Its leaves run from a 71 percent chance of selling, for a young book priced about a third below fair, down to 5 percent, for an older book asked at more than 20 percent above. The same ordering of reasons came out of the logistic model's coefficients.

[Inherently Interpretable Models](/data-ai/interpretable-models) takes this further. Features can be numeric, ordinal or categorical without scaling, since only the order of values matters. Splits can capture interactions, because a question below another question applies only in that branch.

## Weaknesses

- **Instability**: small changes in the data can change the top split, and with it the whole tree. The scikit-learn documentation lists this among the main drawbacks. On one test listing, the prediction of a depth-12 tree trained on bootstrap samples varied with a standard deviation of 0.30 across 20 retrainings, on a scale of 0 to 1
- **Steps, not slopes**: smooth trends are approximated by staircases, and trees can't extrapolate beyond the range seen in training
- **Greedy splitting** misses interactions that only pay off after two splits
- **Bias toward features with many split points**, and toward dominant classes

## Why They Matter Anyway

A single tree is rarely the final model. Averaging many randomized trees stabilizes them, which is [Bagging and Random Forests](/data-ai/random-forests), and adding small trees one at a time to fix remaining errors gives [Boosting and Gradient Boosting](/data-ai/boosting). Those ensembles are the strongest general methods for tables of mixed features.

## Key Points

- A tree asks yes or no questions chosen greedily to reduce impurity, and the leaves hold predictions
- Training AUC rose to 0.91 with depth while test AUC peaked at 0.727 at depth 4 and fell to 0.649 at depth 12
- Limit depth, leaf size or prune to control overfitting
- Trees are unstable and piecewise constant: the prediction on one listing had a standard deviation of 0.30 across retrainings
- <u>Use a single shallow tree to explain, and an ensemble of trees to predict</u>
