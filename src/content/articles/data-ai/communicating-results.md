> **Communicating findings** means turning an analysis into a decision for someone who didn't do it. Lead with the answer, say how sure you are, show the evidence that carries the point, and name what the reader should do. The framing of a number, as a relative or an absolute change, can change what a reader concludes.

An analysis that nobody acts on has failed, however sound. The reader is a founder, a manager or a seller who has minutes, not a statistician with a day. This page covers the structure that works, and a few traps in how numbers are presented.

## Start With the Answer

The most common mistake is to tell the story in the order it was discovered. The reader wants the conclusion first and the path second. A reliable structure is:

1. **The question** in the reader's words
2. **The answer** in one or two sentences
3. **The evidence**, one chart or table that carries the point
4. **How sure we are**, with the main caveat
5. **What to do**, or what decision it informs

For the textbook app: "Should we show a suggested price? Yes. Sellers who saw a suggestion priced within $5 of the final price in 75 percent of cases against 50 percent without one. This comes from a simulation on historical sales, so we expect the real gain to be smaller until it is tested live. We recommend an experiment on 10 percent of new listings."

Details, methods and the many other charts go in an appendix. They support trust and don't belong in the main line.

## Numbers That Mislead

The same fact can be stated in ways that feel very different. Suppose the share of listings that attract a complaint rises from 2 percent to 3 percent:

| Framing | Statement | Impression |
| --- | --- | --- |
| Relative change | "Complaints rose 50 percent" | Alarming |
| Absolute change | "Complaints rose by 1 percentage point" | Small |
| Natural frequency | "10 more complaints for each 1,000 listings" | Concrete |

All three are true. Which is honest depends on what the reader will do with it, and the safe habit is to give the base rate with every relative change. A 50 percent increase in a rare thing and a 50 percent increase in a common thing are not the same news. Natural frequencies, as in [Conditional Probability and Bayes’ Rule](/data-ai/conditional-bayes), are the easiest for people to reason with.

Other traps:

- **Averages without spread**: "average price $52" hides a range from $15 to $110, so give the median and a range
- **Percent of what**: a rate with an unstated denominator can't be judged
- **Statistical significance as importance**: a tiny effect can be significant in a large sample, and a large one can be non significant in a small sample, as [Hypothesis Testing and p-Values](/data-ai/hypothesis-testing) explains
- **Selective windows and groups**: showing the period or segment where the story works

## Say How Sure You Are

Uncertainty is part of the finding. A number with an interval, "a 3 point lift, between 1 and 5", tells the reader what range of outcomes to plan for, and a number without one invites false precision. [Estimation and Confidence Intervals](/data-ai/confidence-intervals) gives the intervals. Be plain about what the data can't say: that the sample was only students, that the period was one semester, that the link is a correlation and not a cause. A caveat stated once and clearly builds trust, and a hidden one costs it later.

Words carry probability too. "Likely", "probable" and "possible" mean different things to different readers, and a number such as "about 70 percent" removes the guess.

## Match the Form to the Reader

| Reader | What Serves Them |
| --- | --- |
| A decision maker with two minutes | One page: the answer, one chart, the recommendation |
| A colleague who will extend the work | The data, the code, the assumptions and the caveats |
| An engineer who will build on it | The exact definitions, the inputs and the failure cases |
| A broad audience | A single message, with a chart that makes it obvious |

Each chart should make one point, and the title should state it, as [Choosing a Chart](/data-ai/choosing-charts) recommends. Cut everything that doesn't support the message, including interesting results that belong to a different story.

## Reproducibility and Honesty

A finding should be reproducible: the data version, the code and the settings are recorded, as [Experiment Tracking and Reproducibility](/data-ai/experiment-tracking) describes. Report the analyses that failed as well as those that worked, since only reporting the successes is a form of the multiple comparisons problem. If the analysis changed the answer after seeing results, say so. The reader is trusting the process as much as the number.

## Key Points

- Lead with the answer, then give the evidence, the confidence and the action, and move the method to an appendix
- Relative changes mislead without a base rate: 2 percent to 3 percent is a 50 percent rise, 1 point, or 10 more complaints in 1,000
- Give a range and a plain caveat, since false precision and hidden limits cost trust
- Match the form to the reader, and make each chart carry one message in its title
- <u>Report what failed as well as what worked</u>, and keep the analysis reproducible
