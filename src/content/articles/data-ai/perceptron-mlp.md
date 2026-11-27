> A **multilayer network** stacks linear layers with a nonlinear function between them. The hidden layers compute new features from the inputs, and the last layer is an ordinary linear model on those features. Without the nonlinearity the whole stack would collapse into one linear map. With it, the network can learn boundaries that no line can draw.

Every model so far worked on features that a person chose: a log of the price ratio, a cross of edition and age, a kernel. A neural network learns the features and the final model together.

## From One Unit to a Layer

A single **unit** computes a weighted sum of its inputs plus a bias, then applies an **activation function**. A **layer** is many units reading the same inputs, which in matrix form is h = a(Wx + b), as in [Matrix Multiplication and Linear Maps](/data-ai/matrix-multiplication). The output of one layer feeds the next. Layers between the input and output are **hidden**, and a network of fully connected layers is called a multilayer perceptron, or MLP.

<figure class="diagram">
<div class="flow">
<div class="node">Inputs</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Weighted sums</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Nonlinearity</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Linear model on the new features</div>
</div>
<figcaption>One hidden layer: learn features, then classify them linearly</figcaption>
</figure>

If the activation were removed, two layers would compute W₂(W₁x), which is just another matrix times x. Depth would buy nothing. The nonlinearity is what makes layers add up to more than one.

## XOR by Hand

[Linear Classifiers](/data-ai/linear-classifiers) showed that no line solves XOR: output 1 when exactly one of two inputs is 1. A network with two hidden units does, using the ReLU activation, max(0, z). Let h₁ = ReLU(x₁ + x₂) and h₂ = ReLU(x₁ + x₂ − 1), and output y = h₁ − 2h₂.

| x₁ | x₂ | h₁ | h₂ | y |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 2 | 1 | 0 |

The two hidden units turn the inputs into a space where a straight line separates the answers. Training finds weights like these by itself, using [Backpropagation](/data-ai/backprop) and [Gradient Descent](/data-ai/gradient-descent).

## A Disc Inside a Ring

We trained networks with one hidden layer on 300 points labeled by whether they fall inside a disc, with 5 percent of labels flipped, and tested on 3,000 points. Each size was trained from five random starts:

| Hidden Units | Parameters | Mean Test Accuracy | Worst and Best Start |
| --- | --- | --- | --- |
| None, a linear model | 6 | 62.4% | 59.9% to 63.3% |
| 2 | 12 | 66.7% | 63.3% to 70.3% |
| 3 | 17 | 82.2% | 68.7% to 89.7% |
| 4 | 22 | 81.8% | 69.4% to 90.1% |
| 8 | 42 | 90.5% | 89.7% to 91.3% |
| 32 | 162 | 90.9% | 89.2% to 92.7% |

A linear model is stuck near 62 percent. With 8 units the network reaches 90.5 percent, close to the ceiling set by the flipped labels, and about as good as the kernel of [The Kernel Trick](/data-ai/kernels). 

With 3 or 4 units the answer depends on luck: some starts reach 90 percent and others stall below 70. Three units can draw a triangle around a disc, but training doesn't always find it. Extra units are partly insurance against bad starts.

## When It Doesn't Help

We also tried MLPs on the 14-day sales data of earlier chapters, with five input features and 3,000 training listings:

| Model | Test AUC | Train AUC | Test Log Loss |
| --- | --- | --- | --- |
| Logistic regression | 0.766 | 0.774 | 0.443 |
| One hidden layer of 16 | 0.761 | 0.780 | 0.448 |
| Two hidden layers of 64 | 0.746 | 0.810 | 0.475 |

The bigger the network, the better it fit the training data and the worse it did on new data. The true relationship here is close to linear in the log-odds, so there are no features worth learning, and the extra capacity learns noise.

Neural networks earn their cost where useful features are hard to write by hand: pixels, audio, text. On small tables, [Boosting and Gradient Boosting](/data-ai/boosting) or a linear model is often the better first try.

## Parameters and Shapes

A layer from n inputs to m units has n × m weights and m biases. A network with layers 5, 64, 64 and 2 has 5×64+64 plus 64×64+64 plus 64×2+2, which is 4,674 parameters. Counting them is a quick check of what a model can memorize and what it will cost.

## Key Points

- A multilayer network alternates linear maps and nonlinear activations, and the hidden layers learn features
- Without a nonlinearity, stacked layers equal one linear layer
- Two ReLU units solve XOR by hand, and 8 hidden units took a disc problem from 62 to 90 percent
- Small networks depend on the random start, and on near-linear tabular data bigger networks did worse than logistic regression
- <u>Use a network when the useful features are hard to write by hand, and compare it with a linear baseline</u>
