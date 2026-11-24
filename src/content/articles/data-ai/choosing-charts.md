> The right chart depends on the question: **comparison** across categories wants bars, **change over time** wants a line, **distribution** wants a histogram or box plot, **relationship** wants a scatter plot, and **parts of a whole** wants a few stacked bars or none at all. A good chart makes one comparison easy, and a bad one makes a difference look bigger or smaller than it is.

A chart is an argument made with position and length. The eye reads position on a common scale most accurately, length next, and angle, area and color least, so a chart should put the number that matters where the eye is best at reading it. This page matches questions to charts and names the common ways a chart misleads.

## From Question to Chart

| The Question | Chart | Why It Fits |
| --- | --- | --- |
| Which course has the highest average price? | Horizontal bars, sorted | Length compares categories, and long names fit |
| How did weekly sales change over the semester? | Line | Position along time shows trend and rhythm |
| How are prices spread? | Histogram, or box plot for several groups | Shows shape, skew and outliers |
| Does a higher list price mean a higher sold price? | Scatter plot | Each point is one listing, so relationship and outliers show |
| How much of the total does each condition make up? | A single stacked bar, or just a table | A few parts are readable, many are not |
| Which two measures move together across 40 listings? | A scatter plot matrix, or a heat map of correlations | Many pairs at a glance |
| How does an average compare to a target? | Bars with the target as a line | The gap is the message |

A chart type is chosen by the data type too: categories on one axis and a number on the other are bars, two numbers are a scatter plot, and a number against time is a line. [Variables and Measurement Scales](/data-ai/variable-scales) decides which of these the columns allow.

## Bars Must Start at Zero

A bar's length is its message, so a bar chart with a truncated axis lies. Take two courses with average prices of $98 and $100, a difference of 2 percent. Drawn honestly, the bars are almost the same length. Drawn from a baseline of $97 to make the difference visible:

<figure class="chart">
<div class="hbars" role="img" aria-label="Two bars of 98 and 100 drawn from zero, and the same two drawn from 97">
<div class="hbar"><span>Course A, From 0</span><span class="track"><span class="fill" style="--w: 98%"></span></span><span class="value">$98</span></div>
<div class="hbar"><span>Course B, From 0</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$100</span></div>
<div class="hbar"><span>Course A, From 97</span><span class="track"><span class="fill" style="--w: 33.3%"></span></span><span class="value">$98</span></div>
<div class="hbar peak"><span>Course B, From 97</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$100</span></div>
</div>
<figcaption>The same two prices, drawn from zero and from a baseline of $97</figcaption>
</figure>

From zero, course B is 1.02 times course A. From 97, B looks three times as long, since the bars now show 3 and 1. A line chart or a dot plot doesn't encode value in length and may use a zoomed axis, as long as the axis is labeled, because the eye reads position and not length.

## Other Ways a Chart Misleads

- **Too many categories**: a pie chart with eight slices, or a line chart with twenty lines, hides the comparison
- **3D and decoration**: perspective distorts areas and adds nothing
- **Dual axes**: two lines on separate scales can be made to cross anywhere, which suggests a relationship that the scales created
- **Cherry picked windows**: a trend line from the best week to the worst, or a time range that begins at a peak
- **Aggregates that hide groups**: an average over everyone can reverse inside each group, the topic of [Confounding and Simpson’s Paradox](/data-ai/confounding)
- **No uncertainty**: a difference between two bars means little without an interval, which [Estimation and Confidence Intervals](/data-ai/confidence-intervals) supplies
- **Color without a reason**: more than 7 colors can't be told apart, and red and green fail for color blind readers

## Small Habits

Sort bars by value, not alphabetically, unless the order means something. Label the axes with units. Put the message in the title, such as "Prices rise with condition", and not just "Price by condition". Use one color for what is being compared and a muted one for context. Annotate the one point that matters. And draw a chart for one audience: a diagnostic plot for the analyst, a clean comparison for the decision maker, as [Communicating Findings with Data](/data-ai/communicating-results) discusses.

For a small set of numbers, a table is often the better chart. A reader who needs exact values, or who compares many dimensions of a few items, reads a table faster than any graphic.

## Key Points

- Choose the chart from the question: bars to compare, lines for time, histograms for distribution, scatter plots for relationships
- The eye reads position and length best, so use them for what matters and avoid angle, area and color for precise comparison
- A bar chart must start at zero: two prices 2 percent apart looked three times as different when the bars started at $97
- Watch for too many categories, dual axes, hidden groups and missing uncertainty
- <u>Put the message in the title, and use a table when exact values matter</u>
