> A **bitmask** stores a subset of n numbered items as an n bit integer, with bit i set when item i is in the subset. All 2ⁿ subsets are then the integers from 0 to 2ⁿ − 1, union, intersection and difference are single bit operations, and a loop over the numbers visits every subset. It works for n up to about 20 to 25, and it is the base of bitmask dynamic programming.

A project needs five skills covered: Python, SQL, Design, Testing and Cloud. Eight students are available, each with some of the skills. What is the smallest team that covers everything?

Eight students make 2⁸ = 256 possible teams, a small enough number to look at them all. The only question is how to write down a team so that checking it is quick.

## A Team as a Number

Give each student a bit position, from 0 to 7. A team is a number with a 1 at the position of every member.

<figure class="diagram">
<div class="cells"><div class="cell hl">Ana<small>0</small></div><div class="cell hl">Ben<small>1</small></div><div class="cell hl">Chi<small>2</small></div><div class="cell">Dev<small>3</small></div><div class="cell">Eli<small>4</small></div><div class="cell">Fay<small>5</small></div><div class="cell">Gus<small>6</small></div><div class="cell">Hal<small>7</small></div></div>
<figcaption>The team Ana, Ben and Chi as bits 0, 1 and 2 of one number, 00000111, which is 7. The small number under each name is its bit position</figcaption>
</figure>

The same trick encodes skills. Give each skill a bit, with Python as bit 0 and Cloud as bit 4, and each student becomes the number of the skills they have, written here with bit 0 on the right.

| Student | Skills | Skill Mask |
| --- | --- | --- |
| Ana | Python, SQL | 00011 |
| Ben | Design, Testing | 01100 |
| Chi | SQL, Cloud | 10010 |
| Dev | Python, Testing | 01001 |
| Eli | Design | 00100 |
| Fay | Cloud, Testing | 11000 |
| Gus | Python, Design, Cloud | 10101 |
| Hal | SQL | 00010 |

A team's skills are the OR of its members' masks, since OR collects every skill that anybody has. The team covers the project when that OR equals 11111, which is 31. This is the same "a number is a set" idea from [Bitwise Operations](/algorithms/bitwise-operations).

| Set Operation | Expression |
| --- | --- |
| Union | `a \| b` |
| Intersection | `a & b` |
| Difference | `a & ~b` |
| Contains item i | `(a >> i) & 1` |
| Number of members | `a.bit_count()` |
| Everything | `(1 << n) - 1` |

## Trying Every Team

The numbers 0 to 255 are all the teams, so one loop covers them. For each team, walk over its set bits using the move from [Common Bit Tricks](/algorithms/bit-tricks) and OR together the members' skills.

```python
def smallest_cover(masks, full):              # masks[i] is the skill mask of student i
    n = len(masks)
    best, best_team = n + 1, None
    for team in range(1 << n):
        cover, t = 0, team
        while t:
            low = t & -t                      # the lowest member left
            cover |= masks[low.bit_length() - 1]
            t ^= low
        if cover == full and team.bit_count() < best:
            best, best_team = team.bit_count(), team
    return best, best_team
```

The smallest team has 3 students. There are 14 teams of that size, such as Ana, Ben and Chi, or Ben, Gus and Hal. Of the 256 teams, 147 cover all five skills, and by size they are 14 of size 3, 45 of size 4, 51 of size 5, 28 of size 6, 8 of size 7 and the whole group.

We checked the counts against `itertools.combinations`, trying every set of each size, and they agreed for every size from 1 to 8.

No team of 2 exists, so 3 is optimal, and the loop proved it by looking at everything. That is the pattern of brute force with bitmasks: when the number of items is small, writing subsets as numbers makes the search short to write and quick to run. [Brute Force](/algorithms/brute-force) discussed when that is acceptable.

## Sums Over All Subsets

Suppose each item has a weight and we want the total weight of every subset. Adding up the members each time costs n steps per subset. But a subset's total is the total of the same subset without its lowest member, plus that member's weight.

```python
def subset_sums(w):
    n = len(w)
    total = [0] * (1 << n)
    for mask in range(1, 1 << n):
        low = mask & -mask
        total[mask] = total[mask ^ low] + w[low.bit_length() - 1]
    return total
```

Each entry takes constant time, using an entry computed earlier, since `mask ^ low` is smaller than mask. For 18 random weights, this took 0.02 s against 0.19 s for adding the members one by one, and both gave the same table. For 20 items, it built all 1,048,576 sums in 0.07 s.

That is a small dynamic program: the answer for a mask is built from the answer for a smaller mask. [Bitmask DP](/algorithms/bitmask-dp) uses the same shape for harder problems.

## Submasks

Often we need the subsets of one particular set, such as every way to split a team in two. The subsets of a mask are its **submasks**, and one line steps through them in decreasing order.

```python
def submasks(mask):
    sub = mask
    while True:
        yield sub
        if sub == 0:
            break
        sub = (sub - 1) & mask
```

Subtracting 1 turns the lowest 1 of `sub` into 0 and the zeros below into 1s, and ANDing with `mask` throws away the 1s that aren't in the mask. What's left is the next smaller submask. For the mask 1010 it yields 1010, 1000, 0010 and 0000.

A mask with k members has 2<sup>k</sup> submasks. We checked that, along with the facts that none repeats and each lies inside the mask, for every mask below 1,024.

A related count: how many pairs are there of a mask and one of its submasks? It is 3ⁿ: each item is outside the mask, in the mask but outside the submask, or in both. For n = 8, 10 and 12, the counts we got by running the loop were 6,561, 59,049 and 531,441, exactly 3ⁿ. Compare with 4ⁿ for all pairs of masks: for n = 12 that's 16,777,216 against 531,441.

## One Change at a Time

Counting from 0 to 2ⁿ − 1 can flip many bits at once, as 0111 turns into 1000. The **Gray code** order, i XOR (i >> 1), visits the same subsets so that neighbors differ in exactly one item.

For n = 3, it runs 000, 001, 011, 010, 110, 111, 101, 100. Each step adds or removes one item, so a running total can be updated by one addition. We checked for 16 bits that all 65,536 codes are distinct and each differs from the next in a single bit.

## How Far Does It Reach

The loop visits 2ⁿ masks, and each may cost up to n steps. At n = 20 that's a million masks, and the table of sums takes 8.4 MB as a Python list, before counting the integers it points to. At n = 30 there would be more than a billion masks and the list alone would need more than 8 GB, out of reach in Python.

The method fits when the item count is at most about 20 to 25.

[Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints) puts it this way: when a problem says n is at most 20, think of 2ⁿ.

## Key Points

- A subset of n items is an n bit number, so all subsets are the numbers 0 to 2ⁿ − 1, and union, intersection and difference are OR, AND and AND NOT
- A team's skills are the OR of its members' masks, and trying all 256 teams of 8 students showed that 3 is the smallest team covering 5 skills, with 14 such teams
- A subset's total is the total without its lowest member plus that member, which filled a table of 1,048,576 sums in 0.07 s
- `sub = (sub - 1) & mask` steps through the 2<sup>k</sup> submasks of a mask, and summing over all masks gives 3ⁿ pairs, 531,441 for n = 12
- Gray code order changes one item at a time, and the method reaches n of about 20 to 25
