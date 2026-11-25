> Regression error can be summarized in several ways, and each ranks models differently. **MAE** is the typical miss in the label's own units, **RMSE** punishes large misses, **MAPE** measures relative error and breaks on small values, and **R²** compares against always predicting the average. Choose the metric that matches what a miss costs.

[Loss Functions](/data-ai/loss-functions) separated the loss used in training from the metric used in reporting. For the price suggester, the metric answers: how far off are the suggestions, and does it matter?

## The Common Metrics

With errors eᵢ = predictionᵢ − actualᵢ over n examples:

| Metric | Formula | Reads As | Behavior |
| --- | --- | --- | --- |
| MAE | mean of \|e\| | The typical miss, in dollars | Treats all misses alike |
| RMSE | square root of the mean of e² | A miss that weights large errors heavily | Dominated by big errors |
| MAPE | mean of \|e\| / actual | Typical miss as a percentage | Explodes for small actuals, and favors under-prediction |
| R² | 1 − sum of e² / sum of (actual − mean)² | Share of variance explained | Relative to a baseline of the average |
| RMSLE | RMSE of log(1 + prediction) vs log(1 + actual) | Relative error | Treats a ratio miss alike at any scale |
| Within $5 | Share with \|e\| ≤ 5 | Practical hit rate | Easy to explain |

## Three Models, Many Numbers

On 2,000 unseen simulated sales, we scored three price models: A, the linear model of the chapter, B, a rule that always suggests 47 percent of list price, and C, a model as good as A on cheap books and 45 percent off in a random direction on books listed at $150 or more:

| Metric | A Linear Model | B 47% of List | C Wild on Expensive Books |
| --- | --- | --- | --- |
| MAE | $3.52 | $16.29 | $10.49 |
| RMSE | $4.70 | $20.80 | $18.87 |
| MAPE | 8.4% | 45.2% | 16.9% |
| R² | 0.973 | 0.471 | 0.564 |
| RMSLE | 0.117 | 0.445 | 0.265 |
| Within $5 | 75.1% | 21.1% | 63.2% |

A is the clear winner on all of them.

B versus C is more interesting. By MAE and MAPE, C beats B by a wide margin, and by RMSE it is nearly equal (18.87 against 20.80), since C's few huge errors on expensive books weigh heavily in a root-mean-square. The R² of C is only 0.56.

Which model is better depends on the product: if a $60 error on an expensive book is a disaster, RMSE's view is right, and if most sellers list cheaper books, MAE's is.

## Outliers and RMSE

We added extra rows, each missed by $200, to model A's errors:

| Extra Rows Missed by $200 | MAE | RMSE |
| --- | --- | --- |
| 0 | $3.52 | $4.70 |
| 5 | $4.01 | $11.04 |
| 20 | $5.47 | $20.44 |

Five bad rows out of 2,005 raised the MAE by 14 percent and the RMSE by 135 percent. RMSE is sensitive to rare large errors, which is a feature if they matter and a distortion if they are data errors. Report both, and inspect the worst misses by hand.

## MAPE's Problems

MAPE is easy to read and has two flaws.

A miss on a small actual has a huge percentage, so rows with prices under $20, only 212 of 2,000 here, supplied 25 percent of the total MAPE. And it is lopsided: predicting 60 for a 40 book is a 50 percent error, while predicting 40 for a 60 book is 33 percent, so a model trained to lower MAPE learns to under-predict. Alternatives are the symmetric versions, RMSLE or the median of relative errors.

## R² and What It Hides

R² of 0.973 sounds like 97 percent accuracy, which it isn't: it says the model explains 97 percent of the spread of prices. It depends on how spread out the data is. The same model on a narrow price range would score lower with the same dollar errors. Use it to compare models on the same data and not across datasets.

## Bias and Where Errors Fall

An average error near zero, as model A's $0.03 bias, can hide errors that cancel: too high for cheap books, too low for expensive ones. Break the error down by groups, as in [Evaluating Beyond Averages](/data-ai/slice-evaluation), by price band, condition and course. A good aggregate can hide a bad segment.

## Choosing

1. Express the miss in business terms first: dollars, share of price, hit within a tolerance
2. Use MAE or the within-tolerance share for a typical-case view, and RMSE if large misses are costly
3. Use a relative metric if errors scale with the price
4. Always compare with a simple baseline
5. Inspect the worst errors and the error by group

## Key Points

- MAE, RMSE, MAPE, R² and RMSLE each emphasize different errors, and a metric should mirror the cost of a miss
- A model that was wild on expensive books beat a flat 47 percent rule by MAE and nearly tied it by RMSE
- Five rows missed by $200 raised the MAE 14 percent and the RMSE 135 percent
- MAPE is dominated by small actuals and favors under-prediction, and R² depends on the data's spread
- <u>Report a typical-case metric, a large-miss metric and the error by group</u>
