> A dataset is **tidy** when each variable forms a column, each observation forms a row, and each type of observational unit forms a table. Tidy data is not the prettiest layout for a person to read, and it is the layout that makes grouping, plotting and modeling short and uniform.

A seller exports the prices of their books and sends a spreadsheet with one row for each book and one column for each season. It reads well. Asking for the average price in each season takes three separate formulas, and asking for a model of price on season takes a rearrangement first. This page names the arrangement that avoids that work.

## The Three Rules

Hadley Wickham's 2014 paper "Tidy Data" gives the definition, and it describes the rules as Codd's third normal form from database design, put in statistical language and applied to one dataset at a time:

1. Each variable forms a column
2. Each observation forms a row
3. Each type of observational unit forms a table

A **variable** holds all the measurements of one attribute, such as price. An **observation** holds all the measurements of one unit, such as one book in one season. Messy data is any other arrangement. The word applies to the structure, and a messy table can be perfectly correct, only awkward to work with.

## A Wide Table and Its Tidy Form

Here are 3 books priced in three seasons. The wide layout has one row for each book, and the season names are column headers:

| Book | Fall Price | Spring Price | Summer Price |
| --- | --- | --- | --- |
| 1 | 39.90 | 71.39 | 68.10 |
| 2 | 58.75 | 42.96 | 77.56 |
| 3 | 51.20 | 49.00 | 60.35 |

The season is a variable, and it is spread across the headers. The tidy layout makes it a column, with one row for each book and season:

| Book | Season | Price |
| --- | --- | --- |
| 1 | Fall | 39.90 |
| 1 | Spring | 71.39 |
| 1 | Summer | 68.10 |
| 2 | Fall | 58.75 |
| … | … | … |

The tidy table has 9 rows and 3 columns, against 3 rows and 4 columns, and it holds the same information. The change is called **melting**, or pivoting longer, and the reverse is pivoting wider. After it, the average price in each season is one grouped query, `SELECT season, AVG(price) FROM prices GROUP BY season`, and it keeps working when a fourth season appears. In the wide form, a new season is a new column and every query that listed the columns has to change.

## Common Ways Data Is Messy

Wickham's paper lists the recurring patterns, and each has a fix:

- **Column headers are values**: seasons, years or weeks in the headers, as above, fixed by melting
- **Several variables in one column**: a field such as "CS101-8th" holding the course and the edition, fixed by splitting it
- **Variables in both rows and columns**: a table with one row for each book and measure, "price" and "days to sell", fixed by pivoting the measure names into columns
- **Several kinds of units in one table**: a row that repeats the seller's name and email for each of the seller's books
- **One kind of unit across several tables**: a separate file for each semester, fixed by stacking them with a column for the semester

The fourth pattern is the database idea of normalization. A table of listings that repeats each seller's details wastes space and invites inconsistency, since a changed email must be changed in many rows. Splitting it into a table of listings and a table of sellers, joined by a seller id, is the structure discussed in [Choosing Between Normalization and Denormalization](/system-design/normalization). The analysis then joins them back as needed, which [Grouping and Window Functions in SQL](/data-ai/sql-analysis) shows has a trap of its own.

## Why Tidy Helps a Model

Modeling libraries expect a design matrix: one row for each example and one column for each feature, the n × d table of [Vectors and Matrices as Data](/data-ai/vectors-matrices). That is the tidy shape, with the target as one column. A dataset in tidy form moves into a model with no rearrangement, and a plotting tool maps columns to axes and colors by name, so the same one line of code draws any variable.

Tidy is also the form that is easiest to check. Each column has one type and one meaning, so a missing value, an impossible range or a mixed type shows up where it belongs, which is the work of [Exploratory Data Analysis](/data-ai/eda).

## A Caution

Tidy is a default, not a law. A wide layout suits a person reading a report, a matrix suits a computation such as the SVD of [Singular Value Decomposition](/data-ai/svd), and time series sometimes live better in wide form. The rule is to keep the data tidy for storage and analysis, and to reshape on the way out for the reader or the algorithm.

## Key Points

- Tidy data has one variable in each column, one observation in each row and one table for each kind of unit
- Messy data hides variables in headers, packs several into one column or mixes kinds of units in a table
- Melting put the season into a column, so a grouped average became one query that survives a new season
- Splitting repeated details into their own table is normalization, which keeps one fact in one place
- <u>Keep data tidy for storage and analysis, and reshape on the way out</u>
