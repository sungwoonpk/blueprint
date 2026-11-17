> An **embedding** is a list of numbers, a vector, that represents a piece of text so that texts with similar meaning get vectors that lie close together. **Semantic search** embeds the query and returns the stored items whose vectors are nearest, so a search can find a match that shares meaning with the query and few words.

A student types "calc textbook" into the search box of the textbook app. The listings say "Calculus: Early Transcendentals" and "Differentiation and Integration, 8th Edition". A keyword search compares words, and "calc" is not "calculus", so it returns little, or the wrong listings.

The students aren't wrong. Words are one of several ways to say a thing, and the vocabulary of the person searching often differs from the vocabulary of the person who wrote the listing. Semantic search is built to bridge that gap, and it brings costs of its own, which this topic walks through.

## When Keywords Fail and When They Don't

A keyword engine, as in [Full Text Search with Inverted Indexes](/system-design/search-engines), scores a document by the words it shares with the query. It is fast, cheap and exact about what it matches. It has no idea that two different words mean one thing, and that gap is the **vocabulary mismatch**.

It would be a mistake to think vectors replace keywords. The BEIR benchmark tested 10 retrieval systems on 18 public datasets, and the results showed that BM25, the classic keyword scoring function, is a dependable baseline, and that re-ranking and late interaction models do best on average at a high computational cost.

Dense retrieval, the vector approach, often did worse than that on data it hadn't been trained on.

The MTEB benchmark, which covers 8 task types, 58 datasets and 112 languages for 33 embedding models, makes a related point: no single text embedding method does best across the tasks. So the choice of model is a measurement, and the best system often uses both approaches.

## From Words to Vectors

The idea of representing words as vectors learned from text goes back to word2vec in 2013, which computed such vectors from very large data sets, 1.6 billion words in under a day. The same idea was extended to whole sentences.

Sentence-BERT, in 2019, showed why that mattered for search. A model that reads two sentences together needs a pass for each pair, so finding the most similar pair among 10,000 sentences takes about 50 million inference computations, which takes about 65 hours.

If each sentence is embedded once and the vectors are compared with cosine similarity, the same task took about 5 seconds, with accuracy maintained in their tests.

The pattern for search follows. Embed each document once, ahead of time, and store the vectors. At query time, embed the query, which is one model call, and compare it with the stored vectors.

<figure class="diagram">
<div class="flow">
<div class="node">Text</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Embedding Model</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Vector<small>1,024 numbers</small></div>
<div class="arrow" data-label="cosine" aria-hidden="true"></div>
<div class="node">Nearest Items</div>
</div>
<figcaption>Embed each document once, embed the query when it arrives, and compare the vectors</figcaption>
</figure>

The comparison is usually **cosine similarity**: the dot product of the two vectors divided by the product of their lengths, which is the cosine of the angle between them. It ranges from -1 for opposite directions to 1 for the same direction, and it ignores length.

When the vectors are normalized to length 1, the dot product equals the cosine. Voyage AI's documentation, which Anthropic points to for embeddings, says its vectors are normalized, that the dot product is the quicker way to compute the same thing, and that cosine similarity and Euclidean distance give identical rankings.

Some details from the documentation are worth knowing before building:

- **Size**: Voyage models default to 1,024 numbers for each text, with 256, 512 and 2,048 as options on some models
- **Queries and documents differ**: A short question and a long passage don't look alike, so the documentation has the client mark each text as a query or a document, and Sentence Transformers describes asymmetric search for this case
- **Limits on length**: Models read a limited number of tokens, which is 32,000 for most Voyage models, so a long text needs splitting
- **One model, one space**: Vectors from different models aren't comparable, so changing the model means embedding the whole collection again

## Seeing the Gap in an Experiment

We can't run a neural embedding model here, so we reproduced the mechanism with an older technique that builds vectors from word co-occurrence: latent semantic analysis, a matrix factorization of the term and document counts. It is a stand in for a learned model, and shows the mechanism and not the quality of a modern one.

The corpus is invented: 400 listings on 20 topics. Each topic has three names, such as "calc" and "calculus", and ten related words.

A listing carries one name, 70 percent of the time the common one, seven related words and two common words. We ran 600 queries of each kind and measured how many of the top 10 results were on the right topic:

| Query | Keywords | Vectors | Both, Fused |
| --- | --- | --- | --- |
| A Rare Name Alone | 28% | 87% | 57% |
| A Rare Name and a Related Word | 100% | 100% | 100% |
| Three Related Words | 100% | 100% | 100% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of top ten on the right topic for three retrieval methods">
<div class="hbar peak"><span>Keywords</span><span class="track"><span class="fill" style="--w: 28.2%"></span></span><span class="value">28%</span></div>
<div class="hbar"><span>Both, Fused</span><span class="track"><span class="fill" style="--w: 57%"></span></span><span class="value">57%</span></div>
<div class="hbar"><span>Vectors</span><span class="track"><span class="fill" style="--w: 87.3%"></span></span><span class="value">87%</span></div>
</div>
<figcaption>Share of the top 10 on the right topic for a query with a rare name alone, from our experiment</figcaption>
</figure>

The first row is the vocabulary mismatch. The query used a name that few listings carry, so the keyword search found just those few, and the other listings on the topic used a different name.

The vectors had learned that the rare name goes with the same related words as the common one, and found 87 percent. When the query had a related word to match, the keywords were as good, so the gain was in the hard case alone.

The fused column is a plain combination of the two lists, described below. It landed between them: one of the two rankers was weak on that query, and an equal vote can't fix that. The lesson from BEIR holds here too: the right mix depends on the queries, and the decision comes from measuring.

We also varied the number of dimensions of the vectors, with the rare name query:

| Dimensions | Right Topic in the Top 10 |
| --- | --- |
| 5 | 84% |
| 10 | 87% |
| 20 | 87% |
| 40 | 87% |

Quality rose and then stopped rising. Past a point, extra numbers store detail the task doesn't use, and they cost memory.

## What the Vectors Cost

Dimensions matter because of storage and speed. For 3 million listings with 1,024 numbers each, our arithmetic gives:

<figure class="chart">
<div class="hbars" role="img" aria-label="Gigabytes for four storage formats">
<div class="hbar peak"><span>32 Bit Numbers</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">12.3 GB</span></div>
<div class="hbar"><span>8 Bit Integers</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">3.1 GB</span></div>
<div class="hbar"><span>256 Dimensions, 32 Bit</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">3.1 GB</span></div>
<div class="hbar"><span>Binary</span><span class="track"><span class="fill" style="--w: 3.1%"></span></span><span class="value">0.4 GB</span></div>
</div>
<figcaption>Storage for 3 million listings of 1,024 numbers, by format, from our arithmetic</figcaption>
</figure>

There are options: 8 bit integers cut storage to a quarter, binary vectors to a thirty second, and models trained for it, called Matryoshka, allow keeping the leading dimensions, for instance 256 of 1,024, and normalizing again.

Each choice trades some accuracy for space, and the trade has to be measured on your own data, as in our dimensions table.

Comparing the query with each stored vector takes a read of the whole set. At 12.3 GB and a memory bandwidth of 50 GB a second, a number we assume, that is about a quarter of a second for each query, so a search service at 3,000 queries a second can't scan.

It needs an index that looks at a small share of the vectors, the subject of [Vector Databases](/system-design/vector-databases).

There are two costs besides memory. The query must be embedded, which is a model call that adds delay before the search starts, and the collection must be embedded as a batch job before the first query.

A new listing must be embedded and added, which is the freshness problem of [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync).

## Combine With Keywords

A hybrid search runs both and merges the results. It runs full text and vector search in one request and returns one ranked list, and a common way to merge is **reciprocal rank fusion**.

For each list that contains a document, the document earns 1 divided by a constant plus its rank in that list, and the scores add up.

The constant defaults to 60. Each list has equal weight, and the documentation's worked example with a constant of 1 gives a document ranked second in one list and first in another a score of 1/3 plus 1/2, or 0.833.

The method needs no tuning of scores, since it uses ranks and not the raw numbers from the two systems, which aren't on one scale. A document that does well in both lists wins. Our experiment shows what it doesn't do: it doesn't rescue a query on which one ranker has little to offer.

Filters belong in the same request. A student who wants calculus books under 20,000 won, in the 2nd semester, needs the price and course conditions applied exactly, with the vectors ordering what remains.

## Retrieve, Then Re-rank

The vectors are computed ahead of time, which makes them fast and approximate. A **cross-encoder** reads the query and a candidate together, which is slower and more precise.

The standard design has two stages: a bi-encoder retrieves a list of candidates by cosine similarity, and a cross-encoder re-ranks them. BEIR found re-ranking models best on average, at high cost, which is why they run on a short list.

<figure class="diagram">
<div class="flow">
<div class="node">Query</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Vector Search<small>top 100</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Re-ranker<small>top 10</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Results</div>
</div>
<figcaption>Retrieve many cheaply, then re-rank a short list with a slower model</figcaption>
</figure>

## Splitting Long Texts

A model produces one vector for a text, and a long text blurs into an average. A syllabus with 40 topics becomes a vector that matches each of them poorly. The usual answer is to split the text into **chunks** and embed each one.

Fixed size chunking is the most common and simple approach, and a good place to start. Then test smaller chunks of 128 or 256 tokens, which capture finer meaning, against larger ones of 512 or 1,024, which keep more context.

Its test for a good chunk is a human one: if the text makes sense without the text around it, it will make sense to the model. After a hit, fetching the neighboring chunks restores context.

For listings, the text is short, so a listing is often a single chunk. For the long documents of the next topics, such as course pages and syllabi, [Retrieval-Augmented Generation (RAG)](/system-design/rag) builds on this.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Model | A hosted embedding model with 1,024 dimensions, chosen by a test on 200 real searches |
| Text | Title, edition, course and the seller's description, with price and status kept as filters |
| Index | Vectors in a vector index beside the keyword index |
| Query Path | Keywords and vectors in one request, fused by rank, with filters applied exactly |
| Re-ranking | A cross-encoder on the top 50, behind a flag until it proves its cost |
| Freshness | A new listing is embedded and searchable within a minute, through the change log |
| Model Change | A second index built in the background, with an alias switched when it matches |
| Metrics | Share of searches with no click, a labeled set for the top 10, and the delay of the query embedding |

## Pitfalls

- **Replacing keywords with vectors**: Exact names, codes and ISBNs match better by words
- **Skipping the evaluation**: No model wins on each task, as MTEB found
- **Mixing vectors from two models**: The distances carry no meaning
- **A single vector for a long document**: The meaning blurs
- **Scanning each vector for each query**: Memory bandwidth sets a ceiling on the rate
- **Fusing a weak ranker with a strong one at equal weight**: The result lands in between
- **Forgetting that the query costs a model call**: It adds delay before the search begins

## Key Points

- An embedding turns text into a vector so that similar meaning is close, and semantic search embeds the query and returns the nearest vectors
- Vectors bridge the vocabulary mismatch: in our experiment, a rare name found the right topic 87 percent of the time, against 28 percent for keywords, and the two were equal on easy queries
- Size and speed come from the dimensions: 3 million vectors of 1,024 numbers took 12.3 GB, and 8 bit values or fewer dimensions cut it to a quarter or less at some cost in accuracy
- <u>Combine keywords and vectors</u>, merge by rank, apply filters exactly, and re-rank a short list with a slower model, then measure each choice on your own queries
- Split long texts into chunks, embed with one model throughout, and plan to rebuild the whole index when the model changes
