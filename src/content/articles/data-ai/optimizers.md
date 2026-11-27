> An **optimizer** turns gradients into weight updates. **Momentum** accumulates a velocity to move steadily through narrow valleys. **Adam** also scales each weight's step by the recent size of its gradient, and **AdamW** applies weight decay separately from that scaling. A **learning rate schedule** changes the step size over training, usually warming up and then decaying.

[Stochastic and Minibatch Gradient Descent](/data-ai/sgd) steps against the gradient. The plain step has two weaknesses: it zigzags across narrow valleys and it uses one step size for every weight.

## The Family

| Optimizer | Update, in Words |
| --- | --- |
| SGD | Step against the current gradient |
| Momentum | Keep a running velocity: mostly the old velocity plus the new gradient |
| RMSProp | Divide each step by the recent root-mean-square of that weight's gradient |
| Adam | Momentum's average of gradients, divided by RMSProp's scale, with a correction for the first steps |
| AdamW | Adam, with weights also shrunk directly each step |

Kingma and Ba, who proposed Adam, suggest defaults of a 0.001 learning rate, 0.9 and 0.999 for the two averaging constants and a tiny constant to avoid dividing by zero.

## A Narrow Valley

The loss 50x² + y²/2 is 100 times steeper in one direction than the other. We counted the steps from the point (1, 1) until the loss fell below one millionth:

| Optimizer | Learning Rate | Steps |
| --- | --- | --- |
| SGD | 0.001 | More than 5,000 |
| SGD | 0.01 | 653 |
| SGD | 0.019 | 343 |
| SGD | 0.021 | Diverged |
| Momentum, 0.9 | 0.005 | 112 |
| Momentum, 0.9 | 0.019 | 169 |
| Adam | 0.01 | 305 |
| Adam | 0.1 | 82 |

SGD is limited by the steep direction: above a rate of 0.02 it diverges, and at that limit it crawls along the flat one. Momentum builds speed along the flat direction and cancels the zigzag, cutting the best case from 343 to 112. Adam rescales each direction, which removes much of the difference in steepness.

## On a Network

Loss on the three-arm spiral with two hidden layers of 64, averaged over three starts, lower is better:

| Optimizer and Rate | After 200 Steps | After 800 Steps |
| --- | --- | --- |
| SGD, 0.1 | 1.046 | 1.002 |
| SGD, 1.0 | 0.780 | 0.418 |
| Momentum, 0.1 | 0.813 | 0.076 |
| RMSProp, 0.003 | 0.960 | 0.111 |
| Adam, 0.003 | 1.032 | 0.158 |
| Adam, 0.05 | 0.204 | 0.113 |

The learning rate mattered as much as the optimizer: SGD at 0.1 barely moved, and at 1.0 did far better. Well-tuned momentum ended lowest. Adam is popular because it works reasonably across problems with little tuning, not because it always wins.

## Schedules

A large rate moves fast early and can't settle late. We ran Adam with a base rate of 0.02 for 1,500 steps:

| Schedule | Final Loss | Test Accuracy |
| --- | --- | --- |
| Constant | 0.017 | 99.0% |
| Drop to a tenth at step 1,000 | 0.005 | 99.4% |
| Cosine decay to zero | 0.005 | 99.5% |
| Warmup, then cosine | 0.004 | 99.5% |

Decaying the rate lowered the final loss by three to four times here. **Warmup**, ramping the rate up over the first steps, protects the early phase when the averages are unreliable and the weights are fragile. It is standard for large transformers.

## Why AdamW

In plain SGD, adding an L2 penalty to the loss and shrinking the weights each step are equivalent. In Adam they are not, as Loshchilov and Hutter showed: the penalty's gradient is divided by the same scale as everything else, so weights with large gradients are barely decayed. We isolated the effect with two weights that only receive noise and decay, one with large gradients and one with small, both starting at 1:

| After 500 Steps | Weight With Large Gradients | Weight With Small Gradients |
| --- | --- | --- |
| Adam with an L2 penalty | 1.035 | 0.566 |
| AdamW | 0.990 | 0.954 |

With the penalty, decay depended on how noisy each weight's gradient was: one weight lost 43 percent and the other none. AdamW treats them alike, so the decay setting means the same thing for every weight and is easier to tune.

## Choosing

1. Start with AdamW at its defaults, plus warmup and cosine decay
2. Try SGD with momentum where it is the tradition, as in much image training
3. Tune the learning rate first, on a log scale, before anything else
4. Clip gradients if the loss spikes

## Key Points

- Momentum averages gradients to cancel zigzags, and Adam also scales each weight's step by its gradient size
- On a narrow valley the best step counts were 343 for SGD, 112 for momentum and 82 for Adam
- On the spiral, tuned momentum ended lowest, so Adam is a convenient default more than a guaranteed winner
- Decaying the learning rate cut the final loss by three to four times, and AdamW decays all weights alike
- <u>Tune the learning rate and its schedule before switching optimizers</u>
