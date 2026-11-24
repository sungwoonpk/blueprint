> **Machine learning** replaces rules a person writes with numbers a program finds. You hand it past examples with the right answers, it adjusts a model until its answers match them, and the finished model then answers cases it has never seen.

The textbook app wants to suggest an asking price when a seller lists a book. This page builds that feature twice, first the way programmers have always built things, then by learning from past sales, and compares the two on the same data.

All the sales here are simulated. We wrote a hidden formula for what a book sells for, added random noise, and generated 3,000 sales for the program to see and 2,000 more that it never sees. That way we know the right answer exactly and can check every claim.

Each sale records the **list price** of the book new (from $40 to $180), its age in years (0 to 6), its condition (1 worn to 4 like new) and whether a newer edition exists.

## The Rulebook Approach

Start with the obvious rule: a used book sells for about half of its list price. A teammate then looks at the results and notices old books sell for less, so we add age. Then condition. Then a seller complains that her book was priced far too high, and the team learns that a new edition had come out.

```python
def suggest(list_price, age, condition, new_edition):
    rate = 0.60 - 0.05 * age + 0.04 * (condition - 2)
    if new_edition:
        rate -= 0.15
    return list_price * max(rate, 0.10)
```

Every number in that rule, 0.60 and 0.05 and 0.04 and 0.15, was chosen by eye. We score a suggestion by its **error**, the gap in dollars from the price the book really sold for, averaged over the 2,000 sales the rules have never seen.

## Where the Rules Run Out

Each rule helped, and each had to be noticed by a person first.

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Always the average price</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$23.11</span></div>
<div class="hbar"><span>1 rule: half of list price</span><span class="track"><span class="fill" style="--w: 71.1%"></span></span><span class="value">$16.43</span></div>
<div class="hbar"><span>2 rules, plus age</span><span class="track"><span class="fill" style="--w: 43.7%"></span></span><span class="value">$10.11</span></div>
<div class="hbar"><span>3 rules, plus condition</span><span class="track"><span class="fill" style="--w: 38.0%"></span></span><span class="value">$8.77</span></div>
<div class="hbar peak"><span>4 rules, plus new edition</span><span class="track"><span class="fill" style="--w: 27.7%"></span></span><span class="value">$6.39</span></div>
</div>
<figcaption>Average error of the hand written price rules on 2,000 simulated sales, lower is better</figcaption>
</figure>

The rulebook went from $16 to $6, and only half of its suggestions landed within $5 of the real price. It would keep improving as long as someone kept looking for the next factor and tuning its numbers by hand. The shape of the rule, a list price times a rate that depends on the other columns, was a guess too. A person is the bottleneck.

## Letting the Data Pick the Numbers

Machine learning keeps the person's job of deciding what the price might depend on and hands over the tuning. We write the shape, with the same four inputs and the same kind of formula, but leave the numbers open.

These open numbers are the **weights**, and a shape with weights is a **model**. The inputs are the **features**, and the sold price we want to predict is the **label**. [Features, Labels and Datasets](/data-ai/features-labels) goes through each term.

**Training** is the step that finds the weights, by choosing the ones with the smallest average error on the past sales.

<figure class="diagram">
<p class="rowname">Training, once in a while</p>
<div class="flow">
<div class="node">Past Sales<small>features and sold prices</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Training<small>search for the weights</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Model<small>shape plus weights</small></div>
</div>
<p class="rowname">Prediction, for every new listing</p>
<div class="flow">
<div class="node">New Listing<small>features only</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Model</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Suggested Price</div>
</div>
<figcaption>Training makes the model from answered examples, and prediction uses it on cases without an answer</figcaption>
</figure>

Training on 3,000 past sales produced this model, which looks a lot like the rule we wrote:

```python
def suggest(list_price, age, condition, new_edition):
    rate = 0.599 - 0.069 * age + 0.050 * condition - 0.177 * new_edition
    return list_price * rate
```

The weights come out close to the hidden formula that made the data, which used 0.60, −0.07, 0.05 and −0.18. The program found in seconds what the team needed four rounds of complaints to find, and it tuned all four numbers together. How a fitting step works is the subject of [Linear Regression](/data-ai/linear-regression) and [Gradient Descent](/data-ai/gradient-descent).

| Approach | Average Error | Within $5 of the Sold Price |
| --- | --- | --- |
| 4 hand written rules | $6.39 | 50% |
| Learned weights | $3.52 | 75% |
| The hidden formula itself, known exactly | $3.50 | Not measured |

The last row matters. Even a program that knows the exact formula misses by $3.50, because sellers vary at random, and no model can remove that. The learned model has nearly reached the floor.

One detail is easy to miss. These errors come from 2,000 sales the model never saw. Scored on its own training sales it would look slightly better than it is, which is why [Training, Validation and Test Sets](/data-ai/train-val-test) exist.

## How Much Data It Takes

Here the model needed little. With 10 past sales the average error was $5.03, with 100 it was $3.60, and with 1,000 it was $3.53, each averaged over 20 random draws of sales.

After a few hundred examples the extra data bought almost nothing, since this model has only four weights to find and the noise sets the floor. A model with millions of weights, such as the networks in Phase 7, can keep improving on far more data. How much data a problem needs depends on how much the model has to find.

## A Model Gets Old Too

Next semester the market changes. Books lose value faster, 0.10 per year of age instead of 0.07, and a new edition hurts more, 0.28 instead of 0.18. Nobody tells the program.

| Version | Error Before the Change | Error After the Change |
| --- | --- | --- |
| 4 hand written rules | $6.39 | $10.83 |
| Learned weights, trained before | $3.52 | $11.20 |
| Learned weights, refit on 300 recent sales | Not applicable | $5.12 |

Learning didn't make the suggestion more durable. Both versions went stale, and the learned model ended slightly worse than the rules. The difference is the repair. The rules need someone to notice the drift and rework the numbers by hand. The model needs recent sales and a new training run. [Data Distribution Shifts](/data-ai/distribution-shift) and [Retraining and Continual Learning](/data-ai/continual-learning) cover how to notice and how often to retrain.

## When Rules Are Still Right

Rules haven't gone away, and a good design often uses both.

- **Known exactly**: sales tax, shipping fees and age limits are written in law or policy, and learning them from examples would only add errors
- **No examples**: a feature with no history has nothing to learn from, and a first version of rules is also the baseline that a model must beat
- **Guarantees**: a rule can promise that a suggestion never goes below $5 or above the list price, and a model can't promise that alone
- **Explanations**: a short rulebook can be read aloud in a meeting, while a model with millions of weights usually can't

In practice, our suggestion would run the model and then apply the rules that clamp its answer to a sensible range. [Baselines and Heuristics](/data-ai/baselines) returns to why the rulebook comes first.

## Key Points

- A rulebook has a person find each factor and tune each number, while machine learning has the program tune the numbers from examples
- The person still chooses the inputs and the shape of the model, and still has to measure the result on data the model has not seen
- On the simulated sales the learned weights beat four hand written rules, $3.52 against $6.39, and reached the noise floor of about $3.50
- <u>A learned model goes stale when the world changes, and its fix is fresh data and retraining</u>
- Rules stay the better tool for exact policy, hard limits and cases with no examples
