> Training failures in deep learning are often silent: the program runs and the loss goes down a little while a bug ruins the result. A fixed routine catches most of them: check the data, check the initial loss, overfit a single batch, then scale up while watching training and validation curves.

A network with a bug rarely crashes. It just learns badly, and that looks the same as a hard problem. The remedy is to test in small steps where the right answer is known.

## Check the Start

Before training, a classifier that knows nothing should spread probability evenly, so its loss should be near ln K for K classes. For our three-class spiral the first loss was 1.09, and ln 3 is 1.099. With ten classes it was 2.50 against ln 10 of 2.30, a bit high because the starting weights produce uneven scores. A loss far above that points to a bug or a badly scaled start.

## Overfit One Batch

Take eight examples and train until the model fits them. A working model and optimizer should drive the loss to near zero: ours reached 0.00014 with 100 percent accuracy. If it can't, something is broken, and more data won't fix it.

## Bugs and Their Signatures

We introduced one mistake at a time into an otherwise identical training run of 1,200 steps:

| Mistake | Training Loss | Test Accuracy |
| --- | --- | --- |
| None | 0.038 | 99.4% |
| Gradients never cleared | 1.114 | 33.0% |
| Softmax applied twice | 0.192 | 95.9% |
| Training labels shuffled | 1.087 | 35.5% |
| Labels out of step with the inputs in each batch | 1.100 | 34.7% |
| Learning rate 10 | 1.516 | 33.4% |
| Learning rate 0.00001 | 1.062 | 43.9% |

Several different bugs look identical: a loss stuck near 1.10 and accuracy near one third. The loss alone can't say which. The softmax mistake is the nastiest because it still works, at 96 percent against 99, so nobody notices. Frameworks' cross-entropy expects raw scores, and passing probabilities flattens the gradients.

## A Routine

1. **Look at the data** as the model will see it, after all preprocessing, and print a few inputs with their labels
2. **Fix the random seed** and use a small subset
3. **Check the initial loss** and the output shapes
4. **Overfit one batch**
5. **Find a learning rate** by trying values on a log scale, or by raising it until the loss blows up
6. **Train on all the data** while plotting training and validation loss
7. **Change one thing at a time** and log it

## Reading the Curves

| What You See | Likely Cause | Try |
| --- | --- | --- |
| Loss becomes not-a-number | Rate too high, or a log of zero | Lower the rate, clip gradients, check [Floating Point and Numerical Stability](/data-ai/floating-point) |
| Loss flat from the start | No gradient reaching weights, or bad labels | Print gradient sizes per layer |
| Training loss falls, validation rises | Overfitting | [Dropout, Weight Decay and Early Stopping](/data-ai/dl-regularization), more data |
| Both losses high and flat | Underfitting | Bigger model, longer training, better inputs |
| Validation better than training | Dropout on in training, or a leak | Check modes and splits |
| Sudden spikes | Bad batches or a high rate | Clip gradients, inspect the batch |

## Common Culprits

- **Mode switches**: dropout and batch normalization must be set to inference for evaluation
- **Preprocessing mismatch** between training and evaluation, such as different scaling
- **Wrong axis** in a softmax or a normalization, which silently mixes examples
- **Broadcasting** that pairs every prediction with every label
- **Data leakage**, from [Data Leakage](/data-ai/data-leakage), when results are too good

## Keep Records

Log the loss, learning rate, gradient size and the code version of every run, as [Experiment Tracking and Reproducibility](/data-ai/experiment-tracking) describes. Compare with a simple baseline, such as logistic regression: a deep model that can't beat it is telling you something.

## Key Points

- Deep learning bugs tend to fail quietly, so test in steps with known answers
- A K-class classifier should start near a loss of ln K, and any working setup should overfit one batch
- Several different bugs gave the same flat loss near 1.10, and a double softmax still scored 96 percent against 99
- Plot training and validation loss, change one thing at a time and keep records
- <u>Overfit a single batch before training on everything</u>
