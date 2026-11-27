> **Multi-head attention** runs several smaller attentions in parallel, each with its own projections, and joins the results, so one layer can track several kinds of relation at once. **Positional encoding** adds information about each item's place, since attention alone ignores order.

[Self-Attention](/data-ai/self-attention) gave one way of mixing. Language has many relations at once: grammar, reference, topic. And "dog bites man" must differ from "man bites dog".

## Multiple Heads

Split the model's vector size d into h heads of size d/h. Each head has its own query, key and value matrices and runs attention independently. The outputs are concatenated and passed through one more matrix. The total cost is about the same as one big attention, since each head is small.

The Transformer paper uses 8 heads with d = 512, so each head works with 64 numbers. Its authors explain that heads let the model attend to information from different representation subspaces, which averaging a single attention would blur.

| | One Large Head | Eight Small Heads |
| --- | --- | --- |
| Query size | 512 | 64 each |
| Kinds of pattern | One mix | Several in parallel |
| Parameters | About the same | About the same |

## Why Order Is Lost

We fed a layer without positional information a sequence and then the same items shuffled. The outputs were exactly the shuffled outputs: the largest difference was 0.0. The layer cannot tell what came first. With a positional signal added, the difference was 0.43.

## Sinusoidal Encoding

The original Transformer adds to each position a fixed vector of sines and cosines at many wavelengths. For position p and a pair of dimensions, the values are sin(p / 10000^(2i/d)) and cos of the same. Positions 0 to 3 with d = 8:

| Position | Dim 0 | Dim 1 | Dim 2 | Dim 3 |
| --- | --- | --- | --- | --- |
| 0 | 0.000 | 1.000 | 0.000 | 1.000 |
| 1 | 0.841 | 0.540 | 0.100 | 0.995 |
| 2 | 0.909 | −0.416 | 0.199 | 0.980 |
| 3 | 0.141 | −0.990 | 0.296 | 0.955 |

Early dimensions change quickly, like a second hand, and later ones slowly, like an hour hand, so every position gets a distinct pattern. The paper reports nearly the same results with positions learned as ordinary weights.

## Does It Matter

On a task of reversing 12 symbols with a small transformer:

| Positional Information | Symbols Correct | Whole Sequences Correct |
| --- | --- | --- |
| Sinusoidal | 100% | 100% |
| Learned | 100% | 100% |
| None | 26.6% | 0% |

Without positions, the model cannot know which symbol was first.

## Other Schemes

- **Relative** encodings feed the distance between two items into the score
- **Rotary** encodings rotate query and key pairs by an angle that depends on position, and are common in current language models
- **Learned absolute** positions don't extend past the length seen in training

The choice matters most when models must handle longer inputs than they trained on.

## Key Points

- Several small heads run in parallel at about the cost of one large one
- Attention without positional information is blind to order: shuffling inputs just shuffles outputs
- Sinusoidal and learned positions worked equally well on our task, and no positions failed
- Relative and rotary schemes encode distance and are common now
- <u>Check that a model has positional information before expecting it to understand order</u>
