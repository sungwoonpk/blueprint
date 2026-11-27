> **Q-learning** learns the value of each action in each state from experience alone, without knowing the probabilities. After every step it nudges its estimate toward the reward plus the best estimated value of the next state. Because it learns about the greedy policy while behaving differently, it is called **off-policy**.

[Value and Policy Iteration](/data-ai/value-iteration) needed the sale probabilities. A real seller doesn't know them. They only see what happened.

## The Update

Keep a table Q(state, action). After taking action a in state s, receiving reward r and reaching s′:

Q(s, a) ← Q(s, a) + α × [r + γ × max Q(s′, ·) − Q(s, a)]

The bracket is the **temporal difference error**: the new evidence minus the old estimate. α is the learning rate. Nothing in the formula uses a probability. Because the target is built from another estimate, this is called **bootstrapping**.

## Exploring

An agent that always takes the best-looking action may never try the others. **ε-greedy** takes a random action with probability ε and the best one otherwise, the same tradeoff as [Adaptive Experiments and Bandits](/data-ai/bandits).

On the pricing problem, the value of the policy learned, averaged over 20 seeds. The best possible is $32.88:

| Episodes | ε = 0 | ε = 0.1 | ε = 0.5 |
| --- | --- | --- | --- |
| 100 | $31.28 | $28.61 | $30.23 |
| 1,000 | $31.28 | $31.38 | $32.37 |
| 10,000 | $31.28 | $32.69 | $32.73 |
| 100,000 | $31.28 | $32.83 | $32.81 |

With ε = 0 the agent never moves from its first choice, $40 every week, whatever the data, and stays at $31.28 forever. It looked fine early, because that happens to be a decent policy. With exploration it approaches $32.88 slowly: after 100,000 episodes it matched the best action in about 7.5 of 8 states.

The states near the deadline are visited rarely. In one run, week 8 was seen 100,000 times and week 1 only 9,184 times, since most books sell earlier.

## Cliff Walking: SARSA and Q-Learning

**SARSA** is the on-policy sibling: its target uses the action it will actually take next, exploration included. We reproduced Sutton and Barto's cliff walking gridworld, where stepping off the edge costs 100, with ε = 0.1, averaged over 100 runs:

| Method | Average Reward per Episode, Last 100 | Greedy Path | Where It Walks |
| --- | --- | --- | --- |
| SARSA | −27.1 | 17 steps | The top row, far from the edge |
| Q-learning | −50.0 | 13 steps | Along the cliff edge |

Q-learning learned the shortest path, which is optimal for an agent that never explores. While it explores, it sometimes steps off. SARSA learned a longer, safer route that accounts for its own random moves, and earned more while learning. Reducing ε would bring them together, as the book notes.

## Maximization Bias

The max in the target picks up noise. If many actions have the same true value, the largest estimate is usually too high. In a small MDP where one path leads to ten actions of true value −0.1 with noisy rewards, the left path is bad and should be taken only by exploration, 5 percent of the time:

| Percent Taking the Bad Path at Episode | 10 | 50 | 100 | 300 |
| --- | --- | --- | --- | --- |
| Q-learning | 88 | 84 | 46 | 12 |
| Double Q-learning | 48 | 15 | 10 | 6 |

**Double Q-learning** keeps two tables, picks the best action with one and scores it with the other, which removes much of the bias.

## Practical Notes

- The learning rate should shrink for convergence in noisy problems
- Initial values matter: optimistic starting values encourage trying things
- A table needs every state visited many times, which doesn't scale: see [Deep Reinforcement Learning](/data-ai/deep-rl)
- Learning from real customers costs real money while exploring, so try simulation or logged data first

## Key Points

- Q-learning updates toward reward plus the best next value, using no model
- Without exploration it stayed on its first policy forever, and exploration took it toward the optimum over tens of thousands of episodes
- On cliff walking, SARSA took a safer path and earned more while learning, and Q-learning learned the shortest path
- The max operator overestimates under noise, and double Q-learning reduces it
- <u>Keep exploring, and watch for overestimated actions</u>
