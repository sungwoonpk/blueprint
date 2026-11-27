> A **residual connection** adds a block's input to its output, so the block only has to learn a correction to what it received. This makes very deep networks trainable: without it, adding layers can make even the training error worse. Skip connections are now in nearly every deep architecture, including transformers.

More layers should never hurt. A deeper network could copy the shallower one and leave the extra layers doing nothing. In practice, plain deep networks fail to find that solution.

## The Degradation Problem

He and colleagues observed that a 56-layer plain network had higher training error than a 20-layer one on an image dataset. This is not overfitting, since the error on the training data itself is worse. They called it **degradation**. Their networks used batch normalization, and the authors argue that vanishing gradients were unlikely to be the cause.

## The Fix

Instead of asking a block to compute the whole output H(x), ask it for the difference F(x) = H(x) − x, and output F(x) + x.

<figure class="diagram">
<div class="flow">
<div class="node">x</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Layers compute F(x)</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">F(x) + x</div>
</div>
<figcaption>The input also skips around the layers and is added back</figcaption>
</figure>

If the best thing a block can do is nothing, it only has to push F toward zero, which is easy. The skip path also gives the gradient a direct route back to earlier layers.

## Our Replication

We trained networks of width 32 on the three-arm spiral, with and without skip connections, 1,000 steps each, no normalization, averaged over three starts:

| Hidden Layers | Plain: Training Loss | Plain: Test Accuracy | Residual: Training Loss | Residual: Test Accuracy |
| --- | --- | --- | --- | --- |
| 2 | 0.327 | 92.3% | 0.477 | 85.8% |
| 6 | 0.020 | 98.8% | 0.023 | 98.8% |
| 14 | 0.080 | 96.5% | 0.055 | 97.8% |
| 26 | 0.048 | 98.1% | 0.016 | 99.0% |
| 42 | 1.084 | 37.1% | 0.080 | 96.7% |

At 6 layers there is no difference. At 42 layers the plain network learned nothing, with a loss at chance level, while the residual one reached 96.7 percent. At 2 layers the plain network was better: skips help depth and do nothing for shallow models. In the residual version we also scaled the initial weights down by the square root of the depth, so the sum of many corrections stays moderate.

The plain 42-layer network's first-layer gradient at the start was about half the size of the last layer's, so it had not vanished at initialization. That matches the paper's argument that the trouble is one of optimization.

## Where Skips Go

| Design | Idea |
| --- | --- |
| ResNet block | Add the input after two or three convolutions |
| Bottleneck block | The same, with 1×1 layers to save computation |
| Pre-activation block | Normalize and activate before the weights, which trains very deep stacks better |
| Projection shortcut | A 1×1 layer on the skip when the shape changes |
| DenseNet | Concatenate earlier outputs instead of adding |

Every sub-layer of [The Transformer Architecture](/data-ai/transformer-architecture) has a residual connection. Without it, stacks of dozens of attention layers would not train.

## Another View

A residual network can be read as many paths of different lengths added together, since each block may be passed through or around. It can also be read as refining a representation step by step: each block nudges it. Neither view is the whole story, and the practical fact stands without them.

## Key Points

- A residual block outputs its input plus a learned correction
- Plain deep networks can have higher training error than shallow ones, which is a failure to optimize and not overfitting
- Our 42-layer plain network stayed at chance, and the residual one reached 96.7 percent
- At shallow depth skips gave no benefit
- <u>Add skip connections when stacking many layers, and don't expect them to help a shallow model</u>
