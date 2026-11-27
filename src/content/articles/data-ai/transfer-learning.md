> **Transfer learning** starts from a network trained on a large dataset and adapts it to a new task. Either keep its layers **frozen** and train only a new final layer, or **fine-tune** all the layers with a small learning rate. It is how useful image and language models get built from a few hundred examples.

The textbook app wants to tell a worn cover from a clean one. A few hundred labeled photos are not enough to train a deep network from scratch. They don't need to be.

## Why It Works

Early layers of image networks learn edges and color blobs that serve almost any picture, and later layers specialize. Yosinski and colleagues measured this and found that transferability falls as the two tasks grow apart, but that features from even a distant task can beat random ones.

## Two Main Recipes

| Recipe | What Changes | Cost | Risk |
| --- | --- | --- | --- |
| Feature extraction | Only a new final layer, the rest frozen | Cheap, can precompute features | Old features may not suit the new task |
| Fine-tuning | All layers, at a small learning rate | More computation | Overfitting and forgetting |

A common order: train the new head with the rest frozen, then unfreeze and continue with a rate around ten to a hundred times smaller. Large rates would destroy what was transferred.

## A Test With Shapes

We trained a small convolutional network on four shapes with 3,000 images, which reached 98.8 percent. The target task has four different shapes: two diagonals, a cross of diagonals and a corner. We compared training from scratch, freezing the learned layers and fine-tuning, averaging five runs:

| Labeled Target Images | From Scratch | Frozen Features | Fine-Tuned |
| --- | --- | --- | --- |
| 20 | 38.0% | 49.7% | 49.0% |
| 40 | 41.1% | 53.2% | 54.6% |
| 100 | 57.5% | 58.0% | 63.4% |
| 400 | 81.5% | 61.1% | 79.0% |

With 20 or 40 labels, transfer is ahead by about 11 to 14 points. At 100, fine-tuning leads. At 400, training from scratch wins: the frozen features top out near 61 percent because the old shapes, bars and squares, don't describe diagonals well, and fine-tuning carries some of that bias.

Our source and target are tiny and quite different. With large pretrained models and natural photos, transfer usually keeps its lead much longer. The table still shows the pattern: the advantage is largest with few labels, and frozen features set a ceiling.

## Practical Choices

- **Pick a source close to your task**: photos for photos, medical images for medical images if available
- **Match the preprocessing** of the pretrained model, including image size and normalization
- **Learning rates**: small for the old layers, larger for the new head
- **Batch normalization**: decide whether its running statistics stay fixed. With small batches, keep them
- **Augment** the target data
- **Compare** with a from-scratch baseline

## Beyond Images

Language models are the same idea at a larger scale: train once on enormous text, then adapt, which [Supervised Fine-Tuning and Instruction Tuning](/data-ai/sft) covers. [Self-Supervised and Contrastive Learning](/data-ai/self-supervised) builds the pretrained model without labels at all.

## Cautions

- **Inherited biases and errors** come along with the weights
- **Licenses** may restrict use of a pretrained model or its data
- **Overlap** between pretraining data and your test set inflates results, a form of [Data Leakage](/data-ai/data-leakage)
- **Distant domains**, such as satellite or microscope images, may gain little

## Key Points

- Transfer learning reuses a trained network, either freezing it or fine-tuning with small rates
- Early features are general and later ones specific, and transfer weakens as tasks differ
- With 20 target labels, transfer scored about 49 percent against 38 from scratch
- With 400 labels training from scratch won on our small, dissimilar tasks, and frozen features hit a ceiling
- <u>Try a pretrained model first when labels are few, and keep a from-scratch baseline</u>
