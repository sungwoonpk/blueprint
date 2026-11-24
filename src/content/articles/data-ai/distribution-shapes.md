> The **shape** of a distribution, its skew, its tails and its number of peaks, decides which summary, model and transformation fit the data. Right skewed positive data such as prices often becomes symmetric on a log scale, two peaks mean two populations mixed together, and heavy tails mean extreme values are more common than a bell curve allows.

A histogram is the first picture of a column, and its shape answers practical questions. Is the mean a fair summary? Will a method that assumes a bell curve work? Is there one population in the column, or two? This page names the shapes that recur and what each one asks of the analyst.

## Skew and the Log Scale

Prices are bounded below by zero and have no upper limit, so they pile up on the left with a tail to the right: **right skew**. The **skewness**, a standardized third moment, is 0 for a symmetric distribution and positive for a right tail. For our simulated listing prices it was 2.17, and the mean was 1.17 times the median, so the average sits above the typical listing.

Taking the logarithm of a positive variable compresses the long tail, because equal ratios become equal steps: a book twice as expensive is the same distance above on a log scale at any price. After a log transform the skewness of the same prices was 0.008, a near perfect symmetry. Models that assume symmetric errors, and plots that would be dominated by a few expensive books, behave much better on the log scale. The lognormal distribution is the family whose log is Gaussian, and it describes prices, incomes, file sizes and many other multiplicative processes.

| Column | Skewness Raw | After Log |
| --- | --- | --- |
| Listing price | 2.17 | 0.008 |

If the target is on a log scale, the model predicts a ratio and not a difference, and errors are relative: "off by 10 percent" and not "off by $4". That is often what a price model should care about, since a $4 error on a $10 book is a different problem than on a $100 book.

## Two Peaks Mean Two Groups

A histogram with two humps usually mixes two populations. We drew 5,000 prices from a mixture: 60 percent from a cheap group centered near $25 and 40 percent from a group near $75, such as used paperbacks and new hardcovers. The histogram in $10 bins:

<figure class="chart">
<div class="hbars" role="img" aria-label="Histogram of prices in ten dollar bins with two peaks">
<div class="hbar"><span>$0 to 10</span><span class="track"><span class="fill" style="--w: 1.3%"></span></span><span class="value">24</span></div>
<div class="hbar"><span>$10 to 20</span><span class="track"><span class="fill" style="--w: 34.2%"></span></span><span class="value">617</span></div>
<div class="hbar peak"><span>$20 to 30</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">1,806</span></div>
<div class="hbar"><span>$30 to 40</span><span class="track"><span class="fill" style="--w: 32.4%"></span></span><span class="value">586</span></div>
<div class="hbar"><span>$40 to 50</span><span class="track"><span class="fill" style="--w: 1.3%"></span></span><span class="value">23</span></div>
<div class="hbar"><span>$50 to 60</span><span class="track"><span class="fill" style="--w: 6.2%"></span></span><span class="value">112</span></div>
<div class="hbar"><span>$60 to 70</span><span class="track"><span class="fill" style="--w: 26.6%"></span></span><span class="value">480</span></div>
<div class="hbar peak"><span>$70 to 80</span><span class="track"><span class="fill" style="--w: 41.2%"></span></span><span class="value">744</span></div>
<div class="hbar"><span>$80 to 90</span><span class="track"><span class="fill" style="--w: 26.7%"></span></span><span class="value">482</span></div>
<div class="hbar"><span>$90 to 100</span><span class="track"><span class="fill" style="--w: 6.1%"></span></span><span class="value">110</span></div>
<div class="hbar"><span>$100 to 110</span><span class="track"><span class="fill" style="--w: 0.8%"></span></span><span class="value">15</span></div>
</div>
<figcaption>Prices from a mixture of two groups, listings in each $10 bin</figcaption>
</figure>

The mean was $44.40, in the valley where only 4 percent of listings fall within $10 of it, and the median was $30.30. Neither describes any book. The remedy is to find the cause of the two groups, such as the format, and to analyze or model them separately, or to add the variable that separates them as a feature, which is a strong one. Mixtures of Gaussians can be fit directly, as in [Gaussian Mixtures and the EM Algorithm](/data-ai/gmm-em).

## Heavy Tails

A **heavy tailed** distribution has more probability far from the center than a Gaussian. For a Gaussian, 0.26 percent of values lie beyond 3 standard deviations. For the lognormal we drew, 1.86 percent did, seven times more. Methods that rely on the standard deviation, such as a 3 sigma outlier rule or a confidence interval for the mean from a small sample, are too optimistic on such data.

Heavy tails appear in file sizes, wealth, city sizes and the number of sales per seller, and the usual picture is a few sellers who account for most of the sales. Averages are dominated by the extremes, and the sample mean converges slowly. Quantiles, logs and robust methods are the usual response, and [Outliers and Noise](/data-ai/outliers) shows how.

## Bin Width Changes the Picture

A histogram is an estimate, and its bin width is a choice. Too wide, and the shape disappears: with 2 bins of $55 each, our mixture showed only 3,086 and 1,913 listings and no peaks at all. Too narrow, and noise creates false peaks. A reasonable start is a rule such as the square root of the count for the number of bins, then try several. A smooth **density estimate**, which replaces each point with a small bump and adds them up, avoids the bin edges, and it has a width setting of its own.

## Reading Shapes Before Modeling

| Shape | What It Suggests | Typical Response |
| --- | --- | --- |
| Symmetric, one peak | Gaussian may fit | Mean and standard deviation are fine |
| Right skew | Multiplicative or bounded process | Log transform, median |
| Two peaks | Two populations | Split, or add a separating feature |
| Heavy tails | Rare large values matter | Robust summaries, think about the tail |
| Spike at one value | A default or a placeholder, such as 0 | Treat as a category or as missing |
| Bounded, piled at an edge | A cap, such as a rating of 5 | Models for bounded or ordinal data |

## Key Points

- Skew, tails and the number of peaks decide which summaries and models fit a column
- Prices were right skewed, with a skewness of 2.17, and the log scale made them symmetric, with a skewness of 0.008
- Two peaks mean two populations: the mean of a two group mixture fell in the valley, where 4 percent of listings were within $10
- Heavy tails put more mass far out: 1.86 percent of lognormal values lay beyond 3 standard deviations against 0.26 percent for a Gaussian
- <u>Plot the histogram with several bin widths</u>, and let the shape pick the transformation
