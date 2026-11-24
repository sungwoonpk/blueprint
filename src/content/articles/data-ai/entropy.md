> **Entropy** measures the average surprise of a random variable, in bits when the logarithm is base 2: H(p) = −Σ p log₂ p. It is also the fewest bits per symbol that any code can average for the distribution. It is zero when the outcome is certain and largest when every outcome is equally likely, and it is the base quantity of the losses that train classifiers.

Probability so far counted how often things happen. Information theory asks what it costs to say which one did. The question started as engineering, how many bits a message needs, and became the language in which machine learning writes its objectives.

## Surprise and Its Average

An event with probability p carries a surprise of −log₂ p bits. A certain event, p = 1, carries none. A fair coin flip, p = ½, carries 1 bit. An event of probability ¼ carries 2 bits, and a rarer one carries more. Surprise adds for independent events, since probabilities multiply and logarithms turn products into sums, which is the reason for using a logarithm at all.

**Entropy** is the expected surprise: H(p) = Σ pᵢ × (−log₂ pᵢ). Shannon's 1948 paper chose the logarithm base freely and noted that base 2 gives units he named binary digits, or bits. A natural logarithm gives **nats**, and machine learning libraries usually work in nats. The two differ by a constant factor.

| Distribution | Entropy in Bits |
| --- | --- |
| A fair coin, [0.5, 0.5] | 1.000 |
| A biased coin, [0.9, 0.1] | 0.469 |
| Condition of a book, uniform over 4 | 2.000 |
| Condition of a book, [0.50, 0.25, 0.15, 0.10] | 1.743 |
| A sure thing, [1.0] | 0 |

The uniform distribution over 4 outcomes has the maximum entropy, 2 bits, and any skew lowers it. A predictable variable is cheap to describe, and a spread out one is expensive.

## Entropy Is a Code Length

The same number is a limit on compression. A **prefix code** gives each outcome a string of bits so that no string begins another. Likely outcomes get short strings and rare ones get long strings. The average length can't beat the entropy, and a good code gets close. Huffman's method builds an optimal prefix code from the probabilities, and we ran it:

| Distribution | Entropy | Huffman Average Length |
| --- | --- | --- |
| Condition, [0.50, 0.25, 0.15, 0.10] | 1.743 | 1.750 |
| Powers of ½, [0.5, 0.25, 0.125, 0.125] | 1.750 | 1.750 |
| Eight skewed outcomes | 2.465 | 2.530 |

For the condition variable, one outcome gets a 1 bit code and the rarest two get 3 bits, for an average of 1.75, only 0.007 over the entropy. When all the probabilities are powers of ½ the match is exact.

Otherwise a code that assigns whole bits to each symbol loses a little, which coding several symbols together recovers. For the biased coin with p = 0.9, one flip per code word needs 1 bit, although the entropy is 0.469. Coding pairs of flips averaged 0.645 bits a flip, and triples 0.533, closing in on the limit.

## Why This Matters to a Model

- **Uncertainty of a label**: the entropy of the class distribution tells how hard the problem is before any model, and a classifier that does no better than it has learned nothing
- **Decision trees**: a split is chosen by the drop in entropy it causes, the information gain in [Decision Trees](/data-ai/decision-trees)
- **Dependence**: the mutual information of [Joint Distributions and Independence](/data-ai/joint-independence) is a difference of entropies, how much knowing one variable reduces the entropy of the other
- **Maximum entropy**: among all distributions with given averages, the most spread out one is the least committal, a principle that gives the Gaussian and the softmax as answers to constrained problems like those in [Constrained Optimization and Lagrange Multipliers](/data-ai/constrained-optimization)

## Entropy Has Limits

Entropy depends only on the probabilities, not on what the outcomes mean. A rare typo and a rare lawsuit have the same surprise. It also needs the true distribution, which in practice is estimated from data, and estimates from small samples are biased low. [Cross-Entropy and KL Divergence](/data-ai/cross-entropy-kl) shows what happens when the distribution used is not the true one, which is the situation a model is always in.

## Key Points

- Surprise is −log₂ p bits, and entropy is its average, zero for a sure thing and largest for a uniform distribution
- Entropy is the fewest bits per symbol any code can average: for the condition variable it was 1.743 bits, and a Huffman code averaged 1.750
- Coding symbols in groups closes the gap: pairs of flips of a biased coin averaged 0.645 bits against an entropy of 0.469, and triples 0.533
- Models use entropy to measure label uncertainty, to choose tree splits and to measure dependence through mutual information
- <u>Entropy is the cost of describing an outcome when you know the true distribution</u>
