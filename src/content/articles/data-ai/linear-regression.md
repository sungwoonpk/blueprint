> **Linear regression** predicts a number as a weighted sum of features. Training picks the weights that minimize the sum of squared errors, which has a closed-form answer, the normal equations. It is the base case for the rest of the chapter: small, fast, interpretable and often hard to beat as a first model.

The price suggester of [From Writing Rules to Learning from Data](/data-ai/rules-to-learning) was a linear model: a list price times a rate, where the rate shifts by a fixed amount per year of age. This article shows how its weights are found.

## The Model

With features x₁, …, x_d and weights w₁, …, w_d, the prediction is ŷ = w₁x₁ + … + w_d·x_d, often with a constant term (a **bias** or intercept). In vector form ŷ = w·x, using [Vectors and Matrices as Data](/data-ai/vectors-matrices). Stacking all n examples into a matrix X, the predictions are Xw.

"Linear" means linear in the **weights**. The features can be anything we compute from the inputs, such as list price times age, so a linear model can express curved and interacting effects, as [Polynomial and Nonlinear Features](/data-ai/nonlinear-features) shows.

## The Loss

Training minimizes the sum of squared errors, which follows from the squared loss of [Loss Functions](/data-ai/loss-functions):

SSE(w) = Σ (yᵢ − w·xᵢ)²

The residual yᵢ − ŷᵢ is the vertical gap between a point and the fitted line. Squaring makes the loss smooth and convex, as in [Convexity and Local Minima](/data-ai/convexity), so there is one global minimum, and no hill to get stuck on.

## A Fit by Hand

Take five books with a list price of $100, aged 1 to 5 years, which sold for $58, $52, $45, $40 and $33. With one feature, the age, plus an intercept, the normal equations reduce to two sums. With n = 5, Σx = 15, Σy = 228, Σx² = 55 and Σxy = 622:

- Slope = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²) = (3,110 − 3,420) / (275 − 225) = **−6.2**
- Intercept = (Σy − slope·Σx) / n = (228 + 93) / 5 = **64.2**

Each extra year lowers the price by about $6.20, and a new book would sell for about $64.20. The residuals are 0.0, 0.2, −0.6, 0.6 and −0.2, with a sum of squares of 0.8. A line through five points is easy to check by eye, and the formulas scale to any number of features.

## The Normal Equations

Setting the gradient of SSE to zero, using [Derivatives and Gradients](/data-ai/derivatives-gradients), gives a linear system:

XᵀX · w = Xᵀy

so w = (XᵀX)⁻¹ Xᵀy when XᵀX is invertible. This is exact, with no learning rate and no iterations. 

Its cost grows with the cube of the number of features, since it solves a d by d system, so it suits up to thousands of features. Past that, and when the data is huge, [Gradient Descent](/data-ai/gradient-descent) takes over. If two features are copies of each other, XᵀX can't be inverted and the weights are not unique, a problem that [Interpreting Linear Regression](/data-ai/interpreting-regression) and [Regularization with L1 and L2](/data-ai/regularization) deal with.

## The Price Model

We fitted the four-term model of the price suggester on 3,000 simulated sales, with features list price, list price times age, times condition and times new edition. The hidden formula in the simulation has weights 0.60, −0.07, 0.05 and −0.18:

| Term | Fitted Weight | Hidden Formula |
| --- | --- | --- |
| List price | 0.5989 | 0.60 |
| List price times age | −0.0693 | −0.07 |
| List price times condition | 0.0496 | 0.05 |
| List price times new edition | −0.1772 | −0.18 |

The fit recovers the hidden weights to two digits. 

On 2,000 unseen sales the mean error is $3.52, the root-mean-square error $4.70 and the R² 0.973, so the model explains 97 percent of the variation in prices. The residuals have a mean near zero in each list price band, and their spread grows with the price: a standard deviation of $2.43 for books under $80, $4.16 from $80 to $120 and $5.97 above. 

That growing spread is built into the simulation, whose noise is a share of the list price, and it is a reminder to look at residuals by group.

## When a Line Is Not Enough

We made a second world where prices fall steeply in the first years and then level off. A model linear in age had an error of $5.18. Adding an age-squared feature, still a linear model in its weights, brought it to $2.63. A systematic pattern in the residuals, such as errors that are positive for new books, negative in the middle and positive again for old ones, tells us a feature is missing.

## Checking a Fit

1. **Residuals against each feature and the prediction**: curves and funnels show missing structure and uneven noise
2. **Error on held-out data**, not the training data, as in [Training, Validation and Test Sets](/data-ai/train-val-test)
3. **Compare with a baseline**: always predicting the average gave $23.11, so $3.52 means something
4. **Predictions beyond the range of the data** are extrapolation, where a straight line can be badly wrong

## Key Points

- Linear regression predicts a weighted sum of features, and linear refers to the weights, not the features
- Training minimizes squared error, which is convex and has a closed form: XᵀX w = Xᵀy
- Five books gave a slope of −6.2 dollars a year and an intercept of 64.2, worked out by hand
- On 3,000 simulated sales the fit recovered the hidden weights, with an error of $3.52 and an R² of 0.973
- <u>Plot the residuals, since a pattern in them says which feature is missing</u>
