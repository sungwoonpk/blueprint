> A variable's **scale of measurement** says what its numbers mean: **nominal** values are only names, **ordinal** values have an order but no fixed gaps, **interval** values have equal gaps but no true zero, and **ratio** values have a true zero. The scale decides which summaries and models make sense, and a number is not always a quantity.

Phase 2 treated every feature as a number, which is how a model sees them. A table is built from columns that mean different things, and the same digits can be a price, a rating or a course code. This phase starts from the data itself, and the first question about a column is what kind of thing it measures.

## Four Scales

Stanley Stevens proposed the four scales in 1946, and they remain the standard way to sort columns. Each scale allows everything the one before it allows, plus something more.

| Scale | What It Allows | Example Column | A Sensible Summary |
| --- | --- | --- | --- |
| Nominal | Equal or not equal | Course code, seller id | Mode, counts |
| Ordinal | Order, greater or less | Condition: worn, fair, good, like new | Median, quantiles |
| Interval | Differences | A date, a temperature in degrees Celsius | Mean, standard deviation |
| Ratio | Ratios, a true zero | Price, age in years, days to sell | All of these, plus ratios |

The test for a ratio scale is whether "twice as much" means something. A $40 book costs twice a $20 book, and a 5 year old edition is twice as old as a 2.5 year old one. Noon is not twice as late as 6 AM in any useful sense, since the zero of a clock is a convention, which makes time of day an interval variable. Data that only comes in categories, such as the course, cannot even be ordered, and treating it as a number is the most common mistake in this area.

## Codes Are Not Quantities

A column of integers can hide a lower scale. The condition of a book is stored as 1, 2, 3 or 4, but the gap between worn and fair is not known to equal the gap between good and like new. The numbers record an order and nothing else.

To see what goes wrong, take two groups of sellers rated by condition. Group A has 50 books at 3, 30 at 2 and 20 at 4. Group B has 40 books at 1 and 60 at 4, a mix of extremes. We compared the group means under three codings that all keep the same order:

| Coding of the Four Conditions | Mean of Group A | Mean of Group B | Higher Mean |
| --- | --- | --- | --- |
| 1, 2, 3, 4 | 2.90 | 2.80 | A |
| 1, 2, 3, 10 | 4.10 | 6.40 | B |
| 1, 2, 4, 8 | 4.20 | 5.20 | B |

The winner changed with an arbitrary choice that preserves the order. The medians, 3 for group A and 4 for group B, don't depend on the coding, since the median uses only the order. For an ordinal variable, use the median, quantiles or the share in each category, and be wary of any average of the codes.

## What the Scale Means for Models

Machine learning libraries accept numbers, so the responsibility for the right treatment falls on the person preparing the data:

- **Nominal**: don't feed the code as a number, since a model would treat course 7 as bigger than course 3. Use one yes or no column for each category, as in [Encoding Categorical Features](/data-ai/encoding)
- **Ordinal**: the codes are acceptable for tree models, which only compare, and risky for linear models, which use the gaps
- **Interval and ratio**: usable directly, and a ratio variable with a long right tail is often better on a log scale, as [Distributions and Their Shapes](/data-ai/distribution-shapes) shows
- **Cyclic values**: hour of day or day of week wrap around, so 23 and 0 are neighbors, and the plain number says they are far apart

The target has a scale too, and it picks the problem. A nominal target is classification, a ratio target is regression, and an ordinal target, such as a rating from 1 to 5, sits between them and is often handled as one or the other with care.

## Beyond the Four

The four scales are a useful starting point, and real columns add more questions. Is the variable **discrete**, counting separate things, or **continuous**? Is it a measurement or an identifier? A seller id is a nominal variable even though it is an integer, and averaging ids is meaningless. A column such as price is a ratio variable that is also bounded below by zero, and dates carry a time zone. Writing down, for each column, its scale, unit and allowed range is the first entry in what [Model Cards and Datasheets](/data-ai/documentation) call documentation of data.

## Key Points

- The four scales are nominal, ordinal, interval and ratio, and each allows everything before it plus something more
- The scale decides which summary makes sense: modes for names, medians for ordered categories, means for interval and ratio values
- An integer column can hide a lower scale: recoding the four conditions without changing their order flipped which seller group had the higher mean
- Names should not be fed to a model as numbers, and cyclic values need care
- <u>Write down each column's scale, unit and range before analysis</u>
