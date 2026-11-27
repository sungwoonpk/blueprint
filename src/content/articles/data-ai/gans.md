> A **generative adversarial network** trains two networks against each other: a **generator** makes samples from random noise, and a **discriminator** tries to tell them from real data. The generator improves by fooling it. GANs can produce sharp samples, and they are known to be unstable and to drop parts of the data, called **mode collapse**.

Goodfellow and colleagues proposed the idea in 2014. No reconstruction target is needed: the discriminator supplies the training signal.

## The Game

| Player | Input | Aim |
| --- | --- | --- |
| Generator G | Random noise | Produce samples the discriminator accepts |
| Discriminator D | Real and generated samples | Output high scores for real, low for fake |

The two update in turns. In the original paper's analysis, the ideal end is a generator whose distribution matches the data and a discriminator that can only guess. In practice, the generator is usually trained to maximize log D(G(z)) because it gives stronger gradients early on, as the paper suggests.

## Eight Clusters

Our data is a ring of 8 tight Gaussian clusters in two dimensions. We trained five small GANs, with different random starts, and counted how many clusters each produced, with at least 2 percent of its samples:

| Run | Samples Near a Cluster | Clusters Produced |
| --- | --- | --- |
| 1 | 84.9% | 8 of 8 |
| 2 | 53.4% | 6 of 8 |
| 3 | 76.2% | 8 of 8 |
| 4 | 88.9% | 6 of 8 |
| 5 | 84.7% | 8 of 8 |

With identical code, two runs dropped two clusters. The fourth looks good on the first measure, 89 percent of its samples are near a cluster, and it is missing a quarter of the data. A real sample from this data is within the threshold 99 percent of the time.

## Reading the Losses

The two losses don't tell us when it works. Across one training run, the discriminator's loss stayed near 1.3 and the generator's drifted between 0.7 and 1.0 while the number of clusters changed from 1 to 8. A GAN's loss measures the contest and not the quality. Judge with separate measures on samples.

## Why It Is Hard

- The two players chase each other, and the game need not settle
- If D becomes too good, G gets little useful gradient
- G may find a few outputs that fool D and stick to them
- Results are sensitive to architecture, learning rates and the balance of updates

Many fixes exist, among them different losses such as the Wasserstein distance, gradient penalties and normalization. They help and don't remove the difficulty.

## Where They Stand

GANs were the leading image generators through the late 2010s. [Diffusion Models](/data-ai/diffusion) have taken much of that role, while adversarial losses remain useful inside other systems, for example to sharpen outputs. GAN samplers are fast: one pass through the generator.

## Cautions

Realistic fake images raise real risks of deception, which the responsible AI phase and [Copyright, Licensing and Data Provenance](/data-ai/copyright-provenance) discuss.

## Key Points

- A generator and a discriminator train against each other
- Training can drop whole parts of the data: two of five runs missed 2 of 8 clusters
- Sample quality alone can hide missing modes
- The loss values don't indicate quality, so measure coverage on samples
- <u>Check coverage as well as quality when evaluating a generator</u>
