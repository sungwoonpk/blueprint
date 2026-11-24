> Data comes in a few common shapes, and the shape decides which models fit. **Tables** hold one example per row, **text** is words in order, **images** are grids of pixel values and **sequences** are values that follow one another in time. A model works on numbers, so each shape needs its own way of turning the world into them.

To a model, everything the textbook app stores is numbers, but the numbers come arranged differently. [What Are Data Science, Machine Learning and AI?](/data-ai/what-is-data-ai) and [From Writing Rules to Learning from Data](/data-ai/rules-to-learning) used one kind, a row of four columns per listing. Take that same listing and look at everything the app keeps about it.

| Shape | One Example From the App | Numbers in One Example |
| --- | --- | --- |
| Table | A row: list price 120, age 3, condition 3, new edition 0 | 4 |
| Text | The seller's note: "Barely used, no highlighting, missing the access code" | About 8 words, a different count for every note |
| Image | The photo of the cover, 224 by 224 pixels in color | 150,528 |
| Sequence | The shop's sales each week of the semester | One value per week, as long as the history |

The count in the last column already says a lot. A row is tiny and always the same size. A photo is huge, and a note or a history changes length from one example to the next. Each section below takes a shape in turn.

## Tables

A **table** holds one example in each row and one measurement in each column, the way a spreadsheet or a database table does. Each column is a feature, and one more column can hold the label. Rows are independent, so shuffling them changes nothing the model can learn. Most business data lives in tables, and models such as [k-Nearest Neighbors](/data-ai/knn) and [Decision Trees](/data-ai/decision-trees) were built for them.

A table is the standard example of **structured data**, which means data with a predefined data model: the columns and their types are fixed before any row arrives. Columns still need care. A number such as the age can be used as it is, and a category such as the course subject must be turned into numbers first, as [Encoding Categorical Features](/data-ai/encoding) shows.

## Text

The seller's note has no columns. It is **unstructured data**, which means it has no predefined data model, even though it has structure of its own, such as grammar and word order. A model needs numbers, so the text is first split into pieces called **tokens**, usually words or parts of words, and each piece is turned into a number. [Tokenization](/data-ai/tokenization) shows how.

The simplest version counts how often each word appears. It loses order, and order can matter completely. Take two notes: "no pages missing, some highlighting" and "some pages missing, no highlighting". Both use exactly the same words, and a buyer would pick very different books. [Bag of Words and TF-IDF](/data-ai/bag-of-words) builds the counting method, and [Language Modeling and Perplexity](/data-ai/language-modeling) starts the models that read order.

## Images

An **image** is a grid of pixels, and a pixel is a number for brightness. Here is the letter C drawn on a grid of six by six pixels, with 0 for white and 9 for ink. Real pixels run from 0 to 255, and a color photo has three grids stacked, for red, green and blue.

<figure class="diagram">
<div class="cells board sm"><div class="cell">0</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell">0</div></div>
<div class="cells board sm"><div class="cell hl">9</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell hl">9</div></div>
<div class="cells board sm"><div class="cell hl">9</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div></div>
<div class="cells board sm"><div class="cell hl">9</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div></div>
<div class="cells board sm"><div class="cell hl">9</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell">0</div><div class="cell hl">9</div></div>
<div class="cells board sm"><div class="cell">0</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell hl">9</div><div class="cell">0</div></div>
<figcaption>A six by six image as the numbers a model receives</figcaption>
</figure>

A cover photo at 224 by 224 pixels is 224 × 224 × 3 = 150,528 numbers. A 12 megapixel phone photo has 36 million. Feeding that into a table model as one long row would throw away what makes a picture a picture.

Pixels next to each other belong together, and the same cover shifted a few pixels to the left changes many of the values at each position. Models for images are built around those neighbors, and [Convolutions and Feature Maps](/data-ai/convolutions) shows how.

## Sequences

The fourth shape is values that arrive in order, such as sales per week, a listing's price changes, the clicks in a session, or sound. In a **sequence**, order is the information. We simulated three semesters of weekly sales for the shop, with a rush in the first weeks of a semester and small bumps at midterms and finals.

<figure class="chart">
<svg class="line" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Weekly sales over three 16 week semesters, with a large peak at the start of each semester and small bumps later">
<line class="grid" x1="0" y1="40" x2="100" y2="40"></line>
<path class="area" d="M0.0 8.0 L2.1 16.1 L4.3 23.1 L6.4 28.4 L8.5 31.7 L10.6 30.2 L12.8 29.6 L14.9 23.9 L17.0 31.5 L19.1 31.7 L21.3 29.4 L23.4 29.6 L25.5 28.4 L27.7 29.0 L29.8 24.5 L31.9 30.6 L34.0 3.7 L36.2 16.8 L38.3 25.3 L40.4 29.2 L42.6 30.0 L44.7 30.0 L46.8 30.6 L48.9 25.3 L51.1 29.8 L53.2 29.4 L55.3 28.8 L57.4 30.0 L59.6 32.3 L61.7 29.4 L63.8 26.0 L66.0 30.4 L68.1 8.4 L70.2 16.4 L72.3 25.3 L74.5 27.6 L76.6 26.2 L78.7 30.2 L80.9 29.2 L83.0 26.8 L85.1 30.6 L87.2 29.4 L89.4 30.4 L91.5 29.8 L93.6 30.0 L95.7 31.3 L97.9 23.7 L100.0 31.1 L100 40 L0 40 Z"></path>
<path class="stroke" d="M0.0 8.0 L2.1 16.1 L4.3 23.1 L6.4 28.4 L8.5 31.7 L10.6 30.2 L12.8 29.6 L14.9 23.9 L17.0 31.5 L19.1 31.7 L21.3 29.4 L23.4 29.6 L25.5 28.4 L27.7 29.0 L29.8 24.5 L31.9 30.6 L34.0 3.7 L36.2 16.8 L38.3 25.3 L40.4 29.2 L42.6 30.0 L44.7 30.0 L46.8 30.6 L48.9 25.3 L51.1 29.8 L53.2 29.4 L55.3 28.8 L57.4 30.0 L59.6 32.3 L61.7 29.4 L63.8 26.0 L66.0 30.4 L68.1 8.4 L70.2 16.4 L72.3 25.3 L74.5 27.6 L76.6 26.2 L78.7 30.2 L80.9 29.2 L83.0 26.8 L85.1 30.6 L87.2 29.4 L89.4 30.4 L91.5 29.8 L93.6 30.0 L95.7 31.3 L97.9 23.7 L100.0 31.1"></path>
</svg>
<div class="axis"><span>Fall, week 1</span><span>Spring, week 16</span></div>
<figcaption>Weekly sales over 48 weeks (simulated numbers)</figcaption>
</figure>

Now predict each week's sales. The simplest guess is last week's number, and it is off by 22.3 sales on average. Shuffle the weeks into random order, as if each week were an independent row of a table, and the same guess is off by 30.3, so the order was carrying information. A much better guess is the same week of the previous semester, off by only 7.5.

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Last week, weeks shuffled</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">30.3</span></div>
<div class="hbar"><span>Last week, in order</span><span class="track"><span class="fill" style="--w: 73.6%"></span></span><span class="value">22.3</span></div>
<div class="hbar peak"><span>Same week last semester</span><span class="track"><span class="fill" style="--w: 24.8%"></span></span><span class="value">7.5</span></div>
</div>
<figcaption>Average error in weekly sales for three ways to guess, lower is better</figcaption>
</figure>

Order carries two kinds of signal here, what just happened and what repeats on a cycle. Models for sequences are built to find both, and [Modeling Sequences](/data-ai/modeling-sequences) starts with that. [Forecasting Basics](/data-ai/ts-basics) covers the case where a number's own past is the main input.

## Other Shapes

Some data doesn't fit the four. A **graph** records relationships, such as which students follow which sellers, and [Graph Neural Networks](/data-ai/graph-learning) learns from them. Audio is a sequence of pressure readings, and video is images in a sequence. Many real problems mix shapes: a listing is a table row, a note and a photo together, and [Multimodal Models](/data-ai/multimodal) learn from several at once.

## Key Points

- A model works on numbers, and the shape of the data decides how it becomes numbers and which models fit
- Tables are structured data with independent rows, and text and images are unstructured data with structure of their own
- Counting words loses order, and a photo's pixels belong with their neighbors
- In a sequence the order is the information, so shuffling it throws away signal
- <u>Name the shape of your data first, because the rest of the method follows from it</u>
