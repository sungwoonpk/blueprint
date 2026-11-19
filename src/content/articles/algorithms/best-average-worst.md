> The **best case**, **average case** and **worst case** of an algorithm are its cost on the most favorable input of a given size, on a typical one, and on the least favorable one. The worst case is the usual guarantee.

Search a roster of 1,000 student IDs for one student. The answer might come after one check or after a thousand, with the same code and the same list length. The step count in [Measuring Time and Space with Big O](/algorithms/big-o) was one number for each n, but real algorithms often have a spread.

## Same Size, Different Cost

Here is a linear search, which looks at the IDs one by one and stops when it finds the target.

```python
def linear_search(ids, target):
    for position, x in enumerate(ids):
        if x == target:
            return position
    return -1
```

The cost depends on where the target sits, so we ask the question three ways.

| Case | Where the Target Is | Comparisons at n = 1,000 | Growth |
| --- | --- | --- | --- |
| Best | First position | 1 | Constant |
| Average | Equally likely anywhere in the list | 500.5 | Linear |
| Worst | Last position, or missing | 1,000 | Linear |

We counted these by running the loop. The average is still linear, because half of n is a constant factor of n and Big O drops constants.

Each row is its own function of n, so each can get its own O, Ω or Θ. That is why "O means worst case" is a misreading: O says how a function is bounded, and the case says which function we are talking about.

## One Algorithm, Two Growth Rates

Cases can differ by more than a constant. **Insertion sort** takes each item and slides it left past larger items until it fits, as [Bubble, Selection and Insertion Sort](/algorithms/simple-sorts) shows. How far items slide depends on the order the list arrives in.

<figure class="chart">
<div class="hbars" role="img" aria-label="Comparisons insertion sort makes on 1,000 items: 999 for sorted input, about 250,000 for random input and 499,500 for reversed input">
<div class="hbar"><span>Already Sorted</span><span class="track"><span class="fill" style="--w: 0.2%"></span></span><span class="value">999</span></div>
<div class="hbar"><span>Random Order</span><span class="track"><span class="fill" style="--w: 50.1%"></span></span><span class="value">about 250,000</span></div>
<div class="hbar peak"><span>Reversed</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">499,500</span></div>
</div>
<figcaption>Comparisons made by insertion sort on 1,000 items, counted in our run (random order is the mean of 20 shuffles)</figcaption>
</figure>

A sorted list needs one comparison per item, so the best case is linear. A reversed list makes each item slide to the front, which gives n(n − 1)/2 comparisons, so the worst case is quadratic. A random list lands near n²/4, about half the worst case, and still quadratic.

The same code, on inputs of the same size, falls into two different growth classes. Quoting one number for the algorithm would hide that.

## Why the Worst Case Is the Default

The worst case is a promise that holds for any input. The average case is a promise about typical inputs, and it depends on an assumption: what is typical? Think of it as a game: an adversary picks the input to hurt you, and if your bound holds even then, it holds for any input.

That adversary is not imaginary. A hash table is expected to insert n keys in about n steps, because keys spread across buckets. If many keys land in the same bucket, each insert has to walk past the others. We forced that in Python with keys that share one hash value.

| Keys Inserted | Ordinary Keys | All Keys Collide |
| --- | --- | --- |
| 1,000 | 0.02 ms | 15 ms |
| 2,000 | 0.03 ms | 60 ms |
| 4,000 | 0.07 ms | 240 ms |
| 8,000 | 0.15 ms | 960 ms |

The ordinary column roughly doubles when the input doubles, and the colliding column quadruples: a linear algorithm turned quadratic by the choice of input.

In 2003, Crosby and Wallach showed this was a practical attack. Programs that keep outside data in hash tables, among them Perl, the Squid proxy and the Bro intrusion detection system, could be pushed into their worst case by input an attacker chose. In their Bro experiment, tens of thousands of crafted packets cost about 45 minutes of processor time, against under one minute for random ones.

In December 2011 the same weakness was reported across many languages and web frameworks, since a web server puts request parameters into a hash table. Python made its string hashes random by default in version 3.3, so an attacker can't predict which keys collide.

Sorting has its own version. Quick sort with the first item as its pivot makes about 11,000 comparisons on a random list of 1,000, and 499,500 on the same list already sorted. [Quick Sort](/algorithms/quick-sort) shows how choosing the pivot at random leaves no input that is reliably cruel.

## When the Average Is the Right Question

The average case is useful when you know the inputs, or when you control the randomness. Two situations come up often.

- **Randomized algorithms**: the algorithm flips its own coins, so the average is over our choices and not over the input. A randomized quick sort is expected to take n log n steps on any input, and an adversary can't pick one that beats the coin flips. See [Randomized Algorithms](/algorithms/randomized)
- **Amortized cost**: the average is over a sequence of operations on one structure and needs no assumption about inputs. Appending to a dynamic array occasionally copies the whole array, yet the average cost for each append stays constant. See [Amortized Analysis](/algorithms/amortized-analysis)

When you read that an algorithm is O(n log n), ask which case. For a sort, ask whether that is the worst case or just the typical one, and what input triggers the worst.

## Key Points

- The same code can cost different amounts on different inputs of the same size, so best, average and worst cases are separate functions of n
- Big O is not a case. Each case has its own bound, and best and worst can even fall into different growth classes, as with insertion sort
- The worst case is the default guarantee because it makes no assumption about the input, and some inputs come from an attacker
- The average case needs a model of the input, while randomized and amortized analysis bring the average under our control
