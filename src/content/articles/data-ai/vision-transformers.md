> A **vision transformer** cuts an image into patches, treats each patch as a token and runs an ordinary transformer over them. It has fewer built-in assumptions about images than a convolutional network, so it needs more data to learn them, and with enough data it matches or beats convolutional networks.

[CNN Architectures](/data-ai/cnn-architectures) built image knowledge into the layers. The vision transformer asks whether that knowledge can be learned instead.

## Patches as Tokens

Dosovitskiy and colleagues split an image into patches of 16×16 pixels, flatten each, and project it to a vector. With positions added, the sequence goes into a standard transformer encoder.

For a 224×224 color image:

| Quantity | Value |
| --- | --- |
| Patches | 14 × 14 = 196 |
| Numbers per patch | 16 × 16 × 3 = 768 |
| Base model parameters, our count | 86.6 million |

A learned **class token** or an average over patches produces the image label.

## Fewer Built-In Assumptions

A convolution assumes that neighboring pixels matter together and that a pattern means the same anywhere. A transformer assumes neither: from the start, every patch can attend to every other, and it must learn from data which neighbors matter. The paper says Vision Transformers lack some of the **inductive biases** of convolutional networks, so they do worse when trained on insufficient data, and that training on large datasets trumps this bias.

## Our Small Test

On the 16×16 shapes task of the [Convolutions and Feature Maps](/data-ai/convolutions) article, with 4×4 patches, 2 layers and width 32:

| Training Images | Tiny Vision Transformer, 26,372 Parameters | Convolutional Network With Global Pooling, 3,364 |
| --- | --- | --- |
| 100 | 41.8% | 97.9% |
| 400 | 59.8% | 99.6% |
| 1,600 | 89.1% | 99.8% |
| 6,400 | 95.2% | 99.8% |

With little data the transformer trailed badly despite eight times more parameters. It closed most of the gap as data grew. The shapes task suits a convolution especially well, so this shows the direction and not a general ranking.

## Cost and Resolution

Tokens grow with resolution, and attention compares all pairs:

| Image and Patch Size | Tokens | Pairs of Tokens |
| --- | --- | --- |
| 224, patch 32 | 49 | 2,401 |
| 224, patch 16 | 196 | 38,416 |
| 384, patch 16 | 576 | 331,776 |
| 1,024, patch 16 | 4,096 | 16,777,216 |

Doubling the side quadruples the tokens and increases pairs sixteenfold. Variants that attend within local windows and merge patches, such as Swin, bring back some locality to control this cost.

## Choosing

- **Small datasets**: a convolutional network, or a pretrained transformer fine-tuned as in [Transfer Learning with Pretrained Networks](/data-ai/transfer-learning)
- **Large-scale pretraining** available: transformers are competitive or better
- **Multimodal** models share one architecture for images and text, as in [Multimodal Models](/data-ai/multimodal)
- **Edge devices**: efficient convolutional networks are often cheaper

## Key Points

- Vision transformers turn image patches into tokens and use a standard transformer
- They lack the locality and translation assumptions of convolutions, so need more data
- Our tiny transformer scored 42 percent against 98 for a CNN with 100 images, and 95 against 100 with 6,400
- Attention cost grows with the square of the token count
- <u>Use a pretrained vision transformer or a CNN when labeled data is small</u>
