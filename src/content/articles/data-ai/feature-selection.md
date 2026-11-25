> **Feature selection** chooses a subset of the available features to keep. **Filter** methods score features one by one before modeling, **wrapper** methods search subsets by training models, and **embedded** methods such as lasso select while fitting. The classic trap is selecting on the full dataset before validating, which makes pure noise look predictive.

More features are not always better. Each one adds cost to collect and serve, gives a noisy model more room to overfit and makes the model harder to explain. [Regularization with L1 and L2](/data-ai/regularization) showed lasso discarding noise features. This article covers the wider toolbox and the mistake that spoils it.

## Three Families

| Family | How It Works | Example | Weak Point |
| --- | --- | --- | --- |
| Filter | Score each feature against the label, keep the top ones | Correlation, mutual information, chi-square | Ignores interactions and redundancy |
| Wrapper | Train models on candidate subsets and keep the best | Forward selection, backward elimination | Expensive, and easy to overfit the search |
| Embedded | The training method selects as it fits | Lasso, tree-based importance | Tied to one model family |

scikit-learn's documentation lists these as univariate selection, recursive feature elimination and model-based selection, and its common pitfalls page explains how pipelines prevent data leakage of the kind shown below.

## The Classic Mistake

The mistake is to pick the features that correlate best with the label using **all** the data, and then run cross-validation on the reduced table. The validation rows have already voted in the selection.

We tested it on data where there is nothing to find. 50 rows, 1,000 features of pure random noise and labels that are coin flips. We kept the 10 features most correlated with the label and fit a simple classifier:

| Procedure | Accuracy |
| --- | --- |
| Select on all rows, then 5-fold cross-validation | 89.3% on average, from 84% to 98% across 40 trials |
| Select inside each training fold only | 47.9% |
| The first model applied to 500 fresh rows | 50.3% |

The flawed procedure reported nearly 90 percent accuracy for a task with a true ceiling of 50. With 1,000 candidates, some features line up with 50 random labels by luck, the selection finds them, and cross-validation then confirms the luck on the very rows that produced it. The correct procedure gives 47.9, which is chance. Only the fresh rows expose the truth for the first model.

The rule is general: **anything that learns from labels, including feature selection, scaling that uses labels and target encoding, belongs inside the cross-validation loop**, applied to each training fold separately. Wrapping the steps and the model in one pipeline does this automatically, and it is a case of the [Data Leakage](/data-ai/data-leakage) described later in this chapter.

## Practical Methods

- **Remove the obvious first**: constant columns, near-duplicates and features unavailable at prediction time
- **Check redundancy**: for correlated features, keep one, as in [Interpreting Linear Regression](/data-ai/interpreting-regression)
- **Use embedded methods** such as lasso, or the importances of a forest, as a first screen
- **Use domain knowledge**: features with a causal story are more likely to hold up when the data shifts
- **Stability**: a selection that changes much between samples is weak evidence, so rerun on bootstrap samples, as in [Bootstrap and Resampling](/data-ai/bootstrap)

## When Not to Select

With plenty of data and a regularized model, or a tree ensemble, dropping features often changes little, and an unnecessary selection step adds a way to leak. Selection matters most when features are far more numerous than rows, when each feature costs money to produce, or when the model must be small and explainable. Dimension reduction, a different tool that builds new features from combinations, is the subject of [Principal Component Analysis](/data-ai/pca).

## Key Points

- Filter methods score features alone, wrappers search subsets with models and embedded methods select during training
- Selecting on all rows before cross-validation reported 89.3 percent accuracy on coin-flip labels, against 47.9 percent when done inside each fold
- Anything that learns from labels must be refit within each training fold
- Redundant, unavailable and unstable features are the first to drop
- <u>Put selection inside the pipeline that cross-validation evaluates</u>
