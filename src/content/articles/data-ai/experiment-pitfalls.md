> Online experiments go wrong in ways a clean test statistic hides: peeking at results and stopping early, short tests that catch novelty, users who interact with one another, mismatched assignment, and metrics that move for the wrong reason. Each inflates false positives or biases the effect, and each has a known remedy.

The arithmetic of [Controlled Experiments and A/B Tests](/data-ai/ab-testing) assumes a design followed to the end. Real experiments run on dashboards that update daily, on users who talk to each other, and under pressure to ship. This article lists the failures that Kohavi, Longbotham, Sommerfield and Henne described in their survey of controlled experiments on the web, plus the ones our own simulations show.

## Peeking

A fixed-sample test fixes its false positive rate at 5 percent only if you look once, at the end. Looking each day and stopping at the first p below 0.05 gives many chances.

We simulated tests with no real difference and about 4,200 units per group in total, changing only how often we looked:

| Number of Looks | False Positive Rate |
| --- | --- |
| 1, at the end | 3.5% to 4.7% across runs |
| 2 | 9.1% |
| 5 | 14% |
| 14, daily for two weeks | 22% |
| 30 | 30.1% |

The sample size didn't change. A rule that says "stop as soon as it looks significant" turns a 5 percent error rate into 22 percent after two weeks of daily checks, and above 30 percent with 30 looks. Repeated looks are multiple comparisons in time.

Remedies: fix the duration and don't decide before it ends, or use a **sequential test** designed for continuous monitoring, which spends the error budget across looks, or a Bayesian analysis with a decision rule fixed beforehand and checked by simulation.

## Novelty and Primacy

Early results can mislead for behavioral reasons. A **novelty effect** is a burst of clicks because something is new, which fades. A **primacy effect** is the reverse: users used to the old design first do worse with the new, then adapt. Both make a short test unrepresentative of the long run. Run for full weekly cycles, plot the effect by day, and be wary of a trend that hasn't settled.

## Interference

The analysis assumes that one unit's outcome doesn't depend on the other units' assignments. In a marketplace that fails. If the treatment helps some sellers sell faster, they take buyers from control sellers, so the control rate drops, and the measured difference overstates what would happen if everyone got the feature. Social networks, shared inventory and auctions have the same problem.

Remedies: randomize clusters, such as whole campuses, so interference stays inside a group, or randomize by time or region, and measure spillover with a design that includes it. The cost is fewer independent units and less power.

## Assignment and Measurement Problems

- **Sample ratio mismatch**: unequal arms against the plan, covered in the previous article, and the most common sign of a bug
- **Bots and heavy users**: a few accounts can dominate a mean. Filter bots and consider capping or using a trimmed metric
- **Triggered analysis**: if only users who see the change are analyzed, the filter must be applied identically in both arms. Otherwise a treatment that changes who qualifies biases the comparison
- **Different exposure**: treated users who never saw the feature dilute the effect, so analyze everyone assigned, as assigned, an approach called intention to treat
- **Changing the test midway**: altering the traffic split mixes populations and can reverse a result, the structure of Simpson’s paradox in [Confounding and Simpson’s Paradox](/data-ai/confounding)

## Metrics That Mislead

A metric is a proxy, and optimizing a proxy can hurt the real goal:

- **Short term versus long term**: more pop-ups raise clicks today and lower retention later
- **Cannibalization**: a feature that moves purchases from one product to another shows a gain in one place and a loss in the other
- **Ratio metrics**: a rate such as sold per view changes if views change, so check the numerator and the denominator separately
- **Too many metrics**: with 20 outcomes, one will be significant by chance in most tests

Use one primary metric, several guardrails, and an overall evaluation criterion, which Kohavi's group suggests combining the main objectives in.

## A Checklist

1. Fix the hypothesis, metric, duration and sample size in advance
2. Run an A/A test on new tooling
3. Check sample ratio and balance before reading effects
4. Look at the effect by day for novelty
5. Think about whether units interact
6. Adjust for the number of metrics and segments you inspect
7. Report the interval, and keep the guardrails in view

Honest experimentation is mostly discipline of this kind. When an experiment can't be run, [Causal Inference from Observational Data](/data-ai/causal-inference) tries to recover the answer from existing data, with weaker guarantees.

## Key Points

- Peeking and stopping at the first p below 0.05 gave a 22 percent false positive rate after 14 looks and 30 percent after 30, with the sample size unchanged
- Short tests catch novelty and primacy effects, so run full weekly cycles and plot the effect by day
- In a marketplace, treated units can take outcomes from control units, which breaks the independence the test assumes
- Sample ratio mismatch, bots, uneven exposure and shifting splits corrupt the comparison before any statistic is computed
- <u>Pre-register the plan, check trust first, and watch guardrails as well as the target metric</u>
