> A network with one wide enough hidden layer can approximate any continuous function, but "wide enough" may mean impractically wide. **Depth** lets later layers reuse what earlier ones computed, so some functions need exponentially fewer units in a deep network than in a shallow one. Being able to represent a function is a separate matter from being able to learn it.

How big should a network be, and should it grow wider or deeper? The question has a theory part, about what can be represented at all, and a practical part, about what training finds.

## Universal Approximation

Results from around 1989, by Cybenko and by Hornik and colleagues, show that a network with a single hidden layer and a suitable nonlinearity can approximate any continuous function on a bounded region as closely as we like, given enough units. It is a reassuring result and a limited one. It says nothing about how many units are needed, whether training will find the weights, or whether the network will generalize.

We approximated a smooth wavy curve with one hidden layer of ReLU units, three random starts each:

| Hidden Units | Median Squared Error |
| --- | --- |
| 2 | 0.193 |
| 4 | 0.163 |
| 8 | 0.048 |
| 32 | 0.039 |
| 128 | 0.0003 |

More units give a closer fit, as the theorem promises. A ReLU network computes a **piecewise linear** function, and each unit in a single layer can add at most one new bend, so n units give at most n + 1 straight pieces.

## What Depth Adds

Consider the "tent" function that goes from 0 up to 1 and back to 0 on the interval from 0 to 1. It takes two ReLU units. Feed its output into another tent and the result has two tents. Each composition doubles the number of pieces. We built these networks by hand and counted:

| Tents Composed | Straight Pieces | ReLU Units in the Deep Network | Units a Single Layer Needs, at Least |
| --- | --- | --- | --- |
| 2 | 4 | 4 | 3 |
| 3 | 8 | 6 | 7 |
| 4 | 16 | 8 | 15 |
| 5 | 32 | 10 | 31 |
| 6 | 64 | 12 | 63 |

The deep network grows by 2 units for each doubling, and the shallow one must double. At 20 compositions that is 40 units against more than a million. Telgarsky's 2016 paper proves a result of this kind: some functions computed by deep networks can't be approximated by much shallower ones unless they are exponentially large.

## Representable Is Not Learnable

We then asked training to find a 16-piece sawtooth, the 4-composition function, from 1,000 examples. A hand-built network with 8 units represents it exactly. Gradient descent did not come close with small networks:

| Network, as Layer Sizes | Parameters | Best Squared Error of Three Starts |
| --- | --- | --- |
| 1, 16, 1 | 49 | 0.071 |
| 1, 64, 1 | 193 | 0.053 |
| 1, 256, 1 | 769 | 0.026 |
| 1, 8, 8, 8, 1 | 169 | 0.057 |
| 1, 8, 8, 8, 8, 1 | 241 | 0.028 |
| 1, 16, 16, 16, 1 | 593 | 0.015 |

Depth helped: 241 parameters in a four-layer network matched 769 in one wide layer, and the best result came from a deep network. But none learned the function exactly, although it needs only a handful of well-chosen weights. Highly oscillating targets are hard for gradient descent to discover. Theory about what exists is not a promise about what training finds.

## Width or Depth in Practice

| | Wider | Deeper |
| --- | --- | --- |
| Adds | More features at each stage | More stages of features built on features |
| Training | Easier to optimize | Harder without [Residual Networks](/data-ai/residual-networks) and normalization |
| Parallel hardware | Uses it well | Layers run one after another |
| Fits | Tables, simpler structure | Images, text, structure with levels |

Deep networks suit data with a hierarchy: edges make shapes and shapes make objects. For most tables, a few moderately wide layers are enough. Size is usually chosen by trying a few and watching validation error, with regularization from [Dropout, Weight Decay and Early Stopping](/data-ai/dl-regularization) to control the excess.

## Capacity and Generalization

A bigger network can memorize more, which is the concern of [Why Learning Generalizes](/data-ai/learning-theory). In practice, large networks often generalize better than classical bounds suggest, and the reasons are still studied. Count on measurement over theory here: held-out error decides.

## Key Points

- One hidden layer can approximate any continuous function, with no bound on how wide it must be
- A single layer of n ReLU units gives at most n + 1 linear pieces
- Composing a tent function k times gives 2^k pieces from 2k units, while one layer needs at least 2^k − 1
- Training did not find an exact 16-piece sawtooth, though 8 well-chosen units represent it
- <u>Separate what a network can represent from what training will find, and choose size by validation error</u>
