> **Correlation** measures how closely two variables move together along a straight line, from −1 to 1. It misses curved relationships, is easily moved by a single extreme point, appears by chance in small samples, and says nothing about cause. A correlation is a prompt to look, and not a conclusion.

[Expectation, Variance and Covariance](/data-ai/expectation-variance) defined the correlation coefficient. Here are its limits, which matter because correlation is the first number most people reach for when asked whether two things are related.

## Pearson and Spearman

The **Pearson correlation** measures linear association. The **Spearman correlation** is the Pearson correlation of the ranks, so it measures whether one variable rises whenever the other does, in any monotone way. We generated 2,000 points where y is an exponential function of x, a steady and perfectly ordered relationship with a little noise:

| Relationship | Pearson | Spearman |
| --- | --- | --- |
| y rises exponentially with x | 0.858 | 0.997 |

The Pearson value, 0.86, understates a near perfect ordering, because the points are curved and not straight. Spearman, at 0.997, sees the order. When a relationship is monotone and curved, rank correlation fits better, or a log transform before the Pearson, as in [Distributions and Their Shapes](/data-ai/distribution-shapes).

## Zero Correlation Is Not Independence

A correlation of zero means no straight line trend, and nothing more. We drew 2,000 values of x between −3 and 3 and set y to the square of x plus a little noise. The relationship is perfect and deterministic, and the Pearson correlation was −0.023, effectively zero, since the upward and downward halves of the curve cancel. A plot shows the parabola, and the coefficient shows nothing.

Independent variables have a correlation of zero, but the reverse is false. The tool that detects any kind of dependence is mutual information, from [Entropy and Information](/data-ai/entropy), at the cost of needing more data to estimate it.

## One Point Can Make a Correlation

Correlation is sensitive to extremes. We drew 50 pairs of unrelated values and got a correlation of 0.235, which is chance: small samples scatter, and a standard error near 0.14 at n = 50 is normal. Then we added one extreme point with both values far out:

| Data | Pearson | Spearman |
| --- | --- | --- |
| 50 independent pairs | 0.235 | Not measured |
| The same plus one extreme point | 0.670 | 0.329 |

A single point nearly tripled the Pearson correlation, since it alone pulls a line through itself and the cloud. The rank version moved much less. Anscombe's fourth dataset in [Summarizing Data with Statistics](/data-ai/summary-statistics) is the same trick in the extreme.

## Chance Correlations

With enough pairs to try, strong correlations appear by luck. We generated 200 random series of 10 points each, with no relationship among them, and computed the correlation of all 19,900 pairs. The largest absolute value was 0.95. Anyone who searches many variables against one target will find an impressive correlation that means nothing, which is the mechanism behind "spurious correlation" websites and the reason [Multiple Comparisons](/data-ai/multiple-comparisons) exists. Series that trend over time are especially prone, since two upward trends correlate whatever their cause.

## Correlation Is Not Causation

Two variables correlate for three kinds of reason: one causes the other, a third thing causes both, or chance. We built two series of weekly numbers that both fall through the semester, the count of sales and the count of people buying sunscreen, both driven by the weather warming and by students leaving campus. They have no effect on each other, and their correlation was 0.987. The shared cause, in this case the progress of the term, produces a near perfect correlation.

For a model whose only job is prediction, a correlation can be enough: sunscreen sales may predict the quiet weeks. For deciding what to do, it isn't. Changing one variable will not move the other unless the link is causal, and telling the cases apart takes the methods of [Confounding and Simpson’s Paradox](/data-ai/confounding) and [Causal Inference from Observational Data](/data-ai/causal-inference).

## Using Correlation Well

- **Plot first**: a scatter plot shows curves, clusters and outliers that the coefficient hides
- **Report the sample size**, and an interval, since 0.235 from 50 pairs is not distinguishable from 0
- **Use rank correlation** for monotone curved relationships and for data with outliers
- **Beware many comparisons**: a correlation matrix of 100 columns has 4,950 pairs
- **Remember the limit of linear**: correlations between features also flag redundancy that a model can exploit or struggle with, as in [Selecting Features](/data-ai/feature-selection)

## Key Points

- Pearson measures linear association and Spearman measures monotone association: for an exponential trend they gave 0.858 and 0.997
- Zero correlation does not mean independence: y = x² gave −0.023
- One extreme point moved a correlation from 0.235 to 0.670
- Among 19,900 pairs of random series the strongest correlation was 0.95, so searching many pairs finds chance relationships
- <u>A correlation is a prompt to look, and the shared cause of the term gave 0.987 between unrelated series</u>
