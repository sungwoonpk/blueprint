> A **feature cross** combines two or more features into one, so a linear model can capture an effect that exists only for the combination. **Hashing** maps a huge set of possible feature values, such as every user ID or word, into a fixed number of columns with a hash function, trading some collisions for bounded memory.

[Polynomial and Nonlinear Features](/data-ai/nonlinear-features) showed how to bend a linear model. This article covers two practical tools for categorical data: combining features and compressing them.

## Feature Crosses

A linear model adds up separate effects: some effect for the book being old, some for a new edition existing. It can't express "a new edition hurts old books much more than recent ones". A **cross** is a feature that is on only when two conditions hold together, such as new edition exists and age is 3 or more. Its weight is the extra effect of the combination.

We simulated a world where a new edition reduces the price share by 0.05 for young books and by an additional 0.25 for books aged 3 or more. We trained two linear models on 3,000 sales:

| Model | Error on Training Sales | Error on Unseen Sales |
| --- | --- | --- |
| Additive: age, condition, edition | $5.77 | $5.79 |
| Plus the cross of new edition and age 3 or more | $3.48 | $3.52 |

The cross cut the error by 39 percent, to the level of the noise. The additive model's mistakes had a pattern:

| Group | Test Sales | Additive Model's Average Error (Predicted Minus Sold) |
| --- | --- | --- |
| No new edition, age under 3 | 677 sales | +$3.12 |
| No new edition, age 3 or more | 833 | −$2.11 |
| New edition, age under 3 | 210 | −$11.91 |
| New edition, age 3 or more | 280 | +$9.41 |

The errors cancel overall and are large within the combinations, up to $11.91, because the model must average the very different cases. Checking the residuals by combinations of features is how crosses are found.

## When to Cross

- When error analysis shows structure in a combination, as in [Error Analysis](/data-ai/error-analysis)
- When domain knowledge says an effect depends on context, such as weekend and region
- For high-cardinality combinations, such as seller by course, only with enough data per cell, as in the many-cells caution of [Learning as Function Approximation](/data-ai/what-is-learning)

Crosses multiply columns. With 300 courses and 4 conditions there are 1,200 cells, many nearly empty. Decision trees and neural networks find interactions themselves, which is a main reason to use them on tabular data with complex structure.

## Hashing

Some features have enormous or open-ended vocabularies: user IDs, search words, product codes. A one-hot column for every value is too large, and new values appear daily. The **hashing trick** applies a hash function to the value and uses the result modulo m as the column index. Memory is fixed at m columns, no dictionary is stored, and a new value just hashes somewhere.

The price is **collisions**: different values land in the same column and share a weight. We tested it with 1,000 keys, 100 of which have a real effect on price, in 20,000 sales:

| Hash Buckets | Average Keys per Bucket | Important Keys Sharing a Bucket | Error on Unseen Sales |
| --- | --- | --- | --- |
| No key feature | | | $5.28 |
| 1,000 | 1.0 | 79 of 100 | $4.86 |
| 300 | 3.3 | 97 of 100 | $5.22 |
| 100 | 10 | 100 of 100 | $5.41 |
| 30 | 33 | 100 of 100 | $5.32 |
| 10 | 100 | 100 of 100 | $5.29 |

Even with as many buckets as keys, 79 of the 100 important keys shared a bucket with another key, since random assignment collides often, as the birthday problem predicts. The benefit shrank as buckets did. At 300 buckets almost all the gain was gone, and at 100 the effects of important keys with opposite signs were mixed with noise from the other 900 keys, and the model was worse than ignoring keys.

Collisions matter more when:

- Few values carry most of the signal, and rare noise values share their buckets
- Buckets are far fewer than the values, with sizes at least several times the number of important values

Common remedies are more buckets, using two hash functions, and hashing only the rare tail while giving frequent values their own columns.

## Choosing

| Situation | Tool |
| --- | --- |
| A known interaction | An explicit cross |
| A few categories | One-hot |
| An open vocabulary, text or IDs, with a memory limit | Hashing |
| Many categories needing similarity between them | Learned embeddings |

Hashing and crosses together power large sparse models for advertising and search, which hash crosses such as user and ad. The same ideas give way to embeddings and neural networks, in [Embeddings](/data-ai/embeddings).

## Key Points

- A cross is a feature that fires only for a combination, and it lets a linear model express an interaction
- One cross cut the error from $5.79 to $3.52 on our data, and the additive model's errors cancelled overall but reached $11.91 in single groups
- Hashing fixes memory by mapping values to m columns, at the price of collisions
- With 1,000 keys and 1,000 buckets, 79 of 100 important keys still collided, and with 100 buckets hashing was worse than no key feature
- <u>Find crosses by studying residuals, and size hash tables well above the number of values that matter</u>
