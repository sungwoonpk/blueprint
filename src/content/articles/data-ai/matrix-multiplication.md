> A **matrix product** combines a matrix with a vector or another matrix by taking dot products of rows with columns. It is also the way to compose **linear maps**: multiplying by a matrix sends each vector somewhere new, and multiplying two matrices applies one map and then the other.

[Vectors and Matrices as Data](/data-ai/vectors-matrices) computed one prediction at a time. A dataset matrix X with n rows and the weight vector w give all n predictions in one expression, Xw, and that expression is the reason a model can be trained on millions of rows. This page covers what a matrix product means and what it costs.

## Rows Times Columns

The product of a matrix A with n rows and k columns and a matrix B with k rows and m columns is a matrix C with n rows and m columns. Entry Cᵢⱼ is the dot product of row i of A with column j of B. The inner sizes must match, and they disappear:

(n × k)(k × m) → (n × m)

A vector is a matrix with one column, so Xw is (n × 4)(4 × 1) → (n × 1): one price for each listing. If the model predicts two things at once, say the price and the days to sell, the weights become a 4 × 2 matrix W, and XW is n × 2. Each column of W is one model, and the product runs all of them together.

Order matters. AB and BA are different matrices in general, and one of them may not even exist for the given shapes. A matrix product is associative, so (AB)C equals A(BC), and that freedom decides which grouping is cheaper.

## A Matrix Is a Linear Map

Multiplying a vector by a matrix is a function from one space to another. It is **linear**, which means it keeps sums and scaling: M(a + b) equals Ma + Mb, and M(2a) equals 2(Ma). A matrix turns a grid into a tilted grid, so lines stay lines and the origin stays put.

| Matrix | What It Does to a Point |
| --- | --- |
| Identity | Leaves it alone |
| Diagonal [2, 0; 0, 0.5] | Stretches x by 2 and shrinks y by half |
| Rotation by 90° | Sends (x, y) to (−y, x) |
| [1, 1; 1, 1] | Flattens the plane onto a line |

The last row loses information: two different points can land on the same place, and no matrix can undo it. A matrix that can be undone is **invertible**, and one that flattens is not. This is the first place that rank shows up, the number of independent directions a map keeps, and it returns in [Singular Value Decomposition](/data-ai/svd).

The product of two matrices is the composition of their maps. Applying B and then A to a vector is the same as applying the single matrix AB. A neural network's layers are maps like these with a bend between them, which [From Linear Models to Multilayer Networks](/data-ai/perceptron-mlp) explains: without the bend, a stack of layers collapses into one matrix.

## What a Product Costs

Each entry of the result takes k multiplications and additions, and there are n × m entries, so a product takes n × k × m of each. We timed a plain triple loop in Python on square matrices, which is slow and shows the shape of the cost:

| Size | Multiply-Adds | Time |
| --- | --- | --- |
| 50 × 50 | 125,000 | 0.003 s |
| 100 × 100 | 1,000,000 | 0.021 s |
| 200 × 200 | 8,000,000 | 0.169 s |

Doubling the size multiplied the work by 8, as the n³ count says, and the time followed. These times are far from what a tuned library does. They come from one interpreter on one core, and a library that uses vector hardware and many cores is hundreds of times faster. The counts still carry over.

Counts guide design. The price model on 3 million listings costs 3,000,000 × 4 × 1 = 12 million multiply-adds for one pass over the data. One layer of a network with 1,024 inputs and 1,024 outputs, on a batch of 64 examples, costs 64 × 1,024 × 1,024 = 67 million. Models with many layers and big batches are mostly matrix products, which is why GPUs, built to do exactly this, changed the field, as [A Short History of AI](/data-ai/ai-history) described.

## Grouping Changes the Cost

Because the product is associative, the order of grouping is a free choice, and it can change the cost by a large factor. For a vector v, multiplying (AB)v builds the full matrix AB first, and A(Bv) never builds it. With A of size 1,000 × 1,000, B of size 1,000 × 1,000 and v of size 1,000 × 1, the first costs 1,000³ + 1,000² = about 1 billion multiply-adds, and the second 2 × 1,000² = 2 million. The answers are the same. That is the kind of rewrite that [Tensors and Vectorized Computation](/data-ai/tensors) and automatic differentiation depend on.

## Key Points

- A matrix product takes dot products of rows with columns, and the inner sizes must match: (n × k)(k × m) gives n × m
- Xw gives all n predictions at once, and a matrix of weights runs several models together
- A matrix is a linear map, a product is the composition of two maps, and a map that flattens can't be undone
- A product costs n × k × m multiply-adds: in our timing, doubling a square matrix multiplied the work by 8
- <u>Grouping is a free choice that changes the cost</u>: (AB)v took about 1 billion operations in our example and A(Bv) took 2 million
