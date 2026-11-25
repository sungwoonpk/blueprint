> **Hyperparameters** are the settings chosen before training, such as the strength of a penalty or the depth of a tree, and the training loss can't pick them. **Cross-validation** estimates held-out performance by rotating which part of the training data is held out, which wastes less data than one fixed validation split and gives steadier choices.

Training fits the weights. Something else must fit the hyperparameters, and it must not be the training loss, which always prefers the most flexible setting. We need an honest estimate of performance on unseen data, and when data is limited, cross-validation provides it.

## k-Fold Cross-Validation

1. Shuffle the training data and split it into k equal folds, often 5 or 10
2. For each fold in turn: train on the other k − 1 folds and measure the error on the held-out fold
3. Average the k errors: that is the cross-validation estimate

Every row is used for validation once and for training k − 1 times. Variants are stratified folds that keep the label share equal, grouped folds that keep all rows of a seller together, and time-ordered folds for forecasting, which [Splitting Data Over Time](/data-ai/time-splits) covers. Stanford's CS229 notes present holdout, k-fold and leave-one-out in this order, and scikit-learn documents the splitters.

## Choosing a Penalty With It

We used 60 simulated listings with 25 features, 20 of them noise, and a ridge penalty λ. For one dataset, 5-fold cross-validation and the error on a large fresh set gave:

| λ | 5-Fold CV Error | Error on Fresh Data |
| --- | --- | --- |
| 0 | 9.99 | 7.73 |
| 1 | 8.74 | 7.58 |
| 3 | 7.64 | 7.50 |
| 10 | 7.22 | 7.92 |
| 30 | 8.88 | 9.48 |
| 100 | 12.83 | 12.63 |
| 300 | 16.45 | 16.02 |

Both curves are U-shaped with minima in the same region, between λ = 3 and λ = 10, and the CV picked λ = 10, whose fresh error of 7.92 is close to the best of 7.50. The CV error is a bit pessimistic, usually higher than the fresh error, because each model trained on only 48 of the 60 rows.

## How Reliable Is the Choice

We repeated the whole procedure on 60 different datasets of the same kind. CV picked λ = 3 in 28 of them and λ = 10 in 27, with three picks at 1 and one each at 0 and 30. So it nearly always lands in the right neighborhood. 

The average CV score of the winners was 7.06, and their true error was 6.60, so there was no optimistic bias here, only the usual small pessimism.

The estimate itself is noisy. For one dataset and λ = 10, we reran 5-fold CV with 30 different random shuffles:

| Quantity | Value |
| --- | --- |
| Mean of the 30 estimates | 6.21 |
| Standard deviation | 0.79 |
| Range | 4.79 to 9.00 |

The same model on the same data scored anywhere from 4.79 to 9.00 depending only on how rows landed in folds. Differences smaller than that spread between candidates are not meaningful, which is the problem of [Comparing Models Fairly](/data-ai/comparing-models). Repeating CV with several shuffles, or using more folds, steadies the estimate.

## Searching

Common ways to explore hyperparameters:

- **Grid search**: try every combination on a grid, with the penalty on a log scale such as 0.01, 0.1, 1, 10, 100
- **Random search**: sample combinations at random, which usually finds good settings faster when only a few parameters matter
- **Smarter search**: Bayesian optimization and successive halving, covered in [Hyperparameter Search and AutoML](/data-ai/hyperparameter-search)

Each combination tried is another comparison, so with hundreds of them the best CV score is partly luck, the effect behind [Multiple Comparisons](/data-ai/multiple-comparisons) and the 100 coin flips of [Training, Validation and Test Sets](/data-ai/train-val-test).

## Nested Cross-Validation

If the same folds both select the hyperparameters and report the final score, the score is optimistic, since the winner was chosen for doing well on them. **Nested** cross-validation runs the selection inside each outer training fold and scores on the outer held-out fold, so the score reflects the whole procedure of choosing and fitting. It costs more computation. A simpler alternative is to keep a separate test set that the search never touches.

## Practical Rules

1. Hold out a test set before any tuning, and use cross-validation inside the rest
2. Put every learned step, such as scaling and feature selection, inside the folds
3. Choose k to suit the data size: 5 or 10, with smaller data using more folds
4. Prefer the simplest setting whose score is within noise of the best
5. Record the search so that the final score can be trusted

## Key Points

- Hyperparameters are set outside training, and cross-validation estimates their effect without a fixed validation set
- On our data, 5-fold CV picked a ridge penalty of 3 or 10 in 55 of 60 datasets, near the true best
- The same data and model scored from 4.79 to 9.00 across shuffles, so small differences are noise
- Searching many settings makes the best score optimistic, and nested CV or a clean test set corrects it
- <u>Put every learned step inside the folds, and prefer the simplest setting within noise of the best</u>
