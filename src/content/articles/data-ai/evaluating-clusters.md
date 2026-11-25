> Clusters have no answer key, so evaluating them is harder than evaluating a classifier. **Internal** measures such as the silhouette judge how tight and separated the groups are, **external** measures such as the adjusted Rand index compare against known labels when they exist, and **stability** asks whether the groups reappear on resampled data. None is enough alone, and every one will say yes to clusters in pure noise.

A model that predicts has a target to be wrong about. A clustering has only the data, and the question of whether it found something real, or merely divided the space.

## Internal Measures

The **silhouette** of a point compares a, its average distance to the other points in its own cluster, with b, its average distance to the points of the nearest other cluster: (b − a) / max(a, b). It runs from −1 to 1. Near 1 means the point sits well inside its cluster, near 0 on a boundary and negative means it may be in the wrong cluster.

The average over points is the silhouette score, and scikit-learn’s documentation uses it to compare numbers of clusters. Other internal scores, such as the Davies–Bouldin and Calinski–Harabasz indexes, also reward compact, separated groups.

**Inertia**, the total squared distance to the centers, falls with every added cluster and can't choose k alone. For mixture models, likelihood-based scores such as BIC work, as in [Gaussian Mixtures and the EM Algorithm](/data-ai/gmm-em).

## External Measures

When labels exist, even partial ones, compare clusters with them. The **Rand index** counts pairs of points that both clusterings treat the same way, together or apart.

The **adjusted Rand index**, ARI, subtracts what chance would give, so it is 1 for perfect agreement and about 0 for random labels. Mutual information based scores are the other common family. The labels may not be the "truth": they are one view, and a clustering that disagrees may have found another valid structure.

## Stability

A real structure should survive resampling. Fit the clustering on two random 80 percent subsets, and measure the ARI between their assignments on the shared points. High agreement means the result doesn't hinge on a few points. Stability also tests the method's own randomness, such as k-means starts.

## All Three, on Real and Fake Data

We clustered 900 simulated sellers from four true groups, and also 900 points scattered uniformly at random, which contain no clusters at all. For each k:

| k | Silhouette, Sellers | Stability, Sellers | Silhouette, Noise | Stability, Noise | ARI vs True Groups |
| --- | --- | --- | --- | --- | --- |
| 2 | 0.488 | 0.50 | 0.347 | 0.60 | 0.24 |
| 3 | 0.597 | 0.94 | 0.376 | 0.53 | 0.57 |
| 4 | **0.654** | **0.97** | 0.415 | 0.94 | **0.96** |
| 5 | 0.630 | 0.86 | 0.373 | 0.66 | 0.93 |
| 6 | 0.554 | 0.82 | 0.377 | 0.64 | 0.84 |
| 8 | 0.521 | 0.73 | 0.371 | 0.63 | 0.77 |

On the real sellers, silhouette and stability both peak at k = 4, the true number, with an ARI of 0.96. Reassuring, and also instructive about the noise columns:

- **The silhouette of pure noise was 0.35 to 0.42**, values some rules of thumb would call a reasonable structure. The silhouette is a relative score: use it to compare ks on the same data, not as proof that clusters exist. A real structure of 0.65 is clearly higher, and the gap between data and noise is the informative number
- **Stability of pure noise at k = 4 was 0.94**, almost as high as the real data. A square of uniform points splits into the same four quadrants every time. Stability shows a result is reproducible and not that it is meaningful

## A Checklist for Believing Clusters

1. **Compare with a null**: cluster shuffled or uniform data of the same shape, and see how much better the real score is
2. **Check several scores and k values**, with no single number deciding
3. **Check stability** across subsamples, and across methods: do k-means and a mixture agree?
4. **Look at the clusters**: group sizes, averages, example members. Are they distinct, and can you name them?
5. **Test usefulness**: do the clusters improve a downstream task, such as a better price model for each segment, or a clearer plan for sellers? This is the strongest evidence
6. **Consider the features**: clusters reflect the features and the scaling you chose. Different choices give different, equally valid groups

## Common Mistakes

- Picking k by the lowest inertia
- Treating a silhouette above some threshold as proof
- Clustering after unscaled features dominate the distance
- Reading clusters in a two-dimensional projection as real, since a plot can invent or hide structure, as [Visualizing High-Dimensional Data](/data-ai/high-dim-visualization) shows
- Believing a segment name without checking the members

## Key Points

- Internal measures like the silhouette score tightness and separation, external ones like ARI compare with known labels, and stability checks reproducibility
- On four-group sellers, silhouette and stability peaked at the true k of 4
- Pure noise scored a silhouette of 0.42 and a stability of 0.94 at k = 4, so a good score doesn't prove structure
- Compare against a null, check several measures and judge clusters by whether they are useful
- <u>Ask whether clusters beat what random data would give, and whether they improve a decision</u>
