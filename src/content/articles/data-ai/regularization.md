> **Regularization** adds a penalty on the size of the weights to the training loss, trading a little bias for a large cut in variance. **L2** (ridge) penalizes squared weights and shrinks them smoothly, and **L1** (lasso) penalizes absolute weights and pushes some exactly to zero, which performs feature selection. The penalty strength is a hyperparameter chosen on validation data.

[Bias and Variance](/data-ai/bias-variance) showed that flexible models have high variance when data is scarce. Regularization lets us keep a flexible model and limit how much it can use that flexibility.

## The Penalized Loss

Instead of minimizing the loss alone, minimize

Loss(w) + λ · Penalty(w)

with Penalty = Σ wⱼ² for L2 and Σ |wⱼ| for L1. The knob λ sets the tradeoff: λ = 0 is the plain fit, and a large λ forces the weights toward zero. Features should be standardized first, as in [Scaling and Normalizing Features](/data-ai/scaling), and the intercept is left out of the penalty.

Stanford's CS229 notes show the Bayesian reading: a Gaussian prior on the weights gives the L2 penalty and a Laplace prior gives L1, with the fit being the most probable weights, a connection from [Bayesian Inference](/data-ai/bayesian-inference).

## A Test Where Most Features Are Noise

We simulated 60 listings with 25 features, of which only 5 affect the price and 20 are pure noise. The noise in the price gives an error floor of 4. Training an ordinary fit, then ridge with increasing λ:

| λ | Error on Training Rows | Error on Fresh Rows | Total Size of the 20 Noise Weights |
| --- | --- | --- | --- |
| 0 | 1.38 | 5.61 | 4.35 |
| 1 | 1.39 | 5.46 | 4.19 |
| 5 | 1.54 | 5.25 | 3.73 |
| 20 | 2.61 | 6.24 | 3.30 |
| 60 | 5.54 | 9.26 | 3.08 |
| 200 | 11.63 | 14.15 | 1.97 |
| 1,000 | 18.97 | 18.99 | 0.59 |

The unregularized fit has a training error of 1.38, far below the floor of 4, and it is overfit: fresh error is 5.61. 

A mild penalty (λ = 5) raises training error slightly and lowers fresh error to 5.25, the best, a small but real gain. Beyond it, the penalty starts to flatten the real weights too: at λ = 1,000 everything is shrunk to near zero and the model underfits, with 18.99 on both. The curve on fresh data is U-shaped in λ, and the point of the exercise is to find its bottom with validation data.

## Lasso Picks Features

L1's penalty has a corner at zero, so as λ rises, weights hit exactly zero and stay there. With the same data:

| λ | Error on Fresh Rows | Real Features Kept | Noise Features Kept |
| --- | --- | --- | --- |
| 0.01 | 6.22 | 5 of 5 | 20 of 20 |
| 0.2 | 5.01 | 5 of 5 | 7 of 20 |
| 0.5 | 5.61 | 5 of 5 | 1 of 20 |
| 1.0 | 7.52 | 3 of 5 | 0 of 20 |
| 2.0 | 13.71 | 3 of 5 | 0 of 20 |

At λ = 0.2 lasso discarded 13 of the 20 noise features, kept all five real ones, and had the best error of any method here, 5.01. Push further and it starts dropping real features, the two with the smallest weights first. This makes lasso both a regularizer and a selection method, and a close relative of [Selecting Features](/data-ai/feature-selection). Its picks can be unstable when features are correlated, and elastic net combines both penalties.

## Comparing L1 and L2

| | L2, Ridge | L1, Lasso |
| --- | --- | --- |
| Effect on weights | Shrinks all smoothly, rarely to zero | Zeroes some, shrinks others |
| Correlated features | Shares weight among them | Tends to pick one |
| Best when | Many small effects | A few effects matter |
| Training | Closed form or gradient | Needs coordinate descent or similar |

## Other Forms of Regularization

- **Early stopping**: halt training when validation error rises, a form of implicit regularization
- **Dropout and weight decay** in neural networks, in [Dropout, Weight Decay and Early Stopping](/data-ai/dl-regularization)
- **Smaller models** and fewer features
- **Data augmentation**: more varied examples
- **Constraints**, such as monotonic effects

## Choosing λ

λ is a **hyperparameter**: it is not fit by the training loss, because the loss is always lowest at λ = 0. Pick it on validation data, by trying a grid on a log scale, usually with the cross-validation of [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv). Retrain on all training data with the chosen value.

## Key Points

- Regularization adds λ times a penalty on the weights to the loss, trading some bias for lower variance
- On 60 rows with 20 noise features, ridge cut fresh error from 5.61 to 5.25, and λ too large underfit at 18.99
- Lasso zeroed 13 of 20 noise features at λ = 0.2 while keeping all 5 real ones, with the best error of 5.01
- Standardize features first, leave out the intercept, and choose λ on validation data
- <u>Treat the penalty strength as a hyperparameter and look for the bottom of the validation curve</u>
