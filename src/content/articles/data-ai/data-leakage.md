> **Data leakage** is when information that wouldn't exist at prediction time gets into training, so the model scores well in evaluation and fails in use. It comes from features recorded after the outcome, from duplicates across splits, from preprocessing fitted on all the data and from time. It is the most common reason a great offline result turns out wrong.

Several earlier articles brushed against leakage: [Training, Validation and Test Sets](/data-ai/train-val-test), [Selecting Features](/data-ai/feature-selection) and [Serving Data to Analysts, Models and Applications](/data-ai/serving-data). Here is the full list of ways it happens, with measurements, and the habits that prevent it. The scikit-learn guide to common pitfalls defines it the same way: information that would not be available at prediction time influencing the model.

## 1. Features From the Future

A column that is recorded after the outcome, or caused by it, makes prediction easy and meaningless. We added to the 14-day sales data a feature, "time until the first buyer message", where listings that sell tend to get messages sooner. The model's AUC on held-out data:

| Features | AUC on Held-Out Data |
| --- | --- |
| The honest features | 0.766 |
| Plus time to first message | 0.861 |
| The same model in production, where the message time is not yet known | 0.764 |

The leaky model looked 0.095 better.

In production, where the feature doesn't exist yet, the gain disappeared. Typical causes are statuses, totals and flags updated after the event, such as "refund issued" in a model of fraud, and aggregates computed over all time and not up to the prediction moment, the point-in-time problem of [Serving Data to Analysts, Models and Applications](/data-ai/serving-data). For each feature ask when it is known, as [Features, Labels and Datasets](/data-ai/features-labels) advised.

## 2. Duplicates Across the Split

If the same case appears in training and test, a model that merely memorizes looks good. We copied 1,000 training listings into a test set of 5,000, as happens when sellers relist the same book. A lookup table with no learning at all got every one of those 1,000 right, and scored 82.9 percent overall against 78.2 percent for the majority-class baseline.

The fix is to deduplicate before splitting, and to split by the entity, such as the seller or the book edition, so related rows stay together, with the tools of [Duplicates and Entity Resolution](/data-ai/duplicates-entity-resolution).

## 3. Learning From the Test Set During Preparation

Any step that learns from data must learn only from training data:

- **Scaling and imputation** fitted on all rows, a mild leak, as in [Scaling and Normalizing Features](/data-ai/scaling)
- **Feature selection** on all rows, a severe leak: it produced 89.3 percent accuracy on coin-flip labels where the honest number was 47.9 percent
- **Target encoding** from labels without out-of-fold computation, as in [Encoding Categorical Features](/data-ai/encoding)
- **Resampling or augmentation** before the split, which puts copies of one example on both sides

## 4. Time

When the model will predict the future, a random split lets it learn from rows that come after the test rows, including trends and seasonality, and the score is too good. Split chronologically, with the model trained on the past and tested on the later period, and do the same inside cross-validation, as [Splitting Data Over Time](/data-ai/time-splits) explains. Features built from neighbors in time, such as moving averages, must use only earlier rows.

## 5. The Process Itself

- **Tuning on the test set**, shown in [Training, Validation and Test Sets](/data-ai/train-val-test): the best of 100 coin flips looked like a 62 percent classifier
- **Leaking through the label**: a label defined from a feature, so that the model rediscovers a rule. For example a "high value" label set by a price cutoff, with price as an input
- **Group leakage**: many rows from one source, such as one hospital, one seller or one camera, appearing on both sides
- **Public data**: benchmark answers that were part of a model's training data, a growing concern for language models, as in [How Language Models Are Benchmarked](/data-ai/llm-benchmarks)

## Warning Signs

- A score that is too good for the problem, or far above a simple baseline
- One feature with a huge weight or importance
- A large gap between offline results and early production results
- Performance that collapses when the suspicious feature is removed
- Perfect results on the duplicated or related rows

## Prevention Habits

1. Split first, by time or group where they apply, before any other step
2. Put every learned step in a pipeline fitted on training folds only
3. Write down for each feature when it is known, and build training features as of that moment
4. Look at the most important features and ask if each is available in production
5. Keep the test set sealed until the end
6. Check train and test for overlap: duplicate rows, shared entities and overlapping time spans

## Key Points

- Leakage is training on information unavailable at prediction time, and it makes offline scores meaningless
- A feature recorded after the outcome lifted our AUC from 0.766 to 0.861 and vanished in production at 0.764
- A memorizing lookup table beat the baseline when 1,000 duplicates crossed into the test set
- Selection, scaling, encoding and resampling must be fitted inside the training folds, and time needs chronological splits
- <u>Be suspicious of any result that looks too good, and ask for each feature when it becomes known</u>
