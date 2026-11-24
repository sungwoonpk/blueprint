> A **derivative** is the slope of a function at a point, the rate at which its output changes as its input changes. The **gradient** of a function of many inputs is the vector of its slopes along each input, and it points in the direction of steepest increase. Training a model means following the negative gradient of its loss downhill.

Phase 1 fit the price model by letting a program pick the weights with the smallest average error. The program does it by calculus, and this page is the part of calculus a model uses: how a small change in a weight changes the loss, and how to measure that change on a computer.

## Slope and Partial Slope

For a function of one input, the derivative f′(x) is the limit of the change in output over the change in input as the change shrinks. Near x, the function looks like a line with that slope: f(x + h) ≈ f(x) + h f′(x). That one line is the idea behind every optimizer.

A loss depends on many weights at once. The **partial derivative** of the loss with respect to one weight holds the others fixed and asks how the loss moves as that weight alone changes. Stacking all the partial derivatives into a vector gives the **gradient**, written ∇L. For the price model's four weights, it is a vector of four numbers.

## Following the Gradient Downhill

The gradient points where the loss rises fastest, so stepping the other way lowers it. **Gradient descent** repeats one update: w ← w − η ∇L, where the **learning rate** η sets the size of the step. [Gradient Descent](/data-ai/gradient-descent) builds the full method, and this page only needs to know that the gradient is the ingredient.

For the price model with a mean squared error loss, the gradient has a clean form. If the error on one listing is e = w · x − y, the loss on it is e², and its gradient is 2 e x. The gradient of the average loss is the average of these. We computed it at a starting guess of weights [0.5, 0, 0, 0] over 500 simulated listings:

| Weight | Gradient | Meaning |
| --- | --- | --- |
| Price | 465.23 | Raising it raises the loss: the guess is too high on average |
| Price × Age | 9,267.91 | Strongly too high without an age penalty |
| Price × Condition | −623.64 | Raising it lowers the loss |
| Price × Edition | 1,296.93 | Raising it raises the loss |

Descent moves each weight against its gradient, so the age weight goes down fast and the condition weight goes up. The very different sizes, 465 against 9,268, are a sign that the features are on different scales, which comes back in [Scaling and Normalizing Features](/data-ai/scaling).

## Checking a Gradient Numerically

A derived gradient is easy to get wrong, so a standard check compares it with a finite difference: (f(x + h) − f(x)) / h for a small h. We tested the formula on the textbook function f(x) = eˣ sin x at x = 1, where the true slope is known, and shrank h:

| Step h | Error, Forward Difference | Error, Central Difference |
| --- | --- | --- |
| 10⁻² | 1.5 × 10⁻² | 2.7 × 10⁻⁵ |
| 10⁻⁴ | 1.5 × 10⁻⁴ | 2.7 × 10⁻⁹ |
| 10⁻⁶ | 1.5 × 10⁻⁶ | 1.1 × 10⁻¹⁰ |
| 10⁻⁸ | 2.2 × 10⁻⁸ | 1.1 × 10⁻¹⁰ |
| 10⁻¹⁰ | 4.2 × 10⁻⁷ | 4.2 × 10⁻⁷ |
| 10⁻¹² | 5.0 × 10⁻⁴ | 5.7 × 10⁻⁵ |
| 10⁻¹⁴ | 1.9 × 10⁻² | 1.9 × 10⁻² |

The error falls as h shrinks, and then rises again. A smaller step cuts the error of the approximation, and also leaves two nearly equal function values to subtract, where the computer's rounding dominates. [Floating Point and Numerical Stability](/data-ai/floating-point) explains the second effect. The **central difference**, (f(x + h) − f(x − h)) / (2h), is far more accurate, and its best step is around 10⁻⁶ to 10⁻⁸. With a step of 10⁻⁵ it matched our formula for the price model's gradient to a relative difference of 4 × 10⁻¹², which is the evidence that the formula is right.

## The Size of the Step

The learning rate matters as much as the direction. We ran 200 steps of descent on the price loss with four learning rates:

| Learning Rate | Loss After 200 Steps |
| --- | --- |
| 10⁻⁷ | 119.1 |
| 10⁻⁶ | 34.9 |
| 2 × 10⁻⁶ | 21.9 |
| 5 × 10⁻⁶ | Diverged |

Too small a step crawls, and a step that is too large overshoots and blows up. The edge sits between 2 × 10⁻⁶ and 5 × 10⁻⁶, and [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians) shows where that number comes from.

## Key Points

- A derivative is a slope, and near a point a function looks like a line with that slope
- The gradient is the vector of partial derivatives, pointing uphill, and descent steps the other way
- For the price model the gradient is the average of 2 e x over the listings, and its size shows the scale of each feature
- Check a gradient against a central difference: the error fell and then rose again as the step shrank, because rounding takes over
- <u>The learning rate sets whether descent crawls, converges or blows up</u>, and 5 × 10⁻⁶ blew up where 2 × 10⁻⁶ worked
