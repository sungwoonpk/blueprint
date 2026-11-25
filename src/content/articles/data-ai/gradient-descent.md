> **Gradient descent** minimizes a loss by repeatedly stepping the parameters a little in the direction that lowers it fastest, which is the negative of the gradient. The step size, called the learning rate, decides whether it converges slowly, quickly or not at all. It is the workhorse that trains models too large for a closed-form answer, from logistic regression to neural networks.

[Linear Regression](/data-ai/linear-regression) solved for the weights in one step. Most models have no such formula, and some datasets are too big to invert a matrix. Gradient descent needs only the ability to compute the loss and its slope.

## The Update

Starting from some weights w, repeat:

w ← w − η · ∇L(w)

where ∇L is the gradient of the loss, defined in [Derivatives and Gradients](/data-ai/derivatives-gradients), and η is the **learning rate**. The gradient points uphill, so we step the other way. For squared error on a linear model, the gradient is the average over examples of the error times the input features, so each step nudges every weight to reduce the errors it contributed to.

For a convex loss such as this one, [Convexity and Local Minima](/data-ai/convexity) guarantees that it finds the global minimum, if the learning rate is small enough. For nonconvex losses, as in neural networks, it finds a good valley and no guarantee.

## Learning Rate

We ran gradient descent on the price model with 1,000 sales, from all weights at zero, where the loss is 1,685. The best possible loss is 11.43. Using raw features, whose values reach into the thousands:

| Learning Rate | Result |
| --- | --- |
| 0.001 | Diverged |
| 0.0001 | Diverged |
| 0.00001 | Diverged |
| 0.000001 | Reached 1% of the best loss after 2,980 iterations |
| 0.0000002 | Still at a loss of 59.7 after 3,000 iterations |

Too large a step overshoots the valley and the loss grows. Too small a step crawls. Only a narrow window works, and it moves whenever the features change scale. The picture of a ball rolling down a bowl is right for the safe case, and in the unsafe case the ball bounces higher on each swing.

## Scaling Changes Everything

Raw features have wildly different sizes: list price near 100, list price times age up to 1,000. The loss surface is then a long narrow canyon, where the gradient points across the canyon more than along it. The same run with standardized features, each with mean 0 and standard deviation 1:

| Learning Rate | Result |
| --- | --- |
| 1.5 | Diverged |
| 1.0 | 180 iterations to 1% of the best loss |
| 0.3 | 40 iterations |
| 0.1 | 100 iterations |
| 0.01 | 950 iterations |

With scaled features the safe range of learning rates is wide and centered near 0.3, and convergence takes 40 iterations instead of about 3,000. This is the main practical reason to standardize, the subject of [Scaling and Normalizing Features](/data-ai/scaling). The eigenvalues of the loss curvature, from [Eigenvalues and Eigenvectors](/data-ai/eigen), explain it formally: the ratio of the largest to the smallest sets how long the canyon is.

## Practical Habits

- **Plot the loss against iteration**. A smooth fall is good, a rise means the rate is too large, a plateau high up means too small or stuck
- **Start with a moderate rate and shrink it** by a factor of 3 or 10 on divergence
- **Stop** when the loss stops improving on a validation set, or after a fixed budget
- **Check the gradient** on a tiny example against a numerical estimate when writing it by hand
- **Use better optimizers when needed**: momentum and Adam adapt the step per parameter, as in [Optimizers and Learning Rate Schedules](/data-ai/optimizers)

## What the Loss Surface Looks Like

For linear regression the loss is a bowl, and steepest descent always reaches the bottom. Logistic regression's loss is also convex. Neural networks have loss surfaces with many valleys, saddle points and flat regions, yet gradient descent works well on them in practice, a fact that is still partly understood.

## Why Not Always the Closed Form

The normal equations cost the cube of the feature count, and need the whole matrix in memory. Gradient descent uses memory and time proportional to the data and parameters per step, and it works for any differentiable loss. For a few features, use the formula. For many features, or a different loss, use descent. [Stochastic and Minibatch Gradient Descent](/data-ai/sgd) makes each step cheaper still.

## Key Points

- Gradient descent steps the weights against the gradient of the loss, scaled by a learning rate
- Too large a rate diverges and too small a rate crawls: with raw features only 0.000001 of five tried rates converged within 3,000 steps
- Standardizing features widened the safe range and cut the needed iterations from about 3,000 to 40
- Plot the loss against the iteration to diagnose the rate
- <u>Scale the features first, then tune the learning rate</u>
