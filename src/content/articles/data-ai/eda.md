> **Exploratory data analysis** is the first look at a dataset before modeling: its size and types, its missing and duplicate values, the distribution of each column, the relationships between columns, and anything that looks wrong. John Tukey named it in the 1970s, and its purpose is to find the questions, and the problems, that a model would otherwise inherit.

A model trained on a table trusts the table. A zero where a price should be, a negative age, a column that is secretly the answer, all become part of what it learns. EDA is the habit of reading the data before relying on it, and it is cheaper than every later stage. This page walks one pass over a simulated table with problems planted in it.

## The First Look

A table of 5,000 listings was combined with some mistakes that real tables contain: 150 prices blank, 40 prices of 0, 5 prices typed 100 times too large, 60 ages of −1 and 120 rows copied twice. We ran the checks in the order a careful analyst would:

| Check | What We Found |
| --- | --- |
| Shape | 5,120 rows, 7 columns, 120 more rows than expected |
| Missing values | 149 prices blank, 2.91 percent |
| Impossible values | 61 ages below 0, 40 prices equal to 0 |
| Implausible values | 5 prices above 1.5 times the list price |
| Duplicates | 120 ids appear twice |
| Usable rows after cleaning | 4,751 unique listings |

The row count already pointed to a problem, since 5,000 listings were expected. Every one of these checks is a line of code or a query, and together they take minutes. They are the same questions as [Missing Data](/data-ai/missing-data), [Outliers and Noise](/data-ai/outliers) and [Duplicates and Entity Resolution](/data-ai/duplicates-entity-resolution), asked first.

## A Checklist

1. **Size and shape**: how many rows and columns, and does the count match what the source says
2. **Types and scales**: is each column the type it should be, and is a number really a quantity, as in [Variables and Measurement Scales](/data-ai/variable-scales)
3. **Missing values**: how many in each column, and whether they cluster
4. **Duplicates**: exact and near, and whether the key is really unique
5. **Ranges and impossible values**: negative ages, dates in the future, a price of 0
6. **Distributions**: a histogram for each numeric column and a count for each category, with the shapes of [Distributions and Their Shapes](/data-ai/distribution-shapes)
7. **Relationships**: scatter plots and correlations between columns, and between each column and the target, with the cautions of [Correlation and Its Limits](/data-ai/correlation)
8. **Time**: how the data changes over the period, and whether old rows resemble new ones
9. **Leakage**: any column that could not be known when the prediction is made, as in [Data Leakage](/data-ai/data-leakage)
10. **The target**: its distribution, its balance and its definition

## What the Relationships Showed

After removing the bad rows, we looked at how long listings took to sell for each condition. The days to sell fell steadily as the condition rose:

| Condition | Listings | Average Days to Sell |
| --- | --- | --- |
| 1 | 1,231 | 19.3 |
| 2 | 1,232 | 16.5 |
| 3 | 1,219 | 13.6 |
| 4 | 1,186 | 10.9 |

A clean monotone trend of this kind is a candidate feature. The days to sell is the sort of column that deserves a second look as well: it is known only after the sale, so using it to predict the price would be leakage, and EDA is the point at which such a column is flagged.

## Habits of a Good Pass

- **Keep a record**: write down each finding and the decision it led to, so the cleaning is reproducible and can be reviewed
- **Don't change the raw data**: do cleaning in code that runs on the original, not by editing the file
- **Look at samples of rows**, not only summaries, since a column of odd strings shows in ten rows and not in a mean
- **Ask the source**: a zero price might mean "free" or "unknown", and only the people who built the system know
- **Check against the world**: a total that doesn't match another report, or a count of students that exceeds the enrollment, signals a problem upstream
- **Stop when it is enough**: EDA has no end, and the goal is to know the data well enough to model it and to know what to distrust

## Automated Checks

For data that arrives every day, the manual pass becomes a set of tests that run on each batch: row counts, null rates, allowed ranges and uniqueness of keys. [Testing and Monitoring Data Quality](/data-ai/data-quality-checks) covers the practice, and the checklist above is where the tests come from. The first EDA of a dataset is also the first draft of its documentation, in the form described by [Model Cards and Datasheets](/data-ai/documentation).

## Key Points

- EDA is reading the data before relying on it, and it is cheaper than every later stage
- A pass over a table with planted problems found 120 extra rows, 149 blank prices, 61 impossible ages, 40 zero prices and 5 absurd ones, leaving 4,751 usable listings
- The checklist covers size, types, missing values, duplicates, ranges, distributions, relationships, time, leakage and the target
- Days to sell fell from 19.3 to 10.9 as condition rose, and the column also flagged a leakage risk
- <u>Record what you found and why you changed it</u>, and turn the checks into tests for new data
