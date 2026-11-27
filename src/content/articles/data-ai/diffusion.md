> A **diffusion model** learns to reverse a gradual noising process. Training adds noise to data and asks a network to predict the noise. Generation starts from pure noise and removes a little at a time over many steps. It is stable to train and covers the data well, at the cost of many passes to make one sample.

A single step from noise to an image is hard. Many small steps, each only slightly cleaning up, are much easier to learn.

## Adding Noise

Take a data point x₀. After t steps, the noisy version is a mix:

x_t = √ᾱ_t · x₀ + √(1 − ᾱ_t) · noise

where ᾱ_t falls from 1 toward 0 as t grows. At step 0 the point is untouched, and at the end it is nearly pure noise. In our 100-step schedule the factor on the signal, √ᾱ_t, was 1.00 at step 0, 0.88 at 25, 0.59 at 50, 0.31 at 75 and 0.13 at 99. The paper of Ho and colleagues, DDPM, used 1,000 steps.

## Training

For each training example: pick a random step t, make x_t, and train a network to predict the noise that was added, given x_t and t. This is the denoising task of [Autoencoders](/data-ai/autoencoders) at many noise levels, trained with a squared error. Ho and colleagues found that this simple objective works well.

## Generating

Start with random noise. For each step from the last to the first, predict the noise, subtract part of it, and add a little fresh noise except at the end. After 100 steps you have a sample.

## Eight Clusters Again

On the 8-cluster data of the [Generative Adversarial Networks](/data-ai/gans) article, three runs of a small diffusion model gave:

| Run | Samples Near a Cluster | Clusters Produced |
| --- | --- | --- |
| 1 | 95.3% | 8 of 8 |
| 2 | 94.3% | 8 of 8 |
| 3 | 93.9% | 8 of 8 |

No clusters were lost, and quality was close to the 99 percent that true samples reach. Structure appears late: the share near a cluster was 3 percent at step 75, 10 percent at step 25, 46 percent at step 10 and 95 percent at the end. Early steps set the rough layout and the last ones sharpen.

## Compared With GANs

| | GAN | Diffusion |
| --- | --- | --- |
| Training | Adversarial, can be unstable | A regression loss, stable |
| Coverage | Can drop modes | Covers them well |
| Sampling cost | One pass | Many passes |
| Likelihood | None | An approximate bound |

## Making It Practical

- **Fewer steps**: improved samplers and distillation reduce hundreds of steps to a few
- **Latent diffusion**: run the process in the small code space of the models in [Variational Autoencoders](/data-ai/vaes), which cuts the cost greatly
- **Conditioning**: give the network a text description or label, with guidance to strengthen it
- **Other data**: audio, video, molecules and more

## Cautions

Generators can reproduce training examples and imitate styles, which raises privacy and copyright questions, covered in [Memorization and Privacy Attacks](/data-ai/privacy-attacks).

## Key Points

- A diffusion model learns to predict noise added at random levels, then removes noise step by step
- The simple noise-prediction loss makes training stable
- Our three small models covered all 8 clusters with about 95 percent of samples near one
- Sampling is slow because of the many steps, and latent diffusion and faster samplers reduce it
- <u>Expect coverage and stability from diffusion, and budget for sampling cost</u>
