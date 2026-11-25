> We estimate how a model will behave on new data by holding some data back. The **training set** fits the model, the **validation set** is used to choose among models and settings, and the **test set** is touched once at the end for an honest final estimate. A number measured on data the model has already seen, or used to make choices, is optimistic.

[Learning as Function Approximation](/data-ai/what-is-learning) showed that a rich enough model can match its training examples almost perfectly. So the training error says little about future performance. The only fair test is on examples the model hasn't seen.

## The Three Sets

| Set | Used For | How Often |
| --- | --- | --- |
| Training | Fitting the weights | Constantly |
| Validation, or development | Choosing the model type, settings and features | Many times |
| Test | A final unbiased estimate of performance | Once |

Common splits are 60/20/20 or 70/15/15 for medium datasets, and with millions of rows a small share, 1 percent or less, is enough for validation and test. The sizes follow from how precise the estimates need to be.

## How Precise Is a Test Estimate

A test set is a sample, so its error is an estimate with spread, the idea of [Sampling Distributions and the Central Limit Theorem](/data-ai/sampling-distributions). We trained the price model once and then measured its error on random test sets of different sizes, 300 times each. On a very large fresh set the true error was $3.54:

| Test Set Size | Average Estimate | Spread (Standard Deviation) | Range Across 300 Draws |
| --- | --- | --- | --- |
| 50 | $3.59 | $0.44 | $2.51 to $5.24 |
| 200 | $3.56 | $0.22 | $2.89 to $4.24 |
| 2,000 | $3.56 | $0.06 | $3.41 to $3.72 |

With 50 test examples, the same model scored anywhere from $2.51 to $5.24, a spread of more than a factor of two. Two models compared on such a set could be ranked either way by luck. With 2,000 examples the estimate is tight. The spread falls with the square root of the size, so ten times as much test data buys a little over three times the precision. [Comparing Models Fairly](/data-ai/comparing-models) comes back to this.

## Why the Test Set Must Stay Clean

Each time we look at a score and then change something, we leak information from the evaluation set into the model. The damage grows with the number of looks. We simulated the extreme case: models that are pure coin flips, with a true accuracy of 50 percent, and we picked the best one on a test set:

| Test Set Size | Models Tried | Best Model's Test Accuracy |
| --- | --- | --- |
| 100 | 1 | 50.0% |
| 100 | 10 | 57.5% |
| 100 | 100 | 62.4% |
| 100 | 1,000 | 66.0% |
| 1,000 | 100 | 53.9% |

Tried 100 times on 100 examples, a coin flip looked like a 62 percent classifier.

The winner of a contest among many candidates is partly the winner of a lottery. This is why the validation set exists: use it for all the choosing, and keep the test set for one measurement of the chosen model. Once the test set has guided a decision, it has become a validation set, and an honest estimate needs fresh data. The same problem appears as [Multiple Comparisons](/data-ai/multiple-comparisons).

## How to Split

A random split suits independent rows. Others don't:

- **By time**: when the model will predict the future, train on the past and test on later data, since a random split lets the model peek at neighbors in time, as [Splitting Data Over Time](/data-ai/time-splits) explains
- **By group**: if one seller has many listings, keep each seller entirely in one set, or the model recognizes sellers and not patterns
- **Stratified**: for rare labels, keep the same label share in each set
- **After removing duplicates**: identical rows on both sides inflate the score

Do the split **first**, before computing means for filling gaps, scaling features or choosing features, all of which should learn only from the training set. Otherwise test information leaks in, as [Data Leakage](/data-ai/data-leakage) shows.

## When Data Is Scarce

With a small dataset, a fixed validation set wastes data and gives noisy estimates. **Cross-validation** rotates the validation role among several folds, and is covered in [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv). A test set is still held out for the end.

## After the Test

The test number is an estimate of future performance, if the future resembles the past. When the world shifts, performance falls even though the test score was honest, which is the subject of [Data Distribution Shifts](/data-ai/distribution-shift).

## Key Points

- Train on the training set, choose with the validation set, and measure once on the test set
- A test set is a sample: 50 examples gave the same model errors from $2.51 to $5.24, and 2,000 examples gave $3.41 to $3.72
- Choosing the best of many models on one test set inflates its score: the best of 100 coin flips looked like 62 percent accuracy
- Split by time or group when rows aren't independent, and split before any preprocessing
- <u>Look at the test set once, and treat it as spent after a decision depends on it</u>
