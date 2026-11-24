> **Sampling bias** is a systematic gap between the people or things in a dataset and the population we want to learn about, caused by how the data was collected. It does not shrink as the sample grows, which makes it different from random error, and no amount of modeling can repair a sample that left out the wrong people.

Before a seller dashboard shows "how satisfied are our sellers", someone collects ratings. How they are collected matters more than how many arrive. This page is about the ways collection tilts the answer, and why a bigger pile of data does not cure it.

## Two Kinds of Error

Random error comes from the luck of the draw: a different sample gives a slightly different answer, and the spread falls as the square root of the sample size, as [Expectation, Variance and Covariance](/data-ai/expectation-variance) showed. **Bias** is a consistent push in one direction. A scale that always reads 3 pounds heavy is biased however many times you weigh. Random error is a problem of quantity, and bias a problem of design.

## A Survey That Only Some Answer

Take 20,000 sellers, each with a satisfaction score from 1 to 5. The true average is 3.56. We ran two surveys. In the first, the app picked sellers at random. In the second, sellers chose to answer, and happier sellers were more likely to bother: those scoring 4 or 5 answered with probability 1.0, those at 3 with 0.25 and those at 1 or 2 with 0.08.

| Responses Collected | Random Sample | Volunteers |
| --- | --- | --- |
| 100 | 3.60 | 4.08 |
| 1,000 | 3.59 | 4.12 |
| 10,000 | 3.56 | 4.12 |
| True average | 3.56 | 3.56 |

The random sample drifts toward the truth as it grows. The volunteer sample settles at 4.1, more than half a point too high, and adding more volunteers only makes the wrong answer more precise. The ten thousand responses are a far bigger sample than the hundred, and exactly as wrong. This is the central lesson: a big sample does not repair a biased design.

## Common Sources of Bias

- **Selection bias**: the way units enter the data depends on the outcome, as with volunteers who answer when they are happy
- **Survivorship bias**: only the survivors are visible. A model of which listings sell, trained on completed sales, never sees the listings that were removed unsold
- **Convenience samples**: data from whoever was easiest to reach, such as students in one dorm
- **Non-response**: the people who skip a question differ from those who answer
- **Measurement bias**: the instrument itself tilts the answer, such as a leading question or a sensor that drifts
- **Feedback loops**: a model's own decisions shape the data it later learns from, as when a recommender only collects clicks on what it showed, which [Evaluating Recommenders and Feedback Loops](/data-ai/recsys-evaluation) returns to

Survivorship bias deserves its own warning for the textbook app. The price model learned from sold listings. Books that were overpriced and never sold are missing, so the data suggests that high prices work better than they do, and a model fit to it learns the survivors' habits.

## Fixing the Design, Not the Data

The cure is mostly at collection time. Random sampling gives every unit a known chance of selection, and the right comparison then holds. When the population has important groups, **stratified sampling** draws from each group on purpose so that none is missed. When non-response is unavoidable, follow up with a random subset of non-responders and give their answers extra weight.

After the fact, the options are weaker. If the probability of selection can be estimated, **weighting** each response by the inverse of its chance of being collected makes the sample resemble the population. Weighting the volunteer survey by the answer probabilities we set would recover 3.56, and in practice those probabilities are unknown and are only guessed from a few measured variables. It works when the cause of selection has been measured, and fails when the cause is the very thing being asked about.

## Questions to Ask of Any Dataset

1. Who or what could have been in this data and wasn't?
2. How did a unit get here, by choice, by a rule or by a random draw?
3. Does the way a unit got in depend on the outcome being studied?
4. Was the data collected by a system whose own decisions changed what it saw?
5. Is the data representative of where the model will be used, in time and in place?

The last question matters most for deployed models. A model trained on last year's students and used on this year's has a sampling problem in time, which [Data Distribution Shifts](/data-ai/distribution-shift) takes up.

## Key Points

- Bias is a systematic push that does not shrink with more data, while random error does
- Volunteers who were happier answered more, so the survey settled at 4.1 against a true 3.56, however many responded
- Selection, survivorship, convenience, non-response, measurement and feedback loops are the usual sources
- Good design fixes it: random sampling, stratification and follow up with non-responders, and weighting only helps when the cause of selection was measured
- <u>Ask who could have been in the data and wasn't</u>
