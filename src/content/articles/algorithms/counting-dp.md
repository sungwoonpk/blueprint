> A **counting DP** asks how many ways something can be done and uses the same recurrence as an optimization, with a sum in place of a min or max: the number of ways to reach a state is the total over the ways into it. What counts as the same way matters, and the order of the loops decides it. With a modulus, the counts stay small enough to store.

In how many ways can a cashier make 11 cents from coins of 1, 2 and 5? Two questions hide in that sentence. Is 5 + 5 + 1 the same as 1 + 5 + 5? A cashier would say yes, since it is the same pile of coins. A person counting the order in which coins are handed over would say no.

The two answers are different numbers, and a counting table gives either one, depending on one decision in the code.

## Counting Piles of Coins

Let ways(a) be the number of different piles of coins that make a. Process one kind of coin at a time. Starting with only the coin 1, there is one way to make each amount.

Add the coin 2: a pile for amount a is either a pile that doesn't use a 2, as before, or a pile that does, which is a pile for a − 2 using any of the coins considered so far, plus one more 2.

```python
def piles(coins, amount):
    ways = [1] + [0] * amount                 # one way to make 0: the empty pile
    for c in coins:                           # one kind of coin at a time
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]            # piles that use at least one more coin c
    return ways
```

Looping over the coins on the outside means that each pile is built with its coins in a fixed order, all the 1s, then all the 2s, then all the 5s, so a pile is counted once. For 11 cents with the coins 1, 2 and 5, there are 11 piles. For 6 cents there are 5, which are 2+2+2, 1+5, 1+1+2+2, 1+1+1+1+2 and 1+1+1+1+1+1.

## Counting Orders Too

If handing over 1 then 5 differs from 5 then 1, the question becomes how many sequences of coins add up to the amount. Now the last coin handed over is the thing that matters, so the amount is on the outside.

```python
def sequences(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):            # the amount outside: any coin may be last
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways
```

For 6 cents there are 15 sequences against 5 piles, and for 11 cents there are 218 against 11. The difference grows quickly.

| Amount | Piles | Sequences |
| --- | --- | --- |
| 5 | 4 | 9 |
| 10 | 10 | 128 |
| 20 | 29 | 26,547 |
| 50 | 146 | 237,139,442,616 |

Swapping the two loops swapped the question. The recurrence in both is the same sum, and what differs is whether a state remembers the order. We checked both against listings of every pile and every sequence on 300 random coin sets with amounts up to 14, and the counts agreed.

## Change for a Dollar

With the coins 1, 5, 10, 25, 50 and 100 cents, the number of piles for 100 cents is 293. With the eight British coins of 1, 2, 5, 10, 20, 50, 100 and 200 pence, the number of ways to make 200 pence is 73,682. These are classic puzzles, and the table gets them in a fraction of a second.

## One Recurrence, Three Questions

Compare the coin problems of this phase for the amount 11 and the coins 1, 2 and 5.

| Question | Combine With | Answer |
| --- | --- | --- |
| Is it possible? | Or | Yes |
| What is the fewest coins? | Min, plus 1 for the coin | 3, which is 5 + 5 + 1 |
| How many piles? | Sum | 11 |
| How many sequences? | Sum, order counted | 218 |

The shape of the table is the same each time, a cell for each amount and a look back by each coin, and the operation that combines the look backs changes. This is why a recurrence for one question is often a recurrence for the others. [Memoization and Tabulation](/algorithms/memoization-tabulation) used the min version.

## Partitions

A **partition** of n is a way of writing n as a sum of positive whole numbers, where order doesn't matter: the partitions of 4 are 4, 3 + 1, 2 + 2, 2 + 1 + 1 and 1 + 1 + 1 + 1. That is piles of coins again, where the coins are 1, 2, up to n. The same function gives the counts.

For n from 1 to 5 the counts are 1, 2, 3, 5 and 7. For 10 it is 42, for 50 it is 204,226 and for 100 it is 190,569,292. We checked it against a direct recursive count for every n up to 24.

## A Counting Pattern Without Coins

The same method works on strings. How many binary strings of length n have no two ones next to each other? Track how the string ends. Let ends0 be the count of valid strings ending in 0, and ends1 those ending in 1.

A string of one more letter ends in 0 after any valid string, so the new ends0 is ends0 + ends1. It ends in 1 only after a string that ends in 0, so the new ends1 is the old ends0.

```python
def no_adjacent_ones(n):
    ends0, ends1 = 1, 1                       # strings of length 1: "0" and "1"
    for _ in range(n - 1):
        ends0, ends1 = ends0 + ends1, ends0
    return ends0 + ends1
```

For lengths 1 to 9 it gives 2, 3, 5, 8, 13, 21, 34, 55 and 89, the Fibonacci numbers, and a brute force over all strings of those lengths gave the same list. This is the counting version of the state idea from [Defining States and Transitions](/algorithms/states-transitions): the last letter is the piece of history the future needs.

Counting subsets of numbers that sum to a target works like the knapsack table of [Knapsack Problems](/algorithms/knapsack), with a sum in place of a max. We checked it against trying all subsets on 500 random cases.

## When the Count Is Huge

Counts grow fast, and a language with fixed width integers will overflow. The usual request is the count modulo 1,000,000,007, which works because adding and multiplying can be done on remainders, as in [Modular Arithmetic](/algorithms/modular-arithmetic).

```python
MOD = 10**9 + 7
ways = [1] + [0] * amount
for c in coins:
    for a in range(c, amount + 1):
        ways[a] = (ways[a] + ways[a - c]) % MOD      # reduce after every addition
```

For the six dollar coins and an amount of a million cents, this took 0.72 s and gave 499,492,980. For 100,000 cents the exact count has 17 digits, and its remainder matched the modular table. The modular version needs only sums of remainders, so it can't overflow a 64 bit integer.

## Key Points

- A counting DP uses the optimization's recurrence with a sum, and what counts as the same way is set by the state, and in the coin loops by which loop is outside
- Coins on the outside count piles, 11 for 11 cents with 1, 2 and 5, and the amount on the outside counts sequences, 218, and both matched listings on 300 random cases
- The same table gives other questions by changing how look backs combine: or for possible, min for the fewest, sum for the count
- Partitions are piles of coins 1 to n, with 190,569,292 for n = 100, and binary strings with no two adjacent ones follow the Fibonacci numbers, found by tracking the last letter
- For huge counts, reduce modulo 1,000,000,007 after every addition, which took 0.72 s for an amount of a million
