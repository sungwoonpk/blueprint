> **k-means** groups points into k clusters by alternating two steps: assign each point to the nearest center, then move each center to the mean of its points. It minimizes the total squared distance of points to their centers. It is fast and simple, it needs k chosen in advance, it prefers round, similar-sized clusters, and its answer depends on its starting centers.

Suppose the textbook app wants to understand its sellers. Some list a few expensive books a semester, some clear their shelf every term, some sell all year. Nobody labeled them, and k-means looks for groups in the numbers.

## The Algorithm

Given k:

1. Pick k starting centers
2. **Assign** every point to its nearest center
3. **Update** each center to the mean of the points assigned to it
4. Repeat steps 2 and 3 until the assignments stop changing

Each step lowers, or at least doesn't raise, the **inertia**, the sum of squared distances from every point to its center, so the process always converges.

It finds a local minimum, not necessarily the best one. This is Lloyd’s algorithm, the one in the scikit-learn documentation, and Stanford’s CS229 notes present it as the standard clustering algorithm. The inertia is the objective, and the documentation notes that it assumes clusters are convex and isotropic, roughly round blobs.

## Choosing k

We simulated 1,200 sellers by two numbers, listings per month and typical list price, drawn from four true groups: occasional sellers of cheap books, occasional sellers of expensive books, regular mid-price sellers and high-volume sellers. We standardized both columns and ran k-means for k from 1 to 8:

| k | Inertia | Silhouette | Agreement With the True Groups (ARI) |
| --- | --- | --- | --- |
| 1 | 2,400 | | 0 |
| 2 | 1,386 | 0.465 | 0.43 |
| 3 | 529 | 0.602 | 0.57 |
| 4 | 239 | 0.655 | 0.97 |
| 5 | 210 | 0.629 | 0.94 |
| 6 | 176 | 0.551 | 0.82 |
| 7 | 147 | 0.533 | 0.79 |
| 8 | 126 | 0.425 | 0.58 |

Inertia always falls as k grows, so the lowest inertia can't pick k. The **elbow** method looks for where the fall slows: here from 529 to 239 between k = 3 and 4 and only 29 more at k = 5.

The **silhouette** score, explained in [Evaluating Clusterings](/data-ai/evaluating-clusters), peaks at k = 4 with 0.655. The ARI, a comparison with the true groups that real data wouldn't give us, agrees: it is highest at 0.97 for k = 4. 

All the signals point at four, because the data really has four groups. With real data the elbow is rarely this clear.

## Starting Points

Poor starting centers can leave a bad local minimum, such as two centers inside one group and one center shared by two groups. **k-means++** starts by choosing one center at random and then each next center with probability proportional to the squared distance from the nearest center chosen so far, which spreads the starts out.

Arthur and Vassilvitskii, who proposed it in 2007, proved that it yields a result within a factor of order log k of the best possible in expectation, a guarantee random starts lack.

Running several restarts and keeping the lowest inertia is standard.

We ran k = 4 from 200 different starts, with random centers and with k-means++:

| Initialization | Best Inertia | Worst Inertia | Runs Within 1% of the Best |
| --- | --- | --- | --- |
| Random points | 239.4 | 491.6 | 171 of 200 |
| k-means++ | 239.4 | 491.6 | 183 of 200 |

Both reached the best answer, and the worst runs were twice as bad. The k-means++ start got stuck a little less often, 183 against 171. About one run in ten still landed in a poor solution, which is why restarts are used.

## Scaling Changes the Answer

k-means uses Euclidean distance, so features in large units dominate. With the raw listings per month and price, price controlled the distances and the agreement with the true groups was 0.63, against 0.97 after standardizing. See [Scaling and Normalizing Features](/data-ai/scaling).

## Where k-means Fails

- **Non-round clusters**: on two interleaved crescent shapes it scored only 0.37 against the true groups, since it splits the plane by straight lines between centers. [Hierarchical and Density-Based Clustering](/data-ai/clustering-more) handles shapes
- **Unequal sizes and spreads**: a large, loose group gets cut up and a small tight one swallowed
- **Outliers** drag centers, since the mean is not robust
- **Categorical features** have no mean
- **No uncertainty**: every point belongs to exactly one cluster, even those halfway between. [Gaussian Mixtures and the EM Algorithm](/data-ai/gmm-em) gives soft memberships
- **Many dimensions**: distances flatten, as in [k-Nearest Neighbors](/data-ai/knn)

## Uses

- Customer or seller segmentation, as long as the segments are checked for meaning and stability
- **Vector quantization**: replacing vectors by their center, as in compression and some retrieval systems
- A first look at data, or initialization for other models, including the mixtures of the next chapter

A cluster is a description that someone has to interpret. Look at each group's averages and examples, and ask whether the segments are useful for a decision.

## Key Points

- k-means alternates assigning points to the nearest center and moving each center to its group's mean, minimizing inertia
- The inertia falls as k grows, so choose k by elbow, silhouette and stability, and by whether the clusters are useful
- k-means++ spreads the starting centers and is within a log k factor of optimal in expectation, and restarts still matter
- Standardizing took the agreement with the true groups from 0.63 to 0.97
- <u>Check that clusters are round-ish and stable, and give each cluster a meaning before using it</u>
