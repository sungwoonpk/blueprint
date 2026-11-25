> A model **overfits** when it learns the noise and quirks of its training examples and so does well on them and badly on new data. It **underfits** when it is too simple to capture the real pattern and does badly on both. The gap between training error and held-out error is the sign, and more data, a simpler model or a penalty are the remedies.

[Learning as Function Approximation](/data-ai/what-is-learning) said a rich enough model can match any set of examples. That is the danger: matching the examples is not the aim. The aim is to predict cases the model hasn't seen.

## A Curve Through Twenty Points

We simulated a price share that falls with the age of a book, plus noise of 4 points of list price. This 4 is the floor: no model can do better than a typical miss of 4 points. We drew 20 training sales and fitted polynomials of increasing degree in age. The errors below are in points of list price, on the training sales and on 2,000 fresh ones:

| Degree | Error on the 20 Training Sales | Error on Fresh Sales |
| --- | --- | --- |
| 0, a constant | 16.9 | 19.1 |
| 1, a line | 5.3 | 5.7 |
| 2 | 4.2 | 4.0 |
| 3 | 4.2 | 4.3 |
| 4 | 3.6 | 12.1 |
| 6 | 3.2 | 55.2 |
| 9 | 3.1 | 65.4 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Error on fresh sales: constant 19.1, line 5.7, degree 2 4.0, degree 3 4.3, degree 4 12.1, degree 6 55.2, degree 9 65.4">
<div class="hbar"><span>Degree 0</span><span class="track"><span class="fill" style="--w: 29%"></span></span><span class="value">19.1</span></div>
<div class="hbar"><span>Degree 1</span><span class="track"><span class="fill" style="--w: 8.7%"></span></span><span class="value">5.7</span></div>
<div class="hbar peak"><span>Degree 2</span><span class="track"><span class="fill" style="--w: 6.1%"></span></span><span class="value">4.0</span></div>
<div class="hbar"><span>Degree 3</span><span class="track"><span class="fill" style="--w: 6.6%"></span></span><span class="value">4.3</span></div>
<div class="hbar"><span>Degree 4</span><span class="track"><span class="fill" style="--w: 18.5%"></span></span><span class="value">12.1</span></div>
<div class="hbar"><span>Degree 6</span><span class="track"><span class="fill" style="--w: 84.4%"></span></span><span class="value">55.2</span></div>
<div class="hbar"><span>Degree 9</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">65.4</span></div>
</div>
<figcaption>Error on fresh sales for models of growing flexibility, trained on 20 sales</figcaption>
</figure>

Training error only falls as the model grows, down to 3.1, below the noise floor of 4, which can only mean the model has memorized noise. The fresh error fell until degree 2, which matches the true shape, then climbed and exploded. The jumps from degree to degree are real for a single draw of 20 points, since a high-degree curve bends to hit each point and swings wildly in between.

- **Underfitting**: degrees 0 and 1. Both errors are high and similar. The model is too stiff
- **A good fit**: degrees 2 and 3. Training and fresh errors are close and near the floor
- **Overfitting**: degrees 4 and up. Training error is below the floor and fresh error is far above it

## Data Cures It

The same degree-9 polynomial with more data behaves differently. We averaged 30 training sets of each size, in points of list price:

| Training Sales | Line: Train / Fresh | Degree 9: Train / Fresh |
| --- | --- | --- |
| 20 | 4.8 / 5.8 | 2.7 / 111.9 |
| 40 | 5.0 / 5.6 | 3.4 / 9.0 |
| 100 | 5.2 / 5.4 | 3.7 / 4.2 |
| 400 | 5.4 / 5.3 | 3.9 / 4.0 |

With 100 sales the flexible model is almost as good as the right one, and with 400 it is the same. 

The line is different: more data gives it no relief, both its errors settle near 5.3, above the floor. That is the signature of high bias. The flexible model had a variance problem that data solved, and the stiff model had a bias problem that data cannot solve. These curves, error against training size, are **learning curves**, and they are one of the best diagnostics.

## Reading the Curves

| Symptom | Diagnosis | Remedies |
| --- | --- | --- |
| Training error high, held-out error similar | Underfitting, high bias | A richer model, more or better features, less regularization |
| Training error low, held-out error much higher | Overfitting, high variance | More data, a simpler model, regularization, fewer features, early stopping |
| Both low and close | Good fit | Stop, or improve the data |

## Where Overfitting Hides

- **Many features, few examples**: the 25 features on 60 rows of [Regularization with L1 and L2](/data-ai/regularization)
- **Tuning on the test set**: [Training, Validation and Test Sets](/data-ai/train-val-test) showed the lottery effect
- **Leakage**: a feature that contains the answer is a perfect way to overfit, as in [Data Leakage](/data-ai/data-leakage)
- **Duplicates and near-duplicates** across training and test
- **Training too long**, for iterative models, which is why validation loss decides when to stop

Modern very large models complicate the old story: test error can fall again once a model is big enough to fit the training data exactly, called double descent, which Stanford's CS229 notes discuss. The practical checks remain the same, with held-out data as the judge.

## Key Points

- Overfitting is low training error with high held-out error, and underfitting is high error on both
- On 20 simulated sales the right shape (degree 2) scored 4.0 on fresh data, while degree 9 scored 65.4 with a training error below the noise floor of 4
- More data fixes a flexible model, with 100 sales bringing degree 9 to 4.2, and cannot fix a model that is too stiff
- Learning curves of error against training size separate bias from variance
- <u>Compare training and held-out error, and suspect overfitting when the model beats the noise floor</u>
