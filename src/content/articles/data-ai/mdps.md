> A **Markov decision process** describes decisions that unfold over time. An agent sees a **state**, chooses an **action**, receives a **reward** and lands in a new state. A **policy** says what to do in each state, and the **value** of a state is the total reward expected from there. The **Bellman equation** links each state's value to the values of the states that follow.

Supervised learning answers a question once. A seller pricing a textbook faces a string of decisions: each week's price affects whether there is a next week. That is the setting of **reinforcement learning**, introduced in [Supervised, Unsupervised and Reinforcement Learning](/data-ai/kinds-of-learning). Richard Sutton and Andrew Barto's textbook, *Reinforcement Learning: An Introduction*, is the standard reference for this phase.

## Our Running Problem

A seller lists a book 8 weeks before the semester ends. Each week they choose a price:

| Price | Chance of a Sale That Week |
| --- | --- |
| $40 | 15% |
| $30 | 35% |
| $20 | 60% |

A sale ends the process and pays the price. If the book is unsold after the last week, a store buys it for $8. The probabilities are made up for this example.

## The Parts

| Part | Meaning | Here |
| --- | --- | --- |
| State | What the agent knows | Weeks left, or "sold" |
| Action | What it can do | One of three prices |
| Transition | Where an action leads, with probabilities | Sold, or one week fewer |
| Reward | A number received | The sale price or $8, otherwise 0 |
| Discount γ | Weight on later rewards | 1 here, since all happens within weeks |

The **Markov property** says the next state and reward depend only on the current state and action, not on how we got there. Sutton and Barto note that this is best seen as a requirement on the state: it must hold whatever matters about the past. If buyers' interest fell each week for reasons not captured by the week count, the state would need to include it.

<figure class="diagram">
<div class="flow">
<div class="node">State: weeks left</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Action: a price</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Reward and next state</div>
</div>
<figcaption>The loop repeats until the book is sold or time runs out</figcaption>
</figure>

## Policies and Values

A policy maps states to actions. Its value from a state is the **expected return**, the sum of future rewards, discounted by γ per step. We computed the value from 8 weeks out:

| Policy | Expected Revenue |
| --- | --- |
| Always $20 | $19.99 |
| A random price each week | $25.45 |
| Always $30 | $29.30 |
| Always $40 | $31.28 |
| Best possible | $32.88 |

Expected values hide spread. In 100,000 simulated runs of the best policy, the average was $32.90 with a standard deviation of $10.28, since the outcome is a sale at a high or lower price, or the $8 buyback.

## The Bellman Equation

The value of a state is the reward now plus the discounted value of what follows, averaged over what can happen. For w weeks left and price p with sale chance q:

Q(w, p) = q × p + (1 − q) × γ × V(w − 1)

with V(0) = $8. The best value is the largest Q over the three prices. This recursion is the engine of the whole phase, in the next article and beyond.

| Weeks Left | Q at $40 | Q at $30 | Q at $20 | Best |
| --- | --- | --- | --- | --- |
| 8 | 32.88 | 31.06 | 24.65 | $40 |
| 4 | 26.36 | 26.07 | 21.58 | $40 |
| 3 | 23.60 | 23.96 | 20.28 | $30 |
| 1 | 12.80 | 15.70 | 15.20 | $30 |

Aim high while there is time, and lower the price as the deadline nears. At 4 weeks the two choices are within 30 cents.

## Discounting Changes the Answer

| γ | Best Prices From 8 Weeks to 1 |
| --- | --- |
| 1.0 | $40 five weeks, then $30 for three |
| 0.9 | $30 every week |
| 0.5 | $30 for seven weeks, then $20 |

A smaller γ makes money later worth less, so the policy takes sales sooner. γ is part of the problem statement and not only a numerical convenience.

## Setting the Reward

The agent maximizes the reward it is given, not what we meant. A team at DeepMind calls this **specification gaming** and collects examples, such as a boat race agent that circled to collect bonus targets instead of finishing. Reward what you want achieved, and check behavior, not just the score.

## Where This Goes

[Adaptive Experiments and Bandits](/data-ai/bandits) are MDPs with one state. Here the actions change what happens next. [Value and Policy Iteration](/data-ai/value-iteration) solves an MDP when the probabilities are known, and [Q-Learning](/data-ai/q-learning) learns when they aren't.

## Key Points

- An MDP has states, actions, transition probabilities, rewards and a discount, and the state must capture what matters from the past
- A policy's value is its expected return, and the Bellman equation relates each state to its successors
- On our pricing problem the best policy earns $32.88: ask $40 early and $30 near the end
- A discount of 0.9 changed the best policy to $30 every week
- <u>Define the state and reward carefully, since the solution follows them exactly</u>
