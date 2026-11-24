> **Learning** is choosing, from a family of candidate functions, the one that best maps inputs to outputs on examples we have. A learning problem has an unknown rule that links features to a label, a family of functions we allow ourselves to search, a measure of error and a method for searching. Everything else in machine learning is a choice of one of these four.

[From Writing Rules to Learning from Data](/data-ai/rules-to-learning) built a price suggester by letting a program find the weights. This chapter takes the same example apart. Here is the idea underneath: a model is a guess at a function, and learning is the search for a good guess.

## The Four Pieces

Suppose the world has a rule f that takes a listing's features, such as list price, age and condition, and returns the price it sells for. We don't know f. We have 3,000 past sales, each an input paired with the output f produced, plus noise.

| Piece | In General | In the Price Example |
| --- | --- | --- |
| Target function | The unknown rule f from inputs to outputs | What a book really sells for, given its features |
| Hypothesis class | The set of functions we search, written H | Prices that are a list price times a rate depending on age, condition and edition |
| Loss | A number measuring how wrong a candidate is on the examples | Average dollar gap between prediction and sold price |
| Learning algorithm | A procedure that picks a function from H with low loss | Solve for the weights that minimize the loss |

The learning algorithm can only return something inside H. If f isn't in there, or near it, the best we can do is the closest thing in H.

## A Bigger Family, A Better Fit

We trained five hypothesis classes on 3,000 simulated sales and measured the average error on 2,000 sales the models never saw:

| Hypothesis Class | Error on Training Sales | Error on Unseen Sales |
| --- | --- | --- |
| Constant: always the average price | $22.56 | $23.11 |
| Price proportional to list price | $15.28 | $16.30 |
| Plus an age effect | $9.05 | $9.32 |
| Plus condition and new-edition effects | $3.48 | $3.52 |
| Plus squared terms of list price and age | $3.47 | $3.52 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Error on unseen sales falls from 23.11 dollars to 3.52 dollars as the hypothesis class grows, then stops falling">
<div class="hbar"><span>Constant</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">$23.11</span></div>
<div class="hbar"><span>List price</span><span class="track"><span class="fill" style="--w: 70.5%"></span></span><span class="value">$16.30</span></div>
<div class="hbar"><span>Plus age</span><span class="track"><span class="fill" style="--w: 40.3%"></span></span><span class="value">$9.32</span></div>
<div class="hbar peak"><span>Plus condition, edition</span><span class="track"><span class="fill" style="--w: 15.2%"></span></span><span class="value">$3.52</span></div>
<div class="hbar"><span>Plus squared terms</span><span class="track"><span class="fill" style="--w: 15.2%"></span></span><span class="value">$3.52</span></div>
</div>
<figcaption>Error on 2,000 unseen sales as the hypothesis class grows</figcaption>
</figure>

The first three steps matter a great deal, because each class contains something closer to f than the one before. The fourth reaches the floor. The fifth class is richer and gains nothing.

## The Noise Floor

Our simulation lets us compute something real data never gives us: the error of a predictor that knows f exactly. It is **$3.50**. The sold price in this world contains random noise, because two identical books sell for slightly different amounts, and no function of the features can predict noise. Our fourth model scored $3.52, within two cents of the floor.

This number is called the **irreducible error**. Real problems have one too, and we rarely know it, which is why a model that stops improving is ambiguous: either we reached the floor, or we need better features or a richer class.

## Memorizing Is a Hypothesis Too

A lookup table is a legitimate hypothesis class. We grouped listings into the 56 combinations of age, condition and edition, and stored the average price-to-list ratio of each group. It scored $3.43 on training sales and $3.52 on unseen ones, as good as the formula.

It works here because there are only 56 cells and thousands of sales to fill them. With more features, cells multiply and most would be empty, so a table would have nothing to say about listings in empty cells. That is the problem of **generalization**: doing well on cases that weren't in the examples, which [Overfitting and Underfitting](/data-ai/overfitting) takes up.

## Inductive Bias

Every hypothesis class assumes something. Ours assumes the price is a list price times a rate, and that age shifts the rate by a constant amount per year. If that is close to true, learning is fast and needs few examples. If it is wrong, no amount of data helps. This built-in assumption is the **inductive bias** of the model, and choosing a family of models is mostly choosing one.

- A **simple** class has a strong bias: it learns from few examples and may be wrong in a way more data can't fix
- A **rich** class has a weak bias: it can match almost anything and needs more data to find the right thing

## The Same Picture Elsewhere

A spam filter's target function maps an email to spam or not. A translator maps a sentence in one language to a sentence in another. A language model maps a text prefix to a distribution over the next word. 

Deep networks are a very rich hypothesis class searched by [Gradient Descent](/data-ai/gradient-descent). The vocabulary is the same: a target we want, a class we search, a loss we minimize and examples that stand in for the world.

## Key Points

- Learning picks a function from a hypothesis class that has low loss on examples, to approximate an unknown rule
- Richer classes fit better until they reach the irreducible error: our price models fell from $23.11 to $3.52 against a floor of $3.50
- Noise sets a floor no model can pass, and a model that stops improving may be at it
- Every class carries an inductive bias, and a wrong one can't be fixed with more data
- <u>Pick the simplest hypothesis class that can reach the floor, and then spend effort on data</u>
