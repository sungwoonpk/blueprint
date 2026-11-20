> A **greedy algorithm** builds a solution one step at a time, taking whichever choice looks best by a simple rule and not reconsidering it later. It is correct when some optimal solution starts with the greedy choice, and what remains is a smaller problem of the same kind.

A cashier owes 40 cents in change, with coins of 1, 5, 10 and 25. The natural move is to hand over the biggest coin that fits, then repeat: 25, then 10, then 5. That is three coins, and two coins can't reach 40 cents. The rule needed no search, no table and no undo.

Now move to a country whose coins are 1, 5, 10, 20, 25 and 50. The same rule gives 25, 10, 5, which is three coins again, but 20 and 20 pays the same 40 with two. The rule didn't change. The coins did, and with them the answer to whether the rule works.

## The Greedy Idea

Greedy trades thoroughness for speed. [Brute Force](/algorithms/brute-force) looks at every candidate, and [Backtracking](/algorithms/backtracking) tries a choice and takes it back if it fails. A greedy algorithm makes each choice once, by a rule, and moves on. There is no choice to undo, so a typical greedy solution is a sort or a heap followed by one pass, and costs O(n log n).

The risk is clear: a choice that looks best now might block something better later. The skill is telling when that can't happen.

## When It Works

Two properties together make a greedy algorithm correct.

- **The greedy choice is safe**: at least one optimal solution contains the choice the rule makes, so taking it doesn't rule out the best answer
- **The rest is the same problem**: after the choice, what remains is a smaller instance of the same problem, and the best answer to it, joined to the choice, is the best answer overall

The second property is called optimal substructure, and dynamic programming uses it as well. The first is what makes greedy special. In dynamic programming you try every first choice and compare the results. In greedy you prove that one particular first choice is enough. [Exchange Arguments for Greedy Proofs](/algorithms/exchange-arguments) shows how to prove it.

## Coins: One Rule, Different Answers

| Coins | Amount | Greedy | Fewest |
| --- | --- | --- | --- |
| 1, 5, 10, 25 | 40 | 3 coins | 3 coins |
| 1, 5, 10, 20, 25, 50 | 40 | 3 coins | 2 coins |
| 1, 3, 4 | 6 | 3 coins | 2 coins |
| 1, 5, 10, 12, 25 | 15 | 4 coins | 2 coins |

For 6 with coins 1, 3 and 4, greedy takes 4, 1, 1 and misses 3 and 3. For 15 with coins 1, 5, 10, 12 and 25, it takes 12, 1, 1, 1 and misses 10 and 5.

```python
def greedy_coins(coins, amount):
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c               # as many of this coin as fit
        amount %= c
    return count
```

We compared this with an exact table, built the way [Memoization and Tabulation](/algorithms/memoization-tabulation) will describe, for every amount from 1 to 10,000. For the coins 1, 5, 10 and 25, the two agreed on all of them. The euro cent coins, 1, 2, 5, 10, 20 and 50, showed no failure up to 1,000 either.

Then we drew 2,000 random coin systems, each with a 1-cent coin and three others between 2 and 30. Greedy failed on some amount up to 200 in 1,782 of them, or 89%. The pleasant systems we use every day are the exception, and the rule alone doesn't say whether a given set of coins is one of them.

## When It Doesn't: The Courier Again

The delivery route from [Pruning the Search Space](/algorithms/pruning) has a natural greedy rule: from the current stop, drive to the nearest stop not yet visited. It takes one pass and finds a route instantly.

We ran it on 200 random instances of 10 stops and compared with the exact answer from the pruned search. The nearest stop rule found the shortest route in only 17 of them. On average its route was 11.7% longer, and the worst was 44.8% longer.

The rule is cheap and decent, which is why the pruning article used it to get a first good route, but it is a heuristic: there is no guarantee that it is optimal.

Knapsack shows another failure. Choose items with weights and values to fit a bag of limited size, and take items in order of value per unit of weight. We tried this on 2,000 random instances of 10 items, with the bag holding half the total weight, and checked each against all 1,024 subsets.

The rule fell short of the best value in 684 of them, 34%, by 3.9% on average when it was wrong and 15.5% at worst. The best-ratio item can leave an awkward gap that no other item fills.

If the items could be cut, so that you may take part of one, the same rule would be optimal, because any space left over is filled by a piece of the next item and nothing is wasted. The 0/1 version has no such fix, and a different method is needed, as in [From Recursion to Dynamic Programming](/algorithms/recursion-to-dp).

## A Few Rules and Their Records

| Problem | Greedy Rule | Optimal? |
| --- | --- | --- |
| Interval scheduling | Earliest finish first | Yes |
| Minimizing lateness | Earliest deadline first | Yes |
| Huffman codes | Merge the two rarest symbols | Yes |
| Fractional knapsack | Best value per weight first | Yes |
| Coin change | Largest coin first | Only for some coin systems |
| 0/1 knapsack | Best value per weight first | No |
| Courier route | Nearest stop first | No |

The first three are the subject of the next articles, [Greedy Scheduling](/algorithms/greedy-scheduling) and [Huffman Coding](/algorithms/huffman-coding). The last three show that the shape of the rule isn't what decides things.

## Deciding Before You Trust a Rule

1. Try to prove the greedy choice is safe, by an exchange argument
2. Look for a counterexample on small inputs, by comparing with a brute force
3. If the rule fails, change method: backtracking with pruning for small inputs, or dynamic programming when the problem has a table of subproblems

Step 2 is cheap, and it catches most wrong rules in seconds.

```python
def find_counterexample(greedy, exact, random_instance, trials=1000):
    for _ in range(trials):
        instance = random_instance()
        if greedy(instance) != exact(instance):
            return instance                # the rule fails here
    return None
```

A test like this can't prove a rule correct, but a rule that survives thousands of random small cases is worth trying to prove, as in [Edge Cases and Testing](/algorithms/edge-cases).

## Key Points

- A greedy algorithm makes each choice once by a simple rule, so it is usually a sort plus a pass and costs O(n log n)
- It is correct when the greedy choice belongs to some optimal solution and the remainder is a smaller copy of the problem
- The same rule can be right for one input family and wrong for another: largest coin first matched the optimum for 1, 5, 10 and 25 up to 10,000, and failed on 89% of random coin systems
- Nearest stop first was optimal on only 17 of 200 courier instances, and best ratio first fell short on 34% of 0/1 knapsack instances
- Test a rule against brute force on random small inputs, and then try to prove it
