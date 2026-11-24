> A **slowly changing dimension** is descriptive data, such as a seller's campus or a book's category, that changes occasionally. The way we store the change decides whether old facts are reported under the value that was true then or the value that is true now. Type 1 overwrites, type 2 adds a row with validity dates, and type 3 keeps one previous value.

A sale is a fact that never changes. The seller who made it has attributes that do. Reports ask both "what is the seller's campus now" and "what was it when they sold", and the table has to answer both questions.

## The Problem

The textbook app records each sale with a seller ID, and the seller's campus lives in a seller table. A seller moves from North to South campus in March. A question about revenue by campus for the previous year can mean two things:

- By the campus the seller belongs to **today**
- By the campus the seller belonged to **when the sale happened**

If the seller table holds only the current campus, only the first question is answerable, and a report about last year's South campus includes sales made while the seller was still at North.

## The Standard Types

The names come from Ralph Kimball's dimensional modeling techniques:

| Type | Method | History Kept | Use When |
| --- | --- | --- | --- |
| 0 | Never change the value | The original only | Birth date, original sign-up channel |
| 1 | Overwrite | None | Corrections, and values where history is irrelevant |
| 2 | Add a new row | Complete | History matters for reporting |
| 3 | Add a column for the previous value | One step | Comparing before and after a single change |

**Type 2** is the workhorse. Kimball's description: a change adds a new row to the dimension with the updated attributes, and that requires a surrogate key, so that more than one row can describe the same seller. Each new row gets a new key, used in fact rows from the moment of the change. At least three columns are added: an effective date, an expiration date, and a current-row indicator.

| seller_key | seller_id | campus | valid_from | valid_to | is_current |
| --- | --- | --- | --- | --- | --- |
| 101 | S77 | North | 2025-09-01 | 2026-03-14 | no |
| 482 | S77 | South | 2026-03-14 | 9999-12-31 | yes |

A sale stamped with the date joins to the row valid on that date, so it shows North if made in January and South if made in April.

## How Much It Matters

We simulated 2,000 sellers over a year, with 300 sales a day, about $4.86 million in total. Over the year, 607 sellers changed campus, in 720 changes. We computed revenue by campus under type 1 and type 2:

| Campus | Type 1: Current Campus | Type 2: Campus at Sale | Difference |
| --- | --- | --- | --- |
| North | $1,583,430 | $1,581,649 | +0.1% |
| South | $1,687,689 | $1,666,663 | +1.3% |
| East | $1,587,810 | $1,610,617 | −1.4% |

At the campus level the difference is small, 0.5 percent of revenue, since sellers moved in random directions and the changes largely cancelled. At the sale level it is large and grows with age:

| Quarter of the Year | Revenue Sitting Under a Campus the Seller Has Since Left |
| --- | --- |
| Days 1 to 90 | 24.9% |
| Days 91 to 180 | 19.9% |
| Days 181 to 270 | 12.2% |
| Days 271 to 360 | 4.2% |

A quarter of the oldest sales are filed under the wrong campus. If sellers drifted systematically toward one campus, the totals would be wrong too, and any analysis by seller group, such as price behavior by campus, would blur. The effect is mild only because the moves in this simulation had no direction.

## Implementing Type 2

A nightly job compares the incoming snapshot, or a stream of changes, with the current rows:

1. For each seller whose tracked attributes changed, close the current row by setting its end date
2. Insert a new row with a new surrogate key, the new values, a start date, and an open end date
3. Leave unchanged sellers alone

Several practical points:

- **Choose the tracked attributes**: tracking every column explodes the table. Track what reports need as history
- **Use a boundary convention**, such as start inclusive and end exclusive, so that no day belongs to two rows
- **Late-arriving changes** require reopening and splitting rows, so the effective date must be the date of the real-world change, and not the date the pipeline noticed it
- **Facts must join to the surrogate key** or to the row valid at the fact date. Joins on the natural ID alone return all versions and multiply the counts
- Table formats and tools offer snapshot features that implement type 2 from a source table automatically

## In Machine Learning

The same problem appears when building a training set. A seller's attributes at the time of a listing are the legitimate features. Joining the current attributes leaks the future, the situation [Data Leakage](/data-ai/data-leakage) describes, and [Serving Data to Analysts, Models and Applications](/data-ai/serving-data) shows how large the effect can be. A type 2 table is what makes a correct point-in-time join possible.

## Key Points

- A slowly changing dimension is descriptive data that changes, and the design decides whether history is reported as it was or as it is
- Type 1 overwrites, type 2 adds a row with validity dates and a surrogate key, and type 3 keeps one prior value
- In our simulation, 24.9 percent of the oldest quarter's revenue sat under a campus the seller later left, though campus totals moved by only 0.5 percent
- Join facts to the dimension row valid on the fact date, and set the effective date to the real change date
- <u>Use type 2 when a model or report needs to know what was true at the time</u>
