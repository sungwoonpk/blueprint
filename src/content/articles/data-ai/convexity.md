> A function is **convex** if the line segment between any two points on its graph lies on or above the graph. A convex function has no false valleys: every local minimum is a global minimum, so descent from any start ends at the best answer. Most deep learning losses are not convex, and understanding why that is a problem explains a lot of how training behaves.

[The Chain Rule and Computational Graphs](/data-ai/chain-rule) gave gradients, and [Gradient Descent](/data-ai/gradient-descent) will use them to walk downhill. Whether that walk ends at the best point depends on the shape of the surface. This page is about that shape.

## Convex Functions

Formally, a function f is convex when f(θa + (1 − θ)b) ≤ θ f(a) + (1 − θ) f(b) for every pair of points a and b and every θ between 0 and 1. The chord lies above the curve. Pictures to keep in mind are a bowl, and a flat plane, and a V shape, which is convex even though it has a corner.

For smooth functions there are two practical tests. In one dimension, f is convex when its second derivative is never negative. In many dimensions, f is convex when its Hessian, the matrix from [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians), is positive semidefinite everywhere, which means all its eigenvalues are at least zero. The mean squared error of a linear model has Hessian (2/n) XᵀX, whose eigenvalues are never negative, so least squares is convex.

## The Property That Matters

If f is convex, any point where the gradient is zero is a global minimum, and any local minimum is global. Textbooks on convex optimization state it as the central fact: a locally optimal point of a convex problem is globally optimal. Descent has nowhere to get stuck.

We checked it on the price model. We started gradient descent from six random points far apart, with weights between −20 and 20 and a two feature model, and ran it to convergence. All six ended at the same weights, [6.551, −0.714], with the same loss, 0.1487. Convexity is the reason the answer didn't depend on where we began, and it is why linear and logistic regression are called reliable.

## When the Surface Is Not Convex

Now take a function with two valleys, f(x) = x⁴ − 3x² + x. We ran descent from seven starting points between −2 and 2:

| Start | Ended At | Value There |
| --- | --- | --- |
| −2.0 | −1.301 | −3.514 |
| −1.0 | −1.301 | −3.514 |
| −0.2 | −1.301 | −3.514 |
| 0.0 | −1.301 | −3.514 |
| 0.3 | 1.131 | −1.070 |
| 1.0 | 1.131 | −1.070 |
| 2.0 | 1.131 | −1.070 |

Four starts reached the deep valley and three reached the shallow one, where the value is much worse. Both ends are local minima, with zero gradient, and only one is global. Descent can't tell the difference, and the start decided the result. A model with a bent layer in the middle, which is what [From Linear Models to Multilayer Networks](/data-ai/perceptron-mlp) builds, has a loss with this kind of landscape in a million dimensions.

## Why Deep Learning Still Works

That sounds like a disaster, and the experience of the field is milder than the picture suggests. A few reasons have both evidence and argument behind them:

- **Many good minima**: in a model with many weights, a large share of the minima that descent finds have similar loss, so ending in any of them is fine
- **Saddle points more than traps**: in high dimensions a flat spot with zero gradient is more often a saddle, where some direction still leads down, than a valley
- **Noise helps**: the random sampling in [Stochastic and Minibatch Gradient Descent](/data-ai/sgd) jostles the weights out of shallow dips
- **Good starts and shapes**: careful initialization and architectures such as [Residual Networks](/data-ai/residual-networks) make the surface easier to descend

None of this is a guarantee, and two runs from different starts can end with different models. The practical response is to run with several seeds, compare, and record the seed, as [Experiment Tracking and Reproducibility](/data-ai/experiment-tracking) advises.

## Convexity in a Model's Design

Knowing which part of a pipeline is convex is a design tool:

- **Linear and logistic regression, and support vector machines**: convex, so the solution is unique and doesn't depend on a start
- **Regularization added to a convex loss**: the L1 and L2 penalties are convex, so the sum stays convex, as in [Regularization with L1 and L2](/data-ai/regularization)
- **k-means and neural networks**: not convex, so results depend on the start, and the standard remedy is several restarts
- **A convex relaxation**: replacing a hard, non convex problem with a close convex one that can be solved reliably, a common move in theory

## Key Points

- A convex function lies below its chords, and for smooth functions its Hessian has no negative eigenvalues
- In a convex problem every local minimum is global, so descent from any start reaches the best answer: six distant starts gave identical weights and loss
- Without convexity the start decides: on f(x) = x⁴ − 3x² + x, four starts found the deep valley, at −3.514, and three the shallow one, at −1.070
- Deep networks are not convex, and they train well in practice for reasons that include many good minima, saddles instead of traps, noise and careful design
- <u>Check how a model's loss is shaped</u>: convex ones need no restarts, and non convex ones need several seeds
