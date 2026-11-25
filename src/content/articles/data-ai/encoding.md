> Models need numbers, and categorical features such as a course name must be encoded. **One-hot encoding** gives each category its own 0 or 1 column, **ordinal codes** assign numbers and are right only when the categories have a true order, and **target encoding** replaces a category with the average label for it, which is powerful and leaks the label unless done carefully.

A listing has a course: calculus, organic chemistry, microeconomics. The price depends on the course, since some textbooks are expensive and some hold their value, but a model can't multiply by the word "calculus".

## One-Hot Encoding

Create one column per category, with a 1 for the matching one and 0 elsewhere. A listing for course 17 gets a 1 in column 17. The model learns a separate weight per course, with no assumed relation among them. This is the safe default for nominal categories and for linear models.

The costs: **many columns** for high-cardinality features, and **rare categories** with only a few examples, where the learned weight is mostly noise. One-hot also has no answer for a category it never saw in training.

## Ordinal Codes

Mapping categories to 1, 2, 3 and so on is fine for values with a natural order, such as condition from worn to like new. For categories without an order it invents one: it tells a linear model that course 200 is twice course 100, and that course 17 is between 16 and 18.

## A Test on Many Courses

We simulated 300 courses with realistic uneven popularity: the ten most popular accounted for 1,387 of 3,000 training sales, and 124 courses had three sales or fewer. Each course has its own price premium, and prices have noise. We trained on 3,000 sales and tested on 4,000 new ones, of which 71 had a course that never appeared in training:

| Encoding of Course | Error on Training Sales | Error on Unseen Sales |
| --- | --- | --- |
| Not used | $8.30 | $8.72 |
| Integer code, 0 to 299 | $8.30 | $8.71 |
| One-hot, 300 columns | $6.43 | $7.66 |
| Target encoding, no smoothing | $6.49 | $7.57 |
| Target encoding, smoothed | $6.68 | $7.43 |

The integer code did nothing at all, since the order of course codes means nothing. One-hot encoding helped, and its error on unseen data was $1.23 above the error on its training data: the weights for rare courses were fitted to noise. Target encoding with smoothing had the smallest gap and the best score.

## Target Encoding

Replace each category with a statistic of the label for it, such as the average price-to-list ratio of past sales in that course. One numeric column replaces hundreds, and it handles high cardinality. The danger is **leakage**: if a row's own label contributes to its category's average, the feature contains the answer. For a course with two sales, the average is half made of each row's own label, and the model rewards itself.

Our version of this showed up as a gap between training and test error (6.49 against 7.57 without smoothing). The remedies:

- **Smoothing**: shrink the category's average toward the overall average, more when the category has few rows, so rare courses can't claim extreme values. We used a prior worth 3 rows
- **Out-of-fold encoding**: compute each training row's value from the other folds, never from itself, as in [Hyperparameters and Cross-Validation](/data-ai/hyperparameters-cv)
- **Noise**: adding a little random noise to the training encoding

Whichever we use, the feature at prediction time uses the full training average, and unseen categories get the global average.

## Other Options

- **Frequency or count encoding**: replace the category with how often it appears
- **Embeddings**: learn a small vector per category, which neural networks do well, and which is the idea behind [Embeddings](/data-ai/embeddings)
- **Hashing** the category into a fixed number of columns, as in [Feature Crosses and Hashing](/data-ai/crosses-hashing)
- **Grouping rare categories** into an "other" bucket
- **Trees** can split on categories directly in some libraries

## Practical Rules

1. Use one-hot for low-cardinality nominal features and ordinal codes only for ordered ones
2. Group categories with very few examples
3. Plan for unseen categories, with an "unknown" level
4. Fit any encoding that uses the label inside cross-validation, never on the full data
5. Save the encoding with the model

## Key Points

- One-hot gives each category its own column, and ordinal codes impose an order that nominal categories don't have
- An integer code for 300 courses did nothing: $8.71 against $8.72 for no course feature
- One-hot cut the error to $7.66 but fitted rare courses to noise, with an error $1.23 higher on unseen sales than on training sales
- Target encoding is compact and leaks the label unless smoothed or computed out of fold
- <u>Encode on training data only, and plan for categories the model has never seen</u>
