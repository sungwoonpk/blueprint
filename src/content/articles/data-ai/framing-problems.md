> **Framing** a problem means turning a goal into a precise machine learning task: what to predict, from which inputs known at that moment, judged by which measure, against which baseline. A good frame decides whether the project helps anyone, before a single model is trained.

"Help sellers price their books" is a goal, and no model can be trained on it. [The Machine Learning Project Lifecycle](/data-ai/lifecycle) starts with a goal stage for a reason: the frame chosen there sets what every later stage can achieve. This page turns that goal into a task, one decision at a time.

## Is Machine Learning the Right Tool?

First check whether learning is needed. Three requests from the app, each asked the same four questions:

| Question | Sales Tax | September Sales | Price Suggestion |
| --- | --- | --- | --- |
| Is the rule hard to write, or does it change? | No, it is a fixed percentage | No, it is a query | Yes, many factors that shift each semester |
| Are there examples with the right answer? | Not needed | Not needed | Yes, years of sold listings |
| Can a wrong answer be tolerated? | No, it must be exact | No, it must be exact | Yes, the seller can edit it |
| Does a decision use the result? | Yes | Yes | Yes |
| Right tool | Rules | A query and a chart | Machine learning |

Only the price suggestion needs a learned model. The other two need exactness, and a model would only add error. If the rule is easy to write, write it. If there are no examples and none can be collected, there is nothing to learn from. If a wrong answer can't be tolerated, learning can still help, but a person or a rule has to check each answer.

## Choose the Target

For the price suggestion, the same goal can be framed in at least three ways:

- **Sold price**: predict the dollars a book will sell for, a regression, which gives one suggested price
- **Sells in time**: predict whether a listing at a given price sells within two weeks, a classification, which gives warnings and a safe range
- **Days to sell**: predict how long a listing will wait, a regression, which gives the seller an expected wait

Each one makes a different product, and each one needs different labels. The **target** is the thing the model predicts, and the label for each past example is its true value. Pick the one that matches the decision, not the one that is easiest to collect. Past asking prices are everywhere in the data, but they include the optimism of sellers whose books never sold. Sold prices say what buyers actually paid.

For the first version we choose sold price, and add the second framing as a warning later.

## Use Only What You Know in Time

The model runs when a seller opens the listing form, so the inputs are whatever is known then: list price, age, condition and edition. Anything learned later, such as the days a book waited, can't be an input. Leaving a column in that is only known after the fact is **leakage**, covered in [Data Leakage](/data-ai/data-leakage).

## Choose the Measure

A measure that sounds right can hide a useless model. Suppose the second feature warns sellers whose asking price is too high. In a simulation of 5,000 listings, 491 of them, about 10%, fail to sell within two weeks. The program flags a listing when its asking price is above some multiple of the model's suggestion.

| Rule | Listings Flagged | Overpriced Caught of 491 | False Alarms | Accuracy |
| --- | --- | --- | --- | --- |
| Never flag anything | 0 | 0 | 0 | 90.2% |
| Flag above 1.15 times the suggestion | 986 | 489 | 497 | 90.0% |
| Flag above 1.25 times the suggestion | 603 | 476 | 127 | 97.2% |
| Flag above 1.35 times the suggestion | 435 | 410 | 25 | 97.9% |

The program that never warns anyone scores 90.2% accuracy and helps no seller. The one that flags too eagerly scores about the same, 90.0%, and catches nearly everything but annoys half of those it flags. Accuracy barely tells them apart. The right threshold depends on a cost question that only the team can answer: how bad is a needless warning compared with a missed one?

For this app, a needless warning is a small annoyance and a miss leaves a book unsold for two weeks, so a threshold near 1.25 is a reasonable start. [Accuracy, Precision and Recall](/data-ai/classification-metrics) builds the measures for this, and [Aligning Model Metrics with Goals](/data-ai/metric-alignment) shows how to tie a measure to a business goal.

## Set the Bar

A number means little alone. The price model's error of $3.52 is good only against something. The baseline is the cheapest alternative that already works, here the hand written rules from [From Writing Rules to Learning from Data](/data-ai/rules-to-learning), at $6.39.

Decide in advance how much better the model must be to justify the work of running it, because a gain of fifty cents might not pay for a model that needs retraining every semester. [Baselines and Heuristics](/data-ai/baselines) explains why the simple version comes first.

## Plan for Wrong Answers

No model is right every time. The frame should say what happens when it is wrong. Show the suggestion as one the seller can change. Fall back to the rules if the model service is down. Say what the suggestion is based on, so a seller can judge it. [Designing Products Around Imperfect Predictions](/data-ai/imperfect-predictions) builds this into the product.

## Writing It Down

The result fits in a short table. A team that can't fill in every row isn't ready to train anything.

| Part | Price Suggestion |
| --- | --- |
| Unit | Each new listing |
| Inputs known in time | List price, age, condition, new edition flag |
| Target | The price the book later sold for |
| Measure | Average dollar error, and the share of listings within $5 |
| Baseline | The four hand written rules, $6.39 |
| Bar to launch | Within $5 on at least 70% of listings, our choice |
| When it is wrong | The seller edits the price, and the rules cover an outage |

## Key Points

- Check whether machine learning is needed at all, because exact rules and queries are often the better tool
- The target must match the decision and be known in time, and different targets make different products
- A measure like accuracy can reward a useless model, so choose one that reflects the costs of each kind of mistake
- A number needs a baseline and a bar to launch, both set before training
- <u>If the frame can't be written in one short table, the project isn't ready for a model</u>
