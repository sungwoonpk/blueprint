> **Selection sort**, **insertion sort** and **bubble sort** are the simple sorts: each uses two nested loops and takes O(n²) time in the worst case. They sort in place and are easy to get right, and insertion sort is also very fast on data that is nearly sorted already.

The registrar prints the day's check-in list, and you want it sorted by arrival time. You already know how to do it by hand: put the cards in order the way you would sort a hand in a card game. These three algorithms are three ways of turning that habit into a loop, and each shows a different idea about what "sorted so far" means.

## Selection Sort

Selection sort grows a sorted section at the front. Each round, find the smallest item in the unsorted part and swap it into the first unsorted position.

```python
def selection_sort(a):
    for i in range(len(a) - 1):
        smallest = i
        for j in range(i + 1, len(a)):
            if a[j] < a[smallest]:
                smallest = j
        a[i], a[smallest] = a[smallest], a[i]
```

The invariant, in the sense of [Proving Correctness with Loop Invariants](/algorithms/loop-invariants), is that `a[0..i-1]` holds the i smallest items in order. Each round extends it by one, so when the loop ends the whole list is sorted.

Finding the smallest means looking at every remaining item, so the number of comparisons doesn't depend on the input. For 1,000 items it was 499,500 comparisons whether the list was sorted, random or reversed. What it saves is writing: at most one swap per round, 992 swaps for a random list of 1,000.

Selection sort is also not stable. Take the records (2, a), (2, b), (1, c). The first round swaps (1, c) with the front item, which sends (2, a) to the back, and the result puts (2, b) before (2, a). Equal keys changed order, a property that [Stable Sorts and Custom Comparators](/algorithms/stable-sorts-comparators) explains.

## Insertion Sort

Insertion sort also grows a sorted section at the front, but it takes the next item and slides it left past larger items until it fits. This is how most people sort a hand of cards.

```python
def insertion_sort(a):
    for i in range(1, len(a)):
        current = a[i]
        j = i - 1
        while j >= 0 and a[j] > current:
            a[j + 1] = a[j]          # shift the larger item right
            j -= 1
        a[j + 1] = current
```

Here is a run on 5, 2, 4, 6, 1, 3. The shaded cells are the sorted section, and the outlined cell is the item just inserted.

<figure class="diagram">
<p class="rowname">Insert 2</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">5</div>
<div class="cell">4</div>
<div class="cell">6</div>
<div class="cell">1</div>
<div class="cell">3</div>
</div>
<p class="rowname">Insert 4</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">4</div>
<div class="cell done">5</div>
<div class="cell">6</div>
<div class="cell">1</div>
<div class="cell">3</div>
</div>
<p class="rowname">Insert 6</p>
<div class="cells">
<div class="cell done">2</div>
<div class="cell done">4</div>
<div class="cell done">5</div>
<div class="cell done">6</div>
<div class="cell">1</div>
<div class="cell">3</div>
</div>
<p class="rowname">Insert 1</p>
<div class="cells">
<div class="cell done">1</div>
<div class="cell done">2</div>
<div class="cell done">4</div>
<div class="cell done">5</div>
<div class="cell done">6</div>
<div class="cell">3</div>
</div>
<p class="rowname">Insert 3</p>
<div class="cells">
<div class="cell done">1</div>
<div class="cell done">2</div>
<div class="cell done">3</div>
<div class="cell done">4</div>
<div class="cell done">5</div>
<div class="cell done">6</div>
</div>
<figcaption>Each row is the list after one more item has been slid into the sorted section on the left</figcaption>
</figure>

The invariant is the same as for selection sort in one respect and different in another: `a[0..i-1]` is sorted, but it holds the first i items of the original list, not the i smallest.

The work depends on how far items slide. An **inversion** is a pair of items that is out of order, such as 5 before 2. Each shift in the inner loop removes exactly one inversion, so the number of shifts equals the number of inversions, and the comparisons are those plus about one for each item. A sorted list has none, and a reversed list has the most, n(n − 1)/2.

We counted for 1,000 items: 999 comparisons for a sorted list, 250,553 for a random one, as the mean of 20 random lists, and 499,500 for a reversed one. The same pattern shows on a list that is almost sorted. We took 10,000 sorted items and swapped 100 pairs, each up to 20 positions apart.

That created 2,037 inversions, and insertion sort made 12,039 comparisons, about 1.2 for each item. It is **adaptive**: its cost follows how disordered the input is. It is also stable, since it doesn't move an item past an equal one.

## Bubble Sort

Bubble sort compares neighbors and swaps them if they are out of order, sweeping across the list again and again. Each sweep carries the largest remaining item to the end, as a bubble rises.

```python
def bubble_sort(a):
    for end in range(len(a) - 1, 0, -1):
        swapped = False
        for j in range(end):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break                      # a clean sweep means it is sorted
```

After the first sweep, the largest item is at the end, after the second sweep the two largest are, and so on, so each sweep covers one fewer position. The early exit ends the loop when a sweep makes no swaps, which makes a sorted list cost only n − 1 comparisons.

Every swap of neighbors fixes exactly one inversion, so bubble sort swaps as many times as insertion sort moves items. But it compares many more pairs on random data: 498,539 comparisons for 1,000 random items, against 250,553 for insertion sort, both as means of 20 lists.

## Side by Side

We counted comparisons and moves for 1,000 items, where a move is a swap for selection and bubble sort and a shift for insertion sort. The random row is the mean of 20 random lists.

| Input | Selection Sort | Insertion Sort | Bubble Sort |
| --- | --- | --- | --- |
| Sorted | 499,500 compares, 0 swaps | 999 compares, 0 shifts | 999 compares, 0 swaps |
| Random | 499,500 compares, 992 swaps | 250,553 compares, 249,560 shifts | 498,539 compares, 249,560 swaps |
| Reversed | 499,500 compares, 500 swaps | 499,500 compares, 499,500 shifts | 499,500 compares, 499,500 swaps |

On 2,000 random items in Python, selection sort took 54 ms, insertion sort 59 ms and bubble sort 120 ms. The three are quadratic, so doubling the list size roughly quadruples the work.

| | Stable | Adaptive | Writes |
| --- | --- | --- | --- |
| Selection sort | No | No | At most n − 1 swaps |
| Insertion sort | Yes | Yes | One shift for each inversion |
| Bubble sort | Yes | A little, with the early exit | One swap for each inversion |

## When to Use Which

For anything large, use the algorithms in the next articles, which take O(n log n). The simple sorts still have uses.

- **Short lists**: for a few dozen items, insertion sort's tiny overhead beats the cleverer algorithms. Python's built-in sort, for instance, sorts short stretches with a version of it, as [How Standard Library Sorts Work](/algorithms/library-sorts) shows
- **Nearly sorted data**: insertion sort runs in close to linear time when each item is near its place, as when you add a few new entries to a list that is already sorted
- **Writes are expensive**: selection sort makes at most n − 1 swaps, which matters when each write is costly, as with memory that wears out when it is written
- **Teaching**: they show invariants and counting cleanly, which is why this page started with them

Bubble sort has no clear job. Insertion sort does less work for the same result, so it is rarely the right choice outside a classroom.

## Key Points

- Selection sort swaps the smallest remaining item to the front, costs about n²/2 comparisons on any input, and makes at most n − 1 swaps
- Insertion sort slides each item into a sorted prefix, is stable, and costs about the number of inversions plus n
- Bubble sort swaps neighbors until a clean sweep, and swaps as many times as there are inversions, with more comparisons than insertion sort
- All three take O(n²) time in the worst case and sort in place
- Insertion sort is the one worth using, for short lists and for data that is nearly sorted
