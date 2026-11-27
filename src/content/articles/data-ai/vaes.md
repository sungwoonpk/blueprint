> A **variational autoencoder** maps each input to a distribution over codes, pulls those distributions toward a simple prior, and decodes samples from them. This makes the code space smooth enough that sampling a new code produces a new example. The balance between reconstruction and the pull to the prior is set by one weight.

The plain models of [Autoencoders](/data-ai/autoencoders) learn codes with no structure between them. To generate, we need a code space we can sample from.

## The Idea

The encoder outputs a mean and a variance for each code dimension. We sample a code from that Gaussian and decode it. Training minimizes:

- a **reconstruction** term: how badly the decoder reproduces the input
- a **KL** term: how far the encoder's distribution is from a standard Gaussian, from [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl)

Kingma and Welling showed how to optimize this lower bound on the data's likelihood. The trick that makes sampling trainable, called **reparameterization**, writes the sample as mean plus spread times fixed noise, so gradients pass through the mean and spread.

## The Balance

Multiply the KL term by a weight β. We trained a VAE with 16 code dimensions on clean images of shapes, then generated from random codes. A separate classifier judged whether each sample looked clearly like a shape, which it did for every real image:

| β | Reconstruction Error | KL | Dimensions in Use | Samples the Classifier Was Sure Of |
| --- | --- | --- | --- | --- |
| 0.1 | below 0.0001 | 24.4 | 16 | 57.5% |
| 1 | 0.0011 | 12.9 | 16 | 55.7% |
| 4 | 0.0075 | 5.4 | 14 | 43.9% |
| 20 | 0.0528 | 0.0 | 0 | 17.3% |

At β = 20 the model gave up: every code collapsed to the prior, so the code carries nothing, the reconstruction is the average image, and the samples were all judged one class. This is **posterior collapse**. Small β reconstructs sharply. In every setting many samples were not clear shapes, though real images always were: a sample from random codes can fall where the decoder has learned little.

## Properties

- **Smooth**: nearby codes decode to similar outputs, so interpolation works
- **Probabilistic**: gives an approximate likelihood bound
- **Blurry**: VAE images are often softer than other generators', since the decoder averages over possibilities
- **Stable to train**, compared with [Generative Adversarial Networks](/data-ai/gans)

## Where They Are Used

VAEs compress images into a smaller space where other models work, including image generators that run [Diffusion Models](/data-ai/diffusion) in a VAE's latent space. They also serve anomaly detection and representation learning.

## Practical Notes

- Watch both terms separately: a falling total can hide a collapsed KL
- Anneal β from 0 upward to avoid early collapse
- Report active dimensions
- Judge samples with more than one measure, as in [Evaluating Generative Models](/data-ai/evaluating-generative)

## Key Points

- A VAE encodes inputs as distributions, penalizes distance from a prior and decodes samples
- Reparameterization lets gradients pass through sampling
- β trades reconstruction for a code space like the prior, and at 20 our model collapsed
- Samples were often unclear, though real images never were
- <u>Monitor reconstruction and KL separately to catch collapse</u>
