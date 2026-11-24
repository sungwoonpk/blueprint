> A **vector** is an ordered list of numbers, and a **matrix** is a table of them. Machine learning turns each example into a vector of features, a dataset into a matrix with one row for each example, and a model's prediction into arithmetic on them, most often a **dot product**.

[From Writing Rules to Learning from Data](/data-ai/rules-to-learning) fit a price model with four weights and four inputs, and the code used lists and loops. This phase gives that arithmetic its proper names, because every later topic, from regression to transformers, is written in them. The reader has met all of this in a linear algebra course, so each page stays on what machine learning does with it.

## A Listing as a Vector

The price model reads four numbers for each listing: the list price, the list price times the age, the list price times the condition and the list price times the new edition flag. Written in order, those four numbers are a vector with four **dimensions**.

| Listing | List Price | Price × Age | Price × Condition | Price × Edition | Vector |
| --- | --- | --- | --- | --- | --- |
| A | 120 | 360 | 360 | 0 | [120, 360, 360, 0] |
| B | 80 | 80 | 320 | 0 | [80, 80, 320, 0] |
| C | 150 | 750 | 300 | 150 | [150, 750, 300, 150] |

A vector can be read two ways. It is a list, one number for each feature, and it is a point in a space with one axis for each feature, here a space of four dimensions.

The second view is the one that lets us talk about distance and direction later. In [Features, Labels and Datasets](/data-ai/features-labels) the features are chosen with care, and here only the shape matters: a fixed number of columns, in a fixed order, for every example.

## The Dot Product

The model's four weights are also a vector, w = [0.599, −0.069, 0.050, −0.177]. A prediction is the **dot product** of the weights with the features, the sum of each weight times its feature:

w · x = w₁x₁ + w₂x₂ + w₃x₃ + w₄x₄

| Listing | Arithmetic | Suggested Price |
| --- | --- | --- |
| A | 0.599×120 − 0.069×360 + 0.050×360 − 0.177×0 | $65.04 |
| B | 0.599×80 − 0.069×80 + 0.050×320 − 0.177×0 | $58.40 |
| C | 0.599×150 − 0.069×750 + 0.050×300 − 0.177×150 | $26.55 |

Listing C is a new edition of a five year old book, which is why the dot product pulls its price down.

The geometric reading is that w · x equals the length of w times the length of x times the cosine of the angle between them, so a dot product is large when the two vectors point the same way. A model is a direction in feature space, and a prediction measures how far an example lies along it.

## A Dataset as a Matrix

Stack the vectors, one for each listing, and the dataset is a **matrix** X with n rows and d columns, written n × d. Rows are examples and columns are features, a convention that nearly every library follows. The three listings above make a 3 × 4 matrix.

Reading the shape first saves time later. A matrix with 3 million rows and 4 columns is a tall table. Its **transpose** Xᵀ swaps rows and columns and has 4 rows and 3 million columns. The entry in row i and column j is written Xᵢⱼ, and a single row or column is a vector.

Size matters on a real machine. The textbook app's 3 million listings with 4 features take 3,000,000 × 4 × 8 = 96 MB as 64 bit numbers, and 48 MB as 32 bit numbers. That is our arithmetic, and it is small. The same count with 1,024 features would take 24 GB, which is why [Embeddings](/data-ai/embeddings) and their storage decisions come up in the system design phases.

## Matrices With a Name

A few special matrices appear again and again:

- **Identity**: ones on the diagonal and zeros elsewhere, the matrix that changes nothing
- **Diagonal**: nonzero only on the diagonal, which scales each feature on its own
- **Symmetric**: equal to its own transpose, the shape of a covariance matrix in [Eigenvalues and Eigenvectors](/data-ai/eigen)

A dataset matrix is rarely symmetric, and XᵀX always is, which is the reason it shows up when a model is fit. The next topic, [Matrix Multiplication and Linear Maps](/data-ai/matrix-multiplication), uses the matrix to compute every prediction at once.

## Key Points

- A vector is a list of numbers and also a point in space, with one dimension for each feature
- The dot product of the weights and the features is a linear model's prediction, large when the two point the same way
- A dataset is an n × d matrix, with rows as examples and columns as features, and the shape is the first thing to read
- Size is arithmetic: 3 million listings of 4 features took 96 MB as 64 bit numbers and 48 MB as 32 bit numbers
- <u>Most of machine learning is written as matrices and vectors</u>, so the notation is worth knowing before the models
