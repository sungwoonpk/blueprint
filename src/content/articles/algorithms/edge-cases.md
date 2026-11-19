> An **edge case** is an input at the boundary of what a program is meant to handle, such as an empty list, a single item, duplicates or the largest allowed value. Bugs gather at the edges, so testing them is how you find what typical inputs miss.

You can prove a loop correct and still ship a bug. The proof covers an idealized program. The program that runs has limits the proof never mentioned, and the edges of the input are where those limits show.

## The Midpoint That Broke

In 2006, Joshua Bloch of Google wrote about a bug in binary search. The code had been proved correct and tested in Jon Bentley's book *Programming Pearls*, and a copy sat in the Java standard library's `Arrays` class. Both used the same line to pick the middle of the range, the one we saw in [Proving Correctness with Loop Invariants](/algorithms/loop-invariants).

```java
int mid = (low + high) / 2;
```

For two numbers in the middle of an array, this is fine. But the sum `low + high` is computed first, in a 32 bit integer, which holds values only up to 2,147,483,647. In a very large array, the sum goes past that limit and wraps around to a negative number.

```text
low             = 1,500,000,000
high            = 1,600,000,000
low + high      = 3,100,000,000    (the true sum)
as a 32 bit int = -1,194,967,296   (wrapped past 2,147,483,647)
mid             = -597,483,648     (a negative index)
```

A negative index is out of bounds. In Java that throws an exception, and in C it reads from the wrong place. The failure needs an array of about a billion elements, so it stayed hidden for years: the post says the book's version escaped detection for two decades and the library's for about nine years.

The fix keeps the numbers small by adding half the distance to `low`.

```java
int mid = low + (high - low) / 2;
```

We tried this on a pretend array of 2³⁰ + 5 items, using 32 bit arithmetic. The original line produced the index −1,073,741,824 and the fixed line found the target. On an array of a thousand items, both worked.

The lesson isn't that the proof was wrong. The proof treated integers as unbounded, and the machine didn't. Python's integers don't overflow, so the same line is safe in Python, but the idea carries to every language with fixed width numbers.

## Where Edge Cases Hide

The same families of edges come up in most problems. Here is a checklist by kind of data.

| Data | Edges to Try |
| --- | --- |
| Lists and arrays | Empty, one item, two items, all items equal, already sorted, reversed, the largest size allowed |
| Searching | Target missing, first, last, and appearing more than once |
| Numbers | Zero, negatives, the largest and smallest allowed values, sums and products that overflow, the remainder of a negative number, comparing decimals for equality |
| Strings | Empty, one character, one character repeated, spaces and punctuation, non-ASCII text |
| Trees and graphs | Empty, one node, a single long chain, a cycle, pieces that aren't connected |

A few of these are less obvious than they look.

- In C++ and Java, the remainder of a negative number can be negative, while in Python `-7 % 3` is 2. An algorithm that uses remainders can behave differently in each language
- Decimals aren't exact: in Python `0.3 * 3 + 0.1` is `0.9999999999999999`, so comparing it to 1.0 with `==` is false. Compare with a small tolerance instead
- A single long chain makes a recursion go as deep as the input, which is how a stack overflow appears, as in [The Call Stack and Recursion Depth](/algorithms/call-stack)

## Hunting for the Edges

You don't have to rely on memory for the list. Three habits find edges on their own.

- **Reread the statement for what it leaves open.** The questions from [How to Approach a Problem](/algorithms/approaching-problems), such as whether an item can be used twice or what happens when nothing matches, are edge cases waiting to be asked
- **Check the ends of every loop.** The invariant of a loop says what is true at the start and at the end, and the first and last iterations are where off by one errors live
- **Push each value to its extremes.** Ask for the smallest, the largest, the empty, the equal and the sorted case of every input. Constraints from [Reading Constraints to Pick a Target Complexity](/algorithms/reading-constraints) tell you how big the largest case is

## Writing Tests

Once you know the edges, turn them into tests that run on their own. Here are the examples for the gift card problem, written with Python's `unittest`.

```python
import unittest

class PairForBudgetTests(unittest.TestCase):
    def test_example(self):
        self.assertEqual(pair_for_budget([25, 40, 15, 35], 60), (0, 3))

    def test_equal_prices_are_different_books(self):
        self.assertEqual(pair_for_budget([30, 20, 30], 60), (0, 2))

    def test_one_book_cannot_pair_with_itself(self):
        self.assertIsNone(pair_for_budget([30], 60))

    def test_empty_shelf(self):
        self.assertIsNone(pair_for_budget([], 60))
```

The test names say which edge each one covers, so a failure reads like a sentence. Each test sets up its own input and checks one fact. The four tests pass against the solution from earlier.

## Letting the Computer Invent Inputs

Hand written tests only cover what you thought of. A **property test** states something that should hold for all inputs of a kind, then runs it on many generated inputs, including awkward ones. Libraries such as Hypothesis for Python do the generating, and they report a small failing input when a property breaks.

For a sorting function, a first property is that the output is in order. It isn't enough on its own, because a function that returns an empty list satisfies it. A second property is that the output holds the same items as the input.

```python
import random
from collections import Counter

def check_sort(my_sort, trials=2000):
    for _ in range(trials):
        xs = [random.randint(-5, 5) for _ in range(random.randint(0, 8))]
        out = my_sort(xs)
        assert all(a <= b for a, b in zip(out, out[1:])), xs   # in order
        assert Counter(out) == Counter(xs), xs                 # same items
```

The built-in `sorted` passes. A function that quietly removes duplicates, `sorted(set(xs))`, produces ordered output, and the second property catches it within a few trials. The generated inputs are short on purpose, since small failing cases are easiest to read.

Another kind of generated check is to compare a fast solution against the slow, obviously correct one on random small inputs. We did this for the gift card problem on 20,000 random cases, and the two agreed. That is why a brute force solution is worth writing first.

## Proof and Tests Together

Neither tool is enough alone. A proof speaks about all inputs, but only for the program as modeled, and the binary search proof didn't model overflow. Tests run the real program on the real machine, but only on the inputs they try, and no test suite covers an endless input space.

Together they cover each other's gaps. Use the invariant to understand why the algorithm works, the checklist to find the inputs where the real machine disagrees with the model, and tests to keep fixed bugs from returning.

## Key Points

- Edge cases sit at the boundaries of the input: empty, single, duplicate, extreme, and out of the expected shape
- The midpoint bug lasted years because a proof assumed unbounded integers while the machine used 32 bit ones, and it showed only on huge arrays
- Find edges by rereading the problem statement, checking the ends of loops and pushing each value to its extremes
- Turn edges into named unit tests, and use property tests or a brute force comparison to try inputs you wouldn't think of
- Proofs and tests answer different questions, and a trustworthy algorithm has both
