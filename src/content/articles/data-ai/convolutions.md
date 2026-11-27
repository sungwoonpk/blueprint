> A **convolution** slides a small grid of weights, a filter, across an image and computes a weighted sum at each position. The same weights are used everywhere, so a pattern learned in one corner is found in any other, with far fewer parameters than a fully connected layer. The outputs are **feature maps**.

The textbook app lets sellers upload a photo of the book. To a computer that photo is a grid of numbers, as [Tables, Text, Images and Sequences](/data-ai/kinds-of-data) described. A dense layer treats every pixel as a separate feature and ignores that neighbors belong together. Convolution builds in both ideas.

## The Operation

Take a 5×5 image whose left three columns are 0 and right two are 1, and this 3×3 filter:

| −1 | 0 | 1 |
| --- | --- | --- |
| −2 | 0 | 2 |
| −1 | 0 | 1 |

Place the filter over the top-left 3×3 patch, multiply matching entries and add. Slide it one step right and repeat. The result is a 3×3 feature map, the same in every row:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| 0 | 4 | 4 |

The output is zero where the image is flat and large where the dark region meets the bright one. This filter is a hand-made vertical edge detector. In a convolutional network the filter values are weights, learned by [Backpropagation](/data-ai/backprop), and a layer has many filters, each producing its own map.

## The Settings

| Setting | Meaning | Effect |
| --- | --- | --- |
| Filter size | Often 3×3 | How much neighborhood each output sees |
| Number of filters | Output channels | How many patterns are looked for |
| Stride | Step between positions | A stride of 2 halves the size |
| Padding | Zeros around the border | Keeps the size unchanged |

For an input of width n, filter width k, padding p and stride s, the output width is the floor of (n − k + 2p) / s, plus 1. The 5-wide image with a 3-wide filter and no padding gives 3, as above. **Pooling** shrinks maps by keeping the largest or average value in each small block.

## Why So Few Parameters

Connecting a 224×224 color image to 64 units with a dense layer takes 9,633,856 parameters. A 3×3 convolution with 64 filters takes 1,792, whatever the image size. The saving comes from two assumptions: **locality**, that nearby pixels matter together, and **weight sharing**, that a useful pattern is useful anywhere.

## Seeing Farther

One 3×3 layer sees a 3×3 patch. A second layer on top sees 5×5 of the original, since each of its inputs already covers 3×3. This growing **receptive field** lets early layers respond to edges and later ones to larger shapes. Pooling and strides grow it faster.

## Position and Invariance

We made 16×16 images of four shapes, a horizontal bar, a vertical bar, a plus and a square outline, with noise, and compared three small models when shapes appear at random positions:

| Training Images | Dense Network, 16,708 Parameters | Convolutions Then a Dense Head, 9,604 | Convolutions Then Global Pooling, 3,364 |
| --- | --- | --- | --- |
| 100 | 36.5% | 58.6% | 97.7% |
| 400 | 46.7% | 89.3% | 99.6% |
| 1,600 | 63.0% | 97.6% | 99.8% |

The smallest model learned fastest. We then trained with every shape in the center and tested on shapes moved around:

| Model | Centered Test | Shifted Test |
| --- | --- | --- |
| Dense network | 99.6% | 26.1% |
| Convolutions, dense head | 99.5% | 32.9% |
| Convolutions, global pooling | 99.8% | 99.5% |

A convolution is **equivariant**: shift the input and the feature map shifts with it. It is not **invariant** by itself. The dense head reads the map position by position, so it learned "this shape in the center" and failed elsewhere. Global pooling keeps the strongest response wherever it occurs, which gives invariance to position.

Real networks sit between these extremes, using pooling, strides and data augmentation. Convolutions don't give invariance to rotation or scale at all.

## Key Points

- A convolution applies the same small set of weights at every position, producing feature maps
- Filter size, number, stride and padding set the output's shape and cost
- A 3×3 layer with 64 filters has 1,792 parameters, against 9.6 million for a dense layer on a color image
- Trained on centered shapes, a dense head scored 33 percent on shifted ones and global pooling 99.5 percent
- <u>Convolution shifts with the input, and pooling is what makes a network ignore position</u>
