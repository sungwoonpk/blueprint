> **Using values as indices** means treating each number as the position where it belongs, so the array itself becomes the lookup table. It solves problems about missing, duplicate and misplaced numbers in O(n) time and O(1) extra memory.

A campus has lockers numbered from 1 up, and the office keeps an unsorted list of the lockers currently rented. Which is the lowest locker number that is free? A set of the rented numbers answers it, at the price of memory for the set. But each locker number says where it belongs in a list: locker 3 belongs in the third position. The list can sort itself out and be its own record.

## A Value Names Its Slot

Suppose the list has n entries, and we care about the values from 1 to n. Value v has a natural home at index v − 1: locker 1 in slot 0, locker 2 in slot 1, and so on.

Walk through the list, and whenever an entry is not at home, swap it into its home slot, which sends whatever lived there to the current position. Repeat until the current entry is home, or can't go anywhere because it is out of range or its home already holds a copy.

When this finishes, every value in 1 to n that was present sits in its home. Slots that don't hold their own value are the gaps, so the first slot `i` where `a[i] != i + 1` shows that locker `i + 1` is free.

Here it is on 3, 4, −1, 1.

<figure class="diagram">
<p class="rowname">Start</p>
<div class="cells">
<div class="cell">3<small>0</small></div>
<div class="cell">4<small>1</small></div>
<div class="cell">−1<small>2</small></div>
<div class="cell">1<small>3</small></div>
</div>
<p class="rowname">3 goes to slot 2</p>
<div class="cells">
<div class="cell">−1<small>0</small></div>
<div class="cell">4<small>1</small></div>
<div class="cell done">3<small>2</small></div>
<div class="cell">1<small>3</small></div>
</div>
<p class="rowname">4 goes to slot 3</p>
<div class="cells">
<div class="cell">−1<small>0</small></div>
<div class="cell">1<small>1</small></div>
<div class="cell done">3<small>2</small></div>
<div class="cell done">4<small>3</small></div>
</div>
<p class="rowname">1 goes to slot 0, and slot 1 doesn't hold a 2</p>
<div class="cells">
<div class="cell done">1<small>0</small></div>
<div class="cell bad">−1<small>1</small></div>
<div class="cell done">3<small>2</small></div>
<div class="cell done">4<small>3</small></div>
</div>
<figcaption>Shaded values are home. Slot 1 should hold 2 and doesn't, so 2 is the smallest missing number</figcaption>
</figure>

The −1 has no home, since it is out of range, and it gets pushed around until it rests in a slot that no valid value claimed.

```python
def first_missing_positive(a):
    """Smallest positive integer not in a, using a itself as the table. Changes a."""
    n = len(a)
    for i in range(n):
        while 1 <= a[i] <= n and a[a[i] - 1] != a[i]:
            j = a[i] - 1
            a[i], a[j] = a[j], a[i]          # send a[i] to the slot named by its value
    for i in range(n):
        if a[i] != i + 1:
            return i + 1
    return n + 1
```

The second half of the condition, `a[a[i] - 1] != a[i]`, matters. If the home slot already holds the same value, a duplicate, swapping would do nothing and the `while` would loop forever. The check says that if the home is occupied by a copy, leave this one alone.

## Why It Is Linear

There is a loop inside a loop again, and again the cost is amortized. Every swap puts one value into its final home, where it stays, and a value in its home is not moved again.

There are at most n values that can be at home, so there are at most n swaps in total, whatever the order. The scan costs n more. On a million entries our run did 999,985 swaps, just under n.

We compared the function with a version that builds a set, on 5,000 random lists including negative numbers, zeros and duplicates. Both returned the same answers. For 3, 4, −1, 1 it returns 2, for 1, 2, 0 it returns 3, and for 7, 8, 9 it returns 1.

The memory is the point. The set version needed about 50 MB at a million entries, and the in-place version used none. In Python, the set version was faster, 52 ms against 0.40 s, because its loop runs inside the language's fast built-in code. The in-place method is for when memory is the limit, or when you are not allowed to allocate.

## Other Tricks with the Same Idea

**Marking presence with signs.** To find the values that appear twice in a list of n numbers from 1 to n, where each value appears once or twice, use each value as an index and mark that slot by making its number negative. If the slot is already negative, the value was seen before.

```python
def find_duplicates(a):
    """a has n numbers, each in 1..n; return those that appear twice. Changes a."""
    out = []
    for v in a:
        i = abs(v) - 1
        if a[i] < 0:
            out.append(abs(v))
        else:
            a[i] = -a[i]
    return out
```

The sign is a free flag that rides along with the number, so the list doubles as a record of which values have been seen. We compared it with counting on 5,000 random lists. Afterward, restore the list by taking absolute values if the caller needs it.

**Arithmetic.** If a list holds the n distinct numbers from 0 to n with one missing, the total of 0 to n is n(n + 1)/2, so the missing number is that total minus the sum of the list. A variation with the XOR operation, covered in [XOR Tricks](/algorithms/xor), avoids large sums.

**Counting with an array.** When values are small integers, a plain array indexed by value counts them, as in [Counting, Radix and Bucket Sort](/algorithms/linear-time-sorting). That is the same idea in the gentlest form: the value picks the slot.

## When It Applies

The idea needs three things.

- **Values in a known range** that matches the array's indexes, such as 1 to n, so that every value has a slot
- **Permission to change the array**, or a copy to change. Some of these methods scramble the order, and the sign method flips signs and has to be undone
- **A reason to avoid extra memory**, because a set or dictionary is usually faster and clearer in a language like Python

Check small cases by hand, including empty lists, a list with all duplicates and values outside the range. The out-of-range check and the duplicate check are where most mistakes live, as the guidance in [Edge Cases and Testing](/algorithms/edge-cases) predicts.

## Key Points

- A value in the range 1 to n belongs at index value − 1, so the array can serve as its own lookup table
- Swapping each value into its home finds the smallest missing positive in O(n) time and O(1) extra memory
- The duplicate check in the loop condition prevents an endless loop, and each swap finalizes one value, so there are at most n swaps
- Flipping the sign at an index marks that a value was seen, which finds duplicates without extra memory
- These methods trade clarity and speed in Python for memory, and they change the input
