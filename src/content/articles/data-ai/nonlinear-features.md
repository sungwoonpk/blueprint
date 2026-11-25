> A linear model can fit curves and interactions if we give it nonlinear features: powers of a feature, logarithms, products of two features, or indicators for ranges. The model stays linear in its weights, so training stays easy, and the flexibility comes from the features. Too much flexibility brings overfitting and wild behavior outside the range of the data.

[Linear Regression](/data-ai/linear-regression) fits a straight line, and relationships are often not straight. The model doesn't have to change, only what we hand it.

## Making a Linear Model Curve

A price that falls quickly in the first years of a book's life and then levels off is not linear in age. Add age squared as a feature, and the model fits a parabola. Add age cubed, and a cubic. The weights still enter linearly, so the fitting method of [Linear Regression](/data-ai/linear-regression) applies unchanged.

Common transformations:

| Feature Idea | Example | Captures |
| --- | --- | --- |
| Powers | age, age² | Curvature |
| Logarithm | log(list price) | Multiplicative effects and skew |
| Interaction | list price × condition | An effect that depends on another feature |
| Bins or indicators | age 0 to 1, 2 to 3, 4 or more | Arbitrary steps |
| Domain features | days since the new edition appeared | Knowledge of the problem |

Feature crosses, covered in [Feature Crosses and Hashing](/data-ai/crosses-hashing), and the kernel methods of [The Kernel Trick](/data-ai/kernels) are systematic ways of building such features.

## How Flexible

We simulated a world where the price share falls exponentially with age, from 0.78 for a new book toward a floor of 0.08, with 300 training sales. We fitted polynomials of increasing degree in age and measured the error inside the training range of ages 0 to 6, and outside it at ages 7 to 9:

| Degree of the Polynomial in Age | Error on Training Sales | Error on Unseen Sales, Ages 0 to 6 | Error at Ages 7 to 9 |
| --- | --- | --- | --- |
| 1, a line | $5.42 | $5.26 | $19.27 |
| 2 | $2.75 | $2.66 | $12.60 |
| 3 | $2.68 | $2.58 | $2.80 |
| 5 | $2.68 | $2.61 | $79.36 |
| 8 | $2.68 | $2.61 | $59,445.71 |
| One indicator per age | $2.68 | $2.61 | impossible |

The line is too stiff, the square better, and the cubic reaches the floor of about $2.6. Degrees 5 and 8 do not improve the fit inside the range, since the cubic already had it. 

Outside the range the story differs sharply: the cubic extrapolates acceptably at $2.80, and degrees 5 and 8 are a disaster, with an error near $60,000 for degree 8. High-degree polynomials swing wildly beyond the data, and we never saw it on the test set, because the test set shared the training range.

That gives two rules. Extra flexibility beyond what the data needs buys nothing and creates risk, and a test set drawn from the same range can't reveal the risk. [Overfitting and Underfitting](/data-ai/overfitting) takes this further.

## Transform the Target Instead

Sometimes the better move is to change the scale of the label. Price falls by a constant **share** each year, so its logarithm falls by a constant amount, and log price is linear in age. 

A model for the log of the price ratio, linear in age, had an error of $2.97 on in-range data, close to the best, and $3.35 at ages 7 to 9. The cubic's $2.80 at those ages was luck of the numbers, while the log model's good extrapolation comes from its structure.

When the structure is multiplicative, a log transform captures it in one weight, with far less risk than powers.

## Practical Advice

- Look at plots of the label against each feature, and at residuals, to find where a line fails
- Start with the lowest degree that works, and standardize before taking powers, since the powers of large numbers are enormous
- Prefer logs and domain features to high powers
- Use [Regularization with L1 and L2](/data-ai/regularization) when adding many features
- Choose by validation error and check behavior at the edges of the data
- For a large number of automatically built features, trees and neural networks learn them instead of hand building them

## Key Points

- Nonlinear features such as powers, logs, products and indicators let a linear model fit curves, and it stays linear in its weights
- A line gave $5.26 on our curved data, a cubic $2.58, and higher degrees gained nothing inside the range
- Outside the training range, a degree-8 polynomial erred by about $60,000 while a log transform stayed near $3.35
- A matching transform of the label can capture a multiplicative pattern with one weight
- <u>Use the simplest transformation that matches the structure, and test beyond the edge of the training range</u>
