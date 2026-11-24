> A **multi-armed bandit** balances **exploring** options to learn their value against **exploiting** the best one found so far. Instead of a fixed A/B test that splits traffic equally until it ends, a bandit shifts traffic toward better options as evidence builds, trading some statistical clarity for fewer wasted visits.

[Controlled Experiments and A/B Tests](/data-ai/ab-testing) send half the traffic to the worse variant for the whole test. If one layout is clearly better after a few days, that is a cost: every visit to the loser is a missed sale. Bandits reduce the cost.

## The Problem

There are K options, called arms, with unknown success rates. At each step we pick an arm and observe whether it succeeded. The goal is to maximize total successes over time, and the difficulty is that learning needs trying arms we suspect are worse. The measure of loss is **regret**, the successes we would have had if we had always chosen the best arm, minus the successes we got.

[Markov Decision Processes](/data-ai/mdps) bring this tradeoff back with states added, and the same exploration question runs through all of reinforcement learning.

## The Main Strategies

| Strategy | How It Picks | Weak Point |
| --- | --- | --- |
| Uniform | Every arm equally, like an A/B/C test | Never stops wasting on losers |
| Explore then commit | Equal split for a fixed budget, then the best seen | A wrong winner is locked in |
| Epsilon-greedy | The best so far, with a small probability of a random arm | Keeps exploring blindly at a fixed rate |
| UCB | The arm with the highest optimistic estimate: mean plus an uncertainty bonus | Needs tuning of the bonus |
| Thompson sampling | Draw a rate for each arm from its posterior, pick the largest | Needs a posterior, simple for yes or no outcomes |

Thompson sampling uses the Beta posteriors of [Bayesian Inference](/data-ai/bayesian-inference). An arm with few visits has a wide posterior and often wins a draw, so it keeps being tried. An arm with many visits and a low rate rarely wins. Exploration fades on its own as certainty grows.

## A Comparison

We tested three product page layouts with true click rates 4, 7 and 5 percent. Each run had 5,000 visitors, and we repeated it 200 times:

| Strategy | Mean Clicks per Run | Share of Visits to the Best Layout |
| --- | --- | --- |
| Uniform split | 267.0 | 33% |
| Explore 1,500 then commit | 323.6 | 77% |
| Thompson sampling | 324.9 | 80.2% |
| Epsilon-greedy, from an earlier run | 313.9 | not recorded |
| Oracle, always the best | 349.9 | 100% |

Uniform sampling gets 267 clicks, 83 below the oracle. The explore-then-commit rule recovered most of that, 323.6, and Thompson sampling did slightly better at 324.9 while using no fixed exploration budget. The gap between 324.9 and 349.9 is the price of not knowing: about 25 clicks per 5,000 visits.

The fixed rule has a weakness the mean hides. It picked the wrong layout in 4 percent of runs, and then lived with it for the other 3,500 visits.

Thompson sampling doesn't lock in: when early luck favors a worse arm, more data corrects it. The visit counts show the contrast, with Thompson sampling visiting the layouts roughly 356, 4,012 and 632 times, while the explore-then-commit rule's counts of 511, 3,834 and 655 reflect the 1,500 visits it spent exploring.

## Bandit or A/B Test

Neither is better in general:

| | A/B Test | Bandit |
| --- | --- | --- |
| Goal | Learn the effect precisely | Earn as much as possible while learning |
| Traffic | Fixed split | Shifts to the winner |
| Inference | Clean estimate and p-value | Biased naive estimates, since samples are adaptive |
| Fits | Decisions with lasting consequences, such as a redesign | Many cheap options, short lived choices, headlines |
| Risk | Cost of the losing arm | Misses slow effects, drifts with time |

Adaptive allocation complicates analysis. The arms that did well early got more traffic, so their average is biased upward, and ordinary confidence intervals no longer apply. If we need to report the size of an effect, a fixed test is the safer instrument.

## Extensions

- **Contextual bandits** use features of the visitor, such as the user's country or device, to pick the arm, a step toward personalization and a key part of [Evaluating Recommenders and Feedback Loops](/data-ai/recsys-evaluation)
- **Non-stationary bandits** discount old data, because tastes change
- **Delayed feedback**: a sale may come days after a click, which blurs the updates
- **Safety**: guardrails and minimum traffic floors keep exploration from hurting users

## Key Points

- A bandit trades exploring for exploiting, and regret measures the successes lost against always choosing the best arm
- On three layouts at 4, 7 and 5 percent, uniform got 267.0 clicks, explore-then-commit 323.6, Thompson sampling 324.9 and the oracle 349.9
- Explore-then-commit locked in a wrong winner in 4 percent of runs, and Thompson sampling corrects itself as data arrives
- Adaptive samples bias naive estimates, so a bandit is for earning while learning and an A/B test is for measuring
- <u>Use a bandit when options are many and cheap to test, and an A/B test when you need a trustworthy effect size</u>
