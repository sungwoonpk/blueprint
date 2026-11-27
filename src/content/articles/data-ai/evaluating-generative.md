> A generator has no single correct output, so evaluating it needs several measures: how realistic samples are, how much of the data's variety they cover, and whether they copy training data. Summary scores such as the Fréchet distance compress both quality and variety into one number and can be fooled. Inspect samples too.

A classifier has accuracy. A generator can fail in three different ways, and one number rarely catches all.

## The Three Questions

| Question | Measure |
| --- | --- |
| Are samples realistic? | Precision: share of samples near real data |
| Do they cover the variety? | Recall: share of real data near some sample |
| Are they new? | Distance to the nearest training example |

A **Fréchet distance** compares the mean and covariance of two sets of points. The widely used FID, from Heusel and colleagues, applies it to features of an image network.

## Eight Models Under One Roof

We scored generators of the 8-cluster data. Fréchet distance here is computed on the raw two numbers, times 1,000, lower is better:

| Generator | Fréchet | Precision | Recall | Median Distance to Training Data |
| --- | --- | --- | --- | --- |
| Fresh real samples | 10.1 | 0.98 | 0.97 | 0.009 |
| Diffusion model | 7.0 | 0.96 | 0.98 | 0.010 |
| GAN, all 8 clusters | 3.5 | 0.85 | 0.72 | 0.014 |
| GAN, 6 clusters | 309 | 0.89 | 0.80 | 0.008 |
| Only 4 of 8 clusters | 2,454 | 0.97 | 0.48 | 0.009 |
| Right clusters, 5× too blurry | 14.2 | 0.22 | 0.98 | 0.259 |
| One Gaussian with the data's mean and covariance | 0.85 | 0.07 | 0.95 | 0.619 |
| Copies of the training data | 3.9 | 0.98 | 0.90 | 0.000 |

Read the surprises. A single blob with the right mean and covariance, which looks nothing like eight clusters, scores the **best** Fréchet distance, better than fresh real data. Its precision of 0.07 exposes it. Copying the training set scores almost perfectly and only the distance of 0 shows it is not new. Missing half the clusters keeps precision high and recall falls to 0.48.

Differences of a few units among the best scores, such as 3.5 against 10.1, are sampling noise of a 2,000-point estimate, and the table shows why more than one measure is needed. Feature-based FID is far better than raw numbers for images and still summarizes with a mean and covariance.

## For Images and Text

- **FID** and relatives for images
- **Human ratings** for quality and preference, the most direct and costly
- **Task-specific checks**: does generated text answer correctly, is code runnable, as in [How Language Models Are Benchmarked](/data-ai/llm-benchmarks)
- **Safety and bias** testing
- **Likelihood**, where a model gives one, which measures fit and not sample quality

## Practice

1. Look at many random samples, not cherry-picked ones
2. Report quality, coverage and novelty separately
3. Use the same reference set and sample size when comparing
4. Check nearest training neighbors for copies
5. Evaluate on the use that matters

## Key Points

- Generative models need separate measures for realism, coverage and novelty
- A single Gaussian beat real data on our Fréchet distance while having a precision of 0.07
- Copying the training set scores well except on distance to training data
- Compare scores only with the same reference set and sample size
- <u>Never rely on one summary number, and always look at samples</u>
