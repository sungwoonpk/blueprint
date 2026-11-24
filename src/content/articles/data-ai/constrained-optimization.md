> **Constrained optimization** minimizes a function subject to conditions the answer must satisfy. A **Lagrange multiplier** prices each constraint: it is the amount the best value would improve if the constraint were loosened by one unit. In machine learning it explains why a penalty on large weights and a limit on their size are two views of one idea.

[Convexity and Local Minima](/data-ai/convexity) described problems with no limits on the answer. Real problems have limits: weights that must stay small, probabilities that must add to one, margins that must be respected. This page shows how to handle them with calculus.

## A Limit on the Answer

Take a toy loss, the squared distance from the point (3, 1), and ask for the weights w = (w₁, w₂) with the smallest loss that also satisfy w₁² + w₂² ≤ c: the weights must stay inside a circle.

Without the limit the best answer is (3, 1) itself, at squared length 10. If c is at least 10, the limit does nothing. If c is smaller, the best point lies on the boundary, at the spot of the circle closest to (3, 1).

At that boundary point two directions have to agree. The loss wants to move toward (3, 1), and the constraint blocks it. The best point is where the gradient of the loss is exactly opposite the gradient of the constraint, so that no move along the circle helps. That condition is the heart of the method.

## The Lagrangian

Write the problem as minimizing L(w) subject to g(w) ≤ 0, with g(w) = w₁² + w₂² − c. Add the constraint with a multiplier λ ≥ 0 to form the **Lagrangian**:

Λ(w, λ) = L(w) + λ g(w)

At the optimum, the gradient of Λ with respect to w is zero: ∇L = −λ ∇g. The multiplier says how hard the constraint pushes back. If the constraint is slack, the best point is inside the circle and λ is zero.

If it binds, λ is positive. These requirements are the **KKT conditions**, named for Karush, Kuhn and Tucker: stationarity, feasibility, a multiplier that is not negative, and complementary slackness, meaning λ times g(w) is zero, so either the multiplier is zero or the constraint is tight.

## The Price of a Constraint

For our toy problem the solution can be written down, and we computed it for several circle sizes:

| c, the Limit on w₁² + w₂² | Best w | λ | Loss at the Best w |
| --- | --- | --- | --- |
| 100 | (3.000, 1.000) | 0 | 0 |
| 10.5 | (3.000, 1.000) | 0 | 0 |
| 4 | (1.897, 0.632) | 0.581 | 1.351 |
| 1 | (0.949, 0.316) | 2.162 | 4.675 |
| 0.25 | (0.474, 0.158) | 5.325 | 7.088 |

Two things show. While the limit is loose, λ is zero and the answer ignores it. Once it binds, tightening it from 4 to 1 to 0.25 costs more loss, and the multiplier rises from 0.58 to 2.16 to 5.33: the shadow price grows as the room shrinks. A multiplier near zero says a constraint is nearly free, and a large one says it is the thing holding the answer back.

## Penalty and Limit Are the Same Idea

Instead of a hard limit, add a penalty to the loss: minimize L(w) + λ ‖w‖². For each limit c above, the penalized problem with the matching λ has the identical solution, because the Lagrangian is exactly that expression with the multiplier as the penalty weight. In the table, w = (3, 1) / (1 + λ): at c = 4, λ = 0.581 gives (1.897, 0.632), the same point.

This is the equivalence behind [Regularization with L1 and L2](/data-ai/regularization). A model with a penalty on its weights is a model with a limit on their size. We saw it on the price model with two features. Fitting by least squares with a penalty λ times the squared weights:

| Penalty λ | Length of the Weights | Training Loss |
| --- | --- | --- |
| 0 | 6.589 | 0.149 |
| 0.1 | 5.093 | 0.909 |
| 1 | 1.800 | 8.200 |
| 10 | 0.567 | 14.891 |

A stronger penalty shrinks the weights and costs fit, along the same curve as a smaller circle. Whether to think in penalties or limits is a convenience: penalties are easier to code, and limits are easier to state.

## Where Constraints Appear

- **Probabilities**: a distribution must sum to 1 and stay non negative, which leads to the softmax form in [Multiclass Classification and Softmax](/data-ai/softmax)
- **Support vector machines**: the widest margin subject to every example being on the right side, whose Lagrangian gives the kernel form in [Support Vector Machines](/data-ai/svm)
- **Maximum entropy**: the most spread out distribution matching known averages, a problem with Lagrange multipliers that [Entropy and Information](/data-ai/entropy) points to
- **Fairness and safety**: a rule that a rate stay under a threshold while accuracy is maximized

## Key Points

- Constrained optimization minimizes a loss subject to limits on the answer, and the best point on a binding limit is where the loss gradient opposes the constraint gradient
- The Lagrangian adds each constraint with a multiplier, and the KKT conditions say the multiplier is not negative and is zero when the constraint is slack
- The multiplier is a price: in our toy problem it rose from 0.58 to 5.33 as the limit shrank from 4 to 0.25
- A penalty on the weights and a limit on their size describe the same solutions, and in our fit a stronger penalty shrank the weights from 6.59 to 0.57 at a cost in training loss
- <u>A multiplier tells how much a constraint costs</u>, near zero when it hardly matters and large when it is what holds the answer back
