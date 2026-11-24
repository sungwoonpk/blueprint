> A fitted regression is read through its coefficients: each says how much the prediction changes when its feature rises by one unit, holding the others fixed. Standard errors say how well the data pins each coefficient down. Correlated features make the coefficients unstable, and a coefficient describes the data, not necessarily a cause.

A model that predicts well is useful. A model whose weights can be read is also useful for understanding, auditing and explaining prices to sellers. [Linear Regression](/data-ai/linear-regression) found the weights, and this article covers what they mean and how far to trust them.

## Reading a Coefficient

In our price model, the weight on list price times age is −0.0693. For a book with a $100 list price, one more year of age lowers the predicted price by $6.93. For a $50 book it lowers it by $3.47. The coefficient is a **slope with the other features held constant**, and its units are those of the label per unit of the feature.

Standardizing features first, as in [Scaling and Normalizing Features](/data-ai/scaling), puts all coefficients on a common scale of "change per standard deviation", which allows a rough comparison of importance.

## How Certain Are the Weights

A coefficient is estimated from one sample, so it carries uncertainty, in the sense of [Estimation and Confidence Intervals](/data-ai/confidence-intervals). For ordinary least squares the **standard error** of each weight comes from the noise level and from how much the feature varies. For our fit, with a residual standard deviation of $4.68 on 3,000 sales:

| Term | Weight | Standard Error | Approximate 95% Interval |
| --- | --- | --- | --- |
| List price | 0.5989 | 0.0022 | 0.5946 to 0.6032 |
| List price times age | −0.0693 | 0.0004 | −0.0701 to −0.0686 |
| List price times condition | 0.0496 | 0.0007 | 0.0483 to 0.0509 |
| List price times new edition | −0.1772 | 0.0017 | −0.1805 to −0.1739 |

All four intervals are narrow and exclude zero, and each contains the weight used to create the data. More data narrows them, and noisier data widens them. The intervals assume the model's form is right and the errors are roughly independent with similar spread, which the residual plots check.

## Correlated Features

When two features carry nearly the same information, the model can't tell which one deserves the credit. We added a column holding the list price in euros, a copy of the dollar price with a little noise:

| | Without the Euro Column | With the Euro Column |
| --- | --- | --- |
| Training error | $3.477 | $3.477 |
| Weight on list price | 0.599, standard error 0.0022 | 0.604, standard error 0.157 |
| Weight on the euro price | not present | −0.005, standard error 0.171 |
| Spread of the list price weight across 30 samples of 500 | 0.006 | 0.498 |

Predictions did not change at all, since the two columns together say what one did. The individual weights became meaningless: standard errors grew seventy-fold, and across samples the list price weight swung with a spread of 0.50, eighty times as large. The model's coefficients can be a nearly arbitrary split between the duplicates, one large and positive, the other large and negative. This is **multicollinearity**.

What to do:

- Drop or combine redundant features
- Use [Regularization with L1 and L2](/data-ai/regularization), which spreads weight sensibly
- Don't read the individual weights of correlated features, though predictions are still fine

[Correlation and Its Limits](/data-ai/correlation) is a tool for spotting such pairs.

## Not Causation

A coefficient says how the label **varies** with a feature in the data. It doesn't say what would happen if we changed the feature. If buyers pay more for books with more photos, adding photos to a listing may or may not raise its price, since good sellers could both take more photos and ask more. [Confounding and Simpson’s Paradox](/data-ai/confounding) and [Causal Inference from Observational Data](/data-ai/causal-inference) explain why.

## Fit and Overfit

**R²** is the share of the label's variance the model explains, 0.973 on our test sales. Adding any feature, even noise, never lowers training R², so a higher training R² isn't proof of a better model. Compare on held-out data, or with an adjusted measure that penalizes extra features. [Measuring Regression Error](/data-ai/regression-metrics) covers the choices.

## Practical Checks

1. Look at standard errors, not just weights
2. Check for correlated features before interpreting any one weight
3. Remember units, and standardize for comparison
4. Look at residuals for curvature and unequal spread
5. Resist a causal reading

## Key Points

- A coefficient is the change in prediction per unit of its feature, with the other features held fixed
- Standard errors and intervals show how well the data pins each weight down: all four of ours were narrow
- A duplicate feature left predictions unchanged but inflated a weight's standard error from 0.0022 to 0.157
- Coefficients describe association in the data and are not causal effects
- <u>Check for correlated features before reading any individual weight</u>
