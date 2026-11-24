> An **eigenvector** of a square matrix A is a direction that A only stretches: A v = λ v, where the number λ is the **eigenvalue**. For the symmetric matrices that machine learning builds from data, the eigenvectors are perpendicular directions, and the eigenvalues say how much the matrix stretches along each.

[Matrix Multiplication and Linear Maps](/data-ai/matrix-multiplication) showed a matrix as a map that tilts and stretches space. Most vectors change direction under it. A few special directions don't, and those directions summarize what the map does. This page finds them for a matrix we can compute with, a covariance matrix of the textbook app's prices.

## Directions That Only Stretch

Take a map that doubles x and halves y. A vector along the x axis comes out twice as long, in the same direction, so it is an eigenvector with eigenvalue 2. A vector along the y axis has eigenvalue 0.5. Any other vector turns toward the x axis. The eigenvectors give a set of axes in which the map is plain scaling.

An eigenvalue can be larger or smaller than 1, and it can be negative, which flips the direction, or zero, which flattens that direction to nothing. A matrix with a zero eigenvalue loses information, as in the flattening matrix of the last topic.

## Symmetric Matrices Are the Friendly Case

If a real matrix equals its transpose, which covariance matrices do, three facts hold. All its eigenvalues are real numbers. Eigenvectors for different eigenvalues are perpendicular. And the matrix can be written as A = QΛQᵀ: rotate into the eigenvector axes (Qᵀ), scale each axis by its eigenvalue (Λ), and rotate back (Q). This is the spectral decomposition, and it is the form that [Singular Value Decomposition](/data-ai/svd) extends to any matrix.

## The Covariance Matrix of Two Prices

From 2,000 simulated sales, we took each listing's list price and its sold price and built the **covariance matrix**, which holds the variance of each and the covariance between them. [Expectation, Variance and Covariance](/data-ai/expectation-variance) defines these, and here they are numbers:

| | List Price | Sold Price |
| --- | --- | --- |
| List Price | 1,598.1 | 845.4 |
| Sold Price | 845.4 | 775.7 |

The correlation is 0.759: expensive books sell for more, with plenty of spread. The eigenvalues of this matrix are 2,127.0 and 246.8. The eigenvector for the larger one is [0.848, 0.530], a line at 32.0 degrees from the list price axis. That line is the direction in which the sales vary most, and it carries 89.6 percent of the total variance, 2,127.0 out of 2,373.8. The perpendicular direction carries the other 10.4 percent. This is the whole idea of [Principal Component Analysis](/data-ai/pca): the eigenvectors of the covariance matrix are the axes of the data, and the eigenvalues say how much each matters.

## Finding Them by Repeated Multiplication

Eigenvectors don't need a formula. Multiply any starting vector by the matrix, rescale it to length 1, and repeat. Each multiplication stretches the dominant direction the most, so the vector swings toward the eigenvector of the largest eigenvalue. This is **power iteration**. We started at the list price axis and tracked the angle to the true eigenvector:

| Iterations | Angle Still Off | Estimate of the Largest Eigenvalue |
| --- | --- | --- |
| 1 | 4.15° | 2,117.1 |
| 2 | 0.48° | 2,126.8 |
| 3 | 0.056° | 2,127.0 |
| 4 | 0.0065° | 2,127.0 |

The error shrinks by a factor of about 8.6 each step, which is the ratio of the two eigenvalues, 2,127.0 divided by 246.8. A matrix whose top two eigenvalues are close converges slowly, and one with a big gap converges fast. Library routines for large matrices use cleverer versions of the same idea.

## Where Eigenvalues Show Up Next

- **Curvature**: the eigenvalues of the matrix of second derivatives say how steep a loss surface is in each direction, as in [Jacobians, Hessians and Matrix Calculus](/data-ai/jacobians)
- **Conditioning**: the ratio of the largest to the smallest eigenvalue measures how stretched a problem is, and it limits how fast training can go
- **Dimensionality reduction**: keeping the directions with large eigenvalues and dropping the rest compresses data
- **Graphs and ranking**: the dominant eigenvector of a link matrix is how early web search scored pages

## Key Points

- An eigenvector is a direction a matrix only stretches, and the eigenvalue is the stretch
- A symmetric matrix has real eigenvalues, perpendicular eigenvectors and the form QΛQᵀ
- For a covariance matrix, the eigenvectors are the axes of the data: in our prices, one direction at 32 degrees carried 89.6 percent of the variance
- Power iteration finds the top eigenvector by repeated multiplication, and in our run the error shrank about 8.6 times a step, the ratio of the two eigenvalues
- <u>Eigenvalues measure how much a matrix stretches each direction</u>, which is why they decide compression, curvature and conditioning
