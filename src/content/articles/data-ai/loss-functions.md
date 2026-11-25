> A **loss function** scores how wrong a single prediction is, and the training objective is the average loss over the examples. The choice decides what the model works to avoid: squared error makes large mistakes very expensive and follows the mean, absolute error treats all mistakes alike and follows the median, and for probabilities, log loss punishes confident wrong answers without limit.

A learning algorithm needs something to minimize. [Learning as Function Approximation](/data-ai/what-is-learning) called it the loss. The same data trained under different losses gives different models, so the choice is part of the design.

## Losses for Numbers

Let the prediction be p and the true value y, with error e = p − y.

| Loss | Formula | Behavior |
| --- | --- | --- |
| Squared error | e² | Large errors dominate. Smooth, and easy to optimize |
| Absolute error | \|e\| | Every dollar of error costs the same. Not smooth at 0 |
| Huber | e²/2 for small \|e\|, linear for large | Squared near zero, absolute in the tails. A compromise |

A constant prediction under squared error is best set at the **mean** of the values, and under absolute error at the **median**. The same tendency shows up in model fits: squared loss chases the average behavior, absolute loss the typical behavior.

## When the Data Has a Bad Row

Data has errors. We took 2,000 sales and fitted one number, the price as a share of the list price, under each loss. Then we corrupted 3 percent of the prices by recording them five times too high, as a data entry slip might:

| Loss | Fitted Rate on Clean Data | Fitted Rate With 3% Bad Prices |
| --- | --- | --- |
| Squared | 0.4755 | 0.5250 |
| Absolute | 0.4658 | 0.4726 |
| Huber | 0.4696 | 0.4782 |

Squared error moved by 0.05, about 10 percent, enough to push every suggestion up by a tenth. Absolute error moved by 0.007. The few bad rows had a huge squared error and pulled the fit toward themselves. This is why squared loss is called sensitive to outliers, and why [Outliers and Noise](/data-ai/outliers) advises fixing the data first and then choosing a loss that suits what is left.

The converse is also true. If large errors are what matter, say a $60 miss costs the user far more than three $20 misses, squared error matches the cost and absolute error doesn't. The loss should encode what mistakes cost.

## Losses for Classes

For a yes or no label, the model outputs a probability p that the label is 1, and the loss compares it with the truth.

| Loss | For a Positive Example with Predicted p | Notes |
| --- | --- | --- |
| 0-1 loss | 0 if p ≥ 0.5, else 1 | What we finally care about, but flat and impossible to optimize by gradients |
| Log loss | −ln p | Smooth, and strongly punishes confident mistakes |
| Hinge loss | max(0, 1 − margin) | Used by support vector machines |

Log loss, also called cross-entropy, is the one to know. For a listing that did sell:

| Predicted Probability of Selling | Log Loss |
| --- | --- |
| 0.90 | 0.105 |
| 0.50 | 0.693 |
| 0.10 | 2.303 |
| 0.01 | 4.605 |

A model that says 1 percent for something that happens pays 44 times as much as one that says 90 percent for it.

That asymmetry drives models to be honest about uncertainty. It also gives log loss a firm basis: the expected log loss is the cross-entropy of [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl), and it is smallest when the predicted probabilities match the true ones. [From Likelihood to Loss Functions](/data-ai/mle-losses) shows that minimizing it is maximum likelihood.

## Loss, Metric and Objective

Three things get confused:

- The **loss** is what the training algorithm minimizes, and it must be smooth enough to optimize
- The **metric** is what we report to judge the model, such as accuracy or the share of suggestions within $5, and it is chosen for the problem
- The **objective** may add a penalty, such as [Regularization with L1 and L2](/data-ai/regularization), to the average loss

They need not match, and often can't: accuracy can't be optimized by gradients, so we train on log loss and report accuracy. They should agree in direction. When a model improves its loss and its metric gets worse, investigate before shipping.

## Choosing

1. Start from the cost of a mistake in the real decision
2. Use squared error for regression unless outliers or a median target say otherwise
3. Use log loss for probabilities
4. Check the loss on the validation set, and also the business metric
5. Revisit the choice if the data changes

## Key Points

- A loss scores one prediction, and training minimizes its average over the examples
- Squared error follows the mean and is sensitive to outliers, absolute error follows the median and Huber sits between
- With 3 percent of prices wrong, the squared-loss fit moved 10 percent and the absolute-loss fit moved 1.5 percent
- Log loss charges 4.6 for a confident wrong answer of 1 percent against 0.1 for a right answer of 90 percent
- <u>Choose the loss from the cost of mistakes, and report the metric that people care about</u>
