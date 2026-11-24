> A **joint distribution** gives the probability of combinations of random variables. The **marginal** distribution of one is what remains after summing out the others, and the **conditional** distribution fixes the value of one. Two variables are **independent** when the joint equals the product of the marginals, and machine learning is mostly about variables that are not.

[Random Variables and Distributions](/data-ai/random-variables) described one quantity at a time. A model is useful only because quantities are related: the edition affects whether a book sells, the age affects the price. This page gives the language for relationships between variables, and a way to tell when there is none.

## A Joint Table

Take two yes or no variables for a listing: whether it is a new edition of the course book, and whether it sold within 14 days. We simulated 10,000 listings with 25 percent new editions, where old editions sold with probability 0.80 and new ones with 0.45. The counts form the joint table:

| | Sold Within 14 Days | Not Sold | Row Total |
| --- | --- | --- | --- |
| Old Edition | 6,047 | 1,454 | 7,501 |
| New Edition | 1,125 | 1,374 | 2,499 |
| Column Total | 7,172 | 2,828 | 10,000 |

Divide by 10,000 and the table is the joint distribution P(edition, sold): 60.47 percent are old editions that sold, 14.54 percent old editions that didn't, and so on. All four entries add to 1.

## Marginals and Conditionals

The **marginals** are the row and column totals. P(new edition) = 24.99 percent and P(sold) = 71.72 percent. They answer each question alone.

The **conditional** probability restricts to one row or column and rescales it to add to 1. P(sold | new edition) = 1,125 / 2,499 = 45.02 percent, and P(sold | old edition) = 6,047 / 7,501 = 80.62 percent. The notation reads "the probability of sold, given a new edition". The three are tied by the **product rule**: P(A, B) = P(A | B) P(B). [Conditional Probability and Bayes’ Rule](/data-ai/conditional-bayes) turns this around.

## Independence

Two variables are independent when knowing one tells nothing about the other, so P(A, B) = P(A) P(B) for every cell. We can test it by multiplying the marginals and comparing each cell:

| Edition and Sold | Actual Joint | Product of Marginals |
| --- | --- | --- |
| Old, sold | 60.47% | 53.80% |
| Old, not sold | 14.54% | 21.21% |
| New, sold | 11.25% | 17.92% |
| New, not sold | 13.74% | 7.07% |

The cells differ by several points, so the variables aren't independent. The edition carries information about the sale, which is exactly what a model can exploit. Had they been independent, the joint would match the right column.

## How Much Do They Share

A single number for the dependence is the **mutual information**, the sum over cells of the joint times the log of the joint divided by the product of marginals: it is zero for independent variables and positive otherwise. For the table above it was 0.079 bits. As a control, we simulated an edition flag and a sale flag drawn independently, and the value was 0.00001 bits, zero up to sampling noise. [Entropy and Information](/data-ai/entropy) gives the formula its meaning, and the number measures how much knowing the edition shrinks the uncertainty about the sale.

Independence also has a conditional form, which is used heavily: A and B are **conditionally independent** given C if they are independent once C is known. It underlies [Naive Bayes](/data-ai/naive-bayes), which assumes that a listing's words are independent given the class, a convenient lie that works surprisingly often.

## Where This Appears

- **Features and labels**: a feature is useful only if it is dependent on the label
- **Training and test data**: rows are assumed independent draws, an assumption that [Data Leakage](/data-ai/data-leakage) and [Splitting Data Over Time](/data-ai/time-splits) show can fail
- **Naive Bayes and graphical models**: factor a joint distribution into simple pieces using independence
- **Sampling**: [Collecting Data and Sampling Bias](/data-ai/sampling-bias) asks whether a sample is a fair draw from the joint of the real world

## Key Points

- A joint distribution lists the probability of each combination, and the marginals are the totals that remain after summing the others out
- A conditional restricts to one value and rescales: in our table, P(sold | new edition) was 45 percent against 81 percent for an old one
- Independence means the joint equals the product of the marginals, and our table's cells differed by up to 6.7 points, so the edition and the sale were dependent
- Mutual information measures the dependence: 0.079 bits for the real pair and 0.00001 for an independent control
- <u>Prediction is possible because variables depend on each other</u>, and many assumptions in modeling are claims of independence
