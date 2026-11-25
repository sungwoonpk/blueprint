> When one class is rare, a model can score high accuracy by ignoring it. The usual fixes, class weights and resampling, change the default threshold and distort the probabilities, and they don't improve how well the model ranks cases. The real work is to measure with precision and recall, choose the threshold from costs and correct the probabilities if they are used.

Rare outcomes are common: fraud, a scam listing, a defect, a disease. In the textbook app, suppose 3 percent of listings are scams. A model that calls every listing honest is 97 percent accurate and useless.

## A Scam Detector

We simulated 30,000 training listings and 60,000 test listings. Scam probability depended on an asking price far below fair, few photos and a young seller account. The rate was 3.1 percent, so the training set had 934 scams. We trained logistic regression four ways:

| Method | AUC | Average Precision | Best F1 at Any Threshold | Recall at 0.5 Threshold | Listings Flagged at 0.5 | Average Predicted Probability |
| --- | --- | --- | --- | --- | --- | --- |
| Plain | 0.853 | 0.184 | 0.263 | 0.4% | 10 | 0.031 |
| Class weights, balanced | 0.853 | 0.184 | 0.263 | 80.5% | 16,104 | 0.318 |
| Undersample honest listings to 1:1 | 0.852 | 0.184 | 0.264 | 80.4% | 16,028 | 0.319 |
| Undersample, then correct the probabilities | 0.852 | 0.184 | 0.264 | 0.5% | 13 | 0.031 |

The first thing to notice is how little differs. **Ranking quality is the same** across all four: an AUC of 0.85, an average precision of 0.184 and a best F1 of 0.26, regardless of method. Weights and resampling didn't teach the model anything new about scams.

What they changed is the default threshold behavior. The plain model, at 0.5, flags only 10 listings and finds 0.4 percent of scams, because even a true scam rarely gets a probability above 50 percent when scams are 3 percent of all listings.

The weighted and undersampled models flag about 16,000 of 60,000 listings, 27 percent of everything, to catch 80 percent of scams. That is the same model with a different cutoff, and not a better detector.

They also broke the probabilities. The average predicted probability of a scam is 0.318, ten times the true rate of 0.031, because training pretended scams were as common as honest listings. Adding back the log of the true odds to the intercept, the **prior correction**, restored the average to 0.031 and the probabilities to honest values.

## What To Do Instead

1. **Measure with the right metrics**: precision, recall, average precision and the precision-recall curve, as in [Thresholds, ROC and Precision-Recall Curves](/data-ai/roc-pr), and not accuracy
2. **Choose the threshold from costs**: how many reviewers are available, what a false alarm costs and what a missed scam costs. With a review budget of 500 listings a day, flag the top 500 by score
3. **Keep probabilities honest** if anyone uses them: train on the natural distribution, or correct after resampling, then check with [Calibrating Probabilities](/data-ai/calibration)
4. **Split carefully**: stratify so each split contains rare cases, and keep the test set at the real rate

## When Resampling Does Help

Our model was a low-capacity logistic regression with plenty of rare examples, 934, so it saw the rare class well enough. Resampling and weights can help where:

- The model is flexible and the rare class would otherwise be ignored, as in some neural network and tree training
- Rare examples are extremely few, and a minibatch rarely contains one
- Computation is the bottleneck: undersampling the common class shrinks the data, with a prior correction afterward

Oversampling by duplicating rare rows, or by creating synthetic neighbors, as the SMOTE method does, can lead to overfitting to the copies, and the copies must never cross the split into validation or test data, which is a form of [Data Leakage](/data-ai/data-leakage).

## Other Tools

- **Cost-sensitive learning**: put costs of errors into the loss
- **Anomaly detection** when the rare class is too rare or too varied to have labeled examples, as in [Anomaly Detection](/data-ai/anomaly-detection)
- **Better features and more rare labels**, which are usually worth more than any rebalancing trick
- **Two-stage systems**: a cheap filter followed by human or heavier model review

## Key Points

- Accuracy rewards ignoring a rare class, and we measured precision, recall and average precision instead
- Class weights and undersampling left our scam detector's AUC at 0.85 and best F1 at 0.26, and only moved the threshold behavior
- They inflated the average predicted probability to 0.32 against a true 0.03, and a prior correction restored it
- Choose the threshold from review capacity and costs, and keep the test set at the natural rate
- <u>Treat rebalancing as a way to change the cutoff, not as a way to improve the model</u>
