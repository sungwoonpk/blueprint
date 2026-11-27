> **Normalization layers** rescale the values flowing through a network to have a stable mean and spread, then let the network learn a new scale and shift. **Batch normalization** computes the statistics across the examples of a minibatch, and **layer normalization** across the features of one example. Both allow larger learning rates and make training less fragile.

[Initialization and Vanishing Gradients](/data-ai/initialization) sets a good scale at the start. As weights change, that scale drifts. Normalization holds it in place throughout training.

## The Two Kinds

For a value z entering an activation, subtract a mean, divide by a standard deviation, then apply a learned gain and offset. The difference is where the mean and deviation come from:

| | Batch Normalization | Layer Normalization |
| --- | --- | --- |
| Statistics over | The same unit across the examples in a batch | All units of one example |
| At test time | Uses running averages saved from training | Same computation as in training |
| Depends on batch size | Yes | No |
| Typical use | Convolutional image networks | Recurrent networks and transformers |

Ioffe and Szegedy introduced batch normalization in 2015, describing the problem as shifting input distributions inside the network, and reported that it allows much higher learning rates, less careful initialization and some regularization. Ba, Kiros and Hinton introduced layer normalization in 2016 for cases where batch statistics are awkward. Why batch normalization helps so much is still debated.

## Larger Learning Rates

We trained a network of ten hidden layers of 64 units with momentum for 500 steps on the spiral data:

| Learning Rate | No Normalization: Loss | Batch Norm: Loss | Layer Norm: Loss |
| --- | --- | --- | --- |
| 0.001 | 1.03 | 0.17 | 0.93 |
| 0.01 | 0.36 | 0.17 | 0.15 |
| 0.05 | 0.35 | 0.23 | 0.60 |
| 0.2 | 1.11 | 0.40 | 1.11 |

A loss of 1.10 is chance for three classes. Batch norm learned at every rate, including 0.001, where the plain network was still near chance, and 0.2, where both others failed. Layer norm did best at 0.01 and was no more robust than the plain network at the high rate. The gains vary with the data and network.

## Rescuing a Bad Start

We then initialized the weights three times too large in a six-layer network, trained with Adam:

| Setup | Loss | Test Accuracy |
| --- | --- | --- |
| No normalization | 0.322 | 84.5% |
| Batch norm | 0.096 | 98.4% |
| Layer norm | 0.043 | 98.2% |

Both made the network largely indifferent to the poor scale.

## The Batch Size Problem

Batch norm's statistics are estimates from the batch, and with few examples they are noisy. We varied the batch size for a four-layer network trained 1,200 steps:

| Batch Size | Batch Norm Accuracy | Layer Norm Accuracy |
| --- | --- | --- |
| 2 | 34.8% | 50.0% |
| 4 | 39.6% | 59.4% |
| 16 | 76.1% | 96.9% |
| 64 | 99.0% | 98.7% |

At batch 64 they tie. At 16, batch norm lost 21 points to layer norm. Small batches also mean fewer examples seen in 1,200 steps, which is why both fall, but batch norm falls much further. It is the main reason layer norm, or group norm for images, is used when batches are small, as with very large models.

## Train and Test Mode

Batch norm behaves differently in training and inference. In training it uses the current batch. At test time it uses running averages, so one example's output doesn't depend on its neighbors. Forgetting to switch modes is a common bug: results become erratic and depend on the batch composition. A second subtlety: if training data and test data differ, the saved averages are wrong for the new data.

## Where They Go

The usual order is linear or convolution, then normalization, then activation. Transformers place layer norm around each sub-block, and placing it before rather than after has become common because it trains more stably, as [The Transformer Architecture](/data-ai/transformer-architecture) notes.

## Key Points

- Normalization layers rescale activations and then learn a gain and offset
- Batch norm uses batch statistics and running averages at test time, and layer norm uses each example alone
- Batch norm trained at learning rates from 0.001 to 0.2, where the plain network failed at both ends
- Batch norm degrades with small batches: 76 percent against 97 for layer norm at batch size 16
- <u>Use batch norm for image networks with decent batches, layer norm for sequences and small batches, and switch modes at inference</u>
