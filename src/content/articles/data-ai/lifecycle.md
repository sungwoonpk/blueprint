> The **machine learning project lifecycle** is the sequence of stages a project goes through, from a business goal to a model running in production and being watched. It is a loop and not a line: what a later stage finds often sends the team back to an earlier one.

[From Writing Rules to Learning from Data](/data-ai/rules-to-learning) fit a price model in a few lines. Getting that model into the textbook app, correct and still correct next semester, is a project, and in most real systems the code that trains a model is a small part of everything built around it. This page walks the stages in order, with the price suggestion as the project.

## The Seven Stages

<figure class="diagram">
<div class="flow">
<div class="node">1 Goal</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">2 Data</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">3 Preparation</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">4 Modeling</div>
</div>
<div class="flow">
<div class="node">5 Evaluation</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">6 Deployment</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">7 Monitoring</div>
</div>
<figcaption>Seven stages, with modeling as one of them</figcaption>
</figure>

A well known process called CRISP-DM, written down in 2000 by a group of companies, names the first six, under slightly different names. Monitoring is the stage that models running in production added. The stages run in order only on paper.

## 1. Goal

Start with what the business wants, not the model. For the app, the aim is that sellers list quickly at a price that sells. That becomes a measurable target: a suggestion within $5 of the eventual sold price, and listings that sell within two weeks.

This stage also asks whether machine learning is needed at all. A few written rules are the first version to beat. [Framing a Problem for Machine Learning](/data-ai/framing-problems) is about this step.

## 2. Data

Next, find out what data exists and whether it can answer the question. Our app has years of listings and sales. The catch is timing. The sold price is only known after a sale, and so is the number of days a book took to sell.

When the suggestion runs, the seller has only just typed in the book, so only the columns known at that moment may be inputs. Using a column from the future makes a model look wonderful in testing and fail in the app, which [Data Leakage](/data-ai/data-leakage) covers.

## 3. Preparation

Raw data is rarely ready. We simulated an export of 6,000 listings and counted what is left after each cleanup.

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Exported listings</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">6,000</span></div>
<div class="hbar"><span>Duplicate posts removed</span><span class="track"><span class="fill" style="--w: 91.7%"></span></span><span class="value">5,499</span></div>
<div class="hbar"><span>Only listings that sold</span><span class="track"><span class="fill" style="--w: 78.0%"></span></span><span class="value">4,678</span></div>
<div class="hbar"><span>Price typos removed</span><span class="track"><span class="fill" style="--w: 76.3%"></span></span><span class="value">4,575</span></div>
<div class="hbar peak"><span>Every feature present</span><span class="track"><span class="fill" style="--w: 74.1%"></span></span><span class="value">4,446</span></div>
</div>
<figcaption>Rows left after each cleaning step, from simulated rates of 8% duplicates, 15% unsold, 2% typos and 3% missing features</figcaption>
</figure>

A quarter of the rows were unusable, and the largest loss was a quiet one. A listing that never sold has no label, so it can't teach the model a price. Preparation also joins tables and builds features, and teams often find it takes the largest share of a project. [Missing Data](/data-ai/missing-data) and [Duplicates and Entity Resolution](/data-ai/duplicates-entity-resolution) go deeper.

## 4. Modeling

Only now does a model appear. Start with a baseline, the simple rule that any model must beat, and then try a simple model before a complex one, as [Baselines and Heuristics](/data-ai/baselines) explains. Every attempt gets recorded with its data, settings and score, so a result can be reproduced later, as in [Experiment Tracking and Reproducibility](/data-ai/experiment-tracking).

## 5. Evaluation

The model is scored on sales it never trained on, against the target from the goal stage. Our learned weights reached $3.52 against $6.39 for the rulebook. A good average isn't the end of this stage. The team also asks where the model fails, for example on rare editions, using ideas from [Evaluating Beyond Averages](/data-ai/slice-evaluation), and whether the target was the right one to begin with.

## 6. Deployment

A model helps nobody until the app calls it. For each new listing, the app builds the same features the model trained on, asks the model for a price and shows the suggestion.

The features must be computed exactly as they were in training, or the model sees different numbers than it learned from, a failure named in [Feature Stores and Training-Serving Skew](/data-ai/feature-stores). Running the model reliably at the scale of the app is the topic of [Model Serving](/system-design/model-serving).

## 7. Monitoring

The release isn't the end. In the earlier price example the market changed, and the model's error went from $3.52 to $11.20 without any alarm. The app can notice, because every suggestion has a right answer later, when the book sells. Comparing the two over time shows the drift, and a retraining run fixes it. [Data Distribution Shifts](/data-ai/distribution-shift) and [Retraining and Continual Learning](/data-ai/continual-learning) pick this up.

## Going Around the Loop

Real projects move backward all the time.

| What the Team Finds | Goes Back To |
| --- | --- |
| Accurate suggestions, but sellers ignore them | 1 Goal |
| A column isn't known at listing time | 2 Data |
| The model misses rare editions | 3 Preparation |
| Prices drift after a semester | 3 Preparation, then 4 Modeling |

Each trip around the loop is cheaper than the last, because the pipeline from data to deployed model already exists. Teams that automate it, as [Automating Training and Release](/data-ai/mlops-automation) describes, can retrain on a schedule instead of as a rescue.

## Key Points

- A project goes from goal to data, preparation, modeling, evaluation, deployment and monitoring
- Modeling is one stage of seven, and preparation often takes the most work
- Using a column that isn't known at prediction time breaks a model in production while it looks perfect in testing
- A deployed model gets worse as the world changes, so it needs monitoring and retraining
- <u>The stages form a loop, and what a late stage finds often sends the team back to an early one</u>
