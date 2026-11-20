> A **random shuffle** puts items in an order where every arrangement is equally likely, and **reservoir sampling** keeps k items chosen uniformly from a stream whose length isn't known in advance. Both depend on getting the probabilities exactly right, because a plausible looking shortcut can be biased.

A server logs millions of requests a day and an engineer wants 100 of them, picked fairly, to read by hand. The total number isn't known until the day ends, and the log is too big to hold in memory. A playlist app has the opposite need, to play a fixed list in a fair random order.

Both are about randomness that has to be fair, and both are easy to get slightly wrong.

## Shuffling Fairly

The standard method is the **Fisher–Yates shuffle**. Walk from the last position down to the second. At position i, pick a random position j from 0 to i, both included, and swap the items at i and j. Position i is now final.

```python
def shuffle(a):
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)          # any position up to and including i
        a[i], a[j] = a[j], a[i]
```

The invariant is that after the step for position i, the item there was chosen uniformly from the i + 1 items that remained, and positions i through the end are settled. The choices made were n × (n − 1) × ... × 2 in number, which is n!, and each sequence of choices gives a different permutation. Every permutation arises from exactly one sequence of choices, so each has probability 1 / n!.

For items A, B and C, the first step chooses among 3 positions and the second among 2, giving 6 equally likely sequences and 6 different orders. Nothing is repeated and nothing is missing.

## The Tempting Wrong Version

A shuffle that looks equally reasonable swaps each position with a random position in the whole list.

```python
def biased_shuffle(a):
    n = len(a)
    for i in range(n):
        j = random.randint(0, n - 1)      # any position at all
        a[i], a[j] = a[j], a[i]
```

It makes n choices of n options each, which is nⁿ equally likely sequences. For three items that is 27 sequences, and there are only 6 orders. Twenty-seven doesn't divide evenly by 6, so some orders must be more likely than others. We enumerated all 27: three orders arise from 4 sequences each and three from 5 sequences each.

For n above 2 the problem can't be fixed by luck. The number n! divides nⁿ only if (n − 1)! divides n to the power n − 1, and for n above 2 the number n − 1 has a prime factor that n doesn't share. We shuffled the three items one million times with each method.

| Order | Fisher–Yates | Biased |
| --- | --- | --- |
| A B C | 167,105 | 148,611 |
| A C B | 167,082 | 185,157 |
| B A C | 166,746 | 185,258 |
| B C A | 166,400 | 184,630 |
| C A B | 165,999 | 147,735 |
| C B A | 166,668 | 148,609 |

A fair shuffle puts about 166,667 in each row. Fisher–Yates stayed within 0.5% of that. The biased version split into two groups, near 148,000 and near 185,000, which matches 4 / 27 and 5 / 27. For four items the gap grows: the most likely order comes from 15 of the 256 sequences, and the least likely from 8.

We also ran 2.4 million Fisher–Yates shuffles of 4 items and compared the counts of the 24 orders with equal expectation using a chi-square test. The statistic was 20.1, well under 35.2, the 5% limit for 23 degrees of freedom, so the counts look like fair randomness.

## A Limit Set by the Generator

A shuffle can only produce as many orders as its generator has states. Python's `random` uses the Mersenne Twister, whose period is 2¹⁹⁹³⁷ − 1. The documentation notes that the largest list for which all orders fit within that period has length 2,080. We checked it: 2,080! is about 2¹⁹⁹³², which is below the period, and 2,081! is above it. For longer lists, most orders can never be produced, however fair the shuffle is.

## Sampling From a Stream

For the server log, the engineer needs k items, uniformly chosen, from N items that arrive one at a time with N unknown. **Reservoir sampling** keeps a reservoir of k items and updates it as each item arrives. The method is known as Algorithm R, attributed in Vitter's paper on the subject to Alan Waterman.

- Put the first k items into the reservoir
- For item number t after that, pick a random integer j from 0 to t − 1
- If j is less than k, the new item replaces the one in slot j. Otherwise it is dropped

```python
def reservoir(stream, k):
    sample = []
    for t, item in enumerate(stream, 1):
        if t <= k:
            sample.append(item)
        else:
            j = random.randrange(t)           # 0 to t - 1
            if j < k:
                sample[j] = item
    return sample
```

The new item enters with probability k / t, which is right for a fair sample of t items. An item already inside survives the step with probability 1 − (k / t) × (1 / k) = (t − 1) / t, because it is replaced only if the new item enters and picks its slot. If it was in the sample with probability k / (t − 1), it is still there with probability k / (t − 1) × (t − 1) / t = k / t. So after every item, each item seen so far is in the reservoir with probability k / t.

We checked this on a stream of 10 items with k = 3, using 300,000 runs. Each item was in the sample about 30% of the time, which is 3 / 10, between 29.9% and 30.1%. Each of the 120 possible 3-item subsets appeared about equally often, with a chi-square of 107, under the 5% limit of about 146.

## Why Memory Stays Small

The reservoir holds k items and the loop reads each item once. On a stream of one million integers with k = 10, the peak extra memory was about 1 KB. Putting the same million integers in a list and calling `random.sample`, which needs a sequence, peaked at 40 MB. The time is O(N), since every item is read.

The reservoir changes less than the loop suggests. By the same probability, item t is kept with probability k / t, so the expected number of items that ever enter the reservoir is about k(1 + ln(N / k)). For one million items and k = 10 that is about 125, and our average over 20 runs was 122. Nearly every item is read and dropped.

## Skipping Ahead

If most items are dropped, drawing a random number for each one is wasted. A faster method draws how many items to skip before the next one enters. Vitter's Algorithm Z does this and runs in O(k(1 + log(N / k))) expected time, which his paper proves is the best possible up to a constant factor, since that is the number of items that enter.

We wrote a skip based version, which draws the next skip from a distribution that depends on k and on a running value updated at each replacement. We checked it against the same tests, with a chi-square of 110 on the subset counts. On a stream of 10 million items with k = 10, Algorithm R took 2.04 s and the skip version took 0.16 s. The stream is still read to the end, but random numbers are drawn only a few hundred times.

## Which Tool to Use

| Situation | Use |
| --- | --- |
| A list in memory, any order wanted | A Fisher–Yates shuffle, such as `random.shuffle` |
| k items from a sequence of known length | `random.sample`, which doesn't shuffle everything |
| k items from a stream of unknown length | Reservoir sampling |
| Items with different weights | A weighted variant, beyond this article |

## Key Points

- The Fisher–Yates shuffle swaps position i with a random position from 0 to i, so each of the n! orders arises from exactly one sequence of choices
- Swapping with a random position in the whole list gives nⁿ sequences, which can't split evenly over n! orders, and our test showed the split of 4 to 5 for three items
- Reservoir sampling keeps k items by letting item t in with probability k / t, and each item seen has probability k / t of being in the sample at any time
- It needs O(k) memory for a stream of any length, about 1 KB against 40 MB for a million integers in our test
- Skipping ahead makes it faster, and the Mersenne Twister limits shuffles to lists up to length 2,080 for full coverage
