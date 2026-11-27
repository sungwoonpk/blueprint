> An **autoencoder** learns to reproduce its input after squeezing it through a narrow **code**. With only linear layers it recovers what PCA finds. With nonlinear layers it can follow curved structure and compress far better. A **denoising** autoencoder is trained to clean up corrupted inputs.

No labels are needed: the input is its own target. The point is the code in the middle, a compact description the network had to invent.

## The Shape

<figure class="diagram">
<div class="flow">
<div class="node">Input</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Encoder</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Narrow code</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Decoder</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Reconstruction</div>
</div>
<figcaption>Training compares the reconstruction with the input</figcaption>
</figure>

If the code were as wide as the input, the network could copy. The bottleneck forces it to keep what matters.

## Compared With PCA

We used 16×16 images of four shapes at random positions, 256 pixels each, and measured the squared error per pixel on new images. Predicting the average image gives 0.0528:

| Code Size | PCA | Linear Autoencoder | Nonlinear Autoencoder |
| --- | --- | --- | --- |
| 2 | 0.0484 | 0.0492 | 0.0364 |
| 8 | 0.0383 | 0.0386 | 0.0084 |
| 32 | 0.0157 | 0.0158 | 0.0040 |

The linear autoencoder matches [Principal Component Analysis](/data-ai/pca) almost exactly, as theory says: both find the best linear subspace. A shape moving around an image traces a curved surface in pixel space that no flat subspace can follow, and the nonlinear model with a code of 8 had less than a quarter of PCA's error.

Training matters. An earlier version of this experiment with ReLU units left the small-code models stuck predicting the average image, and a smoother activation fixed it.

## Denoising

Add noise to the input and ask for the clean image:

| Input | Squared Error |
| --- | --- |
| The noisy image itself | 0.1228 |
| Autoencoder trained on clean images, given noisy input | 0.0797 |
| Denoising autoencoder | 0.0078 |

The denoiser, trained on pairs of noisy input and clean target, removed 94 percent of the noise error. It had to learn what shapes look like in order to separate them from noise. [Diffusion Models](/data-ai/diffusion) build generators out of exactly this task.

## Uses

- **Compression** and dimension reduction when relationships are curved
- **Anomaly detection**: unusual inputs reconstruct badly, as in [Anomaly Detection](/data-ai/anomaly-detection)
- **Denoising** and filling in missing parts
- **Pretraining** encoders from unlabeled data, as in [Self-Supervised and Contrastive Learning](/data-ai/self-supervised)

## Limits

- Reconstruction rewards pixel fidelity, which may not be what a downstream task needs
- A plain autoencoder's code space has gaps, so decoding a random code gives junk. [Variational Autoencoders](/data-ai/vaes) address this
- A model with enough capacity can memorize, so keep the bottleneck tight or add noise or penalties

## Key Points

- An autoencoder learns a compact code by reconstructing its input
- A linear one matches PCA, and a nonlinear one does far better on curved structure: 0.0084 against 0.0383 with 8 numbers
- A denoising autoencoder cut the error of noisy images by 94 percent
- Random codes in a plain autoencoder decode poorly
- <u>Compare with PCA, and judge codes by the task you care about</u>
