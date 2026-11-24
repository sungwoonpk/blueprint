> **Conditional probability**, P(A | B), is the probability of A once B is known to have happened. **Bayes’ rule** turns it around: P(A | B) = P(B | A) P(A) / P(B). It tells how to update a belief, the **prior**, with evidence, to get a **posterior**, and it shows that a good test for a rare thing still produces mostly false alarms.

[Joint Distributions and Independence](/data-ai/joint-independence) defined conditional probability as a restricted row of a table. Often the table is not available in the direction we need. We know how often a fake listing looks suspicious, and we want to know how often a suspicious listing is fake. Bayes’ rule converts one into the other.

## The Rule

From the product rule, P(A, B) = P(A | B) P(B) = P(B | A) P(A). Dividing gives Bayes’ rule. The denominator, P(B), is the total probability of the evidence, found by summing over the cases: P(B) = P(B | A) P(A) + P(B | not A) P(not A). Each part has a name that is used throughout machine learning:

| Part | Name | In the Fake Listing Example |
| --- | --- | --- |
| P(A) | Prior | How common fake listings are |
| P(B given A) | Likelihood | How often a fake listing is flagged |
| P(A given B) | Posterior | How likely a flagged listing is fake |
| P(B) | Evidence | How often anything is flagged |

## A Detector for Fake Listings

Suppose 1 listing in 100 is fake, such as a scam or a duplicate. A detector flags 95 percent of fake listings and also flags 5 percent of real ones. A listing is flagged. How likely is it to be fake?

Most people guess about 95 percent. Natural frequencies show the answer. Out of 10,000 listings:

| Group | Listings | Flagged |
| --- | --- | --- |
| Fake | 100 | 95 |
| Real | 9,900 | 495 |
| All | 10,000 | 590 |

Of the 590 flagged listings, 95 are fake, so the posterior is 95 / 590 = 16.1 percent. Five percent of a huge real group outnumbers 95 percent of a tiny fake one. Bayes’ rule gives the same number: 0.95 × 0.01 / (0.95 × 0.01 + 0.05 × 0.99) = 0.161.

We checked it by simulation. Among 200,000 simulated listings, 1,998 were fake and 1,903 of them were flagged, and 9,869 real listings were flagged too. The share of flagged listings that were fake came out at 16.17 percent, against the formula's 16.1 percent.

## The Prior Does a Lot of Work

The same detector gives very different posteriors depending on how rare the target is:

| Share of Listings That Are Fake | Chance a Flagged Listing Is Fake |
| --- | --- |
| 0.1% | 1.87% |
| 1% | 16.1% |
| 10% | 67.9% |
| 50% | 95.0% |

A detector with 95 percent sensitivity is nearly useless on a very rare problem, and excellent on a common one. This is the base rate problem that [Guardrails](/system-design/guardrails) met with attack detection, and it is why [Accuracy, Precision and Recall](/data-ai/classification-metrics) reports precision separately. A claim like "the test is 95 percent accurate" says nothing until the base rate is stated.

## Updating a Belief

Bayes’ rule is repeatable. Today's posterior becomes tomorrow's prior when new evidence arrives. A seller whose first listing was flagged, then whose second was flagged, is less likely to be honest than the first flag alone suggests, and the update is a multiplication by the likelihood each time. This is the engine of [Bayesian Inference](/data-ai/bayesian-inference), where the thing being updated is not a yes or no but a whole distribution over a model's parameters.

## Where It Shows Up

- **Classification**: a model that estimates P(class | features) is computing a posterior, and [Naive Bayes](/data-ai/naive-bayes) does it with Bayes’ rule directly, using the likelihood of each feature
- **Generative models**: [Generative and Discriminative Models](/data-ai/generative-discriminative) contrasts modeling P(features | class) with modeling P(class | features) directly
- **Medical and security tests**: any rare event with an imperfect detector follows the same arithmetic
- **Choosing a threshold**: the prior and the costs of errors, not accuracy alone, decide where to cut, as in [Thresholds, ROC and Precision-Recall Curves](/data-ai/roc-pr)

## Key Points

- Conditional probability restricts to what is known, and Bayes’ rule reverses it using the prior, the likelihood and the total probability of the evidence
- Natural frequencies make it concrete: of 10,000 listings, 95 of the 590 flagged were fake
- With 1 percent fake listings and a detector that catches 95 percent and flags 5 percent of real ones, only 16.1 percent of flagged listings were fake, and simulation gave 16.17 percent
- The prior matters: the same detector gave 1.87 percent at a 0.1 percent base rate and 95 percent at 50 percent
- <u>A test's accuracy means little without the base rate</u>, and a posterior can be updated again with new evidence
