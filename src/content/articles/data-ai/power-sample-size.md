> The **power** of a test is the probability that it detects an effect that is really there. It rises with the sample size and the size of the effect, and falls as the noise grows. Planning a sample size before collecting data is how an experiment avoids being too small to show anything.

[Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) ended on a puzzle: a real difference in prices was invisible in a sample of 180 listings. The reason is power. A test that is too weak to detect an effect of the size we care about will mostly return a non-significant result, and that result then means almost nothing.

## Four Quantities That Trade Off

Power analysis ties together four numbers, and fixing three determines the fourth:

- **The significance level** α, usually 0.05
- **The power**, 1 − β, commonly set at 0.80
- **The effect size**, the smallest difference worth detecting
- **The sample size** n

We simulated power directly. Group A sells 20 percent of the time, and group B sells at a higher rate. For each sample size we ran 1,000 experiments and counted how often a test at α = 0.05 found the difference:

| Sample Size for Each Group | Power for a 3 Point Lift, 20% to 23% | Power for a 1 Point Lift, 20% to 21% |
| --- | --- | --- |
| 500 | 21.8% | 6.2% |
| 1,000 | 36.6% | 7.9% |
| 2,000 | 65.0% | 11.7% |
| 4,000 | 90.9% | 18.4% |
| 8,000 | 99.6% | 36.1% |

With 500 in each group, a real 3 point lift was detected about one time in five. The same experiment at 4,000 each found it 91 percent of the time. For a 1 point lift, even 8,000 in each group reached only 36 percent. Small effects are expensive to detect.

## How Big a Sample

For comparing two proportions, the number needed for each group to reach 80 percent power at α = 0.05 follows a formula. Starting from a 20 percent rate:

| Lift to Detect | Sample Needed for Each Group |
| --- | --- |
| 5 points, 20% to 25% | 1,094 |
| 3 points, 20% to 23% | 2,943 |
| 2 points, 20% to 22% | 6,510 |
| 1 point, 20% to 21% | 25,583 |

The required size grows with the inverse square of the effect: half the effect needs four times the data. Detecting 1 point takes about 26 times as many listings per group as detecting 5 points. The formula agrees with the simulation, where 2,943 per group is the sample for 3 points and our run showed 65 percent power at 2,000 and 91 percent at 4,000.

For a mean, the sample size depends on the standard deviation too: it grows with the variance and shrinks with the square of the difference. A noisy metric needs more data than a quiet one, which is why teams look for lower variance metrics, a topic of [Controlled Experiments and A/B Tests](/data-ai/ab-testing).

## Underpowered Studies Mislead Twice

A low power test fails to find real effects, which is the obvious cost. A second cost is less obvious. Among the results that do reach significance, an underpowered study tends to overstate the effect, since only the lucky large estimates cross the threshold. This is the winner's curse. A small experiment that declares a big win is more likely to be an overestimate than a large one, and the follow up that doesn't reproduce it is not a surprise.

The price comparison from the last topic was underpowered. With 120 and 60 listings and a true gap of about $8, the chance of detecting it was low, and the result of p = 0.52 told us little. The honest report said "no evidence either way" and the interval was wide.

## Doing It in Practice

1. **Choose the smallest effect that would change a decision**: not the effect you hope for, which is usually larger
2. **Estimate the noise** from past data, or from an A/A test
3. **Compute the sample size** for 80 percent power, or more for costly mistakes
4. **Convert it into time**: a sample of 6,510 for each group at 300 new listings a day is 43 days
5. **Commit in advance**: fix the sample size and the stopping rule, because looking early changes the error rates, as [Pitfalls of Online Experiments](/data-ai/experiment-pitfalls) explains

If the sample needed is more than can be had, choices remain: aim for a larger effect, reduce noise, pick a more sensitive metric, or accept that the experiment can only rule out large effects and say so.

## After the Fact

Computing power after seeing a non-significant result, from the observed effect, adds nothing: it is a function of the p-value. The useful after the fact tool is the confidence interval, which shows which effect sizes the data rules out. An interval from −$12 to +$19 says that large effects in either direction remain possible.

## Key Points

- Power is the chance of detecting a real effect, and it depends on the effect size, the noise, the level and the sample size
- A 3 point lift in a 20 percent rate was found 22 percent of the time with 500 in each group and 91 percent with 4,000
- Half the effect needs four times the data: detecting 1 point took about 26 times as many listings as detecting 5
- Underpowered studies miss real effects and exaggerate the ones they find
- <u>Pick the smallest effect that matters, compute the sample size first</u>, and fix the stopping rule in advance
