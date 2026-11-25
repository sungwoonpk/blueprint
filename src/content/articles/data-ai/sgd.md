> **Stochastic gradient descent** estimates the gradient from one example, or a small minibatch, instead of the whole dataset. Each step is far cheaper and a little noisy. On large data it reaches a good solution after seeing the data only a fraction of a time, which is why every large model is trained this way.

[Gradient Descent](/data-ai/gradient-descent) computes the loss's gradient over all examples at every step. With millions of examples, one step could take minutes, and many steps are needed. SGD makes a bet that a rough direction, cheaply, beats an exact one, slowly.

## Three Flavors

| Method | Examples per Step | Gradient | Behavior |
| --- | --- | --- | --- |
| Batch | All | Exact | Smooth path, expensive step |
| Stochastic | 1 | Very noisy | Cheap step, erratic path |
| Minibatch | 32 to a few thousand | Moderately noisy | The standard compromise |

A random sample's gradient has the true gradient as its average, and its noise falls with the square root of the sample size, the logic of [Sampling Distributions and the Central Limit Theorem](/data-ai/sampling-distributions). One **epoch** is a pass through all training data, in random order.

## How Much Work to Get There

We trained the price model on 3,000 sales with standardized features and counted the number of examples processed until the loss came within 2 percent of the best possible value. Each method used a learning rate tuned roughly for it, and we ran each three times:

| Method | Learning Rate | Examples Processed to Reach 2% of Best Loss |
| --- | --- | --- |
| Full batch | 0.3 | 84,000 |
| Minibatch of 256 | 0.1 | 24,000 |
| Minibatch of 32 | 0.05 | 5,400 to 6,000 |
| One example at a time | 0.005 | 1,800 to 2,400 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Examples processed to reach 2 percent of the best loss: full batch 84000, minibatch 256 24000, minibatch 32 about 6000, single example about 2100">
<div class="hbar"><span>Full batch</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">84,000</span></div>
<div class="hbar"><span>Minibatch 256</span><span class="track"><span class="fill" style="--w: 28.6%"></span></span><span class="value">24,000</span></div>
<div class="hbar"><span>Minibatch 32</span><span class="track"><span class="fill" style="--w: 7.1%"></span></span><span class="value">about 5,700</span></div>
<div class="hbar peak"><span>One example</span><span class="track"><span class="fill" style="--w: 2.5%"></span></span><span class="value">about 2,100</span></div>
</div>
<figcaption>Work to reach a loss within 2 percent of the best, on 3,000 simulated sales</figcaption>
</figure>

Single-example SGD got there after seeing about two thirds of the data once, while full batch needed 28 passes. Early in training the gradients of different examples agree, so one example is almost as informative as all of them and 3,000 times cheaper. This is the strongest case for SGD, and our problem is easy and well conditioned. Harder problems need more epochs, and the ordering of costs holds.

## The Cost of Noise

The noise that makes steps cheap also stops SGD from settling exactly. With a constant learning rate it keeps bouncing around the minimum. We ran single-example SGD with a rate of 0.02 against a best loss of 10.92:

| Steps | Loss |
| --- | --- |
| 3,001 | 11.59 |
| 20,001 | 11.82 |
| 60,000 | 11.39 |

The loss stays about 4 to 8 percent above the best and doesn't improve, because every step reacts to one example's error. Two standard remedies:

- **Decay the learning rate** over training, so steps shrink as we near the minimum
- **Increase the batch size** late in training, which cuts the noise

Noise is not always a nuisance. In nonconvex problems like neural networks, it helps SGD escape poor regions, and it is thought to favor solutions that generalize better.

## Practical Choices

- **Minibatch size** is a hardware and statistics trade: larger batches use GPUs better and give cleaner gradients, smaller ones update more often. 32 to 512 is common
- **Shuffle** the data each epoch, since a sorted order, such as all cheap books first, biases the steps
- **Learning rate schedules** and warm-up are standard, as [Optimizers and Learning Rate Schedules](/data-ai/optimizers) describes
- **Scale the features**, as before
- **Track the loss on a validation set**, since the training loss from minibatches is noisy

## Where It Matters Most

For linear models on modest data, the choice is a convenience. For deep networks on millions or billions of examples, full-batch gradients are out of the question, and minibatch SGD or one of its variants is how learning happens at all. The same loop trains the models of [Training and Debugging Deep Networks](/data-ai/training-deep-nets).

## Key Points

- SGD estimates the gradient from one example or a minibatch, so each step is cheap and slightly noisy
- To reach within 2 percent of the best loss on our data, full batch processed 84,000 examples and single-example SGD about 2,100
- With a constant rate SGD hovers above the minimum, and decaying the rate or growing the batch fixes that
- Minibatches of 32 to 512 balance hardware use and gradient quality
- <u>Shuffle every epoch, decay the learning rate, and watch the validation loss</u>
