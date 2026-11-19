> **Counting sort**, **radix sort** and **bucket sort** sort by looking at the values of the keys, not only by comparing pairs. When keys are small integers or spread evenly, they run in linear time, below the n log n limit that applies to comparison sorts.

The registrar has to rank 1,000,000 students by their exam score, a whole number from 0 to 100. A comparison sort would spend about 20 comparisons on each student. But there are only 101 possible scores. Instead of comparing two students, we can ask a different question: how many students got each score? The answer tells us where everyone goes.

## Counting Sort

The [lower bound](/algorithms/sorting-lower-bound) says comparison sorts need n log n steps, and the way around it is to use the key itself as information. **Counting sort** works when keys are integers in a small range 0 to k − 1.

1. Count how many items have each key
2. Turn the counts into starting positions: the first output slot for key 0 is 0, for key 1 it is the count of key 0, and so on
3. Go through the items in order, and put each in the next free slot for its key

<figure class="diagram">
<p class="rowname">Keys</p>
<div class="cells">
<div class="cell">3</div>
<div class="cell">1</div>
<div class="cell">4</div>
<div class="cell">1</div>
<div class="cell">3</div>
<div class="cell">3</div>
<div class="cell">0</div>
<div class="cell">2</div>
</div>
<p class="rowname">How many of each key, for keys 0 to 4</p>
<div class="cells">
<div class="cell">1<small>key 0</small></div>
<div class="cell">2<small>key 1</small></div>
<div class="cell">1<small>key 2</small></div>
<div class="cell">3<small>key 3</small></div>
<div class="cell">1<small>key 4</small></div>
</div>
<p class="rowname">First output position for each key</p>
<div class="cells">
<div class="cell done">0<small>key 0</small></div>
<div class="cell done">1<small>key 1</small></div>
<div class="cell done">3<small>key 2</small></div>
<div class="cell done">4<small>key 3</small></div>
<div class="cell done">7<small>key 4</small></div>
</div>
<p class="rowname">Sorted</p>
<div class="cells">
<div class="cell hl">0</div>
<div class="cell hl">1</div>
<div class="cell hl">1</div>
<div class="cell hl">2</div>
<div class="cell hl">3</div>
<div class="cell hl">3</div>
<div class="cell hl">3</div>
<div class="cell hl">4</div>
</div>
<figcaption>The third row is a running total of the second. Key 3 starts at position 4 because 1 + 2 + 1 = 4 items have smaller keys</figcaption>
</figure>

```python
def counting_sort(items, key, k):
    """Stable sort of items whose key(item) is an integer in 0..k-1."""
    counts = [0] * (k + 1)
    for x in items:
        counts[key(x) + 1] += 1
    for v in range(k):               # counts[v] becomes the first output index for key v
        counts[v + 1] += counts[v]
    out = [None] * len(items)
    for x in items:
        out[counts[key(x)]] = x
        counts[key(x)] += 1
    return out
```

The code makes one pass over the items to count, one pass over the k counters, and one more pass over the items to place them, so it takes O(n + k) time and O(n + k) memory. Items with equal keys are placed in the order they arrive, so the sort is **stable**, and that matters in the next section. We checked it against Python's own stable `sorted` on 2,000 random lists of records.

On a million records with grades 0 to 100, our counting sort took 0.09 s and `sorted` with a key function took 0.10 s. That is close, not a runaway win. Python's built-in sort is written in C, and our counting sort runs in Python, so the algorithm's lower operation count mostly pays for the language's slower loop.

## When the Range Is Too Large

Counting sort's cost includes k, and a big range is expensive even when n is small. We sorted 1,000 numbers drawn from 0 to 9,999,999. Counting sort had to build and scan ten million counters and took 462 ms.

`sorted` took 0.06 ms, more than 7,000 times faster. Counting sort is the right tool when the range is comparable to the number of items or smaller, and the wrong tool for wide ranges. The next idea widens its reach.

## Radix Sort

What if the keys are large, like 9-digit student IDs, but they are made of small pieces, the digits? **Radix sort** sorts by one digit at a time, starting from the least significant, using counting sort for each digit. Each pass has only ten possible keys, so counting sort is cheap, and the passes combine into a full sort.

Here is the idea on six three digit IDs.

<figure class="diagram">
<p class="rowname">Start</p>
<div class="cells">
<div class="cell">413</div>
<div class="cell">205</div>
<div class="cell">318</div>
<div class="cell">120</div>
<div class="cell">407</div>
<div class="cell">219</div>
</div>
<p class="rowname">Sorted by the last digit</p>
<div class="cells">
<div class="cell">120</div>
<div class="cell">413</div>
<div class="cell">205</div>
<div class="cell">407</div>
<div class="cell">318</div>
<div class="cell">219</div>
</div>
<p class="rowname">Then by the middle digit</p>
<div class="cells">
<div class="cell">205</div>
<div class="cell">407</div>
<div class="cell">413</div>
<div class="cell">318</div>
<div class="cell">219</div>
<div class="cell">120</div>
</div>
<p class="rowname">Then by the first digit</p>
<div class="cells">
<div class="cell hl">120</div>
<div class="cell hl">205</div>
<div class="cell hl">219</div>
<div class="cell hl">318</div>
<div class="cell hl">407</div>
<div class="cell hl">413</div>
</div>
<figcaption>After each pass the list is sorted by the digits looked at so far. The rows in the middle are not sorted overall</figcaption>
</figure>

It works because of stability. After the second pass, 205 comes before 407 because their middle digits are 0 and 0 and the earlier pass had 205 first, so the tie is broken by the earlier work. The invariant: after the pass for digit j, the list is sorted by its last j digits. When the pass for the leading digit finishes, the list is sorted by all of them.

```python
def radix_sort(nums, base=10):
    biggest, exp = max(nums, default=0), 1
    while biggest // exp > 0:
        nums = counting_sort(nums, lambda x: (x // exp) % base, base)
        exp *= base
    return nums
```

With d digits in base r, radix sort makes d passes of counting sort, each O(n + r), for O(d(n + r)) in total. The base is a choice. Using base 256 splits a 32 bit number into four byte-sized digits, so four passes with 256 counters each, and the counters fit in the processor's cache.

If the numbers are at most about n to a fixed power, the number of digits stays constant and the sort is O(n). If the numbers can be astronomically large compared with n, the digit count grows and the advantage disappears.

We timed this in C, sorting random 32 bit integers with four passes of 8 bits against the standard library's `qsort`.

| Items | qsort | Radix Sort |
| --- | --- | --- |
| 100,000 | 9.1 ms | 0.9 ms |
| 1,000,000 | 80.5 ms | 3.5 ms |
| 10,000,000 | 882 ms | 36.5 ms |

The radix sort ran about 24 times faster on ten million integers. That overstates the typical gap, because `qsort` calls a function for each comparison, which a tuned sort avoids, but it shows that linear time is not only theory.

## Bucket Sort

**Bucket sort** is for numbers that are spread evenly over a known range. Divide the range into n equal buckets, drop each value into its bucket, sort each small bucket, and read the buckets in order.

```python
def bucket_sort(values):
    """Sort floats in [0, 1)."""
    n = len(values)
    buckets = [[] for _ in range(n)]
    for v in values:
        buckets[int(v * n)].append(v)
    out = []
    for b in buckets:
        for i in range(1, len(b)):       # insertion sort, fine for tiny buckets
            current = b[i]
            j = i - 1
            while j >= 0 and b[j] > current:
                b[j + 1] = b[j]
                j -= 1
            b[j + 1] = current
        out.extend(b)
    return out
```

When the values are uniform, each bucket holds about one value, and the sorting inside buckets costs a constant amount for each item in expectation, so the whole sort is O(n) on average. The risk is that the evenness assumption fails. We timed the sort above on 80,000 values.

Spread evenly, it took 13 ms. With all values squeezed into the first thousandth of the range, a thousand values piled into each bucket, and it took 766 ms, about 60 times longer. The sort gets no benefit from the buckets when they are unbalanced.

## Choosing

| Sort | Works When | Time |
| --- | --- | --- |
| Counting sort | Keys are integers in a range of size k | O(n + k) |
| Radix sort | Keys have a fixed number of digits d in base r | O(d(n + r)) |
| Bucket sort | Values are spread evenly over a known range | O(n) on average |
| Comparison sorts | Anything that can be compared | O(n log n) |

These sorts don't beat the lower bound, because they leave the comparison model by using the key's value. The price is an assumption about the keys. Without one, merge sort and quick sort are the safe defaults, and the fast ones are the right call when you know the keys are small integers, bytes, fixed length strings or evenly spread numbers.

## Key Points

- Counting sort counts how many items have each key and turns the counts into positions, in O(n + k) time for keys in a range of size k
- Radix sort sorts digit by digit from the least significant, using a stable counting sort for each, in O(d(n + r)) time
- Stability is what lets each radix pass keep the order from the earlier passes
- Bucket sort splits an evenly spread range into buckets and is O(n) on average, but slows sharply when values clump
- They need assumptions about the keys, and they get past the n log n limit by reading key values and not only comparing
