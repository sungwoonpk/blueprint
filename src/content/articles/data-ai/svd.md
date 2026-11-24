> The **singular value decomposition** writes any matrix as A = UΣVᵀ: a rotation, a stretch along perpendicular axes by the **singular values**, and another rotation. Keeping only the largest singular values gives the best low rank approximation, which is how data is compressed and how hidden structure is found.

[Eigenvalues and Eigenvectors](/data-ai/eigen) worked for square symmetric matrices. Data matrices are neither: 12 students by 6 books is a rectangle. The SVD is the version of the same idea for every matrix, and it is the most used decomposition in machine learning.

## Any Matrix, Three Pieces

For a matrix A with n rows and d columns, the SVD finds a matrix U of perpendicular directions in the row space, a matrix V of perpendicular directions in the column space, and a diagonal matrix Σ of non negative singular values, usually listed largest first. Reading it as a sum, A is a total of simple rank one pieces, each a singular value times an outer product of a column of U and a column of V.

The link to the last topic is direct. The squared singular values of A are the eigenvalues of AᵀA, and the columns of V are its eigenvectors. The rank of A, the number of independent directions it keeps, is the number of nonzero singular values.

## A Ratings Matrix With Two Tastes

Take a made up table of 12 students rating 6 books from 1 to 5. Half the students like books 1 to 3, the calculus and physics titles, and the other half like books 4 to 6, the humanities titles, with noise on top. The singular values came out as:

| Singular Value | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Size | 25.12 | 13.31 | 1.68 | 1.29 | 0.87 | 0.80 |

Two values stand out, and the other four are noise. The first direction has the same sign on every book: a general level of liking. The second has opposite signs on the two groups of books, a contrast between the two tastes. The data has two hidden factors, and the SVD found both without being told. This idea powers [Matrix Factorization for Recommendations](/data-ai/matrix-factorization).

## The Best Rank k Approximation

Keeping the top k pieces and dropping the rest gives a matrix of rank k. A theorem says it is the closest matrix of that rank to A in the usual sense, which is the reason to use the SVD for compression. We measured the leftover error as a share of the matrix's size, and the numbers that must be stored:

| Pieces Kept | Error Left | Numbers Stored |
| --- | --- | --- |
| 1 | 47.43% | 19 |
| 2 | 8.52% | 38 |
| 3 | 6.14% | 57 |
| 6, All | 0% | 114 |

The matrix has 72 entries. Two pieces, 38 stored numbers, capture 99.27 percent of the squared size and leave 8.5 percent error, which is mostly the noise. Keeping more than 3 pieces stores more numbers than the matrix itself, so compression pays only when few pieces suffice. For a 3 million by 1,024 matrix of embeddings, keeping 128 pieces would store 3,000,000 × 128 + 1,024 × 128 + 128 = about 384 million numbers instead of 3.1 billion, a saving of 8 times, our arithmetic.

## What the SVD Does for a Model

- **Principal Component Analysis**: the SVD of the centered data matrix gives the principal axes directly, without forming a covariance matrix, as in [Principal Component Analysis](/data-ai/pca)
- **Pseudoinverse and least squares**: dividing by the singular values solves a linear fit even when the problem is rank deficient or nearly so, and tiny singular values mark directions that amplify noise
- **Noise removal**: dropping the small singular values keeps the signal and discards much of the noise, as the 8.5 percent above shows
- **Low rank adaptation**: fine tuning a large model with a product of two thin matrices is the same low rank idea, covered in [Parameter-Efficient Fine-Tuning and LoRA](/data-ai/lora)

The ratio of the largest to the smallest singular value is the condition number from [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians), and a huge ratio warns that small changes in the data can change the answer a lot.

## Key Points

- The SVD writes any matrix as a rotation, a stretch by singular values and another rotation, a sum of rank one pieces
- Squared singular values are the eigenvalues of AᵀA, and the number of nonzero ones is the rank
- In our ratings matrix, two of six singular values were large and matched two tastes, and two pieces captured 99.27 percent of the squared size
- Keeping the top k pieces is the best rank k approximation: two pieces stored 38 numbers and left 8.5 percent error against 72 entries
- <u>Small singular values are mostly noise</u>, so dropping them compresses data and removes noise at the same time
