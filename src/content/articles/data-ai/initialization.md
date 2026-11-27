> The starting values of the weights decide whether signals and gradients keep a usable size as they pass through many layers. Too small and they fade to nothing, too large and they explode. **Xavier** and **He** initialization scale the random weights by the layer's width so that the size of the signal is roughly preserved.

A network starts with random weights, and "random" hides an important choice: how big. In a shallow network almost anything works. In a deep one, a small error in scale is multiplied layer after layer.

## Why Zero Is Wrong

If all weights in a layer start equal, every unit computes the same value, receives the same gradient and stays identical forever. Random values break the symmetry. The biases can start at zero.

## Watching the Signal

We passed random inputs through 20 layers of 256 units and measured the spread of the activations. No training is involved:

| Activation and Weight Spread | Layer 1 | Layer 5 | Layer 10 | Layer 20 |
| --- | --- | --- | --- | --- |
| Tanh, 1 | 0.97 | 0.97 | 0.97 | 0.97 |
| Tanh, 0.01 | 0.16 | 0.0001 | 0.00000001 | 1.1 × 10⁻¹⁶ |
| Tanh, Xavier | 0.63 | 0.32 | 0.23 | 0.16 |
| ReLU, 1 | 9.3 | 1.5 × 10⁵ | 2.6 × 10¹⁰ | 7.7 × 10²⁰ |
| ReLU, 0.01 | 0.093 | 0.000015 | 2.6 × 10⁻¹⁰ | 7.7 × 10⁻²⁰ |
| ReLU, Xavier | 0.58 | 0.14 | 0.023 | 0.00064 |
| ReLU, He | 0.82 | 0.80 | 0.74 | 0.65 |

With weights of spread 0.01 the signal vanishes within ten layers. With spread 1 and ReLU it explodes past 10²⁰. Tanh with spread 1 looks steady at 0.97, which is deceptive: its units are saturated near −1 and 1, where the slope is almost zero. Only He initialization keeps the ReLU signal near its starting size across 20 layers.

## The Rules

Each unit sums n inputs, so the variance of its output grows with n times the variance of the weights. Keeping the output as spread as the input fixes the weight variance:

| Name | Weight Variance | For |
| --- | --- | --- |
| Xavier, from Glorot and Bengio, 2010 | 2 / (inputs + outputs) | Tanh and sigmoid-like units |
| He, from He and colleagues, 2015 | 2 / inputs | ReLU and its variants |

The factor 2 in He's rule makes up for ReLU zeroing half of its inputs, which is why Xavier, which assumes no such zeroing, still fades in a deep ReLU stack. He and colleagues report that their rule lets very deep rectifier networks train from scratch.

## It Decides Whether Training Works

We then trained 20-layer networks of width 64 on the three-arm spiral, with the Adam optimizer for 600 steps, and measured the first layer's gradient before training:

| Setup | First-Layer Gradient at Start | Training Accuracy After 600 Steps |
| --- | --- | --- |
| ReLU, He | 0.11 | 97.7% |
| ReLU, Xavier | 0.000074 | 86.5% |
| ReLU, spread 0.01 | 6 × 10⁻²⁷ | 34.5% |
| ReLU, spread 1 | 2 × 10¹⁴ | 49.6% |
| Tanh, Xavier | 0.068 | 51.4% |
| Tanh, spread 0.01 | 1 × 10⁻²³ | 34.5% |

With one of three classes to guess, 34.5 percent means nothing was learned. The adaptive optimizer rescued the ReLU network with Xavier partially, since Adam rescales small gradients, but couldn't save gradients of 10⁻²⁷. The tanh network had healthy gradients and was simply slow within this budget.

## Vanishing and Exploding Gradients

The backward pass multiplies by the weights and slopes at every layer, so the same compounding applies to gradients, the problem [Backpropagation](/data-ai/backprop) warned about. Besides initialization, the remedies are:

- **Activations** that don't saturate, from [Activation Functions](/data-ai/activations)
- **Normalization** between layers, in [Batch and Layer Normalization](/data-ai/normalization-layers), which makes the scale of the weights matter much less
- **Skip connections**, in [Residual Networks](/data-ai/residual-networks)
- **Gradient clipping**, capping the gradient's length, which is standard for [Recurrent Neural Networks](/data-ai/rnns)
- **Gated cells** for long sequences, in [Long Short-Term Memory and GRUs](/data-ai/lstm-gru)

Libraries apply sensible defaults. They are worth checking when you build unusual layers or very deep stacks.

## Key Points

- Equal starting weights keep units identical, so weights start random
- The variance of the signal scales with width times weight variance, and errors compound layer by layer
- Xavier suits tanh-like units and He suits ReLU, which kept the signal near 0.65 after 20 layers
- A weight spread of 0.01 or 1 left a 20-layer ReLU network learning nothing or worse
- <u>Match the initialization to the activation, and print activation and gradient sizes when a deep network won't learn</u>
