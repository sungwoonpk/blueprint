> A classifier's mistakes come in two kinds, and **accuracy**, the share of correct predictions, hides which. The **confusion matrix** counts all four outcomes. **Precision** says how many flagged cases are real, **recall** says how many real cases are flagged, and the **F1 score** is their harmonic mean. Which to favor depends on what each kind of mistake costs.

[Logistic Regression](/data-ai/logistic-regression) produces a probability. To act we pick a threshold and make a yes or no call. Judging those calls is the subject here.

## The Confusion Matrix

For the question "will this listing sell within 14 days?", every prediction falls into one of four cells:

| | Actually Sold | Actually Did Not Sell |
| --- | --- | --- |
| **Predicted to sell** | True positive (TP) | False positive (FP) |
| **Predicted not to sell** | False negative (FN) | True negative (TN) |

From these four counts:

- **Accuracy** = (TP + TN) / all
- **Precision** = TP / (TP + FP): of the listings we said would sell, the share that did
- **Recall**, also called sensitivity or true positive rate = TP / (TP + FN): of those that sold, the share we caught
- **False positive rate** = FP / (FP + TN)
- **F1** = 2 · precision · recall / (precision + recall), which is high only when both are

## The Accuracy Trap

We tested the 14-day sales model of the logistic regression article on 10,000 unseen listings, of which 22.1 percent sold. A model that says "will not sell" for every listing has an accuracy of **77.9 percent** and has learned nothing. Our logistic model at the usual threshold of 0.5 scored 79.8 percent, only two points better.

| Threshold | TP | FP | FN | TN | Accuracy | Precision | Recall | F1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5 | 568 | 376 | 1,642 | 7,414 | 79.8% | 60.2% | 25.7% | 0.360 |
| 0.3 | 1,284 | 1,578 | 926 | 6,212 | 75.0% | 44.9% | 58.1% | 0.506 |
| 0.2 | 1,683 | 2,902 | 527 | 4,888 | 65.7% | 36.7% | 76.2% | 0.495 |
| 0.1 | 2,063 | 5,134 | 147 | 2,656 | 47.2% | 28.7% | 93.3% | 0.439 |

As the threshold falls, the model flags more listings. Recall climbs from 26 to 93 percent, while precision falls from 60 to 29 percent and accuracy falls below the do-nothing baseline. The threshold with the best accuracy, 0.5, has the lowest recall and a poor F1. The F1 peaks near 0.3 and 0.2. **No single threshold is the right one**: it is a choice about costs.

## Choosing the Threshold

Suppose the app flags listings likely to sell slowly, to offer the seller a price cut. A false alarm costs a needless nudge to a seller, and a miss costs a slow sale. If a miss is three times as costly as a false alarm, the right threshold favors recall, around 0.2 to 0.3 in our table. If the nudge irritates sellers, precision matters more and 0.5 or higher fits.

A way to decide is to give each of the four cells a cost or benefit and pick the threshold with the best total, instead of an arbitrary 0.5. [Thresholds, ROC and Precision-Recall Curves](/data-ai/roc-pr) shows all thresholds at once.

## Beyond Two Classes

- **Macro average**: compute a metric for each class and average, so every class counts equally
- **Micro average**: pool all decisions, so large classes dominate
- **Per-class confusion matrix**: a K by K table showing which classes get mixed up, which is often the most useful picture of the errors

## Common Mistakes

- Reporting accuracy alone when classes are unbalanced
- Comparing the precision of two models at different thresholds, or different recalls, which is not a comparison
- Choosing the threshold on the test set. Choose it on validation data
- Forgetting that precision depends on how common the positive class is: the same model has lower precision where positives are rarer, as [Imbalanced Data](/data-ai/imbalanced-data) shows

## Key Points

- The confusion matrix counts true and false positives and negatives, and every classification metric is built from it
- Always predicting "will not sell" scored 77.9 percent accuracy, and our model scored 79.8 percent at a threshold of 0.5
- Lowering the threshold raised recall from 26 to 93 percent and cut precision from 60 to 29 percent
- The right threshold comes from the cost of each kind of error, not from 0.5
- <u>Report precision and recall together with the threshold, and compare with a do-nothing baseline</u>
