> A standard library sort is usually a **hybrid**: it combines several algorithms and switches between them by the size and shape of the data. Python sorts with Timsort, a stable merge sort that takes advantage of order already present in the data, and many languages use a quick sort variant when stability isn't needed.

You have now seen insertion sort, merge sort and quick sort, each strong in one place and weak in another. Calling `sorted()` or `Arrays.sort()` doesn't make you choose. The library has already chosen, and not one algorithm but a blend, tuned over years. Looking inside shows how the ideas in this chapter fit together.

## Why a Blend

Each algorithm has a job it does best.

| Algorithm | Strength | Weakness |
| --- | --- | --- |
| Insertion sort | Fast on short or nearly sorted data | Quadratic on large random data |
| Merge sort | Guaranteed n log n, stable | Extra memory for the merge |
| Quick sort | Fast in practice, sorts in place | Not stable, and can degrade to n² |

A library wants all the strengths: n log n on any input, speed on small and nearly sorted data, and either stability or low memory depending on the type. So it mixes.

## Timsort: Using the Order That Is Already There

Python's `list.sort` and `sorted` use **Timsort**, written by Tim Peters for CPython. Its observation is that real data often contains stretches that are already in order, such as a log file that is mostly chronological, or a list with a few items added at the end. Timsort finds those stretches and merges them instead of sorting from scratch. It has four moves.

**Find runs.** A **run** is a stretch that is already in order, ascending or descending. A descending run is reversed in place to make it ascending. Here are nine numbers.

<figure class="diagram">
<p class="rowname">The data, split into runs</p>
<div class="cells">
<div class="cell done">1</div>
<div class="cell done">3</div>
<div class="cell done">5</div>
<div class="cell done">9</div>
<div class="cell">7</div>
<div class="cell">4</div>
<div class="cell">2</div>
<div class="cell done">6</div>
<div class="cell done">8</div>
</div>
<p class="rowname">After reversing the descending run</p>
<div class="cells">
<div class="cell done">1</div>
<div class="cell done">3</div>
<div class="cell done">5</div>
<div class="cell done">9</div>
<div class="cell">2</div>
<div class="cell">4</div>
<div class="cell">7</div>
<div class="cell done">6</div>
<div class="cell done">8</div>
</div>
<p class="rowname">After merging the runs</p>
<div class="cells">
<div class="cell hl">1</div>
<div class="cell hl">2</div>
<div class="cell hl">3</div>
<div class="cell hl">4</div>
<div class="cell hl">5</div>
<div class="cell hl">6</div>
<div class="cell hl">7</div>
<div class="cell hl">8</div>
<div class="cell hl">9</div>
</div>
<figcaption>Three runs are found in one pass: 1, 3, 5, 9 then the descending 7, 4, 2 then 6, 8. After the middle run is reversed, merging finishes the job</figcaption>
</figure>

**Extend short runs.** In random data the runs are tiny, so Timsort stretches any run shorter than a minimum length by inserting the next items into it with a **binary insertion sort**, which is insertion sort with a binary search to find each spot. The minimum is chosen between 32 and 64 for long lists, and a list shorter than 64 is sorted entirely by binary insertion sort. This is the point from [Bubble, Selection and Insertion Sort](/algorithms/simple-sorts) and [Measuring Time and Space with Big O](/algorithms/big-o), that a quadratic sort wins on short stretches.

**Merge neighbors wisely.** Runs are merged with the stable merge from [Merge Sort](/algorithms/merge-sort), but only adjacent runs, since merging runs that aren't adjacent could reorder equal items. A policy decides which neighbors to merge and when, aiming to keep the merged pieces similar in size, which is the cheapest way to merge. A temporary array holds the smaller of the two runs being merged.

**Gallop.** When one run wins about seven comparisons in a row during a merge, Timsort assumes it will keep winning and switches to **galloping**: it searches ahead in that run with exponentially growing steps and then a binary search, so a long stretch can be copied in one move instead of compared item by item.

## What the Adaptivity Buys

We counted the comparisons Python's `sorted` made on 100,000 items in several shapes, using a class whose `<` operator counted its calls.

<figure class="chart">
<div class="hbars" role="img" aria-label="Comparisons for each item when Python sorts 100,000 items: about 15.3 for random order, 1.0 for ascending, 1.0 for descending, 1.8 for ascending with 1 percent replaced by random values, and 7.2 for 10 distinct values">
<div class="hbar peak"><span>Random Order</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">15.3</span></div>
<div class="hbar"><span>Only 10 Distinct Values</span><span class="track"><span class="fill" style="--w: 46.7%"></span></span><span class="value">7.2</span></div>
<div class="hbar"><span>Ascending, 1% Replaced</span><span class="track"><span class="fill" style="--w: 11.7%"></span></span><span class="value">1.8</span></div>
<div class="hbar"><span>Descending</span><span class="track"><span class="fill" style="--w: 6.5%"></span></span><span class="value">1.0</span></div>
<div class="hbar"><span>Ascending</span><span class="track"><span class="fill" style="--w: 6.5%"></span></span><span class="value">1.0</span></div>
</div>
<figcaption>Comparisons for each item when Python sorts 100,000 items, counted in our run</figcaption>
</figure>

On random data the count was 1,531,851, about 1% above the minimum log₂(n!) from [The Lower Bound for Comparison Sorting](/algorithms/sorting-lower-bound), so Timsort loses almost nothing there. On sorted or reversed data, and on a list of equal items, it made n − 1 comparisons, just enough to see that the list is one run. Even a list with 1% of its values replaced took under two comparisons for each item.

Time follows the same shape. Sorting a million integers took 178 ms when random, 3.2 ms when already ascending, 4.3 ms when descending and 13.7 ms when 1% had been replaced.

## The Quick Sort Family

When equal items don't need to keep their order, libraries often prefer a quick sort hybrid. The Java standard library sorts arrays of primitives such as `int` with a dual-pivot quicksort, since equal integers can't be told apart and stability means nothing. Objects go to a merge based sort, which the documentation requires to be stable. Go's `sort` package has used pattern-defeating quicksort since Go 1.19. It switches to heapsort when too many partitions are unbalanced, which guards the worst case, the safeguard described in [Quick Sort](/algorithms/quick-sort). Rust's unstable sort works the same way: it combines quick sort's typical speed with heapsort as a fallback, and runs in linear time on sorted or reversed input.

| Language | What the Standard Sort Uses |
| --- | --- |
| Python | Timsort, stable |
| Java | Stable merge based sort for objects, dual-pivot quicksort for primitives |
| Go | Pattern-defeating quicksort, with stable variants as separate functions |
| Rust | Driftsort when stable, ipnsort when unstable, since Rust 1.81 |
| C++ | The standard requires O(N log N) comparisons and leaves the algorithm to the implementation |

## What This Means for You

Use the library's sort. It has been tested on a vast range of inputs and tuned in ways that are hard to match, and it already includes the tricks above. Writing your own makes sense only for learning, or for a case the library doesn't cover, such as the linear time sorts when keys are small integers.

A few habits make the library work in your favor.

- Know whether it is stable, as in [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators), before relying on the order of ties
- Pass a key function and not a comparison when you can, because Python calls the key once for each item and not once for each comparison
- Sort once, then use the order, as the next article, [Sorting as a First Step](/algorithms/sorting-first), shows
- Expect nearly sorted data to be cheap, so re-sorting a list after a few appends costs far less than sorting a random one

Libraries also disagree about what they promise, and what to do when a comparator breaks its contract. Some detect the problem, Rust's new sorts may panic and Java's may throw an exception, and some silently return a wrong order, so the rules in the previous article matter.

## Key Points

- Library sorts are hybrids, because insertion, merge and quick sort each win in a different place
- Timsort finds runs, extends short ones with binary insertion sort, merges neighbors in a balanced way and gallops when one side keeps winning
- It makes about 1% over the minimum comparisons on random data and n − 1 on data that is already in order
- Languages that need stability for objects use merge based sorts, and unstable sorts use quick sort hybrids with a heapsort guard
- Use the library sort, know whether it is stable, and let it benefit from existing order
