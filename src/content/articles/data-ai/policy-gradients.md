> **Policy gradient** methods adjust the policy directly. The policy outputs probabilities over actions, and its parameters move so that actions followed by high return become more likely. **REINFORCE** is the basic version. A **baseline** subtracted from the return reduces noise without changing the average direction.

[Q-Learning](/data-ai/q-learning) learns values and derives a policy. Policy gradients skip the values and learn the policy, which handles continuous actions and probabilistic choices naturally.

## The Policy

For each state, keep a score per action and turn the scores into probabilities with the softmax of [Multiclass Classification and Softmax](/data-ai/softmax). Learning changes the scores.

## The Update

After an episode, for each step with state s, action a and return G from there:

θ ← θ + α × (G − b(s)) × ∇ log π(a | s)

For a softmax, the gradient of log π with respect to the scores is 1 for the chosen action minus the probability, and minus the probability for the others. High return pushes the chosen action up, low return down. This is **REINFORCE**.

The **policy gradient theorem**, in Sutton and Barto's treatment, justifies it: the expected gradient doesn't need to know how the policy changes which states are visited.

## The Baseline

Subtracting a value b(s) that doesn't depend on the action leaves the expected gradient unchanged, since the action probabilities always sum to 1. It can cut the variance a lot. At the first week of our pricing problem, with a uniform starting policy, over 40,000 episodes:

| Baseline | Total Variance of the Gradient Estimate |
| --- | --- |
| None | 467.9 |
| The state's value | 37.1 |

The variance fell by a factor of 13, while the average gradients agreed within sampling error.

## Results

Value of the learned policy, averaged over 20 seeds, with the worst seed in brackets. Uniform is $25.45 and the best is $32.88:

| Learning Rate and Baseline | 500 Episodes | 5,000 | 20,000 |
| --- | --- | --- | --- |
| 0.005, none | $28.92 (27.83) | $31.03 (29.35) | $31.37 (29.51) |
| 0.005, baseline | $29.09 (28.18) | $32.29 (31.83) | $32.68 (32.39) |
| 0.02, none | $29.12 (23.75) | $30.76 (29.16) | $30.94 (29.26) |
| 0.02, baseline | $30.74 (28.76) | $32.19 (30.00) | $32.40 (31.12) |

With the baseline, both the average and the worst run improve. Without it, one run at the higher rate sat below the uniform policy at 500 episodes.

## Why Choose Policy Methods

- **Continuous actions**, such as a price on a continuous range or a motor command: output the mean and spread of a distribution
- **Stochastic policies** where randomness is useful
- **Smooth changes**: small parameter changes give small policy changes, which Sutton and Barto note brings stronger convergence guarantees than ε-greedy value methods

## The Costs

- High variance and many samples needed
- **On-policy**: data from an old policy is not valid for the new one
- Sensitive to the step size
- Can settle on a poor local solution, especially if probabilities saturate

[Actor-Critic Methods and PPO](/data-ai/actor-critic) addresses the variance and the step size. For language models, policy gradients are used in [Reinforcement Learning from Human Feedback](/data-ai/rlhf).

## Key Points

- Policy gradients raise the probability of actions followed by high return
- A baseline keeps the expected gradient and reduces variance: 467.9 to 37.1 on our problem
- With a baseline, learning was faster and the worst seed better
- They suit continuous actions but need many on-policy samples
- <u>Always use a baseline, and check the worst seed and not only the average</u>
