> A **support vector machine** draws the separating boundary that leaves the widest possible gap, the **margin**, between the classes. Only the training points on or inside the margin, the support vectors, determine the boundary. Its hinge loss and its margin give a clean way to control overfitting, and with the kernel trick it handles curved boundaries.

[Linear Classifiers](/data-ai/linear-classifiers) showed that many lines can separate two classes, and the perceptron stops at the first one it finds. The support vector machine asks for the best line: the one with the most room on both sides.

## The Margin

For a boundary w·x + b = 0 and a training point with label y of +1 or −1, the **functional margin** is y·(w·x + b), positive if the point is correctly classified and larger when it is more confident. The **geometric margin** divides by the length of w, and it is the actual distance from the point to the boundary.

The SVM picks w and b to make the smallest margin over all points as large as possible.

Stanford’s CS229 notes derive the equivalent problem: minimize the length of w subject to every point having a functional margin of at least 1.

Intuitively, a boundary with a wide margin is less sensitive to small changes in the points, so it should generalize better, a link to the bounds of [Why Learning Generalizes](/data-ai/learning-theory), where margin plays the role of complexity.

## Support Vectors

Only points on the margin, or inside it or on the wrong side, affect the solution. Delete any other point and the boundary doesn't move. These are the **support vectors**. The scikit-learn documentation notes that because the decision function uses only a subset of the training points, the support vectors, it is also memory efficient.

On 230 points that a line separates with a gap, our SVM found a minimum functional margin of 0.88 and only 7 points at or near that margin, 3 percent of the data, while the other 223 could have been removed without changing it.

## Soft Margins and the Hinge Loss

Real data overlaps, and no line separates it. The **soft margin** SVM lets points violate the margin, at a price. Its loss for one point is the **hinge loss**, max(0, 1 − y·(w·x + b)), which is zero for points beyond the margin on the correct side and grows linearly for points inside it or misclassified. The objective adds a penalty on the length of w, as in [Regularization with L1 and L2](/data-ai/regularization):

(λ / 2) · |w|² + average hinge loss

A large λ, or equivalently a small C in the usual form with C = 1 over λn, gives a wide margin and tolerates many violations, while a small λ insists on fitting the points and has a narrow margin. We trained with the Pegasos stochastic subgradient method, a simple way to minimize this objective with the techniques of [Stochastic and Minibatch Gradient Descent](/data-ai/sgd), on the 14-day sales data:

| λ | Test AUC | Test Accuracy | Share of Training Points Inside the Margin |
| --- | --- | --- | --- |
| 0.0001 | 0.758 | 77.2% | 49% |
| 0.001 | 0.755 | 78.3% | 55% |
| 0.01 | 0.756 | 78.2% | 56% |
| 0.1 | 0.753 | 78.2% | 64% |
| 1.0 | 0.766 | 79.5% | 97% |

Logistic regression scored an AUC of 0.766 and an accuracy of 80.0 percent on the same data. The SVM matched it at a strong penalty and was a hair lower for weak ones.

Two lessons: on noisy, overlapping data the SVM does about what logistic regression does, and a large share of the training points sit inside the margin, 49 to 97 percent, so most of the data are support vectors and the sparsity advantage is gone. The sparse picture holds for well-separated classes.

## SVM Versus Logistic Regression

| | Linear SVM | Logistic Regression |
| --- | --- | --- |
| Loss | Hinge | Log loss |
| Output | A signed distance, not a probability | A probability |
| Points far from the boundary | Contribute nothing | Contribute a little |
| Typical results | Similar | Similar |

If probabilities matter, use logistic regression, or calibrate the SVM scores with [Calibrating Probabilities](/data-ai/calibration). Standardize features before either.

## Beyond Lines

The SVM's solution can be written in terms of dot products between training points, which opens the door to curved boundaries without ever building the features, the subject of [The Kernel Trick](/data-ai/kernels).

That, with its theory, made SVMs the leading general method of the 1990s and 2000s. For large datasets the training cost grows quickly with the number of examples for kernel SVMs, and tree ensembles and neural networks have taken most of the ground. Linear SVMs remain a fast, strong choice for sparse, high-dimensional data like text.

## Key Points

- A support vector machine finds the boundary with the widest margin, which depends only on the support vectors
- The soft margin uses hinge loss plus a penalty on the weights, with one setting that trades margin width against violations
- On separable toy data only 7 of 230 points mattered, and on noisy sales data 49 to 97 percent of points were inside the margin
- It matched logistic regression on our sales data, with an AUC of 0.766 at a strong penalty
- <u>Use a linear SVM for large sparse data, and calibrate its scores if you need probabilities</u>
