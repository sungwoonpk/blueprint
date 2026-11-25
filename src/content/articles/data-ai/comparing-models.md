> Two models rarely score the same, and the difference may be luck. Fair comparison uses the same data and splits, looks at paired differences and asks whether the gap is large compared with its noise. Small gaps on small test sets are unreliable, standard tests on cross-validation folds need care, and the model with the best score among many is partly a lottery winner.

A new model beats the current one by half a point on the test set. Is it better? [Training, Validation and Test Sets](/data-ai/train-val-test) showed that a test score is a noisy estimate. This article is about deciding when a difference is real.

## Compare on the Same Data

Both models must be trained and scored on identical splits, with the same preprocessing and the same metric. Then analyze the **paired** differences, example by example or fold by fold, since the same hard cases are hard for both models, and pairing removes that shared difficulty.

## How Large a Gap Can a Test Set Detect

We trained the 14-day sales model with and without the photo-count feature and compared them on 10,000 unseen listings:

| | Accuracy |
| --- | --- |
| With photos | 79.61% |
| Without photos | 79.48% |
| Difference | 0.13 points |

The two models disagreed on 3.0 percent of listings. Among those, the first was right and the second wrong in 158 cases, and the reverse in 145. **McNemar's test** looks at exactly those discordant cases: if neither model is better, they should split about evenly. The statistic was 0.48, far from significant. The observed 0.13 points is noise.

The standard error of an accuracy difference depends on how often the models disagree: roughly the square root of the disagreement rate divided by n. With our rate of 3 percent:

| Test Set Size | Standard Error of the Difference | Smallest Reliably Detectable Difference |
| --- | --- | --- |
| 500 | 0.78 points | about 2.2 points |
| 2,000 | 0.39 points | about 1.1 points |
| 10,000 | 0.17 points | about 0.5 points |

On a test set of 500, a gain under two points can't be told from luck, and many real improvements are that small. Before an experiment, decide the smallest difference worth detecting and size the test set to it, as in [Statistical Power and Sample Size](/data-ai/power-sample-size).

## Comparing With Cross-Validation

With scarce data, we compare models by k-fold cross-validation. The tempting analysis is a paired t-test on the k fold differences. The folds' training sets overlap heavily, so the fold scores are not independent, and the test treats ten correlated numbers as ten independent ones, understating the variance. Dietterich's 1998 paper on statistical tests for comparing classifiers is the classic study of this, and recommends McNemar's test or his 5×2 cross-validation t-test for single-train-test setups.

Nadeau and Bengio proposed a corrected resampled t-test that inflates the variance to account for the overlap.

We checked how the plain and corrected tests behave when there is nothing to find: two models differing only in a penalty setting of 1 against 2, which have nearly the same accuracy. In repeated trials with 10-fold cross-validation:

| Data Size | Plain Paired t-Test Calls the Models Different | Corrected t-Test Calls Them Different |
| --- | --- | --- |
| 200 listings, 200 trials | 2% | 0% |
| 1,000 listings, 100 trials | 8% | 0% |

At the nominal 5 percent rate we expect about 5 false alarms in 100.

The plain test gave 8 at 1,000 listings, with a margin of several points from only 100 trials, and the corrected test gave none, so it is conservative and rarely cries wolf. Our run is small and the models almost identical, so the pattern is weaker than the literature's, and the direction is the same: the plain test trusts correlated folds too much.

## Comparing Many Models and Datasets

For many classifiers over many datasets, Demšar's 2006 paper in the Journal of Machine Learning Research recommends non-parametric tests: the **Wilcoxon signed-ranks test** for two classifiers and the **Friedman test**, with follow-up comparisons, for several. They rank the models on each dataset and compare ranks, which avoids assuming normal scores or comparable scales across datasets.

## The Winner's Curse

Picking the best of many candidates by validation score leads to optimism, shown in [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv): the score of the winner overstates its real quality. Report the final model on a fresh test set, and apply the corrections of [Multiple Comparisons](/data-ai/multiple-comparisons) when many pairwise tests are run.

## Beyond a Single Number

- **Spread**: report an interval from bootstrap resampling, as in [Bootstrap and Resampling](/data-ai/bootstrap), or the spread across seeds. Random initialization alone can move a neural network's score by a point or more
- **Slices**: a model can win overall and lose on an important group, as [Evaluating Beyond Averages](/data-ai/slice-evaluation) explains
- **Cost and speed**: a 0.3 point gain that doubles serving cost may not be worth it
- **Online evidence**: offline gains often shrink in production, so the final test is an experiment, as in [Controlled Experiments and A/B Tests](/data-ai/ab-testing)

## A Checklist

1. Same data, same splits, same metric
2. Pair the comparison, with McNemar or a paired interval
3. Ask how big a difference the test set can detect
4. Use a corrected test for cross-validation folds
5. Report spread and slices, not just one score
6. Confirm the winner on untouched data or an online test

## Key Points

- Compare models on identical splits and analyze paired differences
- A 0.13 point accuracy gain on 10,000 listings was noise, with a McNemar statistic of 0.48
- With a 3 percent disagreement rate, a 500-row test set can't detect a gain below about 2.2 points
- A plain t-test on cross-validation folds trusts correlated folds, and corrected tests are more conservative
- <u>Decide the smallest difference that matters before the experiment, and size the test set to detect it</u>
