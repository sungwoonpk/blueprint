> **Automatic differentiation** computes exact derivatives of a program by breaking it into elementary operations with known derivatives and chaining them. **Reverse mode** gives the gradient of one output with respect to many inputs in one backward sweep, which is what training needs. Frameworks build the record of operations as the program runs.

[Backpropagation](/data-ai/backprop) is a recipe for one kind of model. Automatic differentiation is the general tool: write any computation from differentiable pieces, and the derivative comes for free.

## Three Ways to Get a Derivative

| Method | How | Problem |
| --- | --- | --- |
| Numeric | Nudge each input and compare outputs | Approximate, and one or two evaluations per input |
| Symbolic | Manipulate the formula into a derivative formula | Expressions can grow very large, and needs a closed form |
| Automatic | Apply the chain rule to the operations actually executed | Exact up to rounding, cost near that of the program |

Baydin and colleagues' survey of automatic differentiation in machine learning makes the same distinctions, and stresses that it applies to ordinary code with loops and branches.

## Forward and Reverse Mode

**Forward mode** carries a derivative along with each value as the program runs: it answers "how does everything change if this one input changes?" One pass per input. **Reverse mode** runs the program, then walks back: it answers "how does this one output depend on every input?" One pass per output.

| Shape of the Function | Better Mode |
| --- | --- |
| Few inputs, many outputs | Forward |
| Many inputs, one output, such as a loss over millions of weights | Reverse |

Training has one output, the loss, and millions of inputs, so reverse mode wins by a factor of millions.

## A Tiny Engine

To make this concrete, we wrote a small engine for this page's experiments. Each value is an object that remembers how it was made. An operation such as multiply records its two parents and a function that passes a gradient back to them:

```python
def mul(a, b):
    out = Value(a.data * b.data, parents=(a, b))
    def backward(g):
        a.grad += g * b.data
        b.grad += g * a.data
    out.backward_fn = backward
    return out
```

Calling backward on the loss sorts the recorded operations so that each is processed after everything that depends on it, sets the loss's gradient to 1, and calls each function in turn. Add matrix multiply, a few activations, softmax and convolution, and this is enough to train every network in this chapter. We checked each operation's gradient against numeric estimates, and the largest relative difference was under 10⁻¹⁰.

Note the `+=`. A value used in two places receives two contributions, and they add. Forgetting this is the classic bug in a homemade engine.

## Graphs

The record of operations is a **computational graph**, from [The Chain Rule and Computational Graphs](/data-ai/chain-rule). Frameworks build it in one of two styles:

- **Eager, or define-by-run**: the graph is recorded as ordinary code executes, so loops and conditions just work, and it is easy to debug
- **Compiled, or define-then-run**: the graph is built or traced first and then optimized, which can run much faster and deploy elsewhere

Current libraries mix the two, running eagerly while developing and compiling for speed.

## What to Watch

- **Gradients accumulate** until cleared. A training loop must reset them each step, and [Training and Debugging Deep Networks](/data-ai/training-deep-nets) shows what happens otherwise
- **Detaching** a value stops gradients from flowing through it, which is needed when part of a model is frozen
- **Non-differentiable points**, such as ReLU at 0, get a chosen value, and it rarely matters
- **Discrete steps**, such as picking the largest item or sampling, pass no useful gradient and need other techniques
- **Memory** grows with the length of the recorded graph, so don't keep references to old losses

## Beyond Training

The same machinery gives derivatives for scientific simulations, optimization and sensitivity analysis. Second derivatives come from differentiating the gradient computation again, at extra cost.

## Key Points

- Automatic differentiation chains the known derivatives of elementary operations, giving exact gradients of ordinary programs
- Reverse mode costs one backward sweep per output, which suits a single loss with millions of weights
- An operation only needs to record its parents and how to pass a gradient back, and gradients from reuse add up
- Frameworks record graphs eagerly or compile them, and gradients accumulate until cleared
- <u>Clear gradients every step, and test new operations against numeric gradients</u>
