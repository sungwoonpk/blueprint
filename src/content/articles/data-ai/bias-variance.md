> The expected error of a model on new data splits into three parts: **bias**, the error from the model being unable to match the truth even with endless data, **variance**, the error from the model changing with the particular training sample, and **irreducible noise**. Simple models have high bias and low variance, flexible models the reverse, and the best model balances the two.

[Overfitting and Underfitting](/data-ai/overfitting) described two failures. This article measures them. We can only measure bias and variance when we know the truth and can draw many training sets, which a simulation allows and real data doesn't.

## The Decomposition

For squared error at a point x, with a model f̂ trained on a random training set and noise of variance σ²:

Expected error = Bias² + Variance + σ²

- **Bias** is the gap between the average prediction, over many training sets, and the true value
- **Variance** is how much the prediction varies from one training set to another
- **σ²** is the noise in the label, which no model removes

A model with high bias is wrong in the same way every time. A model with high variance is wrong in a different way each time. The mathematics follows from [Expectation, Variance and Covariance](/data-ai/expectation-variance).

## Measuring Them

We simulated the price share falling with age, with noise of 4 points of list price, so σ² = 16 squared points. We drew 300 training sets of 20 sales, fitted polynomials of several degrees to each and measured, over the whole range of ages, the average squared bias and variance in squared points:

| Degree | Bias² | Variance | Noise | Expected Error |
| --- | --- | --- | --- | --- |
| 0 | 281.2 | 13.2 | 16 | 310.4 |
| 1 | 14.7 | 4.0 | 16 | 34.7 |
| 2 | 0.4 | 3.0 | 16 | 19.4 |
| 3 | 0.03 | 5.1 | 16 | 21.1 |
| 5 | 1.3 | 258.4 | 16 | 275.7 |

A constant has huge bias and little variance: it is nearly the same model on every sample and consistently wrong. The line has some bias. Degree 2 has almost none and low variance, the best balance. Higher degrees remove the last bias and the variance grows, and by degree 5 it dominates with 258. The expected error is U-shaped: the left side is bias and the right side is variance.

## More Data Moves the Balance

With 100 sales per training set:

| Degree | Bias² | Variance | Expected Error |
| --- | --- | --- | --- |
| 0 | 281.2 | 2.7 | 299.9 |
| 1 | 14.6 | 0.7 | 31.2 |
| 2 | 0.3 | 0.5 | 16.9 |
| 3 | 0.01 | 0.7 | 16.7 |
| 5 | 0.01 | 1.2 | 17.2 |
| 9 | 0.02 | 2.9 | 19.0 |

Variance fell by a factor of 5 to more than 200, because averaging over more points steadies the fit. Bias didn't change, since it belongs to the model's form. Degree 5 is now fine, and even degree 9 is close to the floor of 16. That is why bigger models become usable as data grows, and why more data helps the high-variance models and does nothing for high-bias ones.

## Fixing Each Problem

| High Bias | High Variance |
| --- | --- |
| Use a more flexible model | Get more data |
| Add features, including nonlinear ones | Use fewer or simpler features |
| Reduce regularization | Increase regularization |
| Train longer | Average many models, as in [Bagging and Random Forests](/data-ai/random-forests) |

Averaging works on variance because the errors of different models partly cancel, and boosting, in [Boosting and Gradient Boosting](/data-ai/boosting), works mainly on bias by fitting what earlier models missed.

## What the Decomposition Doesn't Say

- It is exact for squared error. Other losses have analogues, and the neat split doesn't hold
- Bias and variance can't be separated by looking at one trained model on real data. The learning curves of the previous article are the practical proxy
- Very large networks seem to break the U shape, with error falling again at huge size, the double descent of CS229 notes, and the decomposition still holds while the intuition that more flexibility means more variance does not always hold

## Key Points

- Expected squared error is bias squared plus variance plus noise
- With 20 training sales per set, degree 2 had bias² 0.4 and variance 3.0, while degree 5 had variance 258
- With 100 sales the variances fell by a factor of 5 or more while bias stayed put, so more data favors flexible models
- High bias calls for a richer model, and high variance for more data, simplicity, regularization or averaging
- <u>Diagnose with learning curves before deciding to collect data or change the model</u>
