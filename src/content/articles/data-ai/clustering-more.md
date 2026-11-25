> **Hierarchical clustering** builds a tree of nested clusters by repeatedly merging the two closest groups, and the way groups are compared, the linkage, decides which shapes it finds. **DBSCAN** grows clusters from dense regions, finds clusters of any shape and labels sparse points as noise, with no need to choose k. Each works where k-means fails, and each has its own settings that change the answer.

[k-Means Clustering](/data-ai/kmeans) finds round groups. Real groups may be crescents, chains or blobs of different density, and the data may contain stray points that belong to no group.

## Hierarchical Clustering

**Agglomerative** clustering starts with every point as its own cluster and merges the closest pair, again and again, until one cluster remains. The history of merges is a tree, a **dendrogram**, and cutting it at a chosen height gives a chosen number of clusters, without rerunning anything. The tree is itself useful: it shows which groups are close relatives.

Everything depends on how the distance between two clusters is defined, the **linkage**:

| Linkage | Distance Between Clusters | Tends to Find |
| --- | --- | --- |
| Single | The closest pair of points | Long chains and elongated shapes, and chains through noise |
| Complete | The farthest pair of points | Compact clusters of similar diameter |
| Average | The mean of all pairwise distances | A compromise |
| Ward | The increase in within-cluster variance caused by the merge | Round clusters of similar size, like k-means |

The method needs the distances between all pairs of points, so memory grows with the square of the number of points and the common algorithms take quadratic to cubic time. It suits thousands of points, not millions.

## DBSCAN

Ester and colleagues’ DBSCAN, from 1996, defines clusters through density. Two settings: a radius **eps** and a count **minimum points**. A point with at least that many neighbors within eps is a **core point**. Core points within eps of each other join the same cluster, and points near a core point attach to it. A point that is neither core nor near a core is labeled **noise**.

There is no k to choose, the clusters can take any shape and outliers are named. The costs are two settings, and a single density: groups of very different density can't all be captured with one eps.

## Two Crescents

We drew 300 points in two interleaved crescents with noise, and scored each method by agreement with the true groups, the adjusted Rand index, 1 for perfect and 0 for random:

| Method | Agreement With the True Groups (ARI) |
| --- | --- |
| k-means, k = 2 | 0.37 |
| Agglomerative, complete linkage | 0.48 |
| Agglomerative, Ward | 0.43 |
| Agglomerative, average | 0.26 |
| **Agglomerative, single linkage** | **1.00** |
| DBSCAN, eps 0.1 | 0.16, with 14 clusters and 39 noise points |
| DBSCAN, eps 0.2 | 0.99 |
| **DBSCAN, eps 0.3** | **1.00** |
| DBSCAN, eps 0.5 | 0.00, everything in one cluster |

The methods built for round clusters failed, and single linkage and DBSCAN, which follow chains of nearby points, recovered both crescents exactly. DBSCAN is sensitive to eps in both directions: too small shatters the shapes into 14 pieces and flags 39 points as noise, and too large merges the two crescents. A plot of each point's distance to its k-th nearest neighbor, sorted, helps choose eps at its knee.

## Seller Segments

On 300 sellers in the four-group dataset of the k-means article, standardized:

| Method | ARI |
| --- | --- |
| k-means, k = 4 | 0.96 |
| Agglomerative, Ward | 0.97 |
| Agglomerative, average | 0.95 |
| Agglomerative, complete | 0.51 |
| Agglomerative, single | 0.02 |
| DBSCAN, eps 0.15 | 0.72, with 7 clusters and 63 noise points |
| DBSCAN, eps 0.3 | 0.96, with 4 clusters and 13 noise points |
| DBSCAN, eps 0.5 | 0.52, with 3 clusters |

Now the tables turn. Single linkage chains the four blobs into one and scores 0.02, while Ward and k-means are right. Method fit matters: pick the one whose idea of a cluster matches the data's.

## Outliers

We added 15 scattered points that belong to no group. k-means had to place them in some cluster, and the agreement with the truth, counting them as their own class, dropped to 0.90. DBSCAN with eps 0.3 found the same four clusters and labeled 23 points as noise, against 13 before the strays were added.

Naming noise is itself a use: DBSCAN doubles as an outlier detector, as in [Anomaly Detection](/data-ai/anomaly-detection).

## Practical Choices

- Scale the features first, since all of these use distances
- Use Ward or average linkage for compact groups, single linkage when chains are the point, and DBSCAN for arbitrary shapes with noise
- Plot the dendrogram or the nearest-neighbor distances before choosing a cut or eps
- For larger data, HDBSCAN removes the single eps by varying it, and mini-batch methods and approximate neighbors scale up
- Judge the result with [Evaluating Clusterings](/data-ai/evaluating-clusters), not with the shape of the plot alone

## Key Points

- Agglomerative clustering merges the closest groups into a tree, and the linkage decides which shapes it finds
- DBSCAN grows clusters from dense regions, finds any shape and labels sparse points as noise, using eps and a minimum count
- On two crescents, k-means scored 0.37 and single linkage and DBSCAN scored 1.00, and on four round groups single linkage scored 0.02
- DBSCAN with eps too small gave 14 fragments and too large gave one cluster
- <u>Match the method to the shape of the clusters, and tune eps from the nearest-neighbor distances</u>
