> Run enough tests and some will look significant by chance. With **multiple comparisons**, the chance of at least one false alarm grows quickly with the number of tests, so the threshold has to be adjusted. **Bonferroni** divides the level by the number of tests and controls any false alarm, and the **false discovery rate** procedure of Benjamini and Hochberg controls the expected share of false discoveries among the findings.

A team tests 20 features against a target, or an experiment reports 20 metrics, or an analyst slices a result by 20 segments. Each test at the 5 percent level is fair alone, and together they are not. This page measures how fast the problem grows and how to deal with it.

## How Quickly It Grows

If each of k independent tests has a 5 percent chance of a false alarm when there is nothing to find, the chance of at least one false alarm is 1 − 0.95ᵏ:

| Number of Tests | Chance of at Least One False Alarm |
| --- | --- |
| 1 | 5.0% |
| 5 | 22.6% |
| 10 | 40.1% |
| 20 | 64.2% |
| 50 | 92.3% |

With 20 tests, a false alarm is more likely than not. We confirmed it by simulation: we ran 20 comparisons of two groups drawn from the same distribution, over 3,000 repetitions, and at least one of the 20 reached p < 0.05 in 66.9 percent of the repetitions, close to the formula given the approximations of the test. A report that shows only the significant one among 20 is reporting noise.

The problem is not limited to listed tests. Slicing the same data by many segments, trying several metrics, adjusting the model until a number looks good and choosing the analysis after seeing the data are all multiple comparisons, and the count is the number of things that *could* have been looked at. This is sometimes called the garden of forking paths, and [Pitfalls of Online Experiments](/data-ai/experiment-pitfalls) shows a version of it.

## Controlling Any False Alarm: Bonferroni

The **family wise error rate** is the chance of one or more false alarms. The **Bonferroni correction** controls it with a simple rule: test each of k hypotheses at level α/k. For 20 tests, the threshold becomes 0.0025. In our simulation of 20 null comparisons, at least one passed the corrected threshold in 7.4 percent of repetitions, near the target of 5 percent, the excess coming again from the approximation.

The price is power. A threshold of 0.0025 is hard to meet, so real effects are more often missed. Bonferroni is right when a single false alarm is costly, such as claiming a drug works, and too strict for exploration with many candidates.

## Controlling the Share of False Discoveries

The **false discovery rate** (FDR) is the expected share of rejected hypotheses that are false. Benjamini and Hochberg's 1995 procedure controls it:

1. Sort the p-values from smallest to largest, p₍₁₎ to p₍ₘ₎
2. Find the largest k such that p₍ₖ₎ ≤ (k/m) q, where q is the FDR level, such as 0.10
3. Reject the hypotheses with the k smallest p-values

It allows more discoveries than Bonferroni and accepts that a known small share of them will be false. We compared the three approaches on a realistic mix: 20 comparisons, of which 4 had a real effect of 0.8 standard deviations and 16 had none, repeated 800 times, with 30 observations in each group.

| Method | Real Effects Found, of 4 | False Alarms for Each Run |
| --- | --- | --- |
| No correction, p < 0.05 | 3.49 | 0.85 |
| Bonferroni, p < 0.0025 | 2.15 | 0.05 |
| Benjamini–Hochberg, FDR 10% | 3.05 | Share of findings that were false: 9.1% |

Without correction, nearly every real effect was found and almost one false claim came with them in each run. Bonferroni removed the false claims and lost almost half the real effects. The FDR procedure found 3.05 of the 4 and kept the share of false findings at 9.1 percent, close to the 10 percent it promised. For screening many features, FDR is usually the better trade.

## In Practice

- **Count the tests honestly**, including those you ran and dropped, and those you looked at by eye
- **Decide the primary metric in advance** and treat the others as secondary, which limits the family to one test
- **Use FDR for screens and Bonferroni for confirmatory claims** where one error is expensive
- **Replicate**: a finding from exploration should be confirmed on fresh data, and the hold out set of [Training, Validation and Test Sets](/data-ai/train-val-test) plays this role in modeling
- **Be wary of model selection**: trying 100 models and reporting the best test score is multiple comparisons on the test set, as [Comparing Models Fairly](/data-ai/comparing-models) says

## Key Points

- With k tests at the 5 percent level, the chance of a false alarm is 1 − 0.95ᵏ: 64.2 percent at 20 tests
- Bonferroni tests each at α/k and controls any false alarm, at a cost in power
- The Benjamini–Hochberg procedure controls the false discovery rate: in our mix it found 3.05 of 4 real effects with 9.1 percent of findings false
- Forking paths such as many segments, metrics and models count as tests, even unwritten ones
- <u>Count the comparisons you could have made, and fix the primary one in advance</u>
