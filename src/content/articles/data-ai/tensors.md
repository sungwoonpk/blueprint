> A **tensor** is an array of numbers with any number of axes: a scalar has none, a vector one, a matrix two, and a batch of color images four. **Vectorized computation** means expressing a calculation as operations on whole arrays, so that a library, and not a Python loop, does the work.

[Matrix Multiplication and Linear Maps](/data-ai/matrix-multiplication) worked on two axes. Real data has more. A batch of photos is a box of numbers with a position in the batch, a row, a column and a color. This page names the shapes machine learning uses and the habit that makes them fast.

## Axes and Shapes

The **rank** of a tensor is its number of axes, and its **shape** lists the length of each. The textbook app meets several:

| Data | Shape | Meaning of the Axes |
| --- | --- | --- |
| One price | () | None, a scalar |
| Four features of one listing | (4) | Feature |
| 3 million listings | (3,000,000, 4) | Listing, feature |
| One cover photo | (224, 224, 3) | Row, column, color |
| A batch of 64 photos | (64, 224, 224, 3) | Photo, row, column, color |
| Weekly sales for 40 listings over 16 weeks | (40, 16) | Listing, week |

The first axis is conventionally the **batch**, the number of examples processed together, so a model written for one batch handles one example or a thousand. A shape is the contract between code and data. Most bugs in machine learning code are shape bugs, and reading the shape of each array out loud is the cheapest check there is.

Memory follows from the shape. The batch of 64 photos holds 64 × 224 × 224 × 3 = 9.6 million numbers, which is 38.5 MB at 4 bytes each. A larger batch fills a GPU's memory, one reason batch size is a setting and not a given.

## Broadcasting

Operations on tensors of different shapes follow a rule called **broadcasting**: compare the shapes from the last axis backward, and an axis of length 1 stretches to match the other. To subtract each feature's mean from the 3 million × 4 matrix X, the mean is a vector of shape (4). It is stretched down all 3 million rows, and nobody writes a loop or copies it 3 million times.

| Shapes | Result | Why |
| --- | --- | --- |
| (3,000,000, 4) with (4) | (3,000,000, 4) | The vector stretches across rows |
| (3,000,000, 4) with (3,000,000, 1) | (3,000,000, 4) | The column stretches across features |
| (3,000,000, 4) with (3) | An error | The last axes, 4 and 3, differ and neither is 1 |

Broadcasting is powerful and quiet. A shape such as (n) and (n, 1) behaves differently, and mixing them up gives an n × n matrix with no error, a classic mistake worth knowing about.

## Why Whole Arrays Are Fast

A Python loop over a million numbers pays for the interpreter at each step, and a library call pays once and then runs compiled code, often with vector instructions and several cores. We measured a small stand in. The dot product of two lists of a million numbers took 0.067 seconds with an explicit loop and 0.012 with the built in `sum` and `map`, 5.4 times faster, with no array library at all.

An array library such as NumPy or PyTorch goes much further, because it also stores the numbers together in memory as plain machine numbers and not as separate Python objects. Gains of 10 to 100 times over a loop are common. We couldn't install one here, so we can't give a measured figure, and the five fold gap above is only a hint of the direction.

The rule that follows is simple. Write the calculation as operations on whole arrays: a matrix product for a layer, a sum along an axis for a total, a comparison of two arrays for a mask. Reach for an explicit loop over examples only when nothing else expresses the idea, and expect it to be slow when it is on the hot path.

## Reductions and Axes

A **reduction** collapses an axis: sum, mean, maximum. The axis argument says which one. A sum over axis 0 of the (3,000,000, 4) matrix gives a vector of shape (4), one total for each feature, and a sum over axis 1 gives (3,000,000), one total for each listing. Many training losses are a mean over the batch axis, and many metrics are a reduction followed by a comparison, so naming the axis is part of reading any line of model code.

## Key Points

- A tensor is an array of any rank, and the shape, such as (64, 224, 224, 3) for a batch of photos, is the contract between code and data
- The first axis is usually the batch, and memory follows from the shape: 64 color images took 38.5 MB in our arithmetic
- Broadcasting stretches an axis of length 1, which saves loops and hides shape mistakes such as (n) against (n, 1)
- Whole array operations are faster than Python loops: even built in functions beat an explicit loop 5.4 times in our test, and array libraries go further
- <u>Read every array by its shape</u>, and write calculations as operations on whole arrays
