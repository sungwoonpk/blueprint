> **Deep reinforcement learning** uses neural networks to approximate values or policies when states are too many for a table. It can learn from raw pixels, and it is unstable: the combination of function approximation, bootstrapping and off-policy data can diverge. Experience replay, target networks and care with seeds make it work.

[Q-Learning](/data-ai/q-learning) kept a table. An Atari screen or a robot's sensors have far too many states for one. A network generalizes between similar states, which is both the power and the trouble.

## Why It Can Blow Up

Sutton and Barto call the dangerous combination the **deadly triad**:

- **Function approximation**: the same weights serve many states
- **Bootstrapping**: targets built from the model's own estimates
- **Off-policy training**: data from a different behavior than the one being learned

Any two can be stable, and all three together may diverge. Baird's counterexample shows it with just seven states and linear values, all rewards zero, so the true values are 0. We reproduced it with the book's setup:

| Update | Weight Size at Start | After 100 | After 1,000 |
| --- | --- | --- | --- |
| Off-policy weighting | 10 | 17 | 437 |
| Off-policy sampled TD | 10 | 17 | 452 |
| On-policy weighting | 10 | 10.2 | 9.4 |

The same features and rule diverge or not depending only on which states get updated.

## DQN

Mnih and colleagues' deep Q-network learned to play Atari games from pixels with one architecture and algorithm, beating a human expert on three of the seven games in the first paper. Two ideas stabilize it:

- **Experience replay**: store transitions and train on random batches, breaking the correlation between consecutive steps
- **Target network**: compute targets from an older copy of the network, updated now and then, so the target holds still

Later work adds double Q-learning, which reduces overestimation, prioritized replay and other pieces, and the Rainbow paper combines them.

## Our Cart-Pole Test

We trained a small DQN to balance a pole on a cart, a standard task where a score of 500 steps is the maximum, for 60,000 steps with five random seeds. The "without replay" version learned from only the 64 most recent steps:

| Setup | Final Score, Five Seeds | Median |
| --- | --- | --- |
| Replay and target network | 178, 500, 33, 164, 89 | 164 |
| Without replay, recent steps only | 500, 500, 127, 500, 402 | 500 |
| Double DQN | 500, 500, 94, 500, 28 | 500 |
| Without target network | 9, 9, 9, 9, 9 | 9 |
| Neither | 9, 9, 9, 9, 9 | 9 |

The target network was essential here. Without it, the average estimated value reached 17,200 by step 2,000, when no policy can earn more than about 100 under the discount used. With it, estimates grew toward the right range. A score of 9 means the pole falls almost immediately.

Replay's benefit did not appear in this small task, where the "without" version even did better, and identical settings gave anywhere from 33 to 500. Five seeds can't rank methods this close. The curves also rose and collapsed during training: one run scored 468 in a window and 110 at the end.

## Reproducibility

Henderson and colleagues' study found that variation from seeds and implementation details can be as large as the differences between algorithms, and call for reporting many runs. Our table is a small example of why.

## Beyond Games

- **AlphaZero** reached superhuman strength in chess, shogi and Go from self-play, given only the rules, with search guided by a network
- **Robotics, control and recommendation**, often trained in simulation first
- **Offline RL** learns from logged data without acting, and Levine and colleagues' tutorial explains why estimating actions the data rarely took is the main difficulty
- **Language models** are tuned with reinforcement learning from feedback, as in [Reinforcement Learning from Human Feedback](/data-ai/rlhf)

## Before Using It

1. Is a bandit or supervised model enough?
2. Is there a safe simulator, since exploration makes mistakes
3. Is the reward right? Agents exploit gaps, as [Markov Decision Processes](/data-ai/mdps) warned
4. Run many seeds and report the spread
5. Keep a simple baseline

## Key Points

- Neural networks let RL handle large state spaces and bring instability
- Function approximation, bootstrapping and off-policy data together can diverge, as Baird's counterexample shows
- Without a target network our DQN's values exploded and it failed in every seed
- Identical code gave scores from 33 to 500 across seeds, and replay's advantage didn't show
- <u>Report several seeds, and ask whether a simpler method would do</u>
