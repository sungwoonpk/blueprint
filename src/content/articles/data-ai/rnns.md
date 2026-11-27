> A **recurrent neural network** processes a sequence one step at a time, keeping a hidden state that summarizes what it has seen, and applies the same weights at every step. It can handle any length. Training it over many steps is hard, because the gradient is multiplied by the same weights again and again and tends to vanish or explode.

[Modeling Sequences](/data-ai/modeling-sequences) wanted history without a fixed window. A recurrent network carries it in a state.

## The Cell

At each step t, the new state is a function of the input and the previous state:

hₜ = tanh(W_x xₜ + W_h hₜ₋₁ + b)

An output can be read from any state. The same W_x, W_h and b are used at every step.

<figure class="diagram">
<div class="flow">
<div class="node">h₀</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Step 1 reads x₁</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Step 2 reads x₂</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Step T gives the output</div>
</div>
<figcaption>One cell applied again at each step, passing its state along</figcaption>
</figure>

Training unrolls the loop into a long chain and applies [Backpropagation](/data-ai/backprop), called backpropagation through time. Long sequences are often cut into chunks to limit memory.

## The Memory Test

We gave a network with 32 units a sequence of T random symbols out of 8, and asked for the first one at the end. All later symbols are distractors. Chance is 12.5 percent. Each setting was trained three times for 1,500 steps:

| Steps T | Small Random Recurrent Weights | Orthogonal Recurrent Weights |
| --- | --- | --- |
| 5 | 100% | 100% |
| 10 | 100% | 100% |
| 20 | 64.8% | 91.5% |
| 40 | 31.5% | 56.0% |
| 60 | 46.0% | 43.6% |

Short memory is easy. Past about 20 steps the networks fail more often, and the average hides that individual runs either solve it or don't. Orthogonal weights, which neither shrink nor stretch a vector, helped at 20 and 40 steps.

## Why Memory Fades

The gradient from the final loss back to an early step passes through W_h and a tanh slope at every step. If those factors are below 1, the product shrinks exponentially. If above 1, it grows. We measured the gradient at the first input relative to the last, before training:

| Recurrent Weights | 10 Steps | 40 Steps |
| --- | --- | --- |
| Small random | 0.013 | 0.000000016 |
| Orthogonal | 0.19 | 0.00047 |

At 40 steps the signal from the first input is a hundred-millionth of the last one's for small random weights, so the network cannot learn from it. Pascanu, Mikolov and Bengio studied this and the opposite failure: they proposed **clipping** the gradient's length to deal with explosions. Vanishing needs a different design, [Long Short-Term Memory and GRUs](/data-ai/lstm-gru).

## Variants

- **Stacked** layers, each reading the states of the one below
- **Bidirectional** networks read both directions, when the whole sequence is available
- **Many-to-one** for classification, **many-to-many** for tagging
- **Sampling** one item at a time and feeding it back generates sequences

## Costs

Steps depend on the previous step, so training can't be parallelized along time, which is slow for long sequences. This is a main reason attention-based models replaced them for most language tasks. Recurrent models remain useful for streaming data and small devices, since they use fixed memory per step.

## Key Points

- An RNN applies one cell to each step and carries a hidden state
- Its gradient is multiplied across steps, so it vanishes or explodes
- Memory of a first symbol failed increasingly beyond 20 steps
- With small random weights the first input's gradient was 100 million times smaller than the last's at 40 steps
- <u>Clip gradients, and use gated cells or attention when memory must be long</u>
