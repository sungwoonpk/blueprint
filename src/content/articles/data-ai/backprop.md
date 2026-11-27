> **Backpropagation** computes the gradient of the loss with respect to every weight in a network, in about the time of one extra forward pass. It applies the chain rule from the output backward, reusing the values saved on the way forward. It is the reason networks with millions of weights can be trained at all.

[Gradient Descent](/data-ai/gradient-descent) needs the slope of the loss for each weight. A network has many weights buried under layers of functions. Computing each slope separately would be hopeless.

## The Idea

A network is a chain of simple steps. [The Chain Rule and Computational Graphs](/data-ai/chain-rule) gives the rule for such chains: the effect of an early value on the loss is the product of the local slopes along the path to it. Backpropagation organizes that product:

1. **Forward pass**: compute each intermediate value from the input to the loss, and keep them
2. **Backward pass**: start with the slope of the loss with respect to itself, which is 1, and move back one step at a time, multiplying by each step's local slope
3. At each weight, the incoming slope times the value that weight multiplied gives the gradient

Shared paths are computed once. That reuse is the whole trick.

## By Hand

Take one input, one hidden unit with a tanh activation and one output. Set x = 2, w₁ = 0.5, w₂ = 1.5, with no biases, target t = 1 and loss L = (y − t)² / 2.

Forward:

| Step | Value |
| --- | --- |
| z = w₁x | 1.0 |
| h = tanh(z) | 0.7616 |
| y = w₂h | 1.1424 |
| L = (y − 1)² / 2 | 0.01014 |

Backward, one local slope at a time:

| Slope | Computation | Value |
| --- | --- | --- |
| dL/dy | y − t | 0.1424 |
| dL/dw₂ | dL/dy × h | 0.1084 |
| dL/dh | dL/dy × w₂ | 0.2136 |
| dL/dz | dL/dh × (1 − h²) | 0.0897 |
| dL/dw₁ | dL/dz × x | 0.1794 |

Stepping both weights against their gradients with a learning rate of 0.1 lowers the loss from 0.01014 to 0.00617.

## Check It Numerically

We can verify any gradient by nudging a weight and watching the loss: (L(w + ε) − L(w − ε)) / 2ε. With ε = 0.00001 the numeric values were 0.1794019939 for w₁ and 0.1084443316 for w₂, matching the backward pass to about nine decimal places. This **gradient check** is the standard test for hand-written gradients. It is too slow for training and ideal for debugging.

## Layers at Once

With matrices, a layer computes z = hW + b, and the backward rules are compact: the gradient for W is the layer's input transposed times the incoming slope, and the slope passed further back is the incoming slope times W transposed. [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians) shows where these come from. The activation contributes an element-by-element multiplication by its slope.

## Why It Is Cheap

The backward pass does about as much arithmetic as the forward pass. We timed a forward pass and a forward plus backward pass on networks of three sizes:

| Parameters | Forward Plus Backward, Compared With Forward | Forwards Needed to Nudge Each Weight Twice |
| --- | --- | --- |
| 4,618 | 2.3 times | 9,236 |
| 30,730 | 2.5 times | 61,460 |
| 319,498 | 2.9 times | 638,996 |

At 319,498 parameters, getting the gradient by nudging would have taken about two minutes per step on our machine. Backpropagation took well under a millisecond.

## Costs and Failures

- **Memory**: every intermediate value from the forward pass is kept for the backward pass, so memory grows with depth and batch size. It is often the limit on training. Recomputing some values later trades time for memory
- **Vanishing and exploding gradients**: the product of many slopes can shrink toward zero or blow up, the subject of [Initialization and Vanishing Gradients](/data-ai/initialization)
- **Not biology**: it is an algorithm for computing derivatives, nothing more

Rumelhart, Hinton and Williams made it widely known for neural networks in 1986. Today nobody writes it by hand for each model: [Automatic Differentiation](/data-ai/autodiff) does.

## Key Points

- Backpropagation applies the chain rule backward through the computation, reusing forward values
- One backward pass gives every gradient for about two to three times the cost of a forward pass
- A worked example gave gradients of 0.1794 and 0.1084, confirmed numerically to nine decimals
- It stores intermediate values, so memory grows with depth and batch size
- <u>Check any hand-written gradient against a numeric one before trusting it</u>
