> A **controlled experiment**, or A/B test, randomly assigns units such as users or listings to a control and a treatment, changes one thing for the treatment, and compares an outcome. Randomization is what makes the difference causal: it balances every other factor, measured or not, on average.

[Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) and [Comparing Groups with t-Tests and Chi-Square](/data-ai/comparing-groups) gave the arithmetic. This article is about the design around it, the part that decides whether a difference means anything. The textbook app wants to know whether a new price suggestion makes more listings sell.

## Why Randomize

Comparing users who saw the suggestion with users who didn't is only fair if the two groups were alike beforehand. In real usage they rarely are: eager sellers find new features first. Random assignment breaks that link, since a coin flip can't know who is eager.

With enough units, the groups match on everything, including factors nobody thought to record, and any later difference is due to the treatment or to chance, which the test quantifies.

This is why, in [Confounding and Simpson’s Paradox](/data-ai/confounding), observational data misleads and an experiment doesn't.

## The Ingredients

| Ingredient | What It Means | Our Example |
| --- | --- | --- |
| Unit | What gets randomized | The seller, not the listing, so one seller sees one version |
| Treatment | The one change | Showing the suggested price |
| Metric | The outcome measured | Share of listings sold within 14 days |
| Guardrails | Metrics that must not get worse | Refund rate, time to first sale |
| Duration | Fixed in advance | Two full weeks, covering weekday cycles |
| Sample size | From a power calculation | 5,000 sellers per group |

Choose the primary metric and its minimum worthwhile effect before looking at data, and size the test with [Statistical Power and Sample Size](/data-ai/power-sample-size). The unit decides what independence means: if two listings from one seller are treated as separate samples, the test overstates its evidence.

## One Test Run Through

We simulated the experiment with 5,000 sellers per group. The true sale rate was 20 percent for control and 23 percent for treatment. The observed rates were 20.58 and 24.52 percent, a lift of 3.94 points.

The standard error of the difference is about 0.84 points, so z = 4.71 and p = 0.0000024. The finding is solid: the treatment raised the rate, and the observed lift of 3.9 points is a little above the true 3.0, the usual luck of one sample.

An interval is more useful than the p-value alone. The 95 percent confidence interval for the lift is about 2.3 to 5.6 points, and the decision should depend on whether the whole range is worth shipping.

## Trust Checks Before the Result

Experiments have failure modes where the number looks fine and means nothing, so check these first:

- **A/A tests**: run the pipeline with no difference between groups. With a 5 percent threshold it should reject about 5 percent of the time. In our simulation of the same pipeline, 4.67 percent of A/A runs rejected, which is what a healthy system gives, and Kohavi and colleagues recommend A/A tests for exactly this purpose. Far from 5 percent means a bug in assignment, logging or the test
- **Sample ratio mismatch**: if we planned a 50-50 split, the observed counts should be close to it. A chi-square test of the counts catches trouble, and we show it below
- **Balance**: pre-experiment features like seller age should look alike in both groups
- **Instrumentation**: both versions must log the same events

Sample ratio mismatch is the cheapest and most telling check. With a 50-50 plan:

| Observed Control vs Treatment | Chi-Square | p | Verdict |
| --- | --- | --- | --- |
| 50,252 vs 49,748 | 2.54 | about 0.11 | Fine, ordinary chance |
| 49,400 vs 50,600 | 14.4 | 0.00015 | Broken, discard the result |

A 1.2 percent gap sounds small, but at 100,000 units it is far beyond chance, and it means something in the pipeline, such as a crash in one version or a bot filter that treats the arms differently, dropped users unevenly. The metric comparison is then biased in ways that can't be repaired.

## Reading the Outcome

- **Significant and worthwhile**: ship, after checking guardrails
- **Significant but tiny**: [Statistical Power and Sample Size](/data-ai/power-sample-size) warned that large samples make trivial effects significant, so weigh the interval against the cost
- **Not significant**: not evidence of no effect. Look at the interval. A narrow one around zero means the effect is small, a wide one means the test couldn't tell
- **Many metrics or segments**: each is a chance for a false positive, the problem of [Multiple Comparisons](/data-ai/multiple-comparisons)

[Pitfalls of Online Experiments](/data-ai/experiment-pitfalls) covers what goes wrong over time and in networks, and [Adaptive Experiments and Bandits](/data-ai/bandits) covers shifting traffic toward the winner as evidence comes in.

## Key Points

- Random assignment balances all other factors on average, so a difference can be attributed to the treatment
- Fix the unit, the primary metric, the guardrails, the duration and the sample size before looking at results
- Our simulated test of 5,000 sellers per group gave 20.58 against 24.52 percent, z = 4.71, with an interval of roughly 2.3 to 5.6 points
- An A/A test should reject about 5 percent of the time, and we saw 4.67 percent
- A sample ratio mismatch such as 49,400 against 50,600 (p = 0.00015) invalidates the result, and <u>checking trust before reading the result is part of the design</u>
