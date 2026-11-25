> To look at data with many features we project it to two dimensions. **PCA** gives a faithful but linear picture, and **t-SNE** and **UMAP** bend the map to keep each point's neighbors together, which shows local clusters well and distorts everything else. Cluster sizes, the gaps between clusters and the global layout in such a plot are mostly artifacts of the method and its settings.

A model with 200 features lives in a space nobody can see. A two-dimensional picture is a fine way to spot structure, mistakes and surprises, and a poor way to measure anything, because squeezing 200 dimensions into 2 must throw away most of the distances.

## What Each Method Preserves

| Method | Keeps | Loses | Notes |
| --- | --- | --- | --- |
| PCA | Directions of greatest variance, global layout, relative distances along them | Local neighbors in other directions | Linear, deterministic, fast |
| t-SNE | Each point's local neighborhood | Global distances, cluster sizes and densities | Nonlinear, random start, slow, one key setting called perplexity |
| UMAP | Local neighborhoods, and more of the global arrangement, it is claimed | Exact distances | Nonlinear, faster than t-SNE, with neighbor count and min-distance settings |

t-SNE, introduced by van der Maaten and Hinton in 2008, converts distances to probabilities of being neighbors and arranges the 2D points so that those probabilities match, penalizing a mismatch with a KL divergence, as in [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl). UMAP, by McInnes and colleagues, builds a graph of neighbors and lays it out, and its authors report it is faster and keeps more global structure. Both are visualization tools, not feature extractors for models.

## A Test With Known Answers

We generated 300 points in 10 dimensions from three groups, with true spreads of 0.5, 1 and 2, so the third group is four times as wide, and true centers 4, 8 and 8.9 units apart. We projected it three ways, and measured **neighbor preservation**, the share of each point's 10 nearest neighbors in 10 dimensions that are still among its 10 nearest in the 2D picture:

| Method | Neighbor Preservation | Spread of the Three Groups in the Picture | Distances Between Group Centers |
| --- | --- | --- | --- |
| PCA | 21.7% | 0.70, 1.43, 2.69 | 3.73, 8.00, 8.68 |
| t-SNE, perplexity 5 | 41.0% | 8.9, 9.4, 8.8 | 24.9, 27.4, 26.4 |
| t-SNE, perplexity 30 | 46.7% | 3.4, 4.1, 3.6 | 12.5, 16.3, 17.0 |
| t-SNE, perplexity 100 | 34.9% | 0.75, 1.21, 1.19 | 3.7, 5.1, 7.6 |

Read it carefully:

- **Local structure**: t-SNE keeps about twice as many true neighbors as PCA, 47 against 22 percent at perplexity 30. That is what it is for
- **Cluster size**: the real spreads were 0.5, 1 and 2, a factor of four from smallest to largest. PCA reproduced the ratios, 0.70 to 2.69. t-SNE at perplexity 5 or 30 drew all three groups at almost the same size, 3.4 to 4.1 at perplexity 30. It adapts to the local density, expanding dense groups and shrinking sparse ones, so **cluster size in a t-SNE plot means nothing**
- **Distances between clusters**: the true centers were 4, 8 and 8.9 apart, a ratio of 1 to 2 to 2.2. PCA gave 1 to 2.1 to 2.3. t-SNE at perplexity 5 gave 25, 27 and 26, nearly equal, and at 30 gave 12.5, 16.3 and 17.0. The gaps are not reliable either
- **Perplexity changes the picture**: it roughly sets how many neighbors each point attends to. Very low values break up groups, and very high ones merge them and damage local accuracy, which fell to 35 percent at 100 here

This matches the guidance of Wattenberg, Viégas and Johnson in their Distill article "How to Use t-SNE Effectively", whose lessons include that the settings matter, that cluster sizes and distances between clusters in a t-SNE plot may mean nothing and that you should run it to convergence and try several settings.

## How to Use Them Well

1. **Standardize** the features, as for any distance-based method, and consider reducing to 30 to 50 dimensions with PCA first, which also speeds the computation
2. **Run several settings** and several random seeds, and trust only the patterns that persist
3. **Color by something you know**, such as course, condition or label, to check whether the structure means anything
4. **Don't measure from the plot**: not sizes, not gaps, not densities, not the number of clusters. Use the high-dimensional data for that, with [Evaluating Clusterings](/data-ai/evaluating-clusters)
5. **Use the picture to ask questions**, like why a small island of listings sits apart from the rest, and answer them in the original features
6. **Stay with PCA** when distances and global layout matter

## What Visualization Is For

- Spotting duplicates, label errors and strange batches, as a complement to [Exploratory Data Analysis](/data-ai/eda)
- Looking at **embeddings** from a neural network, to see whether similar items land together, as in [Embeddings](/data-ai/embeddings)
- Explaining a result to others, with the cautions above attached

## Key Points

- PCA is linear and keeps global layout, while t-SNE and UMAP keep neighborhoods and distort the rest
- t-SNE kept 47 percent of true neighbors at perplexity 30, against 22 percent for PCA, and 35 percent at perplexity 100
- Three groups with true spreads of 0.5, 1 and 2 were drawn at nearly equal sizes by t-SNE, and distances between groups were also distorted
- Run several perplexities and seeds, and never read sizes or gaps off a t-SNE plot
- <u>Use the plot to find questions and answer them in the original data</u>
