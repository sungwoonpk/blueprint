> A **loop invariant** is a statement about a loop's variables that is true each time the loop condition is checked. Proving it holds from start to finish is how we prove a loop correct.

A few passing tests can't prove that a method works on any input, as [What is an Algorithm?](/algorithms/what-is-an-algorithm) showed. Loops make this hard in a specific way: a loop runs as many times as the input is long, so there are endless runs to reason about. A loop invariant lets us cover them with three small checks.

## One Loop, Three Checks

Take the used textbook listings on a campus marketplace. We want the lowest price.

```python
def cheapest(prices):
    best = prices[0]
    i = 1
    while i < len(prices):
        # invariant: best is the lowest of prices[0..i-1]
        if prices[i] < best:
            best = prices[i]
        i += 1
    return best
```

The comment is the invariant. It describes what the loop has achieved so far, and the figure shows it in the middle of a run, just before `i = 3` is examined.

<figure class="diagram">
<div class="cells ptrs">
<div class="cell done">24<small>0</small></div>
<div class="cell done" data-ptr="best">18<small>1</small></div>
<div class="cell done">31<small>2</small></div>
<div class="cell hl" data-ptr="i">15<small>3</small></div>
<div class="cell">22<small>4</small></div>
</div>
<figcaption>The shaded cells have been looked at, and best is the lowest among them. The outlined cell is next</figcaption>
</figure>

To prove the loop correct, we check the invariant at three moments.

| Step | The Question | For the Lowest Price |
| --- | --- | --- |
| Initialization | Is it true before the first check of the loop condition? | After the first two lines, best is `prices[0]`, the lowest of one price |
| Maintenance | If it is true before an iteration, is it true after? | Compare `prices[i]` with best and keep the lower, so best covers one more price |
| Termination | When the loop stops, what does it tell us? | The loop stops when `i` equals the list length, so best is the lowest of all of them |

Initialization and maintenance are **induction** in loop form: the first is the base case and the second is the inductive step. The invariant has to hold at the last check too, the one where the condition fails and the loop exits. That is why termination can use it.

There is one more thing to show. The checks above prove that if the loop stops, the answer is right. They don't prove that it stops. Here `i` grows by one each time and the loop ends at the list length, so it does. Proving the answer right is **partial correctness**, and adding the proof that the loop stops gives **total correctness**.

## Finding the Invariant

Writing the invariant is the creative step. A reliable way to find it is to ask what is true after the first few iterations, then state the general pattern.

After one iteration, best is the lowest of two prices. After two, of three. So after `i - 1` iterations, it is the lowest of the first `i`. The statement has to land between two extremes.

- **Too weak**: "best is one of the prices" is true throughout, but when the loop ends it does not tell us the price is the lowest
- **Too strong**: "best is the lowest of the whole list" is what we want at the end, but it is false at the start, so initialization fails

A good invariant is true at the start, survives the loop body, and is strong enough to give the answer when the loop stops.

## What the Checks Catch

Each check fails for a different kind of bug. Here are two broken versions of the loop.

In the first, the starting value is wrong. Someone sets `best = 0`, thinking of zero as a safe start.

```python
best = 0                  # should be prices[0]
```

Initialization fails right away: best is 0, but the invariant says it should be the lowest of the first price, which is `prices[0]`. On `[24, 18, 31, 15, 22]` the function returns 0, a price no listing has.

In the second, the loop stops early.

```python
while i < len(prices) - 1:    # should be len(prices)
```

Initialization and maintenance both hold, so the loop is fine while it runs. Termination fails: when `i` reaches the last position, the invariant covers the prices before the last, so it can't promise the lowest overall. On `[24, 18, 31, 22, 15]` the function returns 18 and misses the 15.

Off by one errors often look like this. Reading the invariant tells you which cases the loop has covered and which it hasn't.

## A Window That Shrinks

An invariant doesn't have to say "the part I've seen is done." In binary search, it says where the answer must be. The list is sorted, and we look for a price in it.

```python
def contains(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        # invariant: if target is in a, it is in a[lo..hi]
        mid = (lo + hi) // 2
        if a[mid] == target:
            return True
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

The invariant is about a window, `a[lo..hi]`, that must contain the target if the target exists at all.

<figure class="diagram">
<p class="rowname">Start</p>
<div class="cells ptrs">
<div class="cell hl" data-ptr="lo">3<small>0</small></div>
<div class="cell hl">8<small>1</small></div>
<div class="cell hl">12<small>2</small></div>
<div class="cell hl" data-ptr="mid">17<small>3</small></div>
<div class="cell hl">21<small>4</small></div>
<div class="cell hl">26<small>5</small></div>
<div class="cell hl">30<small>6</small></div>
<div class="cell hl" data-ptr="hi">35<small>7</small></div>
</div>
<p class="rowname">After 17 &lt; 26</p>
<div class="cells ptrs">
<div class="cell dim">3<small>0</small></div>
<div class="cell dim">8<small>1</small></div>
<div class="cell dim">12<small>2</small></div>
<div class="cell dim">17<small>3</small></div>
<div class="cell hl" data-ptr="lo">21<small>4</small></div>
<div class="cell hl">26<small>5</small></div>
<div class="cell hl">30<small>6</small></div>
<div class="cell hl" data-ptr="hi">35<small>7</small></div>
</div>
<figcaption>Searching for 26. The list is sorted, so 17 and everything before it can be dropped</figcaption>
</figure>

The three checks go like this.

- **Initialization**: the window is the whole list, so the target is in it if it is anywhere
- **Maintenance**: if `a[mid]` is smaller than the target, the sorted order puts the target after `mid`, so moving `lo` to `mid + 1` keeps it inside the window. The other branch is the mirror image
- **Termination**: the window size, `hi - lo + 1`, is a whole number that drops by at least one each time, because `mid` leaves the window each time. When it reaches zero the window is empty, and the invariant says the target is not in the list. Returning `False` is correct

The termination check also explains a classic bug. Write `lo = mid` instead of `lo = mid + 1`, and the invariant still holds, because the target is still in the window. But when `lo` equals `mid` and `a[mid]` is smaller than the target, the window doesn't shrink and the loop does not end. Running the broken version on `[1, 3]` with the target 5 loops forever. Partial correctness held, and total correctness didn't.

## Using Invariants in Real Code

You don't need a formal proof each time. Three habits get most of the value.

- Write the invariant as a comment above the loop, as in both examples. A reviewer can then check the three steps against the code
- Check it with an `assert` while testing, such as `assert best == min(prices[:i])`. It costs a full scan on each iteration, so it belongs in tests and not in production
- When a loop has an off by one bug, write down what the invariant should be at the start, at the end and in between. The mismatch usually points at the line

[Measuring Time and Space with Big O](/algorithms/big-o) turns to the other question this roadmap keeps asking: how much work a loop like this does.

## Key Points

- A loop invariant is true each time the loop condition is checked, including the last check that ends the loop
- Prove it with three checks: it holds before the loop (initialization), each iteration keeps it true (maintenance), and when the loop stops it implies the answer (termination)
- These checks are induction, and they give partial correctness. Showing the loop actually stops gives total correctness
- Different bugs fail different checks: a wrong starting value breaks initialization, a wrong loop bound breaks termination, and a step that doesn't shrink the work breaks the stop
