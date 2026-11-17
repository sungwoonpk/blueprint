> A **probabilistic data structure** answers a question approximately, using far less memory than an exact answer would take. A **Bloom filter** answers "is it in the set?", and **sketches** answer "how often?" and "how many different?".

[LSM Trees](/system-design/lsm-trees) needed a cheap way to avoid reading a file that can't hold a key. The textbook app has similar questions at a larger scale: has this student already seen this listing, which listings are trending, and how many different students viewed a listing today? Exact answers mean remembering every student and every view.

These structures give up a little accuracy, in a direction you can predict, and shrink the memory by orders of magnitude.

## Bloom Filter: Probably Yes, Definitely No

Burton Bloom devised the filter in 1970. It is an array of bits, all zero at first, and several hash functions. To add an item, you hash it with each function and set the bits at those positions.

To ask whether an item is in the set, you check the same positions. If any bit is 0, the item was never added: a certain "no". If all are 1, the item was probably added, though other items may have set those same bits by chance.

<figure class="diagram">
<svg viewBox="0 0 320 196" role="img" aria-label="Three rows of a 16 bit array. After adding calculus, bits 2, 7 and 11 are set. Asking about linear checks bits 2, 5 and 11, and bit 5 is empty, so the answer is definitely not. Asking about algorithms checks bits 2, 7 and 11, which are all set, so the answer is maybe, which here is a false positive." style="width:100%;max-width:360px;height:auto;display:block;margin:0 auto">
<text x="16" y="16" font-size="11" style="fill:var(--muted)">After adding calculus (bits 2, 7, 11)</text>
<rect x="16" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="34" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="52" y="22" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--border)" stroke-width="1.2"/>
<rect x="70" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="88" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="106" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="124" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="142" y="22" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--border)" stroke-width="1.2"/>
<rect x="160" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="178" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="196" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="214" y="22" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--border)" stroke-width="1.2"/>
<rect x="232" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="250" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="268" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="286" y="22" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<text x="16" y="80" font-size="11" style="fill:var(--muted)">Ask linear (bits 2, 5, 11): bit 5 is empty, so no</text>
<rect x="16" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="34" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="52" y="86" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--accent)" stroke-width="2.2"/>
<rect x="70" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="88" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="106" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--accent)" stroke-width="2.2"/>
<text x="114.0" y="101" font-size="12" font-weight="700" text-anchor="middle" style="fill:var(--accent)">×</text>
<rect x="124" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="142" y="86" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--border)" stroke-width="1.2"/>
<rect x="160" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="178" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="196" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="214" y="86" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--accent)" stroke-width="2.2"/>
<rect x="232" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="250" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="268" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="286" y="86" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<text x="16" y="144" font-size="11" style="fill:var(--muted)">Ask algorithms (bits 2, 7, 11): all set, so maybe</text>
<rect x="16" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="34" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="52" y="150" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--accent)" stroke-width="2.2"/>
<rect x="70" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="88" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="106" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="124" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="142" y="150" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--accent)" stroke-width="2.2"/>
<rect x="160" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="178" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="196" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="214" y="150" width="16" height="22" rx="3" style="fill:var(--accent);stroke:var(--accent)" stroke-width="2.2"/>
<rect x="232" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="250" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="268" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
<rect x="286" y="150" width="16" height="22" rx="3" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.2"/>
</svg>
<figcaption>Adding sets bits, and asking checks them: any empty bit means no</figcaption>
</figure>

The figure uses 16 bits and 3 hash functions. After adding "calculus", bits 2, 7 and 11 are set. Asking about "linear" checks bits 2, 5 and 11, and bit 5 is empty, so the answer is a sure no.

Asking about "algorithms" checks bits 2, 7 and 11, the same bits that "calculus" set, so the filter says "maybe". That is a **false positive**, since "algorithms" was never added. In a real filter the bits come from many items, so such coincidences are rare, and they are the price of the small size.

The guarantees are plain. There are no false negatives, and a standard filter can't delete an item, since clearing a bit could erase other items. A counting variant exists for that.

The error rate follows from the size. For `m` bits, `n` items and `k` hash functions it is about `(1 - e^(-kn/m))^k`, and the best `k` is `(m/n) * ln 2`.

The math gives a rule of thumb: about 9.6 bits per item for a 1 percent error rate, and about 4.8 more bits for each tenfold drop. We built filters for 100,000 listing ids and measured the rate on 100,000 ids that were never added:

| Bits per Item | Hash Functions | Measured False Positives | Memory |
| --- | --- | --- | --- |
| 5 | 3 | 9.4% | 61 KiB |
| 10 | 7 | 0.78% | 122 KiB |
| 15 | 10 | 0.08% | 183 KiB |

The measured values match the formula, and the memory is small: 100,000 ids stored as 8 byte numbers would take at least 780 KiB, and the filter doesn't store the ids at all, so it can't list them either.

The right place for a Bloom filter is in front of something costly, where a false positive only costs a wasted check.

Databases such as Bigtable, HBase and Cassandra use them to cut disk lookups for rows that don't exist. Another use is a username check before touching the main database. In Redis the commands are short:

```text
BF.RESERVE seen:student:8 0.01 10000
BF.ADD seen:student:8 listing:17
BF.EXISTS seen:student:8 listing:17
```

The first line asks for a 1 percent error rate for up to 10,000 items. Going past the planned capacity makes the error rate grow, so size it for what you expect.

## Count-Min Sketch: How Often?

A Bloom filter says whether an item is present. A **count-min sketch** says how many times it appeared. It is a grid of counters with `d` rows and `w` columns, and one hash function per row.

To record an item, you add 1 to one counter in each row, the one its hash picks. To ask for a count, you read those same counters and take the smallest.

Collisions only ever add to a counter, so the smallest value is an overestimate, never an underestimate.

The guarantee: the estimate is at most the true count plus `ε` times the total number of events, with probability `1 - δ`, when `w` is `e/ε` and `d` is `ln(1/δ)`, rounded up. Graham Cormode and S. Muthukrishnan introduced it.

We recorded 300,000 listing views, with a few popular listings and a long tail, into sketches of three sizes, each 4 rows deep. The most viewed listing had 30,905 views:

| Counters | Overcount, Top 10 Listings | Overcount, Listings With 3 Views or Fewer |
| --- | --- | --- |
| 800 | 528 on average, of about 9,000 views | 574 |
| 4,000 | 49 | 68 |
| 20,000 | 4.4 | 4.3 |

The popular listings are easy: even the smallest sketch is off by under 6 percent for them. The rare ones are another matter, since a count of 3 reported as 577 is useless.

Counts below the error times the total should be treated as noise. A sketch finds heavy hitters well and small counts poorly, so it suits questions like "which listings are trending?".

For that question there is a ready made combination, the top-K structure that Redis offers, based on an algorithm called HeavyKeeper, which tracks the K most frequent items with a small table and a heap.

One honest note: in our toy example, with 9,915 distinct listings, an exact dictionary is small enough. Sketches pay off when the items are millions or billions, such as search queries or IP addresses.

## HyperLogLog: How Many Different?

Counting unique students exactly means remembering every id seen. **HyperLogLog** estimates the count in a tiny, fixed amount of memory, using an observation about random bits. Hash each id into random bits.

Half of the hashes start with a 0, a quarter with 00, and so on, so seeing a hash that starts with ten zeros suggests about 1,000 ids were hashed, as long runs of heads suggest many coin flips.

One run is a noisy guess, so the structure splits the ids into `m` groups by the first bits of the hash, remembers the longest run of leading zeros seen in each group, and combines the groups with an average.

The typical error is `1.04 / √m`, and about 1.5 kB is enough for 2 percent accuracy on counts beyond a billion. Flajolet and his colleagues published it in 2007.

We counted 200,000 distinct student ids, five times with different ids:

| Registers | Memory | Average Error |
| --- | --- | --- |
| 1,024 | About 770 bytes | 1.6% |
| 4,096 | About 3 KB | 0.9% |

An exact list of the 200,000 ids as 8 byte numbers would take about 1.5 MiB. Redis's implementation reports a standard error of 0.81 percent in at most 12 KB, however many items it sees.

Two sketches can be merged by taking the larger value in each group, so the union is counted without double counting. The textbook app's version of the commands:

```text
PFADD viewers:listing:17 student:3 student:8
PFADD viewers:listing:18 student:8 student:12
PFMERGE viewers:books viewers:listing:17 viewers:listing:18
PFCOUNT viewers:books
```

The last line prints 3, since student 8 appears in both. A sketch holds no ids, which helps with privacy where storing visitor identifiers is restricted.

## Choosing and Limits

| Question | Structure | The Answer Is | One Mistake It Won't Make |
| --- | --- | --- | --- |
| Is this item in the set? | Bloom filter | Maybe, or definitely not | A false no for an item that was added |
| How often did it occur? | Count-min sketch | A count that may be too high | A count that is too low |
| How many different items? | HyperLogLog | An estimate within about 1 to 2 percent | None, it can err in either direction |

Some rules keep them safe. Size them for the number of items you expect. Use them where an error costs little, such as an extra disk read or a number on a dashboard, and not where it costs a lot: whether a payment has already been processed needs an exact record.

Remember what they can't do: none of them lists its items, and a standard Bloom filter can't delete. When deletion matters, a cuckoo filter, which Redis also offers, supports it, and a digest structure such as a t-digest answers percentile questions.

The same idea, trading a little accuracy for a lot of memory, drives the storage layout in the last topic of this phase, [Columnar Storage](/system-design/column-storage).

## Key Points

- A Bloom filter says "definitely not" or "maybe", with no false negatives, and about 10 bits per item gives a rate under 1 percent
- A count-min sketch estimates how often items occur and never undercounts, which suits heavy hitters and not rare items
- HyperLogLog counts distinct items in hundreds of bytes or a few KB, with an error of a percent or two
- <u>Use them where a small, one directional error is cheap</u>, in front of a costly lookup or on a dashboard
- Size them for the expected load, and don't use them for answers that must be exact
