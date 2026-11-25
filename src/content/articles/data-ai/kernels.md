> The **kernel trick** lets a linear method work in a huge feature space without building it. A **kernel** is a function that returns the dot product of two points after an implicit feature mapping, so any algorithm that only needs dot products can use it. With an RBF kernel, a linear method draws curved boundaries, and one width setting controls whether it underfits or memorizes.

A linear model fails on a ring: a disc of positive points surrounded by negatives has no straight separator. [Polynomial and Nonlinear Features](/data-ai/nonlinear-features) fixed such problems by adding features, such as squares. With many features and high degrees the number of such columns explodes, and the kernel trick avoids ever writing them down.

## From Features to Kernels

Take a feature map φ that turns a point into a longer list of numbers. A linear model in φ(x) has a boundary that is curved in the original space. The key observation, from the dual form of the SVM in Stanford’s CS229 notes, is that training and prediction need only the dot products φ(x)·φ(z). A **kernel** K(x, z) computes that number directly, without forming φ.

For two features, the degree 2 polynomial kernel K(x, z) = (1 + x·z)² equals the dot product of a 6-dimensional feature vector made of 1, the two features, their squares and their product, with suitable constants. We checked on one pair of points: the kernel value was 1.2769 and the explicit 6-number dot product also 1.2769.

The saving grows quickly with dimension. The number of monomials up to a degree d in p features is C(p + d, d):

| Features | Degree | Explicit Monomial Features |
| --- | --- | --- |
| 5 | 2 | 21 |
| 5 | 5 | 252 |
| 100 | 2 | 5,151 |
| 100 | 5 | 96,560,646 |
| 1,000 | 3 | 167,668,501 |

A degree 5 kernel on 100 features costs one 100-term dot product and a power, while the explicit map would have 96 million columns. The **RBF** or Gaussian kernel, K(x, z) = exp(−γ·|x − z|²), corresponds to an infinite-dimensional feature space and is the usual default.

## A Disc Inside a Ring

We generated 300 training points in a square, labeled positive inside a disc and negative outside, with 5 percent of labels flipped, and tested on 3,000 fresh points. We used kernel ridge regression, a simple relative of the SVM that also needs only kernel values:

| Kernel | Train Accuracy | Test Accuracy |
| --- | --- | --- |
| Linear | 63.0% | 62.5% |
| Polynomial, degree 2 | 87.0% | 91.8% |
| RBF, γ = 0.5 | 88.7% | 91.8% |
| RBF, γ = 2 | 88.7% | 92.7% |
| RBF, γ = 10 | 89.0% | 91.8% |
| RBF, γ = 100 | 99.3% | 84.3% |
| RBF, γ = 1,000 | 100% | 85.1% |

The linear model is stuck at 62.5 percent, no better than always guessing the larger class.

The degree 2 kernel, which contains the squares needed for a circle, reaches 91.8 percent, and the RBF kernel with a moderate width reaches 92.7, close to the ceiling set by the 5 percent label noise.

As γ grows, each training point's influence shrinks to a tiny neighborhood, and the model memorizes: at γ = 100 it fits 99.3 percent of the training points and generalizes at 84.3, and at 1,000 it reaches 100 percent on training data and 85.1 on new data. So γ is the bias-variance dial, as in [Bias and Variance](/data-ai/bias-variance): small γ gives smooth, nearly linear boundaries, and large γ gives wiggly ones.

It, with the regularization strength, is tuned by [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv).

## What Makes a Valid Kernel

A function is a valid kernel if its Gram matrix, the table of K for all pairs of training points, is symmetric and positive semidefinite for every set of points, which is Mercer’s condition, and CS229 gives the properties that make combining kernels safe. Sums and products of kernels are kernels, so one can build kernels for strings, graphs, sets and other structured data and get linear-style learning on them.

## The Price

- **The Gram matrix** has one entry per pair of training points, so memory grows with the square of the number of examples and solving grows faster. Our 300-point problem needed a 300 by 300 matrix. At a million examples it is a trillion entries. This is why kernel methods fade on big data
- **Prediction** compares a new point with the support vectors or with all training points
- **Tuning** γ and the penalty matters a great deal
- **Scaling** the features first matters, as for any distance-based method
- **Interpretability** is lower than for a linear model

Approximations such as random features and Nyström sampling build a low-dimensional map that mimics the kernel, bringing cost down at some loss of accuracy. Neural networks learn the feature map instead of fixing it, in [From Linear Models to Multilayer Networks](/data-ai/perceptron-mlp).

## Key Points

- A kernel returns the dot product of two points in an implicit feature space, so linear methods can learn curved boundaries
- A degree 2 kernel matched an explicit 6-feature dot product exactly, while the explicit degree 5 map for 100 features would need 96,560,646 columns
- A linear model scored 62.5 percent on a disc-and-ring problem, and the RBF kernel reached 92.7 percent
- Too narrow a kernel memorizes: at γ = 100 training accuracy was 99.3 percent and test accuracy 84.3 percent
- <u>Tune the kernel width and penalty with cross-validation, and avoid kernel methods on very large datasets</u>
