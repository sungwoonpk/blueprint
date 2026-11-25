> Sweeping the threshold from high to low traces a curve. The **ROC curve** plots recall against the false positive rate, and its area (AUC) measures how well the model ranks positives above negatives. The **precision-recall curve** plots precision against recall, and it is far more sensitive when positives are rare. Pick the curve that matches the question.

[Accuracy, Precision and Recall](/data-ai/classification-metrics) showed that each threshold gives a different tradeoff. These curves show all of them in one picture, and summarize the whole ranking in one number.

## The ROC Curve and AUC

Rank all test examples by predicted probability. At each threshold, compute the **true positive rate**, the recall, and the **false positive rate**. The ROC curve plots one against the other. A model that ranks at random gives a diagonal line and an AUC of 0.5, and a perfect ranking gives an AUC of 1.

The AUC has a clean meaning: it is the probability that a randomly chosen positive example gets a higher score than a randomly chosen negative one. Our 14-day sales model had an AUC of **0.77**, so about 77 percent of the time a listing that sold was scored above one that didn't. It says nothing about calibration, and it doesn't depend on a threshold, so it measures ranking only.

## The Precision-Recall Curve

The PR curve plots precision against recall as the threshold moves. A random model gives a flat line at the positive rate, here 22.1 percent. Its summary is the **average precision**, the area under the curve, and our model scored **0.501** against a baseline of 0.221.

Taking the top-scored listings in order shows the shape of both curves:

| Top k Listings Flagged | Recall | False Positive Rate | Precision |
| --- | --- | --- | --- |
| 200 | 7.1% | 0.6% | 78.5% |
| 500 | 15.2% | 2.1% | 67.4% |
| 1,000 | 26.7% | 5.3% | 59.1% |
| 2,000 | 46.2% | 12.6% | 51.0% |
| 4,000 | 70.5% | 31.3% | 39.0% |

The first listings flagged are the model's surest and are mostly right. Precision slides as we take more, while recall climbs.

## When Positives Are Rare

The ROC curve doesn't change when the mix of classes changes, because recall and the false positive rate are each computed within one class. Precision does change, because it mixes the classes. We kept all the positive listings and resampled the negatives to set the share of positives, then scored the same model:

| Share of Positives | ROC AUC | Average Precision | Precision at 50% Recall |
| --- | --- | --- | --- |
| 50% | 0.769 | 0.759 | not computed |
| 22% | 0.772 | 0.501 | 0.496 |
| 5% | 0.769 | 0.181 | not computed |
| 2% | 0.769 | 0.087 | 0.066 |

The ranking quality didn't change at all: the AUC stays at 0.77 across the whole range.

The average precision fell from 0.76 to 0.09, and the precision at 50 percent recall from 0.50 to 0.07. At 2 percent positives, a model that catches half the real cases is wrong about 93 percent of what it flags, and the ROC curve gives no hint of it.

This is why Saito and Rehmsmeier, in a 2015 study in PLOS ONE, argued that precision-recall plots are more informative than ROC plots on imbalanced data. The negatives in the rarer cases were resampled with repeats from our test set, so the figures are indicative.

## Choosing Between Them

| Question | Use |
| --- | --- |
| How well does the model rank? Balanced classes | ROC AUC |
| How useful are the flags when positives are rare? | PR curve and average precision |
| Will it work at a specific cost tradeoff? | The threshold itself, with the confusion matrix |
| Are probabilities trustworthy? | Calibration, in [Calibrating Probabilities](/data-ai/calibration) |

## Pitfalls

- AUC averages over thresholds nobody would use. Two models with the same AUC can differ in the region that matters, so look at the curves
- Comparing average precision across datasets with different positive rates is meaningless without the baseline
- Both curves come from a sample, so they have uncertainty: a [Bootstrap and Resampling](/data-ai/bootstrap) interval shows how much
- Pick the operating threshold on validation data, and report the metrics on test data at that threshold

## Key Points

- ROC plots recall against false positive rate, and its AUC is the chance a random positive outranks a random negative
- The precision-recall curve plots precision against recall, with average precision as its summary
- Moving the share of positives from 22 to 2 percent left the ROC AUC at 0.77 and cut average precision from 0.50 to 0.09
- Precision at 50 percent recall fell to 0.07 at 2 percent positives
- <u>Use the PR curve when positives are rare, and always read the curve at the threshold you will deploy</u>
