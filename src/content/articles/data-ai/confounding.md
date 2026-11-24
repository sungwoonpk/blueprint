> A **confounder** is a variable that influences both the supposed cause and the outcome, creating an association that is not causal. **Simpson’s paradox** is the extreme case: a trend that appears in the combined data reverses inside every subgroup. The cure is to ask how the groups came to differ, not to trust the pooled number.

[Correlation and Its Limits](/data-ai/correlation) warned that association isn't causation. Confounding is the most common reason, and it can flip a conclusion completely.

## The Discount Puzzle

The textbook app has a discount tool. We simulated 20,000 listings. Sellers choose whether to discount, and the data shows how often each listing sold:

| Group | Listings | Sold |
| --- | --- | --- |
| Discounted | 9,986 | 47.3% |
| Not discounted | 10,014 | 65.4% |

Discounted listings sold less often, by 18 points. Read naively, the discount tool hurts. Now split by the book's condition:

| Condition | Discounted: Listings, Sold | Not Discounted: Listings, Sold |
| --- | --- | --- |
| Good | 1,997, 81.9% | 7,893, 75.0% |
| Poor | 7,989, 38.7% | 2,121, 29.6% |

Within good books, discounting raised the sale rate from 75.0 to 81.9 percent. Within poor books, from 29.6 to 38.7. The discount helps in both groups and hurts overall. The reversal is Simpson’s paradox.

## Why It Happens

Condition is a confounder. Poor books sell badly, and sellers discount poor books far more often: 80 percent of the discounted listings were poor, against 21 percent of the others. So the discounted group is full of books that would have sold badly anyway, and the pooled comparison blames the discount for what condition did.

Arithmetically, the overall rate is a weighted average of the subgroup rates, and the weights differ between the groups. Nothing is wrong with either calculation. They answer different questions, and only one matches the causal question we asked.

## Which Number to Trust

The paradox has no purely statistical resolution: the same table could have a different story behind it. The data can't say whether to use the pooled figure or the split figures. A causal story does:

- Condition affects both the decision to discount and the chance of a sale, and was decided before the discount. It is a confounder, so compare within condition
- If the variable were instead a consequence of the discount, such as a later buyer interest score, splitting on it would hide part of the effect, and the pooled number would be right for the question asked

So the arrow structure of the situation decides. Drawing the causal diagram first, with arrows from causes to effects, makes the choice explicit. Judea Pearl's work on causal diagrams made this point rigorous.

## Confounders Elsewhere in Data and AI

- **Observational comparisons**: feature users versus non-users, hospital A versus hospital B, treated versus untreated
- **Model evaluation**: a model that seems to improve outcomes where it is used may be used on easier cases
- **Learning from logs**: a recommender trained on clicks learns from what was shown, itself the result of earlier models, a loop covered in [Evaluating Recommenders and Feedback Loops](/data-ai/recsys-evaluation)
- **Spurious features**: a classifier can learn that a ruler beside a skin lesion means cancer, because rulers appear in photos of dangerous ones, and then fail when the ruler is absent, a shortcut of the same kind that [Data Leakage](/data-ai/data-leakage) describes
- **Bias and fairness**: group differences in outcomes can reflect a confounder or a cause, and the analysis differs, as in [Group Fairness Metrics](/data-ai/fairness-metrics)

## Handling Confounders

| Approach | Idea | Limit |
| --- | --- | --- |
| Randomize | Assign the treatment by chance, so no variable decides it | Not always possible or ethical |
| Stratify | Compare within groups of the confounder, then average | Needs the confounder measured, and few strata |
| Regression adjustment | Include the confounder as a feature | Assumes the model form |
| Matching and weighting | Compare similar units, or reweight to balance | Only balances what is measured |

All of them except randomization share the same weakness: an **unmeasured** confounder remains. The next article, [Causal Inference from Observational Data](/data-ai/causal-inference), shows adjustment working and then failing when the confounder isn't recorded.

## A Habit

Before accepting a difference between groups, ask what determined who ended up in each group, and whether that same thing affects the outcome. If the answer is yes, a pooled comparison can't be trusted, and if the grouping variable is observed, stratify and compare.

## Key Points

- A confounder influences both the treatment and the outcome, and a pooled comparison blames the treatment for the confounder's effect
- Discounted listings sold 47.3 percent against 65.4 percent overall, yet discounting raised sales from 75.0 to 81.9 percent for good books and from 29.6 to 38.7 percent for poor ones
- Sellers discounted poor books far more often, so the pooled groups were not comparable
- Whether to pool or split depends on the causal structure, not on the table
- <u>Ask how the groups were formed before comparing them, and remember that unmeasured confounders can't be adjusted away</u>
