> **Full text search** finds documents by the words inside them and puts the best matches first. The structure that makes it fast is the **inverted index**: for each word, a list of the documents that contain it.

A student types "early calculus" into the textbook app. The obvious query, `WHERE title LIKE '%calculus%'`, has three problems. A pattern with a leading wildcard can't use a sorted index from [Indexes and Query Optimization](/system-design/indexing), so it reads every row.

It knows nothing about word forms, so "Algorithm" won't find "Algorithms". And it has no idea which result is the best. Search engines were built to solve these three.

## Index the Words, Not the Documents

An ordinary index maps a document to its content. An **inverted index** is the reverse: it maps each word to the places it occurs. Here are six listings, and part of the index built from their titles:

| Listing | Title |
| --- | --- |
| 1 | Calculus: Early Transcendentals, 8th Edition |
| 2 | Calculus Made Easy |
| 3 | Linear Algebra Done Right |
| 4 | Algorithms Notes, Early Draft |
| 5 | Introduction to Algorithms, Third Edition |
| 6 | Calculus Workbook: Calculus Practice and Calculus Review |

| Word | Listings (Count) |
| --- | --- |
| algorithms | 4, 5 |
| calculus | 1, 2, 6 (three times in 6) |
| early | 1, 4 |
| edition | 1, 5 |
| workbook | 6 |

Each list is called a **posting list**. Finding the listings with a word is one lookup in a sorted dictionary of words, with no scan of the titles.

A query with two words combines two lists. For "early calculus" with both words required, the engine walks the two sorted lists together and keeps the ids that appear in both:

<figure class="diagram">
<p class="rowname">early</p>
<div class="flow packets">
<div class="node">1</div>
<div class="node">4</div>
</div>
<p class="rowname">calculus</p>
<div class="flow packets">
<div class="node">1</div>
<div class="node">2</div>
<div class="node">6</div>
</div>
<p class="rowname">Both</p>
<div class="flow packets">
<div class="node">1</div>
</div>
<figcaption>Walking two sorted lists together finds the listings that contain both words</figcaption>
</figure>

There are two variants. A record level index stores only which documents contain a word. A word level index also stores the position of each occurrence, which makes phrase searches such as "linear algebra" possible, at the cost of more space and work to build.

The price of the whole idea is more processing when a document is added: a new title touches the list of each word in it.

## Analysis: What Counts as a Word

Before indexing, text is turned into the words to be indexed, a step called **text analysis**. It has three jobs. Tokenization splits text into tokens, usually words, so that "quick fox" can match a title containing both.

Normalization maps tokens to a standard form: lowercasing, stemming ("foxes" becomes "fox"), or treating synonyms as one word. Stop words, the common ones like "the", are removed. In Elasticsearch an analyzer is a short pipeline: optional character filters, such as stripping HTML, then exactly one tokenizer, then optional token filters such as lowercasing.

The same analysis is applied to the query, so what the user types is reduced the same way as the documents, and "Foxes leap" can match a text about "a quick fox jumps". Here is the result in PostgreSQL:

```sql
SELECT to_tsvector('english', 'a fat  cat sat on a mat - it ate a fat rats');
-- 'ate':9 'cat':3 'fat':2,11 'mat':7 'rat':12 'sat':4
```

The small words `a`, `on` and `it` are gone, `rats` became `rat`, and each word keeps its positions. Stems don't have to be real words, because the query goes through the same reduction. Analysis is also the place where search differs by language, since stemming rules and stop words belong to one language.

## Ranking: Which Match First

Matching words isn't enough, since "calculus" matches three of the six titles. The engine scores each one.

The idea behind most scoring is **tf-idf**, introduced by Karen Spärck Jones in 1972: a word counts for more when it is frequent in a document and rare in the collection. A word that is in all the documents tells you nothing.

Elasticsearch and Lucene default to a refinement called **BM25**, which is written like this, with `f` the count of a word in the document, `|D|` its length and `avgdl` the average length:

```text
score = sum over query words of
        IDF * f * (k1 + 1) / (f + k1 * (1 - b + b * |D| / avgdl))
IDF   = ln((N - n + 0.5) / (n + 0.5) + 1)
```

`N` is the number of documents and `n` the number containing the word. The parameter `k1`, usually between 1.2 and 2.0, makes repeated words count for less each time, and `b`, usually 0.75, penalizes long documents. We computed it for our six titles with `k1` of 1.2 and `b` of 0.75:

| Listing | Score for "early calculus" |
| --- | --- |
| 1, Calculus: Early Transcendentals | 1.62 |
| 4, Algorithms Notes, Early Draft | 1.06 |
| 6, Calculus Workbook | 1.01 |
| 2, Calculus Made Easy | 0.79 |

Listing 1 wins because it has both words. The next result is a surprise: listing 4, which has only "early", beats listing 6, which has "calculus" three times. That is the inverse document frequency at work.

"Early" appears in 2 of 6 titles and "calculus" in 3, so each match on "early" is worth more, 1.03 against 0.69 in our run. And three mentions don't triple the score, because of `k1`.

Searching for "calculus" alone gives another order: the workbook at 1.01, then "Calculus Made Easy" at 0.79, then listing 1 at 0.65. The short title scores higher than the long one, because of `b`.

A score is only comparable inside one query. Real systems combine it with other signals, such as price, distance or recency. PostgreSQL's ranking functions are just examples, and applications can add factors.

## Search Engines in Practice

**Apache Lucene** is the library at the center. Its site describes a fast search library in Java, with ranked search, phrase and proximity queries, faceting and vector search, and it lets documents be added while searches run. Elasticsearch and Solr, the best known search servers, are built around it.

In Elasticsearch, an index is split into shards, each a complete Lucene index holding a subset of the documents. Each document belongs to one primary shard, replicas copy the primaries for safety and read capacity, and the number of primaries is fixed when the index is created, while replicas can be changed at any time.

A query goes to the shards, each returns its best matches, and the results are merged. This is the same split as [Secondary Indexes on Sharded Data](/system-design/sharded-secondary-indexes) describes for any index spread over machines.

A search engine is usually a copy of data that lives elsewhere. The main database holds the listings, and changes are sent to the engine through a feed such as the change capture from [Cache Invalidation](/system-design/cache-invalidation) or a queue from [The Transactional Outbox](/system-design/transactional-outbox).

New documents appear in search after a short delay, not instantly. A search index shouldn't be the only copy of the data, so it should be rebuildable.

## Search Inside PostgreSQL

For a small app, the database may be enough. PostgreSQL has full text search built in. Its `tsvector` is the analyzed document, and its `tsquery` the analyzed query, and `@@` tests whether they match. The usual setup keeps the analyzed text in a generated column and indexes it with GIN, an inverted index:

```sql
ALTER TABLE books ADD COLUMN search tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(authors, ''))
  ) STORED;
CREATE INDEX books_search_idx ON books USING GIN (search);

SELECT id, title, ts_rank(search, q) AS rank
FROM books,
     websearch_to_tsquery('english', 'early calculus -workbook') AS q
WHERE search @@ q
ORDER BY rank DESC
LIMIT 20;
```

The `websearch_to_tsquery` function reads the syntax people type: words are joined with AND, a quoted phrase must match in order, `or` means either, and a leading `-` excludes a word.

It doesn't raise a syntax error, so raw user input is safe to pass. Other functions highlight matches (`ts_headline`) and rank them, with the caveat that ranking has to read each matching document and can be slow on large result sets.

What the search that comes with PostgreSQL lacks is mostly polish: it has no spelling correction, and similarity matching needs an extension such as `pg_trgm`.

## Choosing

Start in the database you have. PostgreSQL search is enough while the data is modest and a ranking that is good enough will do. The usual reasons to add a search engine are:

- **Relevance work**: Boosting titles over descriptions, synonyms, and tuning by what students click
- **Forgiving queries**: Typos, autocomplete and "did you mean"
- **Facets**: Counts by subject, campus and price range next to the results
- **Volume**: A collection too large, or a query rate too high, for the main database

Each is a cost in return: another system to run, a delay in updates and a feed that can fall behind, so decide based on a need you have measured. The same question for other kinds of data comes next in [Time Series Databases](/system-design/time-series).

## Key Points

- An inverted index maps each word to the documents that contain it, so a search is a lookup and a merge of sorted lists, not a scan
- Analysis tokenizes, lowercases, stems and drops stop words, for both documents and queries
- Ranking, usually BM25, favors words that are frequent in a document and rare overall, and penalizes length
- <u>A search engine is a rebuildable copy</u>, fed from the main database, which shards its index like any other
- Start with PostgreSQL full text search, and add an engine for relevance tuning, typo tolerance, facets or volume
