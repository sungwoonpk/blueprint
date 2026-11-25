> **Logistic regression** predicts the probability of a class. It computes a weighted sum of the features, as in linear regression, and passes it through the sigmoid function, which squeezes any number into the range 0 to 1. Trained by minimizing log loss, it is the default model for yes or no questions and the building block of neural network classifiers.

[Linear Classifiers](/data-ai/linear-classifiers) predicted yes or no and had no sense of how sure to be. A probability is more useful: the textbook app can tell a seller "this price gives you about a 26 percent chance of selling within two weeks" and let them decide.

## The Model

Compute the score s = w·x + b, then the probability p = σ(s), where σ(s) = 1 / (1 + e⁻ˢ) is the **sigmoid**. A score of 0 gives 0.5, large positive scores approach 1 and large negative ones approach 0. The score is the **log-odds** of the event: s = ln(p / (1 − p)). So logistic regression is a linear model for log-odds, and its predictions always lie between 0 and 1.

Training minimizes the **log loss** from [Loss Functions](/data-ai/loss-functions), the average of −ln of the probability given to the actual outcome. [From Likelihood to Loss Functions](/data-ai/mle-losses) shows this is maximum likelihood. The loss is convex, so [Gradient Descent](/data-ai/gradient-descent) or Newton's method finds the one best answer. For each weight, the gradient is the average of (p − y) times the feature, which looks just like linear regression's gradient.

## A Fit on the Sales Data

We fitted a logistic regression on 3,000 simulated listings to predict a sale within 14 days. About 22 percent sold. The features were the log of the asking price relative to the fair price, condition, age, new edition and number of photos. The fitted weights are log-odds changes, and exponentiating a weight gives an **odds ratio**:

| Feature | Weight | Odds Ratio | Reading |
| --- | --- | --- | --- |
| Log of asking price over fair price | −3.263 per unit, which is 10% higher asking price | 0.73 | A 10% higher asking price lowers the odds of selling by 27% |
| Condition, per step up | 0.341 | 1.41 | Odds rise by 41% |
| Age, per year | −0.237 | 0.79 | Odds fall by 21% |
| New edition exists | −0.525 | 0.59 | Odds fall by 41% |
| Photos, each | 0.151 | 1.16 | Odds rise by 16% |

For a typical mid-condition listing, here is what the model says as the asking price rises:

| Asking Price Compared With Fair | Probability of Selling Within 14 Days |
| --- | --- |
| 20% below | 42.3% |
| Equal | 26.2% |
| 20% above | 16.4% |
| 50% above | 8.6% |

That is a usable output for a seller: pricing 20 percent lower than fair raises the chance from 26 to 42 percent.

## Is It Any Good

On 5,000 unseen listings, the log loss was 0.443, against 0.525 for always predicting the base rate of 22 percent. Accuracy at the 0.5 threshold was 80.0 percent, only slightly above the 78 percent from always saying no, because most listings don't sell and the model rarely gets above 50 percent. The AUC, which asks how well the model ranks sellers above non-sellers, was 0.766. 

The model's probabilities are the valuable output here, and accuracy at one threshold is a poor summary. [Thresholds, ROC and Precision-Recall Curves](/data-ai/roc-pr) takes this up.

Checking probabilities against outcomes, by grouping listings by predicted probability:

| Predicted Probability Group | Average Predicted | Actual Rate That Sold |
| --- | --- | --- |
| Lowest tenth | 3.0% | 3.0% |
| Fourth tenth | 12.4% | 11.8% |
| Seventh tenth | 26.2% | 22.4% |
| Highest tenth | 62.1% | 58.2% |

They agree closely, with a little overconfidence at the top, which is the topic of [Calibrating Probabilities](/data-ai/calibration).

## Why Not Linear Regression on 0 and 1

One could fit linear regression to labels of 0 and 1. It ranks about as well here, with the same AUC of 0.766, but 9 percent of its predictions fell outside the range of 0 to 1, from −0.37 to 0.88, and a probability of −0.37 means nothing. Squared error also treats a prediction of 0.01 for an event that happens like a small miss, when it is a serious failure. Logistic regression fixes both.

## Decision Boundary and Threshold

The model is a linear classifier in disguise: predicting yes when p > 0.5 is the same as score > 0, a flat boundary. But the threshold need not be 0.5. If a missed fast sale costs more than a false alarm, choose a lower one. The model produces the probability and the application decides the cutoff.

## Practical Notes

- **Scale** the features for stable optimization, and for a fair penalty, see [Scaling and Normalizing Features](/data-ai/scaling)
- **Regularize** when there are many features, with [Regularization with L1 and L2](/data-ai/regularization). With perfectly separable data the unregularized weights grow without bound
- **Interpret with care**: odds ratios describe association, as in [Interpreting Linear Regression](/data-ai/interpreting-regression)
- **Rare events** need attention to metrics and sampling, as [Imbalanced Data](/data-ai/imbalanced-data) explains
- **More than two classes**: see [Multiclass Classification and Softmax](/data-ai/softmax)

## Key Points

- Logistic regression passes a weighted sum through the sigmoid, so it is linear in the log-odds and always outputs a probability
- It minimizes log loss, which is convex, so training finds the one best weights
- Exponentiated weights are odds ratios: a 10 percent higher asking price multiplied the odds of selling by 0.73
- On unseen data it scored a log loss of 0.443 against 0.525 for the base rate, and an AUC of 0.766
- <u>Judge it by its probabilities and ranking, and choose the threshold from the cost of each kind of error</u>
