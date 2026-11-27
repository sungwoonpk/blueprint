> When the transition probabilities and rewards are known, an MDP can be solved by repeated updates. **Value iteration** applies the Bellman optimality update until values stop changing. **Policy iteration** alternates between computing a policy's value and improving the policy. Both reach the optimal policy.

[Markov Decision Processes](/data-ai/mdps) defined the problem. These two **dynamic programming** methods solve it, using the model of the world.

## Value Iteration

Start with a guess, here 0 for every state, and update every state:

V(s) ← max over actions of [expected reward + γ × V(next state)]

Repeat until the largest change is tiny. Sutton and Barto describe it as turning the Bellman optimality equation into an update rule.

On our pricing problem, starting from 0:

| Sweep | Largest Change | Value With 8 Weeks Left | Best Prices, 8 Weeks to 1 |
| --- | --- | --- | --- |
| 1 | 15.7 | 12.00 | $20 for seven weeks, $30 in the last |
| 2 | 8.7 | 18.30 | $30 throughout |
| 4 | 4.0 | 25.06 | Mostly $30, with $40 four weeks out |
| 5 | 3.4 | 27.30 | $40 for five weeks, then $30 |
| 8 | 2.1 | 32.88 | $40 for five weeks, then $30 |
| 9 | 0.0 | 32.88 | unchanged |

Information about the deadline travels one week per sweep, so the exact values arrive after eight sweeps. The **policy** was already right at sweep 5, while the values were still $5.58 short.

## Policy Iteration

Alternate two steps:

1. **Evaluate**: compute the value of the current policy
2. **Improve**: in each state switch to the action that looks best under those values

Stop when nothing changes.

| Round | Value of the Policy Evaluated | States That Changed Action |
| --- | --- | --- |
| 1, always $40 | $31.28 | 4 |
| 2 | $32.73 | 1 |
| 3 | $32.88 | 0 |

Three rounds, each at least as good as the last. Policy improvement never makes things worse, which is why the loop ends at an optimal policy for a finite MDP.

## Policies Settle Before Values

We solved a 20×20 grid with a goal in a corner, γ = 0.95 and moves that slip sideways with probability 0.2. Value iteration needed **97 sweeps** for the largest change to fall below one millionth. The greedy policy was already optimal after **38**.

So if only the policy matters, stop when it stops changing for a while, and don't chase decimals. Truncating evaluation to a few sweeps inside policy iteration, which Sutton and Barto describe, gives a family between the two methods.

## Which to Use

| | Value Iteration | Policy Iteration |
| --- | --- | --- |
| Work per round | One sweep with a max over actions | Solving for a policy's value, then improving |
| Rounds | Many | Few |
| Choose when | Many actions are cheap to scan | Evaluation is cheap, few states |

## Limits

- Both need the **model**: transition probabilities and rewards. Often we don't have them, and [Q-Learning](/data-ai/q-learning) learns from experience instead
- Cost grows with the number of states, and states multiply with each variable, the **curse of dimensionality**. Sutton and Barto note that DP is nonetheless polynomial in the number of states and actions, and handles millions of states
- With large or continuous states, values must be approximated, which [Deep Reinforcement Learning](/data-ai/deep-rl) does
- Planning with a wrong model gives a confident wrong policy

## Key Points

- Dynamic programming solves a known MDP using the Bellman update
- Value iteration repeats the optimality update, and policy iteration alternates evaluation and improvement
- On the pricing problem the policy was optimal at sweep 5 of value iteration and after 3 rounds of policy iteration
- On a grid, the policy was optimal at sweep 38 while values needed 97
- <u>If you know the model, solve it with DP before trying to learn it</u>
