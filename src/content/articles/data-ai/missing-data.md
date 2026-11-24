> **Missing data** is a value that should be in the table and isn't. How it went missing matters more than how much is missing: values missing completely at random, missing at random given other columns, and missing not at random call for different treatment, and the easy fixes of dropping rows or filling in the average each break in a specific way.

Of 20,000 sold listings, a fraction have no recorded price. Some sellers left the box blank, some listings were imported from a system without it, and some buyers asked not to be tracked. What to do next depends on why the values are gone.

## Three Mechanisms

Donald Rubin's 1976 classification names three ways a value can go missing:

| Mechanism | Meaning | Example in the Textbook App |
| --- | --- | --- |
| Missing completely at random (MCAR) | Whether a value is missing is unrelated to anything | A random import error drops 30 percent of prices |
| Missing at random (MAR) | Missingness depends on other recorded columns, not on the missing value itself | Prices of old editions are often left blank, and age is recorded |
| Missing not at random (MNAR) | Missingness depends on the missing value | Sellers hide low prices |

"At random" is a technical term, and MAR is a little misleading: the missing values are not random, they are explainable from what was observed. The three cases can't be told apart from the data alone, since the evidence for MNAR is by definition in the missing values. The choice rests on knowledge of how the data was produced.

## What Dropping and Filling Do

We simulated 20,000 listings with a true mean price of $56.74 and a standard deviation of $27.76, and removed prices under each mechanism. We compared four ways of estimating the mean and the spread:

| Mechanism | Share Missing | Mean, Rows Dropped | Mean, Filled With the Average | Spread After Filling With the Average | Mean, Filled From a Model |
| --- | --- | --- | --- | --- | --- |
| MCAR | 30.2% | $56.90 | $56.90 | $23.31 | $56.79 |
| MAR | 26.6% | $61.24 | $61.24 | $24.24 | $56.74 |
| MNAR | 27.0% | $64.60 | $64.60 | $22.90 | $57.34 |

The truth is $56.74 and a spread of $27.76. Four lessons show:

- **Dropping rows is safe only under MCAR**: when the pattern depended on age, the observed mean was $61.24, and when sellers hid low prices it was $64.60, because the survivors were the expensive ones
- **Filling with the average never changes the mean** of what was observed, and it shrinks the spread by about a sixth, from $27.76 to about $23, since every filled row sits exactly at the center
- **A model fills better**: predicting the missing price from the list price and the age gave $56.74 under MAR, the truth, because the missingness depended on age, a column the model used
- **MNAR is not fully fixable from the data**: the model got $57.34, close here only because the list price is a strong predictor of price, and with weaker predictors the gap would be wide

## Practical Options

- **Drop rows** when few are missing and the cause is plausibly random, and report how many were dropped
- **Drop a column** if most of it is missing and it adds little
- **Impute** with a simple value such as the median, and add a yes or no column that records that the value was missing, since the fact of missingness is often informative
- **Model based imputation**, such as predicting the value from the other columns, or imputing several times and combining the results to reflect the uncertainty
- **Use a method that handles missing values**, as many tree libraries do by learning which way to send a missing value at each split

The missing indicator earns its place. In our MNAR case, sellers hid low prices, so a missing price is itself a sign of a low price, and a model that knows which rows were blank can use that.

## Order of Work

Fit imputation values on the training data only and apply them to the test data, or the test set leaks into the training step, a mistake that [Data Leakage](/data-ai/data-leakage) describes. Look for missingness before modeling, plot where it clusters, and ask why before choosing how.

## Key Points

- Values can be missing completely at random, at random given other columns, or not at random, and the data alone can't tell which
- Dropping rows biased the mean to $61.24 under MAR and $64.60 under MNAR, against a truth of $56.74
- Filling with the average leaves the mean alone and shrinks the spread by about a sixth
- Imputing from a model recovered the truth under MAR, and a missing indicator keeps the information that a value was absent
- <u>Ask why the values are missing before choosing a fix</u>, and fit imputations on training data only
