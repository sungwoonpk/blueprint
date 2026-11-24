> A handful of distributions cover most of the randomness a data team meets: the **Bernoulli** and **binomial** for yes or no outcomes and counts of them, the **Poisson** and **exponential** for events in time, the **uniform** for no preference, and the **Gaussian** for sums of many small effects. Each has a story, a few parameters, and a place in machine learning.

[Random Variables and Distributions](/data-ai/random-variables) described distributions in general. Few real quantities need a new formula, because nature and arithmetic keep reaching for the same shapes. Recognizing which one a quantity follows tells what to assume, what to simulate and which loss to use.

## The Usual Cast

| Distribution | Story | In the Textbook App | Mean | Variance |
| --- | --- | --- | --- | --- |
| Bernoulli(p) | One yes or no trial | A listing sells within 14 days | p | p(1 − p) |
| Binomial(n, p) | Number of yeses in n trials | Sales among 500 listings | np | np(1 − p) |
| Poisson(λ) | Events at a steady rate | Copies sold per day | λ | λ |
| Exponential(λ) | Wait until the next event | Time between sales | 1/λ | 1/λ² |
| Uniform(a, b) | Every value in a range equally likely | A random draw in an experiment | (a + b)/2 | (b − a)²/12 |
| Gaussian(μ, σ²) | A sum of many small effects | Noise in the sold price | μ | σ² |
| Categorical(p₁…pₖ) | One of k outcomes | The condition of a book | pᵢ for each | Per category |

The Poisson is unusual in having its mean equal to its variance, a quick check on whether count data fits.

## Counts and Rates

A binomial with a large n and a small p behaves like a Poisson with λ = np. We checked it: each of 2,000 students opens a listing in a given minute with probability 0.0015, a binomial with an expected 3 opens. Over 5,000 minutes, the count had a mean of 3.002 and a variance of 3.001, against the binomial's np = 3 and np(1 − p) = 2.996, and the Poisson's 3 for both. The two families are the same story seen from different sides.

The exponential describes the wait between Poisson events. At a rate of 3 sales an hour, the average gap should be a third of an hour, and we found 0.335. The chance of a gap longer than an hour is e⁻³ = 4.98 percent by formula, and we measured 5.01 percent. The exponential is **memoryless**: having waited an hour already says nothing about the wait that remains. Among gaps over an hour, 4.88 percent also lasted past two hours, matching 4.98 percent. This is the reason that retry timers and queue models in the system design phases use it.

## Why the Gaussian Is Everywhere

The **central limit theorem** says that the sum, or average, of many independent small effects is close to Gaussian, whatever the shape of each effect. We averaged k draws from a flat uniform distribution, and counted how many averages fell within one and two standard deviations of their mean:

| Draws Averaged | Within 1 Standard Deviation | Within 2 Standard Deviations |
| --- | --- | --- |
| 1 | 57.8% | 100.0% |
| 2 | 65.0% | 96.7% |
| 5 | 67.1% | 95.8% |
| 12 | 68.0% | 95.5% |
| 30 | 68.3% | 95.5% |
| A Gaussian | 68.3% | 95.4% |

A single uniform draw is nothing like a bell, since all values are equally likely and every one is within two standard deviations. Averaging 12 is already close, and 30 is almost exact. Skewed sources take longer: the average of 30 draws from an exponential, which is very skewed, put 68.6 percent within one standard deviation and kept a small skew of 0.37. The rule of thumb that 30 is enough is a rough one, and the sources of the data matter.

That is why measurement noise, the total of many small causes, is modeled as Gaussian, and why a mean squared error loss has a Gaussian story behind it, as [From Likelihood to Loss Functions](/data-ai/mle-losses) will show. It also explains why [The Multivariate Gaussian](/data-ai/multivariate-gaussian) gets its own page.

## Matching the Model to the Data

Choosing a distribution is a modeling decision with consequences:

- **Binary outcome**: Bernoulli, which leads to [Logistic Regression](/data-ai/logistic-regression) and its cross entropy loss
- **One of several categories**: categorical, which leads to softmax in [Multiclass Classification and Softmax](/data-ai/softmax)
- **A count**: Poisson, which suits predicting the number of sales and links to [Generalized Linear Models](/data-ai/glm)
- **A measurement with symmetric noise**: Gaussian, which leads to least squares
- **A skewed positive amount, such as a price**: often modeled on a log scale, where it looks Gaussian, as our lognormal prices did

Assumptions can be wrong, and a plot of the data against the assumed distribution is the first check. Heavy tails, where extremes are far more common than a Gaussian allows, cause trouble for methods that assume it, as [Outliers and Noise](/data-ai/outliers) discusses.

## Key Points

- A few distributions recur: Bernoulli and binomial for yes or no outcomes, Poisson and exponential for events in time, uniform, Gaussian and categorical
- A binomial with large n and small p is a Poisson: in our check both had mean 3.0 and variance near 3.0
- The exponential is memoryless: among waits over an hour, 4.88 percent passed two hours, against 4.98 percent predicted
- Averages become Gaussian: with 12 uniform draws, 68.0 percent were within one standard deviation against 68.3 percent for a Gaussian
- <u>Pick the distribution by the data's story</u>, since it decides the loss, the model and what to check
