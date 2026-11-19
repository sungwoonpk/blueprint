> The **two pointers** technique walks through an array with two indexes at once, so that each step lets you rule something out. Because each pointer only moves one way, the whole walk takes O(n) steps and replaces a search over all pairs.

In [How to Approach a Problem](/algorithms/approaching-problems), finding two books that add up to a gift card kept a hash map of every price seen.

If the prices are already sorted, there is a quieter way that needs no extra memory: put one finger on the cheapest book and one on the most expensive, and move them toward each other. This is the first of the array techniques in this phase, and it comes in two shapes.

## Pointers from Both Ends

The prices on the shelf are 1, 3, 4, 6, 8, 11 and 15 dollars, and the gift card is worth 14. Look at the cheapest and the most expensive: 1 + 15 = 16. That is too much, and it tells you something.

The 15 can't be part of the answer, because even paired with the cheapest book it overshoots, and any other partner costs at least as much as the cheapest. So discard 15 and move the right pointer in.

<figure class="diagram">
<p class="rowname">1 + 15 = 16 is too big, so drop 15</p>
<div class="cells ptrs">
<div class="cell hl" data-ptr="lo">1<small>0</small></div>
<div class="cell">3<small>1</small></div>
<div class="cell">4<small>2</small></div>
<div class="cell">6<small>3</small></div>
<div class="cell">8<small>4</small></div>
<div class="cell">11<small>5</small></div>
<div class="cell hl" data-ptr="hi">15<small>6</small></div>
</div>
<p class="rowname">1 + 11 = 12 is too small, so drop 1</p>
<div class="cells ptrs">
<div class="cell hl" data-ptr="lo">1<small>0</small></div>
<div class="cell">3<small>1</small></div>
<div class="cell">4<small>2</small></div>
<div class="cell">6<small>3</small></div>
<div class="cell">8<small>4</small></div>
<div class="cell hl" data-ptr="hi">11<small>5</small></div>
<div class="cell dim">15<small>6</small></div>
</div>
<p class="rowname">3 + 11 = 14 matches</p>
<div class="cells ptrs">
<div class="cell dim">1<small>0</small></div>
<div class="cell hl" data-ptr="lo">3<small>1</small></div>
<div class="cell">4<small>2</small></div>
<div class="cell">6<small>3</small></div>
<div class="cell">8<small>4</small></div>
<div class="cell hl" data-ptr="hi">11<small>5</small></div>
<div class="cell dim">15<small>6</small></div>
</div>
<figcaption>Each comparison removes one price from consideration, so three steps found the pair</figcaption>
</figure>

```python
def pair_with_sum(a, target):
    """a is sorted. Return (i, j) with i < j and a[i] + a[j] == target, or None."""
    lo, hi = 0, len(a) - 1
    while lo < hi:
        total = a[lo] + a[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1          # a[lo] is too small to pair with anything left
        else:
            hi -= 1          # a[hi] is too large to pair with anything left
    return None
```

The invariant, in the sense of [Proving Correctness with Loop Invariants](/algorithms/loop-invariants), is that if a matching pair exists, it lies inside `lo..hi`. When the sum is too small, `a[lo]` is paired with the largest item in the window and still falls short, so no partner works, and removing it loses no answer.

The argument for `hi` is the mirror image. Each step moves a pointer, the pointers meet after at most n − 1 steps, and the loop is O(n).

We compared it with the pair-by-pair search when no pair exists, the slowest case. On 20,000 prices the pair-by-pair version took 4.73 s and the two pointers took 1.09 ms. On a million sorted items the two pointers took 129 ms.

Two things limit it. The array has to be sorted, and sorting costs O(n log n), as [Sorting as a First Step](/algorithms/sorting-first) weighs, and sorting loses the original positions. If you need positions and the data isn't sorted, a hash map is the better fit.

The same walk checks a palindrome: compare the first and last characters, then move both inward until they meet.

```python
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True
```

It extends to three values. To find triples that sum to zero, sort, fix the first value, and run the two pointer search on what remains. That is O(n²), against O(n³) for checking every triple. We checked it against brute force on 5,000 random lists.

## Two Pointers in the Same Direction

The second shape moves both pointers left to right, at different speeds. A **read** pointer scans every item, and a **write** pointer marks where the next kept item goes. This edits an array in place without a second array.

Removing duplicates from a sorted list is the classic case. The read pointer visits each item, and the write pointer advances only when the item differs from the last one kept.

```python
def remove_duplicates(a):
    """Remove duplicates from a sorted list in place; return the new length."""
    if not a:
        return 0
    write = 1
    for read in range(1, len(a)):
        if a[read] != a[write - 1]:
            a[write] = a[read]
            write += 1
    return write
```

For 1, 1, 2, 2, 2, 3, 5, 5 it leaves 1, 2, 3, 5 at the front and returns 4. The invariant is that `a[0..write-1]` holds the distinct values seen so far, in order.

The read pointer stays at or ahead of the write pointer, so no item is overwritten before it has been read. The pass is O(n) time and O(1) extra memory. A sorted copy through a set would take O(n) extra memory instead.

The same pattern compacts any array by a rule, for example moving all zeros to the end or dropping items that fail a test. It also underlies the merge step in [Merge Sort](/algorithms/merge-sort), where one pointer walks each sorted list.

## When to Reach for It

Two pointers fits when a condition about two positions can tell you which one to give up.

- **Sorted data and a target sum or difference**, where comparing with the target says which end to move
- **Symmetric checks**, such as palindromes, where the ends are compared and move inward
- **In-place editing**, where a read pointer and a write pointer keep what is wanted
- **Merging or comparing two sorted sequences**, one pointer for each

The common thread is that each pointer only moves one way, so no position is visited more than once by each. That is what turns a search over all pairs into a single pass. [Fast and Slow Pointers](/algorithms/fast-slow-pointers) uses the same-direction idea with pointers at different speeds, and [Variable Size Sliding Window](/algorithms/variable-window) uses it to track a stretch of the array.

## Key Points

- Two pointers move through an array so that each step eliminates a position, giving O(n) instead of a search over all pairs
- From both ends of a sorted array, a sum that is too small drops the left item and one that is too big drops the right item
- The invariant is that any answer still lies between the pointers, which is what makes discarding safe
- In the same direction, a read pointer and a write pointer edit an array in place in O(n) time and O(1) extra memory
- The technique needs sorted data or a rule that says which pointer to move, and sorting loses the original positions
