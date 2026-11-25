> A model is **calibrated** when its stated probabilities match how often the events happen: among listings given a 30 percent chance of selling, about 30 percent should sell. Accurate ranking doesn't guarantee this, and overfit or small-data models are often overconfident. A small extra model fitted on held-out data, such as Platt scaling or isotonic regression, can repair it without hurting the ranking.

A probability is only useful if it can be trusted. A seller told "62 percent chance of selling" will decide differently from one told "46 percent". [Logistic Regression](/data-ai/logistic-regression) produces probabilities, and many other models produce scores that merely look like them.

## Reliability

To check calibration, group predictions by predicted probability and compare each group's average prediction with its actual rate. Plotted, this is a **reliability diagram**, and a calibrated model lies on the diagonal. The **expected calibration error**, or ECE, is the average gap weighted by group size.

We trained a deliberately overfit model for the 14-day sale: 400 training listings and 30 extra random noise features on top of the real ones, so it fit noise. Its ranking was acceptable, with an AUC of 0.73, and its probabilities were not:

| Predicted Probability Group (Fifths) | Average Predicted | Actual Rate That Sold |
| --- | --- | --- |
| Lowest | 1.8% | 6.0% |
| Second | 6.6% | 13.2% |
| Middle | 15.6% | 16.9% |
| Fourth | 31.7% | 26.3% |
| Highest | 66.2% | 46.5% |

The model is overconfident at both ends: it said 1.8 percent where 6 percent happened, and 66 percent where 46.5 happened. Predictions above 0.8 came true 63 percent of the time, and predictions below 0.05 came true 6.9 percent of the time. The log loss was 0.498 and the ECE 0.076. This is the typical shape of an overfit model, which learned noise as signal and so pushes its scores to extremes.

Guo and colleagues, in a 2017 paper on modern neural networks, found the same overconfidence in deep networks, with a fix as simple as one scaling parameter, **temperature scaling**.

## Repairing It

Calibration is fitted on data the model did not train on. We held out 2,000 other listings and compared four options on 6,000 further listings:

| Method | Test Log Loss | ECE | AUC |
| --- | --- | --- | --- |
| None | 0.498 | 0.076 | 0.733 |
| Temperature scaling, divide the scores by 1.45 | 0.481 | 0.067 | 0.733 |
| Platt scaling, a logistic fit on the score | 0.462 | 0.012 | 0.733 |
| Isotonic regression, a monotone step fit | 0.471 | 0.016 | 0.731 |

Platt scaling cut the ECE from 0.076 to 0.012 and the log loss from 0.498 to 0.462, with the AUC unchanged, since a monotone map doesn't reorder cases. Isotonic regression did nearly as well. Temperature scaling alone helped little here, because the model was off in both slope and level: Platt's fit also shifted the intercept, and a single temperature can't.

How they work:

- **Platt scaling** fits p = σ(a·score + b) on held-out data
- **Temperature scaling** fits one parameter, T, in σ(score / T), and is common for networks since it is simple and low-risk
- **Isotonic regression** fits a nondecreasing step function, which is flexible and needs more data to avoid overfitting

## When It Matters

- **Decisions from probabilities**: expected value, thresholds from costs, risk limits
- **Showing probabilities** to users
- **Combining models** or feeding scores into another system
- **Imbalanced data** after weighting or resampling, where probabilities are distorted, as [Imbalanced Data](/data-ai/imbalanced-data) found
- **Not as much** when only the ranking is used, such as showing the top 10

## Cautions

1. Calibrate on data separate from training, and measure on a third set
2. Check calibration within important groups, since a model can be calibrated overall and off for a group
3. Calibration drifts when the data distribution does, so monitor it
4. A model can be perfectly calibrated and useless: always predicting the base rate is calibrated and has no ranking power, so calibration is never the only measure
5. Few ECE bins and small samples give noisy numbers, and ties need care

[Prediction Intervals and Uncertainty](/data-ai/prediction-intervals) takes the same concern about honest uncertainty to numeric predictions.

## Key Points

- Calibrated probabilities match event frequencies, and reliability diagrams and ECE measure it
- Our overfit model said 66 percent where 46 percent happened, with an ECE of 0.076
- Platt scaling cut the ECE to 0.012 and the log loss from 0.498 to 0.462 without changing the AUC, while a single temperature did little
- Fit the repair on held-out data, and recheck within groups and over time
- <u>Calibrate whenever probabilities drive decisions, and never use calibration as the only metric</u>
