> **Causal inference** asks what would have happened under a different action. When we can't randomize, it estimates the effect from observational data by adjusting for confounders, under assumptions we can state but can't fully test: no unmeasured confounding, overlap between groups, and no interference between units.

[Controlled Experiments and A/B Tests](/data-ai/ab-testing) answer causal questions by design. Many questions can't be tested that way: we can't randomly assign sellers a past policy, nor assign health conditions. The question is what we can still say from data that exists.

## Potential Outcomes

In the potential outcomes framework of Jerzy Neyman and Donald Rubin, each unit has an outcome under each action: Y(1) if treated and Y(0) if not. The causal effect for a unit is Y(1) − Y(0). We see only one of the two, whichever was actually taken, and the other is the **counterfactual**. That is the fundamental problem of causal inference.

What we can estimate is an average, such as the **average treatment effect**, the mean of Y(1) − Y(0) across units. A comparison of treated and untreated averages estimates it only if the groups are exchangeable, which randomization guarantees and observation doesn't.

## The Assumptions

| Assumption | Meaning |
| --- | --- |
| Conditional exchangeability | Given the measured covariates, treatment is as good as random: no unmeasured confounding |
| Positivity | Every kind of unit has some chance of each treatment |
| Consistency, and no interference | The outcome under a treatment is what we observe, and one unit's treatment doesn't change another's |

These are about the world, not the data, and no test can confirm exchangeability. A causal conclusion is only as good as the argument for it.

## An Example With a Known Answer

Listings with good photos sell more, but better photos are also added to popular books. We simulated 20,000 listings where the true effect of a photo upgrade is **+0.05** in sale probability, and popularity drives both the upgrade and the sale.

| Method | Estimated Effect |
| --- | --- |
| Naive difference: 43.6% against 24.8% | 0.187 |
| Stratify on popularity, then average | 0.0429 |
| Within popular books / within others | 0.0416 / 0.0438 |
| Inverse propensity weighting | 0.0429 |
| Randomized experiment | 0.0422 |
| Naive, with popularity unrecorded | 0.187 |
| True effect | 0.05 |

The naive difference is nearly four times the truth. Once popularity is adjusted for, by stratifying or weighting, the estimate lands near the randomized estimate and a little below the true 0.05. The standard error of each estimate is about 0.005, so the gap is about 1.5 standard errors, ordinary for one simulated sample. When the key variable isn't recorded, nothing in the data tells us the number is wrong: the estimate stays 0.187.

## The Methods

- **Stratification and regression**: compare similar units, or include the confounders in a model of the outcome
- **Matching**: pair each treated unit with similar untreated ones
- **Inverse propensity weighting**: estimate each unit's probability of treatment given covariates, the **propensity score**, and weight units by its inverse so the groups look alike. In our example the propensities were 0.797 for popular books and 0.299 for the others. Weighting gives rare combinations more say and can explode when propensities are near 0 or 1, a violation of positivity
- **Difference in differences**: compare the change over time in a treated group with the change in an untreated group, assuming they would have moved in parallel
- **Instrumental variables**: use something that shifts the treatment but affects the outcome only through it, such as a random reminder
- **Regression discontinuity**: compare units just above and below a cutoff, where assignment is nearly random

Each trades one assumption for another, and none removes the need to think.

## Colliders and Over-Adjustment

More adjustment isn't always better. A **collider** is a variable caused by both the treatment and the outcome, and conditioning on it creates a spurious link between them. If we study only the listings that were featured on the homepage, and featuring depends on both photo quality and popularity, then within featured listings the two become negatively related. Choose covariates to adjust for by causal reasoning, not by availability.

## In Machine Learning

A predictive model answers "what will happen", and a causal question is "what will happen if we act". A churn model can tell us who will leave, and not whom a discount will keep. Uplift models estimate the effect of treatment on each unit, and rely on randomized data or the assumptions above. For the textbook app, a causal estimate of the photo effect is what justifies spending effort on a photo-quality tool.

For a thorough treatment, see Hernán and Robins, *Causal Inference: What If*, a free book from the Harvard T.H. Chan School of Public Health.

## Key Points

- Causal effects compare potential outcomes, and we observe only one per unit, so we estimate averages under assumptions
- The key assumptions are no unmeasured confounding, positivity and no interference, and none can be confirmed from the data
- In our simulation a naive difference of 0.187 shrank to 0.043 after adjusting for popularity, against a true 0.05 and a randomized 0.042
- If the confounder wasn't recorded, the estimate stayed at 0.187 with no warning
- <u>Draw the causal story, adjust for confounders but not colliders, and report the assumptions with the answer</u>
