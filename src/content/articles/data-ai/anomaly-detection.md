> **Anomaly detection** finds cases that don't fit the normal pattern, usually without labeled examples of the bad cases. Methods score how unusual a point is by distance, density, isolation or reconstruction error. There is no best method: the right one depends on how the anomalies differ from normal data, and real anomalies, such as fraud, often adapt to avoid detection.

Fraud, scam listings, failing machines and data pipeline faults are rare, vary a lot and often have no labels. [Imbalanced Data](/data-ai/imbalanced-data) covered the case where examples of the rare class exist. This article covers the case where they don't, or are too varied to learn from, so the model learns what normal looks like and flags what deviates.

## Families of Methods

| Family | Idea | Examples | Weakness |
| --- | --- | --- | --- |
| Statistical | A value far from the typical one is unusual | z-score, interquartile fences, Mahalanobis distance | Assumes a shape, such as Gaussian |
| Distance | A point far from its neighbors is unusual | k-nearest-neighbor distance | Costly, suffers in many dimensions |
| Density | A point in a sparser area than its neighbors is unusual | Local outlier factor, DBSCAN noise | Needs a good neighborhood size |
| Isolation | Anomalies are few and different, so random splits isolate them quickly | Isolation forest | Weak when anomalies cluster or hide in irrelevant features |
| Reconstruction | A model of normal data rebuilds anomalies badly | PCA reconstruction error, autoencoders | Needs a good model of normal |
| One-class | Fit a boundary around normal data | One-class SVM | Sensitive to settings and scale |

The scikit-learn documentation separates **outlier detection**, where the training data may contain anomalies and we want to find them, from **novelty detection**, where the training data is clean and we look for new anomalies later.

## Isolation Forest

Liu, Ting and Zhou's 2008 isolation forest rests on an observation: anomalies are few and different, so a random split tends to separate them from the rest in a few steps. Build many random trees by picking a random feature and a random split value at each node. The number of splits needed to isolate a point, its **path length**, is short for anomalies and long for normal points.

Averaged over trees and normalized, the anomaly score is s = 2 raised to the power of minus the average path length over c(n), where c(n) is the average path length for n points.

A score near 1 means anomalous, and near 0.5 or below means normal. The paper's defaults are 100 trees and a subsample of 256 points per tree, and subsampling reduces the masking effects of too much normal data.

## A Test on Listings

We simulated 6,000 listings, 2.8 percent of them scams, described by six features: the log of the asking price over fair, photos, account age, list price, age and condition. Scam listings tended to be underpriced, with few photos and a young account, but they differ in only some of the features. No labels were used in training. We scored every listing and measured the ranking by AUC and average precision:

| Method | AUC | Average Precision |
| --- | --- | --- |
| Largest absolute z-score over features | 0.882 | 0.629 |
| Mahalanobis distance | 0.852 | 0.495 |
| Distance to the 10th nearest of 1,000 reference points | 0.857 | 0.540 |
| Isolation forest, 100 trees, 256 samples | 0.818 | 0.345 |

The simplest method won. The anomalies here are extreme in a couple of known features, which a per-feature z-score catches directly, while the isolation forest chooses features at random, and three of the six features, list price, age and condition, say nothing about scams, so many of its splits are wasted.

In a different test where the scams were more extreme and tightly grouped, all methods improved and the ordering held: the z-score reached AUC 0.996, Mahalanobis and nearest-neighbor distance 0.98 and the isolation forest 0.938. Fancy methods aren't always better than a simple baseline, so always compare with one, the lesson of [Comparing Models Fairly](/data-ai/comparing-models).

## How Settings Matter

Isolation forest on the scattered data, by number of trees and subsample size:

| Trees | Subsample Size | AUC |
| --- | --- | --- |
| 5 | 256 | 0.789 |
| 25 | 256 | 0.819 |
| 100 | 256 | 0.818 |
| 100 | 32 | 0.826 |
| 100 | 2,048 | 0.827 |

A few dozen trees are enough, consistent with the paper's remark that path lengths usually converge well before 100 trees, and the subsample size barely mattered here.

## When the Anomalies Aren't Rare

An anomaly detector assumes anomalies are few. We made 20 percent of the listings a tight cluster of scams, a large coordinated campaign. The isolation forest's AUC was **0.424**, below chance, and its average precision 0.169. The cluster is dense, so its points are no easier to isolate than the normal ones, and the model treats it as a normal mode.

The same blindness, called masking, affects distance and density methods when the anomalies are numerous and similar. Defenses: clean the training data of known anomalies, use features that expose the pattern, and combine unsupervised scores with any labels that exist.

## Practical Notes

1. **Define normal** carefully: normal for what group, season or seller type? An unusual price for one course may be ordinary for another, so compute scores within groups or on residuals of a model
2. **Scale the features**, since most methods use distances or variances
3. **Choose the threshold from capacity and cost**, such as the top 100 per day for reviewers, and not from a fixed contamination guess
4. **Expect false alarms**: with 2.8 percent anomalies and an isolation forest, the top 3 percent of scores held 33 percent real scams, so two thirds of the flags were false alarms. Anomalous is not the same as bad
5. **Get labels where you can**: reviewer decisions on flagged cases make a labeled set, and later a supervised model can take over, as in [Imbalanced Data](/data-ai/imbalanced-data)
6. **Watch for drift**: normal changes over time, so retrain or recompute the baselines, as with the data checks of [Testing and Monitoring Data Quality](/data-ai/data-quality-checks)
7. **Explain flags**: show which features drove the score

## Where It Appears

Fraud and abuse detection, intrusion and fault detection, data quality alerts, pretraining data cleaning and finding label errors. Many monitoring systems use the simple statistical tests above, with seasonality handled, as in [Testing and Monitoring Data Quality](/data-ai/data-quality-checks).

## Key Points

- Anomaly detection scores how unusual a point is by statistics, distance, density, isolation or reconstruction, usually without labels
- Isolation forests isolate anomalies with random splits: anomalies have short average path lengths
- On our simulated scams a plain z-score beat the isolation forest: AUC 0.882 against 0.818
- When 20 percent of listings were a tight cluster of scams, the isolation forest scored an AUC of 0.424, since a large anomalous group looks normal
- <u>Start with a simple statistical baseline, define normal within groups, and set thresholds from review capacity</u>
