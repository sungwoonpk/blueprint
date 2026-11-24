> The **Jacobian** of a function from many inputs to many outputs is the matrix of all its partial derivatives, and it is the best linear approximation of the function near a point. The **Hessian** is the matrix of second derivatives of a scalar function, and it describes the curvature of a loss. Together they extend the slope of one variable to the many variables of a model.

[Derivatives and Gradients](/data-ai/derivatives-gradients) ended with a mystery: why did a learning rate of 2 × 10⁻⁶ work and 5 × 10⁻⁶ blow up? The answer is curvature, and measuring it takes second derivatives. This page defines the objects and uses them on the price model.

## The Jacobian

A function can have several outputs. A model with 4 weights that predicts the prices of 3 listings maps 4 inputs to 3 outputs.

The **Jacobian** J holds one row for each output and one column for each input: entry Jᵢⱼ is the partial derivative of output i with respect to input j. Near a point, f(w + δ) ≈ f(w) + J δ, a linear map, which is why matrices and calculus meet here.

For a linear model the Jacobian is easy. The predictions are Xw, and the derivative of Xw with respect to w is X itself. The listings of [Vectors and Matrices as Data](/data-ai/vectors-matrices) make a 3 × 4 Jacobian, each row the features of one listing: the rate at which that listing's prediction moves as each weight moves. A scalar function has a Jacobian with one row, and that row is the gradient.

## The Hessian and Curvature

The gradient says which way is downhill and nothing about how the slope changes. The **Hessian** H holds the second partial derivatives, Hᵢⱼ = ∂²L / ∂wᵢ ∂wⱼ, and it is symmetric. For the mean squared error of a linear model it is simply H = (2/n) XᵀX, a matrix we can build from the data.

Its eigenvalues, from [Eigenvalues and Eigenvectors](/data-ai/eigen), measure curvature along perpendicular directions: a large eigenvalue is a steep, narrow valley wall, and a small one a long gentle slope. For the price model on 500 simulated listings, the four eigenvalues were:

| Direction | Eigenvalue of the Hessian |
| --- | --- |
| 1 | 472,242 |
| 2 | 61,172 |
| 3 | 5,457 |
| 4 | 2,691 |

## Why the Step Has a Limit

Gradient descent on a quadratic loss is stable only while the step is below 2 divided by the largest eigenvalue. Here that is 2 / 472,242 = 4.2 × 10⁻⁶. The runs of the last topic match it: a rate of 2 × 10⁻⁶ converged and 5 × 10⁻⁶ diverged. The steepest direction sets the speed limit for every direction.

That limit makes the other directions slow. With the step held under 4.2 × 10⁻⁶, progress along the direction with eigenvalue 2,691 is 175 times slower than along the steepest one, since 472,242 / 2,691 = 175.5. This ratio of the largest to the smallest eigenvalue is the **condition number**, and a large one means a long, narrow valley that gradient descent zigzags down. [Optimizers and Learning Rate Schedules](/data-ai/optimizers) is about methods that cope.

## Conditioning Is a Data Choice

The Hessian is built from the features, so rescaling the features changes it. We divided each of the four columns by its standard deviation and recomputed. The eigenvalues became 27.6, 2.0, 1.5 and 0.8, and the condition number fell from 175.5 to 34.2, a fivefold improvement.

The step limit became 2 / 27.6 = 0.07 and every direction moves at a similar pace. [Scaling and Normalizing Features](/data-ai/scaling) is a cheap preprocessing step that makes the loss surface rounder.

## Using the Curvature

If the Hessian is known, **Newton's method** steps to the bottom of the local quadratic: w ← w − H⁻¹ ∇L. On a quadratic loss that is one step, and on others a handful.

The price is forming and inverting a d × d matrix, which costs about d³ operations, as [Matrix Multiplication and Linear Maps](/data-ai/matrix-multiplication) counted. For 4 weights that is nothing, for a model with a billion weights it is impossible, and the Hessian alone would have 10¹⁸ entries.

So large models use only the gradient, plus cheap summaries of curvature that [Optimizers and Learning Rate Schedules](/data-ai/optimizers) describes. The Hessian still serves as the reference for what a good step would be.

## A Few Identities Worth Knowing

Matrix calculus has a small set of results that appear everywhere:

| Function | Gradient |
| --- | --- |
| aᵀw | a |
| wᵀAw, with A symmetric | 2Aw |
| ‖Xw − y‖² | 2Xᵀ(Xw − y) |

The third is the gradient of least squares, the formula the price model used. Setting it to zero gives the **normal equations**, XᵀXw = Xᵀy, which is how [Linear Regression](/data-ai/linear-regression) is solved in one line.

## Key Points

- The Jacobian is the matrix of partial derivatives of a vector function, and for a linear model it is the data matrix itself
- The Hessian is the matrix of second derivatives, and for least squares it is (2/n) XᵀX
- Its eigenvalues are curvatures: in the price model they ranged from 472,242 to 2,691, a condition number of 175.5
- The largest eigenvalue caps the step at 2 divided by it, 4.2 × 10⁻⁶ here, which matched where descent stopped working
- <u>Rescaling the features reduces the condition number</u>, and in our data it fell from 175.5 to 34.2 and made descent faster
