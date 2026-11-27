> Deep networks have more than enough capacity to memorize their training data. **Dropout** randomly switches off units during training, **weight decay** pulls weights toward zero, and **early stopping** halts when performance on held-out data stops improving. They limit overfitting, and more or augmented data usually helps more than any of them.

[Regularization with L1 and L2](/data-ai/regularization) added a penalty to linear models. Networks use that idea and some of their own.

## The Tools

| Method | What It Does | Setting |
| --- | --- | --- |
| Weight decay | Shrinks every weight a little each step | Strength, often 0.01 to 0.1 with AdamW |
| Dropout | Zeroes each hidden unit with probability p in training, and rescales the rest | p, often 0.1 to 0.5 |
| Early stopping | Keeps the weights from the best point on a validation set | Patience |
| Data augmentation | Trains on altered copies, such as shifted or cropped images | Which changes keep the label |
| Smaller model | Fewer layers or units | Size |

Srivastava and colleagues' 2014 paper on dropout explains it as sampling from many thinned networks, which stops units from relying on one another. At test time the full network is used, with weights scaled so the expected input matches. Libraries usually do that scaling during training instead.

## A Test on Noisy Data

We trained a network of two layers of 128 units on only 150 points of the three-arm spiral, with 15 percent of labels replaced at random, and tested on 3,000 clean points. Guessing gives 33 percent. Averages of four runs:

| Setup | Train Accuracy | Test Accuracy | Test Loss |
| --- | --- | --- | --- |
| No regularization | 98.0% | 53.6% | 4.07 |
| Weight decay 0.1 | 94.0% | 55.5% | 1.91 |
| Weight decay 1.0 | 69.0% | 51.5% | 1.03 |
| Dropout 0.5 | 79.8% | 56.2% | 1.49 |
| 600 training points | 75.9% | 66.4% | 0.87 |
| 2,400 training points | 69.3% | 72.1% | 0.67 |

The plain network fit 98 percent of a training set in which 15 percent of labels are wrong, so it memorized the noise. Its accuracy of 54 percent hides a test loss of 4.07: it is confidently wrong. Decay and dropout cut the loss by half or more and moved accuracy by only a few points. Sixteen times more data raised accuracy to 72 percent.

## Early Stopping

Stopping at the lowest validation loss:

| Setup | Stopped at Step | Test Accuracy | Test Loss |
| --- | --- | --- | --- |
| No regularization | 150 | 43.3% | 1.14 |
| Weight decay 1.0 | 2,037 | 51.1% | 1.01 |
| 2,400 training points | 1,625 | 72.6% | 0.67 |

Without regularization, early stopping gave a far better loss, 1.14 against 4.07, and a worse accuracy, 43 against 54 percent: the loss was lowest before the network had finished learning the shape. Choose the quantity you stop on to match the one you care about. And the validation set that stops training is no longer an unbiased test, as [Training, Validation and Test Sets](/data-ai/train-val-test) explains.

## Dropout Details

Dropout is active only in training. Leaving it on at test time adds noise: in one of our runs accuracy fell from 51.1 to 48.1 percent. Batch normalization already adds some noise, and its paper reports it can reduce the need for dropout. Transformers apply small dropout rates in several places, and very large language models often use little or none, since data is plentiful.

## What To Try, in Order

1. More data, or augmentation that keeps labels true
2. Transfer from a pretrained model, as in [Transfer Learning with Pretrained Networks](/data-ai/transfer-learning)
3. Weight decay, then dropout
4. Early stopping on a held-out metric
5. A smaller model

Measure the gap between training and validation first, using [Overfitting and Underfitting](/data-ai/overfitting). Regularizing an underfit model makes it worse.

## Key Points

- Dropout, weight decay, early stopping and augmentation limit how much a network memorizes
- A network fit 98 percent of noisy training labels and scored a test loss of 4.07 from confident mistakes
- Regularization cut the loss sharply and changed accuracy by a few points, while 16 times more data gained 19 points
- Early stopping on loss improved loss and lost accuracy here, so stop on the metric that matters
- <u>Get more data before tuning regularizers, and switch dropout off at inference</u>
