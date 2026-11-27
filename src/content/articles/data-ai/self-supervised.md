> **Self-supervised learning** invents a task from unlabeled data, such as predicting a hidden part, so a model learns useful representations before seeing a single label. **Contrastive** learning pulls two views of the same item together and pushes different items apart. A small labeled set then suffices for the final task.

Unlabeled data is plentiful and labels are costly. Self-supervised learning spends the unlabeled data to learn how the data is structured.

## Two Families

| Family | Task | Examples |
| --- | --- | --- |
| Predictive | Hide part of the input and predict it | Next-word prediction, masked words or patches |
| Contrastive | Match two views of one item among others | SimCLR for images |

Language models are the biggest success of the first: predicting the next token turns all text into training data.

## Contrastive Learning

For each item in a batch, make two altered views, such as crops or color changes. The encoder maps each to a vector. The loss asks each view to pick out its partner among all the others, with a softmax over similarities. This is a classification where the data supplies the classes.

Chen and colleagues' SimCLR paper found that the **choice of augmentations** matters greatly, that a small extra network between the encoder and the loss helps, and that large batches provide more negatives.

The augmentations decide what the model learns to ignore. If you crop and shift, the representation becomes insensitive to position.

## A Toy With a Clear Answer

We pretrained a small convolutional encoder on unlabeled pairs: the same shape drawn at two different places with different noise. Then we froze it and trained only a linear layer on a few labels:

| Labeled Examples | Contrastive Encoder, Linear Layer | Random Encoder, Linear Layer | Trained From Scratch |
| --- | --- | --- | --- |
| 20 | 88.0% | 33.9% | 35.7% |
| 40 | 95.1% | 34.6% | 44.3% |
| 100 | 98.3% | 39.4% | 60.3% |
| 400 | 99.1% | 44.7% | 87.1% |

With 20 labels, the pretrained encoder reached 88 percent and the others about a third. The reason is that the pairs taught it that position and noise do not matter, which is exactly what the shape task needs. Our world has only eight distinct objects, four shapes in two sizes, so this is far easier than natural images. Gains there are real and much smaller.

## Evaluating Representations

- **Linear probe**: freeze the encoder and train a linear layer. It measures what is easily readable
- **Fine-tuning**: adjust all weights on labels, often better
- **Few-label curves**: how accuracy grows with labels, as above
- **Nearest neighbors** in the vector space, as a sanity check

## Pitfalls

- Augmentations can destroy what the task needs, such as color when color matters
- Items that are truly similar are treated as negatives, pushing them apart
- **Collapse**: all vectors become the same, which methods avoid with negatives or other tricks
- Pretraining on data close to the test set inflates scores, a form of [Data Leakage](/data-ai/data-leakage)

## Key Points

- Self-supervised learning creates targets from the data itself
- Contrastive learning matches two views of an item against all others, and augmentations define invariances
- Our encoder reached 88 percent with 20 labels, against about 36 from scratch, in an easy toy world
- Linear probes and few-label curves measure what was learned
- <u>Choose augmentations that preserve what the final task cares about</u>
