> The **chain rule** says the derivative of a composition is the product of the derivatives of its parts. A **computational graph** records a calculation as a chain of small steps, and **backpropagation** applies the chain rule backward through it to get the gradient of the loss with respect to every weight in about the cost of one forward pass.

A model is a composition: features go through a product with the weights, then a bend, then another product, then a loss. To train it, we need the derivative of the loss with respect to each weight, through all of those steps. [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians) set up the objects. This page shows how to compute them efficiently, which is the central trick of deep learning.

## The Chain Rule

If y = f(g(x)), then dy/dx = f′(g(x)) · g′(x): the slope of the outer function at the inner value, times the slope of the inner function. A small change in x moves g by g′ times that, and moves f by f′ times that. For several steps, the factors multiply along the chain. With many variables the factors become Jacobians and the product becomes a matrix product.

## A Calculation as a Graph

Take one listing with feature x = 2, weight w = 3, bias b = 1 and sold price y = 5. The squared error is built in four small steps, each a node in a graph:

| Step | Operation | Value |
| --- | --- | --- |
| z | w × x | 6 |
| p | z + b | 7 |
| e | p − y | 2 |
| L | e² | 4 |

Running the nodes in this order is the **forward pass**. Each node knows only its own local derivative: z changes with w at rate x, p changes with z at rate 1, e with p at rate 1, and L with e at rate 2e.

## Backward, One Factor at a Time

Start at the output, where dL/dL = 1, and walk backward, multiplying by each local derivative:

| Node | Derivative of L With Respect to It | How |
| --- | --- | --- |
| L | 1 | The start |
| e | 4 | 1 × 2e, with e = 2 |
| p | 4 | 4 × 1 |
| b | 4 | 4 × 1 |
| z | 4 | 4 × 1 |
| w | 8 | 4 × x, with x = 2 |
| x | 12 | 4 × w, with w = 3 |

One backward sweep delivered the derivative with respect to every input at once: 8 for the weight, 4 for the bias and 12 for the feature. Where a value feeds several nodes, the contributions add. This is **reverse mode automatic differentiation**, and for a network, backpropagation is exactly this, as [Backpropagation](/data-ai/backprop) works through. The method works on any program made of differentiable steps, and [Automatic Differentiation](/data-ai/autodiff) covers how libraries record the graph.

## Why Backward and Not Forward

The chain rule can also be applied forward, carrying a derivative along with each value. That costs one pass for each input, so a model with a million weights would need a million passes. Backward mode starts from the single output, the loss, and gets all the derivatives in one pass. Since a model has many inputs and one loss, backward wins by a factor of the number of weights.

We built a tiny reverse mode differentiator, about 25 lines, and compared it with the finite difference of the last topic, which takes one extra evaluation for each weight. For a function of d weights:

| Weights | Backward Pass | Finite Differences | Finite Differences Divided by Backward |
| --- | --- | --- | --- |
| 10 | Under 0.0001 s | Under 0.0001 s | About 0.3 |
| 100 | 0.0002 s | 0.0002 s | 1.1 |
| 1,000 | 0.0022 s | 0.0171 s | 7.8 |

The gap grows with the number of weights, since finite differences cost d + 1 evaluations and the backward pass about 2 or 3. At a million weights the ratio is in the hundreds of thousands, and it is why networks of that size can be trained at all. The difference in the gradient itself was below 2 × 10⁻⁵, which is the finite difference's own error, so the two methods agreed.

## The Costs of Going Backward

The backward pass needs the values from the forward pass: the derivative of w × x with respect to w is x, which must be remembered. So training stores the intermediate values of every layer, and memory grows with depth and batch size. Techniques that recompute some of the values instead of storing them trade time for memory.

Two more points are worth knowing. A step with a derivative of zero over a wide region, such as a hard threshold, passes no signal back, which is why networks use smooth bends. And a long chain of factors smaller than 1 shrinks the signal toward zero, and one larger than 1 blows it up, the vanishing and exploding gradients of [Initialization and Vanishing Gradients](/data-ai/initialization).

## Key Points

- The chain rule multiplies local derivatives along a composition, with Jacobians as the factors when there are many variables
- A computational graph breaks a calculation into small nodes, each with a local derivative
- A backward sweep gave the derivative of the loss with respect to every input in one pass: 8 for the weight, 4 for the bias and 12 for the feature in our example
- Backward mode costs about two or three passes for any number of weights, while finite differences cost one for each: the gap was 7.8 times at 1,000 weights in our test
- <u>Backpropagation is the chain rule applied in reverse</u>, and the price is storing the forward values
