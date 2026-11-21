> An **array** stores items in consecutive slots of memory, so the item at any position is found in one step. A **dynamic array** adds the ability to grow: when it fills up, it moves to a bigger array.

The library door has a scanner, and every student who walks in adds one entry to the day's check-in list. Someone asks for the 5,000th entry, and someone else wants to add a late entry at the top. Both are easy requests to state. How much work each one takes depends on how the list is stored, and the array is the structure that shows the choice most clearly.

## Why Lookup Is One Step

An array reserves one block of memory and puts items side by side, each the same size. If the block starts at address 1000 and each item takes 8 bytes, item number i lives at address 1000 + 8 × i. The computer does that arithmetic and jumps straight there, with no searching.

<figure class="diagram">
<div class="cells">
<div class="cell">12<small>0</small></div>
<div class="cell">7<small>1</small></div>
<div class="cell">30<small>2</small></div>
<div class="cell hl">5<small>3</small></div>
<div class="cell">41<small>4</small></div>
<div class="cell">9<small>5</small></div>
</div>
<figcaption>Reading index 3 means computing start + 3 × item size. At 8 bytes an item and a start of 1000, that is address 1024</figcaption>
</figure>

The cost doesn't change with the position or the size. We timed `a[i]` on a Python list of a thousand items and on one of ten million. Reading the first item took about 10 ns in both, and reading the last about 11 ns, with the loop around the read included.

One detail about Python: a list slot holds a reference to an object, not the object itself, and the reference is the fixed size item. That lets one list hold numbers, strings and other lists together, at the price of one extra hop to reach each value.

## What Costs More

The same layout that makes lookup quick makes some changes slow. Items must stay side by side, so adding or removing anywhere but the end means shifting everything after that spot.

<figure class="diagram">
<p class="rowname">Before</p>
<div class="cells">
<div class="cell">12<small>0</small></div>
<div class="cell">7<small>1</small></div>
<div class="cell">30<small>2</small></div>
<div class="cell">5<small>3</small></div>
<div class="cell">41<small>4</small></div>
<div class="cell dim"><small>5</small></div>
</div>
<p class="rowname">After inserting 99 at index 1</p>
<div class="cells">
<div class="cell">12<small>0</small></div>
<div class="cell hl">99<small>1</small></div>
<div class="cell done">7<small>2</small></div>
<div class="cell done">30<small>3</small></div>
<div class="cell done">5<small>4</small></div>
<div class="cell done">41<small>5</small></div>
</div>
<figcaption>Four items each moved one slot to the right to make room</figcaption>
</figure>

Here are the costs for an array, with n items.

| Operation | Cost | Why |
| --- | --- | --- |
| Read or write by index | O(1) | Address arithmetic |
| Add at the end | O(1) on average | Usually a free slot, sometimes a copy (below) |
| Insert or delete at the front or middle | O(n) | Items after it shift |
| Find a value | O(n) | Compare item by item, unless sorted |

The shifting cost is not small in practice. We built a list of 80,000 numbers two ways: adding each at the end took 2.6 ms, and inserting each at the front took 951 ms, more than 350 times longer. Doubling the size quadrupled the front insert time, the O(n²) pattern from [Measuring Time and Space with Big O](/algorithms/big-o).

## Growing an Array

An array is created with a fixed size. A dynamic array hides that limit: when an append finds no free slot, it allocates a larger array, copies the items over and carries on in the new one.

<figure class="diagram">
<p class="rowname">Full, with room for 4</p>
<div class="cells">
<div class="cell">a<small>0</small></div>
<div class="cell">b<small>1</small></div>
<div class="cell">c<small>2</small></div>
<div class="cell">d<small>3</small></div>
</div>
<p class="rowname">After one more append: a new array with room for 8</p>
<div class="cells">
<div class="cell done">a<small>0</small></div>
<div class="cell done">b<small>1</small></div>
<div class="cell done">c<small>2</small></div>
<div class="cell done">d<small>3</small></div>
<div class="cell hl">e<small>4</small></div>
<div class="cell dim"><small>5</small></div>
<div class="cell dim"><small>6</small></div>
<div class="cell dim"><small>7</small></div>
</div>
<figcaption>The four old items were copied, the new item went in, and three free slots are ready for the next appends</figcaption>
</figure>

How much bigger the new array should be is the design choice that matters. We counted how many item copies 100,000 appends cause under three policies.

| Growth Policy | Total Copies | Copies per Append |
| --- | --- | --- |
| Add one slot | 4,999,950,000 | 49,999.5 |
| Add 1,000 slots | 4,950,100 | 49.5 |
| Double | 131,071 | 1.31 |

Adding a fixed amount copies about n²/2 items overall, because each resize copies everything so far and resizes keep coming. Multiplying the size by a fixed factor makes resizes rarer as the array grows, so the total copying stays proportional to n. That is why each append costs O(1) on average, which [Amortized Analysis](/algorithms/amortized-analysis) proves.

Real libraries pick modest factors, because a big factor leaves a lot of unused memory. Their exact policies are implementation details, and none of them is promised by the language.

| Runtime | Growth | Capacities We Saw |
| --- | --- | --- |
| Python 3.13 list | About 12% plus a few slots | 4, 8, 16, 24, 32, 40, 52, 64, 76 |
| Java ArrayList | About 1.5 times | 10, 15, 22, 33, 49, 73 |
| Go slice, Go 1.27 | Doubling at first, then less | 4, 8, 16, ..., 512, 848, 1280, 1792, 2560 |

The Python and Go rows are what we measured, and the Java row follows the growth rule in OpenJDK's source, which adds half of the current capacity. The Java documentation promises only that adding is amortized constant time.

## What Lives in the Slots

A Python list stores references, so a list of numbers is a list of arrows to number objects. A C array, a Java `int[]` or a Python `array` stores the values themselves.

The difference shows up in memory. A Python list of a million ints took about 36 MB in our run, counting the list and the int objects it points to, and the same numbers in `array('q')`, which stores 8 byte integers, took 8.2 MB. Values that sit side by side are also easier on the processor's cache, because reading one brings its neighbors along with it, a reason array based containers tend to beat pointer based ones.

## Key Points

- An array keeps items side by side, so reading by index is one step of address arithmetic, regardless of size
- Insert or delete at the front or middle shifts items, so it costs O(n)
- A dynamic array grows by allocating a bigger array and copying, and growing by a factor, not a fixed amount, keeps appends O(1) on average
- Libraries use factors such as 1.5 for Java and about 1.125 for Python, and the exact policy is an implementation detail
- Python lists hold references, which makes them flexible and larger than arrays that store values directly
