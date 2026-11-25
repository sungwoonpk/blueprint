> A **linear classifier** separates the classes with a flat boundary: it computes a weighted sum of the features and predicts one class when the sum is positive and the other when it is negative. The boundary is a line in two features, a plane in three, and a hyperplane in general. It is simple and fast, and it fails whenever the classes can't be split by a flat cut.

Regression predicts a number. **Classification** predicts a category. The textbook app's first classification question is whether a listing will sell within 14 days. A model that answers yes or no, and later how likely, lets the app warn a seller that an asking price is too high.

## The Decision Rule

For features x and weights w with a bias b, the score is s = w·x + b. The classifier predicts **yes** if s > 0 and **no** otherwise. The set of points where s = 0 is the **decision boundary**. The weights point towards the yes side, and the distance of a point from the boundary is |s| divided by the length of w. 

A point far from the boundary is classified with more confidence than a point near it, a fact that [Support Vector Machines](/data-ai/svm) builds on as the **margin**.

In the sales data, one feature is how the asking price compares to the model's fair price, as a ratio on a log scale, and others are condition, age, new edition and photos. A boundary in that space says which combinations of price and quality tend to sell.

## The Perceptron

The oldest learning rule for linear classifiers is Rosenblatt's perceptron from the 1950s, a topic of [A Short History of AI](/data-ai/ai-history). 

Start with zero weights and loop over the examples. Whenever an example is classified wrongly, nudge the weights towards it if it is a yes and away if it is a no. Written with labels of +1 and −1: if y·(w·x) ≤ 0, set w ← w + y·x. That is all. A correct example changes nothing.

**It converges when the data can be separated.** If some line splits the classes perfectly, the perceptron makes a bounded number of mistakes and then stops. We generated 284 points that a line separates with a margin. The first pass made 6 mistakes and the second made none, finished.

## When the Classes Overlap

Real data is rarely separable. On the 3,000 simulated listings, about 22 percent of which sold within 14 days, no line separates sellers from non-sellers, because luck plays a part. The perceptron never settles:

| Pass over the Data | Mistakes of 3,000 |
| --- | --- |
| 1 | 893 |
| 2 | 867 |
| 3 | 893 |
| 4 | 877 |
| 5 | 877 |
| 38 to 40 | 847 to 871 |

It keeps correcting itself on the examples it just missed, and the weights wander. 

The weights after the last pass gave 68.5 percent accuracy on 5,000 unseen listings, below the 78.2 percent that comes from always predicting that nothing will sell, and an AUC of 0.59, close to a coin flip.

Logistic regression on the same data scored 80.0 percent accuracy and an AUC of 0.766. The perceptron found a direction in the data, then lost it, because it gives each mistake the same weight and doesn't model the noise.

This failure is also a lesson about accuracy. The majority baseline beats the perceptron at accuracy while knowing nothing, which is why [Accuracy, Precision and Recall](/data-ai/classification-metrics) asks for more than one number.

## What a Line Cannot Do

Some patterns are not linearly separable at all. Suppose a listing sells if it is exactly one of cheap or rare, but not both or neither, the XOR pattern. We generated 2,000 such examples. A linear classifier reached 47.6 percent accuracy, no better than guessing, and the perceptron's mistake count stayed near 1,150 per pass forever. No weighted sum of the two features can implement "one but not both".

Two ways out:

- **Add features**: a feature that is the product of the two, which [Polynomial and Nonlinear Features](/data-ai/nonlinear-features) and [Feature Crosses and Hashing](/data-ai/crosses-hashing) cover, makes the pattern linear in the new space
- **Use a nonlinear model**: trees, kernels and neural networks, covered in later chapters

The same idea runs through the subject: a linear model on good features is often as strong as a complicated model on raw ones.

## What To Use Instead of the Perceptron

The perceptron is instructive and rarely the best tool. [Logistic Regression](/data-ai/logistic-regression) outputs a probability and trains smoothly on overlapping classes. Support vector machines pick the boundary with the widest margin. Both are linear classifiers with better learning rules.

## Key Points

- A linear classifier predicts by the sign of a weighted sum, and the boundary is a hyperplane
- The perceptron converges on separable data, and on our 284 separable points it needed 6 mistakes
- On overlapping classes it never settles: it scored an AUC of 0.59 against 0.766 for logistic regression
- Patterns like XOR can't be split by a flat boundary, and extra features or nonlinear models solve them
- <u>Always compare with the majority baseline, since accuracy alone can hide a weak model</u>
