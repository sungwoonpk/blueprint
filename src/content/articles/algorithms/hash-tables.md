> A **hash table** stores items in an array and uses a **hash function** to turn each key into the slot where its item belongs. That lets it add, find and remove items in O(1) time on average.

The registrar has 40,000 student IDs and wants to answer "is this ID registered?" without scanning the list. Sorting the IDs and using binary search would give O(log n). Hash tables give something better, a lookup that doesn't grow with the number of IDs. How that works is worth knowing precisely, because the same machinery sits under Python's `dict` and `set`, Java's `HashMap` and Go's `map`.

## Use the Key as a Position

The idea starts with an array. If student IDs were small numbers, the ID itself could be the index: slot 1042 holds the record for student 1042. Lookup is a single array read. The catch is memory. Eight digit IDs would need a hundred million slots for 40,000 students, and keys like names or emails can't be array positions at all. Even a ten letter name has about 1.4 × 10¹⁴ possibilities.

The fix is to squeeze the keys into a table of a sensible size, with a **hash function** that turns any key into a whole number, followed by a remainder by the table size.

<figure class="diagram">
<div class="flow">
<div class="node">Key<small>"Ana"</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hash<small>a big integer</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Mod m<small>the table size</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Slot<small>for example 5</small></div>
</div>
<figcaption>How a key becomes a slot number in a table with m slots</figcaption>
</figure>

The same key gives the same slot as long as the table size stays the same, so the item can be found again by repeating the calculation.

## Collisions Can't Be Avoided

There are far more possible keys than slots, so two different keys will land in the same slot sometimes. That is a **collision**. It comes sooner than most people expect, the same effect as the birthday puzzle. We dropped random keys into tables of different sizes and counted how many it took to get the first collision.

| Table Slots | Keys Before the First Collision |
| --- | --- |
| 365 | about 25 |
| 1,000 | about 40 |
| 100,000 | about 400 |

A table with 100,000 slots has a collision after only about 400 keys, while it is still 99.6% empty. The number grows like the square root of the table size. So a hash table can't prevent collisions, and has to handle them. There are two standard ways.

## Chaining

In **chaining**, each slot holds a small list of the items that landed there. A lookup computes the slot and then scans that short list. With n items in m slots, the average list holds n / m items, called the **load factor** α, so a lookup takes about 1 + α steps on average. If the table grows with the data and α stays below a constant, that is O(1).

Java's `HashMap` chains. Its source also shows what happens when the hashing goes badly: once a single chain reaches 8 items, and the table is large enough, the chain is turned into a balanced tree, so even a bad case costs O(log n) and not O(n).

## Open Addressing

In **open addressing**, every item lives in the array itself. When a key's slot is taken, the table **probes**, which means it checks another slot, and another, until it finds an empty one. The simplest rule is **linear probing**, which tries the next slot each time.

<figure class="diagram">
<div class="cells ptrs">
<div class="cell dim"><small>0</small></div>
<div class="cell done">Ben<small>1</small></div>
<div class="cell done" data-ptr="hash">Ana<small>2</small></div>
<div class="cell done">Cy<small>3</small></div>
<div class="cell hl" data-ptr="lands">Dee<small>4</small></div>
<div class="cell dim"><small>5</small></div>
<div class="cell dim"><small>6</small></div>
<div class="cell dim"><small>7</small></div>
</div>
<figcaption>Dee hashes to slot 2, which is taken, so linear probing tries 3 and then settles in 4</figcaption>
</figure>

Lookup follows the same path. Compute the slot, then check slots in order until you find the key or reach an empty slot, which proves the key is absent. The path stays short when the table has plenty of empty slots, so the load factor matters a lot more here than in chaining.

For random hashing, the expected number of slots checked is about ½(1 + 1/(1 − α)) for a key that is present, and ½(1 + 1/(1 − α)²) for one that is absent or about to be inserted. We built a linear probing table and measured both.

| Load Factor | Key Present, Predicted / Measured | Key Absent, Predicted / Measured |
| --- | --- | --- |
| 0.5 | 1.5 / 1.52 | 2.5 / 2.49 |
| 0.75 | 2.5 / 2.46 | 8.5 / 8.59 |
| 0.9 | 5.5 / 5.28 | 50.5 / 49.1 |

Up to about three quarters full, a miss costs under 10 slots. At 90% full it costs about 50, which is why open addressing tables are resized well before they fill. Removing an item takes care, because emptying its slot would end other keys' probe paths early. Tables mark the slot as deleted and keep probing past it.

Real tables vary the probing. Python's `dict` uses open addressing with a scrambled probe order that eventually depends on all the bits of the hash, so keys that collide don't keep colliding. Go's map since version 1.24 checks groups of 8 slots at once, using a one byte tag in each slot to rule out most non-matches without comparing keys.

## Keeping the Load Low

Both designs depend on a small load factor, so a table grows as items arrive. When the load passes a limit, it allocates a bigger array, usually twice the size, and inserts all the items again. The items must be rehashed, because the slot depends on the table size.

Limits differ. Python's `dict` resizes when it is two thirds full, Java's `HashMap` at three quarters, and a textbook linear probing table at one half, which keeps probes short.

Here is a small linear probing table in Python that grows when the load would pass two thirds.

```python
class Table:
    def __init__(self):
        self.m, self.slots, self.n = 8, [None] * 8, 0

    def _put(self, key):
        i = hash(key) % self.m
        while self.slots[i] is not None and self.slots[i] != key:
            i = (i + 1) % self.m            # linear probing
        if self.slots[i] is None:
            self.slots[i] = key
            return True
        return False

    def insert(self, key):
        if (self.n + 1) * 3 > self.m * 2:   # load would pass 2/3
            old = [x for x in self.slots if x is not None]
            self.m *= 2
            self.slots = [None] * self.m
            for x in old:
                self._put(x)
        if self._put(key):
            self.n += 1

    def contains(self, key):
        i = hash(key) % self.m
        while self.slots[i] is not None:
            if self.slots[i] == key:
                return True
            i = (i + 1) % self.m
        return False
```

We inserted 100,000 random keys. The table resized 15 times and reinserted 174,750 items in total, about 1.75 for each insert. That is the doubling argument from [Amortized Analysis](/algorithms/amortized-analysis): resizes are costly but rare, so inserts are O(1) amortized, and the lookups stay O(1) on average.

## Choosing a Hash Function

A hash function has three jobs. It must give the same result for equal keys, it should be quick, and it should spread keys evenly across slots. The first is a correctness rule, and a bad version of the last can wreck performance.

We hashed 10,000 random six letter words into 1,000 slots two ways.

| Hash Function | Slots Used | Longest Chain |
| --- | --- | --- |
| Sum of the letter codes | 117 of 1,000 | 241 |
| 31 × hash + next letter code | 1,000 of 1,000 | 21 |

Adding up letter codes can only produce a few hundred distinct sums, and anagrams collide, so most slots stay empty while a few fill up. Multiplying before each addition makes each letter's position matter, and the words spread out nearly evenly. With 10 words per slot on average, the longest chain of 21 is about what pure chance gives.

A good function also resists an adversary. A fixed hash function can be studied, and an attacker can then send keys that all collide, as in [Best, Average and Worst Cases](/algorithms/best-average-worst). The defense is to make the function random. **Universal hashing** picks a function at random from a family, such as ((a × k + b) mod p) mod m with random a and b and a prime p larger than any key.

For any two different keys, the chance of a collision is at most 1/m, so the expected chain length is at most 1 plus (n − 1)/m. Python salts the hashes of strings with a random value each time the program starts, for the same reason.

Two rules follow for the keys you use. Equal keys must hash equally, and a key must not change while it sits in a table, which is why Python allows tuples as dictionary keys and not lists. [Hash Maps and Hash Sets](/algorithms/hash-maps-sets) shows how to use this in practice.

## Key Points

- A hash table turns a key into an array slot with a hash function and a remainder, so lookup doesn't scan
- Collisions are unavoidable, and arrive after about the square root of the table size in keys
- Chaining keeps a short list in each slot, and open addressing probes for the next free slot in the array
- Performance depends on a low load factor, so tables resize by rehashing into a bigger array, which is O(1) amortized
- The hash function must be consistent for equal keys, should spread keys well, and can be randomized to resist attackers
