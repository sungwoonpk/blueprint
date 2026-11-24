> An **outlier** is a value far from the rest of the data. It may be an error, such as a price typed with two extra zeros, or a real rare event, such as a signed first edition, and the two call for opposite treatment. **Noise** is the smaller, unavoidable scatter around the truth, and robust methods such as the median keep a few wild values from steering the result.

A seller types $4500 for a book worth $45.00. That one cell can change an average, a trend line and a model. This page covers how to notice such values, what they do to common summaries, and how to decide whether to remove them.

## What a Few Bad Values Do

We started with 500 simulated listings and their sold prices, with a mean of $54.90, a median of $49.70, a standard deviation of $27.33 and a slope of 0.50 dollars of price for each dollar of list price. Then three prices were typed with extra digits: $4,500, $3,800 and $5,200.

| Summary | Before | After 3 Typos in 500 Rows |
| --- | --- | --- |
| Mean | $54.90 | $81.46 |
| Median | $49.70 | $49.96 |
| Standard deviation | $27.33 | $347.20 |
| Slope of price on list price | 0.501 | 0.724 |

Three rows out of 500, 0.6 percent, raised the mean by half, multiplied the standard deviation by 13 and made a fitted line steeper by 44 percent. The median barely moved, a change of $0.26. A statistic's **breakdown point** is the share of bad values it can tolerate before it can be dragged anywhere: the median can take almost half, and the mean can be ruined by a single value.

## Finding Them

- **Look first**: a histogram or a sorted list of the top and bottom values shows a typo immediately, as [Exploratory Data Analysis](/data-ai/eda) recommends
- **The z-score rule**: flag values more than 3 standard deviations from the mean. It is easy, and the outliers inflate the standard deviation, which hides them from the rule: this is called masking
- **The IQR rule**: flag values more than 1.5 times the interquartile range beyond the quartiles. On the corrupted data the fence was $137.14, and it flagged 4 values, the three typos and one honest expensive book
- **The robust z-score**: use the median and the median absolute deviation, MAD, in place of the mean and standard deviation. Here the MAD was $19.78 and a cutoff of 3.5 flagged exactly the 3 typos
- **Model based**: a point can be unremarkable on each variable and strange together, which the Mahalanobis distance of [The Multivariate Gaussian](/data-ai/multivariate-gaussian) catches

On the clean data, the IQR rule flagged 1 value out of 500. A rule of thumb flags a small fraction by design, so a flag is a prompt to look, and not proof of an error.

## Error or Event

Whether to remove a flagged value is a question about how the data was made, not about statistics:

| Cause | Example | Usual Handling |
| --- | --- | --- |
| Entry error | A price of $4,500 for a $45 book | Correct it if the right value is known, otherwise treat it as missing |
| Unit or format error | Cents mixed with dollars | Fix the conversion for the whole batch |
| System glitch | A sensor stuck at 0 | Remove, and fix the source |
| Real rare event | A signed first edition at $400 | Keep, and use a method that tolerates it |
| Different population | A bulk reseller among students | Analyze separately |

Removing real extremes because they are inconvenient is a form of cheating that makes models look better than they are. A fraud detector, a rare disease test and an anomaly alert exist to find exactly the unusual cases, and removing outliers there removes the target.

## Robust Choices

Instead of deleting, use methods that tolerate a few wild values:

- **Median and quantiles** in place of mean and standard deviation
- **Winsorizing**, which clips values beyond a percentile such as the 1st and 99th to those limits
- **Log transforms** for positive, right skewed data, which pull in the long tail
- **Robust losses**: the absolute error and the Huber loss grow more slowly than the squared error, so one huge miss doesn't dominate, as [Measuring Regression Error](/data-ai/regression-metrics) compares
- **Tree models**, which split on order and so ignore how far a value is

## Noise

**Noise** is the scatter that remains after the signal, for example the roughly 4 percent of the list price that two identical books still differ by in the simulation. It is not an error to be removed. It sets a floor on achievable accuracy, the $3.50 of [From Writing Rules to Learning from Data](/data-ai/rules-to-learning), and a model that fits it perfectly has memorized the noise, which [Overfitting and Underfitting](/data-ai/overfitting) explains.

## Key Points

- An outlier is a value far from the rest, and an error and a real rare event need opposite handling
- Three typos in 500 rows moved the mean from $54.90 to $81.46 and the standard deviation from $27.33 to $347.20, and the median stayed within $0.26
- The z-score rule suffers masking, and the IQR and robust z-score rules flagged the typos: the robust rule flagged exactly the three
- Decide by cause, and never remove the unusual cases that a model exists to find
- <u>Prefer robust summaries and losses to deleting</u>, and treat noise as a floor, not a defect
