> A **convolutional network** stacks blocks of convolution, activation and downsampling, so that spatial size shrinks while the number of channels grows, and ends with a classifier. The history from LeNet to AlexNet, VGG and ResNet is a history of going deeper while spending parameters and computation more carefully.

[Convolutions and Feature Maps](/data-ai/convolutions) gave the layer. An architecture is the plan for putting layers together.

## The Common Pattern

<figure class="diagram">
<div class="flow">
<div class="node">Image<small>large, 3 channels</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Early blocks<small>edges and textures</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Later blocks<small>parts and objects</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Classifier<small>scores per class</small></div>
</div>
<figcaption>Width and height shrink as channels grow</figcaption>
</figure>

A frequent rule: each time the map halves in width and height, double the channels, so each block costs about the same.

## Milestones

| Network | Year | What It Showed |
| --- | --- | --- |
| LeNet | 1998 | Convolution and pooling read handwritten digits |
| AlexNet | 2012 | Deep convolutional networks win large-scale image classification, using ReLU, dropout and GPUs |
| VGG | 2014 | Depth with stacks of small 3×3 filters |
| GoogLeNet | 2014 | Parallel filter sizes and 1×1 convolutions save computation |
| ResNet | 2015 | Skip connections make 152 layers trainable |

AlexNet's paper reports 60 million parameters and a top-5 error of 15.3 percent in the 2012 ImageNet competition, against 26.2 percent for the runner-up. That gap turned the field toward deep learning. ResNet's authors report 3.57 percent top-5 error with an ensemble.

## Small Filters, Stacked

VGG's lesson: two 3×3 layers see the same 5×5 region as one 5×5 layer, with fewer weights and an extra nonlinearity. With 256 channels in and out, two 3×3 layers need 1,180,160 parameters and one 5×5 needs 1,638,656. Small filters became the norm.

## Where the Parameters Are

We counted VGG-16 from its layer list:

| Part | Parameters | Share |
| --- | --- | --- |
| 13 convolution layers | 14.7 million | 11% |
| 3 fully connected layers | 123.6 million | 89% |
| Total | 138.4 million | |

Nearly all the weights sit in the dense layers at the end, while nearly all the computation is in the convolutions. Later networks replace most of the dense part with **global average pooling**, which averages each channel to one number, and cut the parameter count sharply. The same pooling idea gave position invariance in the previous article.

## Cheaper Blocks

A 1×1 convolution mixes channels without looking at neighbors, so it can shrink the channel count before an expensive 3×3. A **bottleneck block** goes 256 channels down to 64 with 1×1, applies 3×3, then goes back to 256. It has 70,016 parameters, against 1,180,160 for two 3×3 layers at full width, a factor of 17. ResNet's deeper models use it.

Other efficient designs, such as MobileNet, split a convolution into a per-channel spatial step and a 1×1 mixing step, called **depthwise separable** convolution.

## Choosing One Today

1. Start from a **pretrained** model, as in [Transfer Learning with Pretrained Networks](/data-ai/transfer-learning). Designing a new architecture is rarely needed
2. Match size to the constraint: a phone needs an efficient network, a server can afford a large one
3. Compare on accuracy, latency and memory together, not parameters alone
4. Consider [Vision Transformers](/data-ai/vision-transformers) when data and computation are plentiful

## Key Points

- Convolutional networks shrink spatial size and grow channels, then classify
- AlexNet's 15.3 percent top-5 error against 26.2 percent in 2012 started the deep learning wave
- Stacked 3×3 filters see as far as larger ones with fewer parameters
- In VGG-16, 89 percent of 138 million parameters sit in the dense layers, which later designs replaced with pooling
- <u>Reuse a pretrained architecture and judge it on accuracy, speed and memory together</u>
