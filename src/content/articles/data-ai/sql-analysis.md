> **Grouping** collapses rows into one row for each group with an aggregate such as a count or an average, and **window functions** compute a value for each row from a related set of rows without collapsing them. Together they answer most analytical questions about a table: totals by category, ranks within a group, running totals and moving averages.

A product manager asks which course sells for the most, which listing is the priciest in each course, and how sales built up over the semester. Each is a short query, and each has a way to go wrong without an error. We ran the queries below on SQLite with 600 simulated sales of four courses over 16 weeks.

## GROUP BY and Aggregates

`GROUP BY` puts rows with the same value in one group, and an aggregate function summarizes each group: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.

```sql
SELECT course, COUNT(*) AS n, ROUND(AVG(price), 2) AS avg_price
FROM sales
GROUP BY course
ORDER BY avg_price DESC;
```

| Course | Sales | Average Price |
| --- | --- | --- |
| MATH201 | 146 | $59.74 |
| PHYS110 | 139 | $54.60 |
| CS101 | 151 | $51.99 |
| ECON101 | 164 | $43.37 |

Grouping by two columns gives a row for each pair, so `GROUP BY course, cond` splits each course by condition. For CS101 the average price rose with condition: $43.07 for worn, $47.69, $54.34 and $60.32 for like new. A grouped result is a new table, small enough to read, and it is the basic move of exploration.

## WHERE and HAVING

`WHERE` filters rows before they are grouped, and `HAVING` filters groups after they are aggregated. Courses averaging over $55 need `HAVING AVG(price) > 55`, since the average doesn't exist until the grouping happens. Our run returned one course, MATH201. Using `WHERE` for a condition on an aggregate is an error, and using `HAVING` for a plain column condition works but filters late and wastes effort.

## Window Functions

A **window function** adds a value to each row, calculated over a window of related rows, and it keeps every row. The `OVER` clause defines the window: `PARTITION BY` splits rows into groups, and `ORDER BY` orders them within each group.

Ranking the priciest sales within a course:

```sql
SELECT id, course, price,
       RANK() OVER (PARTITION BY course ORDER BY price DESC) AS r
FROM sales
WHERE course = 'MATH201'
ORDER BY r LIMIT 3;
```

The top three MATH201 sales were listing 170 at $78.28, listing 400 at $78.05 and listing 345 at $77.43. A group by can't do this, since it would collapse the rows to one for each course. Related functions include `ROW_NUMBER`, `DENSE_RANK`, and `LAG` and `LEAD`, which read the previous or next row.

## Running Totals and Moving Averages

An aggregate used as a window function, with an `ORDER BY`, accumulates. Counting sales each week and adding them up:

| Week | Sales That Week | Running Total |
| --- | --- | --- |
| 1 | 31 | 31 |
| 2 | 40 | 71 |
| 3 | 36 | 107 |
| 4 | 34 | 141 |
| 5 | 43 | 184 |

A frame such as `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` narrows the window to the last three weeks, which gives a moving average that smooths noise. The 3 week moving average of the weekly average price started at $52.61, $52.31, $52.06, $50.90 and $51.32. Moving averages are the first tool of [Forecasting Basics](/data-ai/ts-basics), and window functions are how they are computed inside a warehouse like those of [Warehouses, Data Lakes and Lakehouses](/data-ai/warehouses-lakes-lakehouses).

## The Join That Multiplies

A join can silently multiply rows. Each sale can have several tags, such as signed or highlighted. We joined 300 sales to their 597 tag rows and summed the price:

| Calculation | Total Price |
| --- | --- |
| Sum over the 300 sales | $15,494.38 |
| Sum after joining to tags | $30,882.26 |

The total doubled, since a sale with three tags appeared three times. This **fan out** is the most common wrong answer in analytical SQL, and it raises no error. The checks are cheap: count the rows before and after a join, and aggregate each table down to the grain you need before joining, so that each side has one row for each key. Whether a number is a count of sales or a count of sale and tag pairs is a question to ask of every join, and the grain is the answer.

## Habits That Prevent Mistakes

- **Say the grain**: write down what one row of the result means before writing the query
- **Count before and after joins**, and check that the keys are unique where you think they are
- **Mind the nulls**: aggregates skip nulls, `COUNT(*)` counts rows and `COUNT(price)` counts non null prices, and comparing to null needs `IS NULL`
- **Use a window function for ranks and running values**, not a self join, which is longer and slower
- **Order explicitly**: a result has no order unless `ORDER BY` asks for one

These queries fit a pipeline that keeps raw data, cleaned data and tables for analysis, as [Raw, Cleaned and Curated Layers](/data-ai/platform-layers) describes.

## Key Points

- GROUP BY with an aggregate gives one row for each group, WHERE filters rows before grouping and HAVING filters groups after
- A window function adds a value to each row from a related window and keeps every row: ranks, running totals and moving averages
- A grouped average by course and condition showed price rising with condition: $43.07 to $60.32 for CS101
- A join to a many side table doubled a sum, from $15,494.38 to $30,882.26, because each sale repeated once for each tag
- <u>State the grain of a result, and count rows before and after each join</u>
