> A **duplicate** is the same real thing recorded more than once. **Entity resolution**, also called record linkage or deduplication, decides which records refer to the same thing when they don't match exactly, by normalizing them, comparing candidate pairs and choosing a threshold that trades missed duplicates against wrong merges.

A student posts "Calculus: Early Transcendentals, 8th ed." and another posts "calculus early transcendentals (8e)". They are the same book, and a table that counts books, or a model that learns from them, sees two. Duplicates inflate counts, leak between training and test data and split one seller's history in two, so finding them is part of every data project.

## Exact Duplicates and Near Duplicates

An **exact duplicate** is a repeated row, for instance from a retried upload. A single command finds them, and a unique key prevents them, as in [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work). A **near duplicate** differs in spelling, spacing, case, abbreviations or typos, and a unique key can't see it.

We made a test: 300 invented book titles, each posted one to three times with realistic variants, such as lower case, doubled spaces, an edition suffix, an ampersand for "and", all capitals, and sometimes a dropped last letter. That gave 614 listings of 300 books, with 188,191 pairs of listings to compare.

## Normalize First

Comparing raw strings misses most duplicates. Normalizing reduces the noise: lower case, strip punctuation and edition markers, collapse spaces. We scored each method on pairs, counting **precision**, the share of declared duplicates that were real, and **recall**, the share of real duplicates found:

| Method | Pairs Declared | Precision | Recall |
| --- | --- | --- | --- |
| Exact match on raw text | 57 | 100% | 13.6% |
| Exact match after normalizing | 340 | 100% | 81.1% |
| Word overlap (Jaccard) at least 0.9 | 340 | 100% | 81.1% |
| Word overlap at least 0.7 | 357 | 100% | 85.2% |
| Word overlap at least 0.5 | 559 | 75% | 100% |

Raw matching found 14 percent of the duplicates. Normalizing found 81 percent with no wrong merges. The **Jaccard similarity** of two titles, the number of words they share divided by the number of distinct words in both, can be loosened to catch more, and the table shows the cost: at 0.5 every duplicate was found and a quarter of the declared pairs were wrong, since dropped letters made different books look alike.

## Choosing the Threshold

There is no setting that gives both. Lowering the threshold raises recall and lowers precision, the trade of [Accuracy, Precision and Recall](/data-ai/classification-metrics), and the right place depends on the cost of each mistake. Merging two different books corrupts both histories and can't easily be undone. Missing a duplicate leaves a harmless extra row. A cautious pipeline merges automatically only at a high threshold, sends the middle band to a person and leaves the rest alone.

Other similarity measures suit other fields. **Edit distance** counts the changes needed to turn one string into another and handles typos. Phonetic codes match names that sound alike. Character n-grams compare overlapping fragments, which is robust to word order and spelling. For records with several fields, a weighted score combines the similarities of the title, the author and the seller, the idea behind the Fellegi and Sunter model of 1969.

## Too Many Pairs

The comparison of every pair grows as n², and our 614 listings made 188,191 pairs. With 3 million listings there would be about 4.5 trillion, far too many. **Blocking** compares only records that share a cheap key, such as the first word of the normalized title. In our test the blocks left 9,723 comparisons, 19 times fewer, and nearly all the true pairs shared a first word.

Blocking can miss a duplicate whose key itself was typed wrongly, so real systems use several blocking keys and take the union. The same idea underlies locality sensitive hashing and the nearest neighbor search of [Vector Databases](/system-design/vector-databases).

## From Pairs to Entities

Pairs have to be turned into groups. If A matches B and B matches C, then A, B and C are one book, even if A and C look different. Grouping uses **connected components** of the match graph, which [Connected Components and Cycles](/algorithms/components-cycles) covers. One wrong link can chain two groups into one, which is why precision matters more than it seems.

After grouping, one record has to be chosen or built as the **golden record**: the most recent value for each field, or the most common. Keep the links back to the originals, so a merge can be undone.

## Why It Matters for Models

- **Counts and averages**: a book listed three times counts three times in a "popular books" ranking
- **Train and test leakage**: if the same book appears in both sets under different spellings, the test score is too optimistic, the problem of [Data Leakage](/data-ai/data-leakage)
- **Seller features**: a seller split into two accounts looks new twice
- **Entities across sources**: joining the app's data to outside data needs the same matching

Deduplicate before splitting into training and test sets, and split by entity, not by row.

## Key Points

- Exact duplicates are easy to find and prevent, and near duplicates differ in spelling, case and format
- Normalizing found 81 percent of the duplicates in our titles with no wrong merges, against 14 percent for raw matching
- A looser similarity threshold raises recall and lowers precision: at 0.5 every duplicate was found and 25 percent of the declared pairs were wrong
- Blocking cut the comparisons by 19 times, and connected components turn pairs into entities
- <u>Deduplicate before splitting the data, and split by entity</u>
