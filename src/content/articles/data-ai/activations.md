> The **activation function** is the nonlinearity between layers. **Sigmoid** and **tanh** flatten out for large inputs, so their gradients vanish in deep networks. **ReLU** passes positive values unchanged and is the common default, with **leaky ReLU** and **GELU** as variations. The choice affects whether a deep network trains at all.

The activation is a small, fixed function applied to each unit's weighted sum. It looks like a detail. In a deep network it decides how much of the error signal reaches the first layers.

## The Main Functions

| Name | Formula | Output Range | Slope at 0 | Slope at 4 |
| --- | --- | --- | --- | --- |
| Sigmoid | 1 / (1 + e⁻ᶻ) | 0 to 1 | 0.25 | 0.018 |
| Tanh | (eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ) | −1 to 1 | 1.00 | 0.001 |
| ReLU | max(0, z) | 0 upward | undefined, taken as 0 | 1 |
| Leaky ReLU | z if positive, else 0.01z | All | undefined | 1 |
| GELU | z times the Gaussian probability below z | About −0.17 upward | 0.5 | 1.00 |

Training multiplies slopes along the path from output to input, as [Backpropagation](/data-ai/backprop) shows. The sigmoid's slope is never above 0.25, so ten sigmoid layers can shrink a signal by a factor of up to a million. A unit whose input is far from zero is **saturated**: its slope is near zero and it barely learns.

## An Eight-Layer Test

We trained networks with eight hidden layers of 32 units on a three-arm spiral, 1,500 points, and compared five activations over three starts. We also measured, before training, the gradient of the first layer's weights divided by that of the last:

| Activation | Test Accuracy After 300 Steps | After 2,000 Steps | First-Layer Over Last-Layer Gradient |
| --- | --- | --- | --- |
| Sigmoid | 33.5% | 41.6% | 0.0000069 |
| Tanh | 46.2% | 81.7% | 1.3 |
| ReLU | 95.2% | 98.3% | 0.47 |
| Leaky ReLU | 96.8% | 98.4% | 0.47 |
| GELU | 98.6% | 99.0% | 0.53 |

With sigmoid, the first layer's gradient was about 150,000 times smaller than the last, and the network barely got past guessing one of three classes. Tanh, centered on zero, kept the gradients healthy at the start and still learned far more slowly than the ReLU family. Glorot and Bengio's 2010 study found the sigmoid unsuited to deep networks with random initialization, because its outputs aren't centered at zero and the top layers saturate.

## Dead ReLUs

ReLU's flat side has its own failure. If a unit's input is negative for every example, its gradient is zero and it never recovers. We trained a two-layer network with plain gradient descent at three learning rates:

| Learning Rate | Dead Units, First and Second Hidden Layer | Test Accuracy |
| --- | --- | --- |
| 1.0 | 0%, 8% | 99.3% |
| 5.0 | 45%, 100% | 33.4% |
| 10.0 | 91%, 100% | 33.4% |

A rate that is too large knocked the units into the dead zone in a few steps, and the second layer died completely. The network then outputs the same thing for every input. Leaky ReLU keeps a small slope on the negative side so a unit can climb back, and a smaller learning rate avoids the problem.

## Choosing

- **Hidden layers**: ReLU as the default. GELU is common in transformers, covered in [The Transformer Architecture](/data-ai/transformer-architecture)
- **Output layer**: set by the task, not by taste. None for regression, sigmoid for yes or no, [Multiclass Classification and Softmax](/data-ai/softmax) for one of many
- **Sigmoid and tanh** inside a network: mainly as gates in [Long Short-Term Memory and GRUs](/data-ai/lstm-gru), where a value between 0 and 1 is the point
- **Initialization** must match the activation, as in [Initialization and Vanishing Gradients](/data-ai/initialization)

## Key Points

- The activation provides the nonlinearity, and its slope controls how gradients flow back through layers
- Sigmoid's slope is at most 0.25, and in an 8-layer network the first layer's gradient was 150,000 times smaller than the last
- ReLU, leaky ReLU and GELU trained the deep network to 98 to 99 percent, against 42 percent for sigmoid
- A large learning rate can kill ReLU units for good: at a rate of 5, the whole second layer died
- <u>Use ReLU or GELU inside, and choose the output activation from the task</u>
