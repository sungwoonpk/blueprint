> In a **sequence**, order carries meaning, and the next item often depends on earlier ones. Models differ in how much history they look at: a **Markov** model uses a fixed number of recent items, a fixed window of a network does the same with shared weights, and recurrent and attention models can use arbitrary history. More context needs more data, unless parameters are shared.

Text, clicks, sensor readings and sales over time are sequences. A model that ignores order would see "dog bites man" and "man bites dog" as identical.

## Common Tasks

| Task | Input and Output | Example |
| --- | --- | --- |
| Next-item prediction | Past items to the next | Autocomplete, language models |
| Sequence classification | A sequence to a label | Sentiment of a review |
| Tagging | A label per item | Marking names in a sentence |
| Sequence to sequence | A sequence to another | Translation, summaries |

## The Markov Idea

A **Markov model of order k** assumes the next item depends only on the previous k. Order 1 uses the last item. For words these are called n-grams, with n = k + 1. Estimation is counting, as in [Naive Bayes](/data-ai/naive-bayes).

The number of possible contexts is V to the power k, for a vocabulary of V items. It explodes.

## A Dependency Three Steps Back

We built a sequence of 6 symbols where each new symbol repeats the one three steps earlier with probability 0.8, and is random otherwise. The best any model can do is 83.3 percent accuracy. We counted contexts from 5,000 items and tested on 20,000:

| Order | Possible Contexts | Accuracy | Log Loss | Test Contexts Never Seen |
| --- | --- | --- | --- | --- |
| 0 | 1 | 16.2% | 1.793 | 0% |
| 2 | 36 | 16.2% | 1.860 | 0% |
| 3 | 216 | 83.1% | 0.800 | 0% |
| 4 | 1,296 | 76.9% | 0.927 | 8% |
| 6 | 46,656 | 62.0% | 1.166 | 28% |
| 8 | 1,679,616 | 48.8% | 1.369 | 48% |

Below order 3 the model can't see the dependency and is at chance. Order 3 reaches the limit. Longer orders include the useful item and still do worse, because the data is split among so many contexts that half of the test contexts at order 8 were never seen.

## Sharing Weights Across Positions

A small network reading a window of the last k symbols doesn't need to see every exact context:

| Network Input Window | Accuracy | Log Loss | Parameters |
| --- | --- | --- | --- |
| 2 | 15.7% | 1.869 | 1,222 |
| 3 | 83.1% | 0.776 | 1,606 |
| 8 | 82.4% | 0.860 | 3,526 |

With a window of 8, the counting model fell to 48.8 percent and the network held 82.4, because it learned that only one position matters. But the window is still fixed: a dependency 20 steps back needs a window of 20 or more, and every extra position adds weights.

## Going Further

Two ideas remove the fixed window:

- **Carry a state** forward and update it at each step, the idea of [Recurrent Neural Networks](/data-ai/rnns)
- **Look at all earlier items at once** and choose which matter, the idea of [Attention](/data-ai/attention)

## Cautions

- Split sequences **by time or by whole sequence**, never by shuffled rows, or the model sees its neighbors, as [Data Leakage](/data-ai/data-leakage) warned
- Compare with simple baselines such as repeating the last value, often strong in time series
- Evaluate at the horizon you need: next step is easier than twenty ahead

## Key Points

- Sequence models differ in how much history they can use and how they share parameters
- A Markov model of order k has V^k contexts, which quickly become unseen
- On a sequence that depends on 3 steps back, order 3 reached 83 percent and order 8 fell to 49
- A network with a window of 8 held 82 percent by learning which position mattered
- <u>Match the history to the dependency, and share parameters across positions</u>
