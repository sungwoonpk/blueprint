> An **embedding** maps each item, such as a word, a user or a book, to a short list of numbers, learned so that items used in similar ways end up close together. It replaces sparse one-hot columns with a dense vector that carries similarity. Embeddings are how neural networks take in categories and text.

[Encoding Categorical Features](/data-ai/encoding) gave each category its own column. With 100,000 books that is 100,000 columns, and every pair of books is equally different. An embedding gives each book, say, 8 numbers that a model learns.

## A Lookup Table of Vectors

An embedding is a table with one row per item. Looking up an item returns its row, and the numbers in the table are weights trained like any others. A one-hot vector times a weight matrix does the same thing, so an embedding layer is a linear layer used efficiently.

## Learning From Context

The idea behind word2vec, from Mikolov and colleagues, is that items appearing in similar company are similar. Train a model to tell which items occur together:

1. Take a pair that really co-occurred, as a positive example
2. Take a few random items as **negative samples**
3. Adjust the vectors so the real pair scores high and the random pairs low

No labels are needed: the data supplies its own targets.

## Books in Baskets

We invented 40 textbooks in five subjects and 3,000 shopping baskets of two to four books, mostly from one subject, with some mixing. We trained vectors from nothing but which books shared a basket, and asked whether each book's five nearest neighbors share its subject:

| Vector Size | Nearest Neighbors in the Same Subject | Average Cosine, Same Subject | Average Cosine, Different Subject |
| --- | --- | --- | --- |
| 2 | 85% | 0.996 | 0.600 |
| 8 | 100% | 0.906 | 0.284 |
| 32 | 100% | 0.789 | 0.250 |
| Random vectors | 16% | | |

Chance is 18 percent. The model was never told about subjects, and found them from co-occurrence. Two dimensions were too cramped, and 8 were enough. With only 100 baskets, neighbor purity was 58 percent, and with 300 it reached 100: embeddings need enough examples of each item.

## Using Similarity

Compare vectors with **cosine similarity**, from [Norms, Distances and Similarity](/data-ai/norms-distances). Uses:

- **Recommendations**: books near the one you are viewing, as in [Collaborative Filtering](/data-ai/collaborative-filtering)
- **Search**: match a query's vector to items, often with approximate nearest neighbors
- **Features**: feed vectors into a downstream model
- **Transfer**: vectors trained on big text carry meaning into small tasks

The word2vec authors showed that vector arithmetic sometimes captures relations, as in "Madrid minus Spain plus France" landing near "Paris". It is striking and not reliable for every relation.

## Cautions

- **Cold start**: a new item has no vector until it has data. Use features such as its title
- **Popularity**: frequent items can dominate neighborhoods, which word2vec counters by subsampling frequent words and sampling negatives from a smoothed frequency
- **Bias**: vectors absorb associations in the data, including unwanted ones
- **Versioning**: retraining changes the whole space, so don't compare vectors from different versions
- **Static**: one vector per word can't separate two meanings, which context-aware models, as in [Self-Attention](/data-ai/self-attention), fix

## Key Points

- An embedding is a learned lookup table of dense vectors, so similar items sit close
- Co-occurrence with negative sampling learns them without labels
- On invented book baskets, 8-dimensional vectors grouped all books with their subject, though subjects were never given
- With too little data neighbors were far less accurate
- <u>Treat embeddings as learned features: check neighbors, version them and watch for bias</u>
