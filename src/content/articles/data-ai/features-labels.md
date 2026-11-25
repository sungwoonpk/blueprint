> A **dataset** for supervised learning is a table of examples. Each row is one example, the **features** are the columns the model may read, and the **label** is the column it must predict. Choosing which columns count as features and exactly what counts as the label are design decisions, and they shape what the model can learn at least as much as the algorithm does.

[Learning as Function Approximation](/data-ai/what-is-learning) described what is learned. This article is about what it is learned from: the shape of the data a model sees, and how the choice of label and features decides whether the finished model is useful.

## Anatomy of a Dataset

| Term | Meaning | In the Textbook App |
| --- | --- | --- |
| Example | One row, one instance of the problem | One past sale |
| Feature | An input the model may use, written x | List price, age, condition, new edition |
| Label | The output to predict, written y | The price the book sold for |
| Training set | The examples with labels the model learns from | 3,000 past sales |
| Feature vector | The row's features as a list of numbers | (120.0, 3, 2, 0) |

Features come in kinds: **numeric** (list price), **ordinal** categories with an order (condition from 1 to 4), **nominal** categories without one (course name), text, images and timestamps. [Variables and Measurement Scales](/data-ai/variable-scales) covered the distinctions, and later articles show how each is turned into numbers a model can use.

## Which Features Matter

A model can only use what it is given, and what it is given sets a ceiling. We trained the price model with each of its four terms removed in turn, and measured the error on 2,000 unseen sales:

| Model | Error on Unseen Sales |
| --- | --- |
| All four terms | $3.52 |
| Without the base rate term | $18.46 |
| Without the age effect | $13.87 |
| Without the new-edition effect | $7.81 |
| Without the condition effect | $6.41 |

Every feature we removed hurt, and the price of losing the age effect was ten dollars, nearly four times the error of the full model. A column that real sellers and buyers use is likely to matter to a model, and one that nobody uses is unlikely to. This kind of ablation is a basic tool for finding what carries the signal.

## Features Must Exist When You Predict

The model is used at the moment a seller lists a book. A feature must be known then. The number of days the book took to sell is a fine column in the training table and useless at prediction time, since it doesn't exist yet.

Worse, if it sneaks into training, it makes the model look excellent, a failure [Data Leakage](/data-ai/data-leakage) covers. For each feature, ask when it becomes known, and whether it will be computed the same way in production, the problem of [Feature Stores and Training-Serving Skew](/data-ai/feature-stores).

## Choosing the Label

The label is the quantity we want to predict, and it is often not obvious. For the price suggester we could use:

- The **sold price**, what buyers actually paid
- The **asking price**, what sellers typed in
- The **days to sell** at a fixed price, if the goal is speed

These produce different products. We simulated sellers who ask about 20 percent above what the book sells for, which is typical of optimistic listing. A model trained on asking prices learned the optimism: its predictions ran $10.85 above the sold price on average, and its error against sold prices was $11.02, compared with $3.52 for the model trained on sold prices. The data was equally plentiful, and the model answered a different question.

A good label is:

- **Aligned with the decision**, as [Framing a Problem for Machine Learning](/data-ai/framing-problems) argued
- **Observed reliably**: sold prices only exist for books that sold, so unsold listings are missing from the data, which is a form of selection bias, as in [Collecting Data and Sampling Bias](/data-ai/sampling-bias)
- **Consistent**: defined the same way for all rows and over time
- **Obtainable at scale**, with a plan for cost when humans must label it, a subject of [Labeling Data](/data-ai/labeling)

## Noise in Labels

Labels are rarely perfect: prices are rounded, categories are marked by tired people, outcomes arrive late. Noise in labels sets the floor of the previous article, and it can mislead evaluation, since a model that disagrees with a wrong label is penalized for being right. Check a sample of labels by hand before trusting them.

## Practical Habits

1. Write down the row, the features and the label as a sentence, "one row per sale, to predict sold price from what the seller enters"
2. For each feature, record when it is known and where it comes from
3. Look at ten rows and a distribution of every column, as in [Exploratory Data Analysis](/data-ai/eda)
4. Set aside part of the data before anything else, as [Training, Validation and Test Sets](/data-ai/train-val-test) explains

## Key Points

- A dataset is rows of examples, with features as input columns and a label as the output column
- Removing a useful feature hurt a lot: dropping the age effect raised the error from $3.52 to $13.87
- Every feature must be available, and computed the same way, when the model predicts
- The label defines the product: a model trained on asking prices ran $10.85 high against sold prices
- <u>Define the label from the decision it supports, and check that it is observed reliably</u>
