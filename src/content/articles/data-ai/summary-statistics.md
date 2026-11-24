> **Summary statistics** describe a column in a few numbers: its center (mean, median), its spread (standard deviation, interquartile range) and its extremes (percentiles). They compress a dataset and are indispensable, and they can hide its shape, which is why they are always paired with a picture.

A seller dashboard has room for one number about prices. Which one? The answer depends on what the number is for, and on what a few odd listings do to it. This page covers the standard summaries, what moves them, and the classic demonstration that identical summaries can describe very different data.

## Center

The **mean** is the sum divided by the count. The **median** is the middle value of the sorted data, and the **mode** is the most common value. For symmetric data they agree. For skewed data they don't, and each answers a different question. We drew 10,000 simulated listing prices, which pile up near $30 to $60 with a long tail of expensive books:

| Statistic | Value |
| --- | --- |
| Mean | $52.63 |
| Median | $45.17 |
| Standard deviation | $31.58 |
| Interquartile range | $33.75 |
| 5th percentile | $18.38 |
| 95th percentile | $112.67 |
| Maximum | $457.76 |

The mean is 17 percent above the median because the expensive tail pulls it up. "A typical listing" is closer to the median, and "the total spent per listing" is the mean, which is what revenue is built from. Reporting both is honest, and picking the flattering one is not.

## Spread

The **standard deviation** is the typical distance from the mean, in the units of the data, and the **variance** is its square. The **interquartile range** (IQR) is the distance between the 25th and 75th percentiles, so it covers the middle half of the values. A **percentile** is the value below which a given share of the data falls, and percentiles are a good way to describe skewed data and tails: a price of $112.67 is the 95th percentile, so one listing in twenty is dearer. Latency numbers are reported the same way, as in [Logs, Metrics and Traces](/system-design/observability).

## What One Value Does

We added a single listing priced at $5,000 to the 10,000:

| Statistic | Before | After One Outlier |
| --- | --- | --- |
| Mean | $52.63 | $53.12 |
| Median | $45.174 | $45.174 |
| Standard deviation | $31.58 | $58.69 |

One value in 10,001 raised the standard deviation by 86 percent and moved the mean by 49 cents. The median didn't move at all in the displayed digits. Statistics based on order, the median and the IQR, are **robust**, and those based on sums, the mean and the standard deviation, are **sensitive**. [Outliers and Noise](/data-ai/outliers) turns this into practice.

## The Same Numbers, Different Data

In 1973 the statistician Francis Anscombe published four small datasets of 11 points each that share almost every summary statistic. We recomputed them:

| Dataset | Mean of x | Mean of y | Variance of y | Correlation | Fitted Line |
| --- | --- | --- | --- | --- | --- |
| 1 | 9.0 | 7.50 | 4.13 | 0.816 | y = 3.0 + 0.50x |
| 2 | 9.0 | 7.50 | 4.13 | 0.816 | y = 3.0 + 0.50x |
| 3 | 9.0 | 7.50 | 4.12 | 0.816 | y = 3.0 + 0.50x |
| 4 | 9.0 | 7.50 | 4.12 | 0.817 | y = 3.0 + 0.50x |

The table says the four are the same, and they are not. Plotted, the first is a noisy line, the second a clean curve, the third a perfect line with one outlier that tilts the fit, and the fourth a vertical stack of points at one x with a single point far to the right that alone creates the whole correlation. No summary would reveal this, and a scatter plot shows it at a glance. This is the standing argument for drawing the data before trusting its numbers, which [Exploratory Data Analysis](/data-ai/eda) builds on.

## Choosing and Reporting

| Question | Reasonable Summary |
| --- | --- |
| What is a typical value? | Median, with the mean if the total matters |
| How variable is it? | Standard deviation for symmetric data, IQR for skewed data |
| How bad can it get? | A high percentile, such as the 95th or 99th |
| How do two columns move together? | A correlation, plus a scatter plot, as in [Correlation and Its Limits](/data-ai/correlation) |
| How big is the sample? | The count, always |

Always report the count and the units, and note missing values. A mean from 12 listings and a mean from 12 million are different kinds of facts, and [Estimation and Confidence Intervals](/data-ai/confidence-intervals) quantifies how different.

## Key Points

- The mean, median and mode describe the center, and for skewed prices the mean, $52.63, sat 17 percent above the median, $45.17
- Standard deviation, IQR and percentiles describe spread and tails
- One value in 10,001 raised the standard deviation by 86 percent and left the median alone, so order based statistics are robust
- Anscombe's four datasets share their means, variances, correlation and fitted line and look nothing alike
- <u>Pair every summary with a plot and a count</u>
