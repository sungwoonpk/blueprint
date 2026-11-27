> An **actor-critic** method learns two things: an **actor**, the policy, and a **critic**, a value estimate that judges its choices. The critic's error gives a lower-noise signal than full returns. **PPO** adds a clipped objective that keeps each update from moving the policy too far, which allows reusing data.

[Policy Gradients](/data-ai/policy-gradients) waited for episodes to end and had noisy estimates. A learned critic helps with both.

## Actor and Critic

| Part | Learns | Updated With |
| --- | --- | --- |
| Actor | The policy π(a given s) | The critic's judgment |
| Critic | The value V(s) | The temporal difference error |

After one step, the **TD error** δ = r + γ V(s′) − V(s) says whether things went better or worse than expected. The actor increases the chosen action's probability in proportion to δ, and the critic moves V(s) toward the target. Updates happen during the episode.

On the pricing problem, a one-step actor-critic against REINFORCE with a baseline, averaged over 20 seeds:

| Episodes | Actor-Critic | REINFORCE With Baseline |
| --- | --- | --- |
| 500 | $27.85 | $29.09 |
| 5,000 | $32.14 | $32.29 |
| 20,000 | $32.73 | $32.68 |

They end about equal, and the critic was slower at the start, while it was still inaccurate. Its main advantages show on long tasks, where waiting for the end is costly and returns vary widely.

## Bias, Variance and GAE

Full returns are unbiased and noisy. One-step TD is less noisy and biased by the critic's mistakes. **Generalized advantage estimation**, by Schulman and colleagues, blends them with a parameter λ, from one-step at 0 to full return at 1.

## Reusing Data, Safely

Collecting experience is expensive, so we want several gradient steps per batch. The risk is that repeated steps move the policy far from the one that generated the data. **PPO**, by Schulman and colleagues in 2017, clips the ratio of new to old action probability inside the objective, to a band such as 0.8 to 1.2, removing the incentive to move further. Its authors present it as simpler than the earlier trust region method TRPO.

We collected batches of 64 episodes and took K gradient steps per batch, 40 batches, 20 seeds:

| Steps per Batch | Clipping | Largest Policy Change in One Update (KL) | Value After 5 Batches | After 40 | Worst Seed at 40 |
| --- | --- | --- | --- | --- | --- |
| 1 | None | 0.002 | $26.15 | $28.74 | $28.55 |
| 20 | None | 0.429 | $30.04 | $32.24 | $30.79 |
| 20 | 0.2 | 0.041 | $28.69 | $31.92 | $30.90 |
| 80 | None | 4.44 | $30.60 | $31.86 | $29.26 |
| 80 | 0.2 | 0.085 | $29.17 | $32.20 | $31.41 |

Reusing the batch clearly helps: one step per batch was far behind. Without clipping the policy jumps, by a KL of 4.4 at 80 steps. Clipping kept changes small at the cost of slower early progress, and gave a better worst case at 80 steps. On this tiny problem, the unclipped versions did fine on average, so the benefit of clipping is insurance.

## The Family

- **A2C and A3C**: actors in parallel collect varied data, which decorrelates it
- **PPO**: clipped objective, minibatches, the common default
- **DDPG and SAC**: off-policy actor-critics for continuous actions, and SAC adds a bonus for keeping the policy random

## Practical Notes

PPO's results depend heavily on details such as normalizing advantages, learning rate schedules and the number of epochs. Run several seeds, as [Deep Reinforcement Learning](/data-ai/deep-rl) stresses.

## Key Points

- An actor learns the policy and a critic learns values whose errors guide it
- GAE trades bias for variance with one parameter
- PPO clips the probability ratio so repeated updates stay near the data's policy
- Reusing a batch helped a lot, and clipping reduced the largest policy change from 4.4 to 0.085
- <u>Use clipping or another trust limit when taking many updates on the same data</u>
