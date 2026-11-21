> A sort is **stable** if items with equal keys stay in their original order. A **comparator** is the rule a sort uses to decide which of two items comes first, and it has to follow a few consistency rules or the sort can misbehave.

A class list is sorted by name. The instructor clicks "sort by grade", and expects students with the same grade to stay in alphabetical order. They do if the sort is stable, and they get shuffled if it is not. The gap between those two outcomes is small to describe and easy to miss until a table on a screen looks wrong.

## Why Stability Matters

Here are six students, already in name order, with their grades under the names. Two sorts by grade give different lists.

<figure class="diagram">
<p class="rowname">Start, sorted by name</p>
<div class="cells">
<div class="cell hl">Ana<small>90</small></div>
<div class="cell">Ben<small>85</small></div>
<div class="cell">Cy<small>90</small></div>
<div class="cell">Dee<small>85</small></div>
<div class="cell">Eli<small>90</small></div>
<div class="cell">Fay<small>70</small></div>
</div>
<p class="rowname">Stable sort by grade</p>
<div class="cells">
<div class="cell">Fay<small>70</small></div>
<div class="cell">Ben<small>85</small></div>
<div class="cell">Dee<small>85</small></div>
<div class="cell hl">Ana<small>90</small></div>
<div class="cell">Cy<small>90</small></div>
<div class="cell">Eli<small>90</small></div>
</div>
<p class="rowname">Unstable sort by grade</p>
<div class="cells">
<div class="cell">Fay<small>70</small></div>
<div class="cell">Ben<small>85</small></div>
<div class="cell">Dee<small>85</small></div>
<div class="cell">Cy<small>90</small></div>
<div class="cell">Eli<small>90</small></div>
<div class="cell hl">Ana<small>90</small></div>
</div>
<figcaption>Both rows are sorted by grade. The stable sort keeps Ana, Cy and Eli in name order, and the unstable one, here selection sort, moved Ana to the end</figcaption>
</figure>

Stability turns a sort into a building block for multi-key sorting. To order by grade with ties broken by name, sort by the secondary key first and then by the primary key, with a stable sort each time. The second sort leaves ties as the first one left them.

```python
students.sort(key=lambda s: s.name)      # secondary key first
students.sort(key=lambda s: s.grade)     # then the primary key, stable
```

This is the same trick that makes radix sort work, as [Counting, Radix and Bucket Sort](/algorithms/linear-time-sorting) shows, where every digit pass relies on the pass before it keeping its order. A key made of a tuple gets the same result in one pass: `key=lambda s: (s.grade, s.name)`. For a descending grade with ascending names, use `(-s.grade, s.name)`.

Which sorts are stable depends on how they are written.

| Stable | Not Stable |
| --- | --- |
| Insertion sort | Selection sort |
| Bubble sort | Quick sort |
| Merge sort, taking the left item on ties | Heap sort |
| Counting sort, in its stable form | |

If you are handed an unstable sort and need stability, attach each item's original position and use it to break ties. The key `(grade, position)` doesn't tie, so the order of equal grades can't change.

## Writing Comparators

Python's sorts take a key function: it maps each item to a value, and the sort compares those values. The key function is called once for each item, which is cheaper than calling a comparison for each pair.

Other languages use a **comparator** instead, a function of two items that returns a negative number if the first comes first, zero if they tie and a positive number if the second comes first. Python can use one through `functools.cmp_to_key`.

Here is the grade-descending, name-ascending order in Go, which takes a comparator. The sort is `slices.SortFunc`, and a stable variant, `slices.SortStableFunc`, is available.

```go
slices.SortFunc(students, func(a, b Student) int {
    if c := cmp.Compare(b.Grade, a.Grade); c != 0 {
        return c                          // higher grade first
    }
    return cmp.Compare(a.Name, b.Name)    // then by name
})
```

A comparator that checks one key and falls through to the next on a tie is the usual shape. Java builds the same thing from pieces: `Comparator.comparingInt(...)` for the first key, and `thenComparing(...)` for each later one.

## The Comparator Contract

A sort relies on the comparator behaving like a true ordering. Three rules matter.

- **Opposite answers for swapped arguments**: if comparing a with b says a comes first, comparing b with a must say b comes second
- **Transitive**: if a comes before b and b comes before c, then a comes before c
- **Ties are consistent**: equal items give equal answers against any third item, and an item must tie with itself

The sort will usually not notice a violation. It just produces output that depends on which comparisons it happens to make. Here are four bugs that break the contract.

| Bug | What Goes Wrong | Fix |
| --- | --- | --- |
| Returning `a - b` for integers | The subtraction can overflow and flip the sign | Compare with `<` and `>` and return the result |
| Using `<=` so that equal items say "first" | Equal items are ordered both ways, and stable order is lost | Return zero for ties |
| Sorting floats that contain NaN | NaN is neither smaller nor larger than anything | Remove NaN first, or give it a fixed place |
| A rule that isn't transitive | The result depends on the input order | Define a real ordering |

We reproduced each in turn.

**Subtraction.** With 32 bit integers, 2,000,000,000 minus −2,000,000,000 should be 4,000,000,000, which does not fit, so it wraps around to −294,967,296. A comparator that returns the difference says the larger number is smaller. Sorting 2,000,000,000, −2,000,000,000, 5 and 0 with it gave 0, 2,000,000,000, −2,000,000,000, 5. Python's integers don't overflow, so we emulated 32 bit arithmetic, which is what Java's `int` uses.

**Less or equal.** We sorted the records (1, a), (1, b), (1, c), (0, d), (1, e) by their first value with a comparator that returned "first" on ties. The result was (0, d), (1, e), (1, c), (1, b), (1, a), with the equal items in reverse order, where a stable sort keeps them in the order a, b, c, e. Some libraries react more harshly. Java's documentation says a sort may throw an exception when it detects a comparator that breaks the contract, and Rust's may panic.

**NaN.** `sorted([3, nan, 1, 2])` in Python returns `[3, nan, 1, 2]`, which is not sorted, and other input orders give other nonsense, because every comparison with NaN is false. The documentation for Python's sorting advises removing NaN values first.

**Not transitive.** Rock beats scissors, scissors beats paper and paper beats rock. Sorting those three words with that rule gave three different outputs from the six possible input orders, since there is no true order to find.

## Stability Across Languages

Libraries differ in what they promise, and the differences matter when you port code.

| Language | Stable | Not Guaranteed Stable |
| --- | --- | --- |
| Python | All its sorts | None |
| Java | Sorting objects | Sorting primitives, where equal values look alike |
| Go | `sort.SliceStable`, `slices.SortStableFunc` | `sort.Slice`, `slices.SortFunc` |
| Rust | `sort`, `sort_by` | `sort_unstable` |
| C++ | `std::stable_sort` | `std::sort` |

Unstable sorts can be faster and avoid extra memory, and some languages default to them. When equal keys are distinguishable and order matters, choose the stable one on purpose, as [How Standard Library Sorts Work](/algorithms/library-sorts) explains.

## Key Points

- A stable sort keeps equal items in their original order, which lets you sort by several keys with one stable pass for each, starting from the least important
- Insertion, bubble and merge sort are stable, and selection, quick and heap sort aren't
- A comparator returns negative, zero or positive, and it must be opposite when its arguments swap, transitive, and zero for an item compared with itself
- Four common bugs are returning `a - b`, using `<=`, sorting NaN and using a rule that is not transitive
- Defaults differ between languages, so check whether a library promises stability before depending on it
