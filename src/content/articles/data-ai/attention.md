> **Attention** lets a model compute, for each output step, a weighted average over all the encoder states, with weights that say which inputs matter now. The decoder gets a fresh context at every step instead of one fixed vector. The weights can be inspected, though they are not a full explanation.

[Encoder-Decoder Models](/data-ai/encoder-decoder) squeezed the input into one vector. Attention removes the squeeze: keep every encoder state, and let the decoder choose.

## The Mechanism

At decoder step t:

1. Compare the decoder state with each encoder state to get a **score**
2. Turn scores into **weights** with a softmax, so they are positive and add to 1
3. Take the weighted average of the encoder states: the **context**
4. Use the context, with the decoder state, to predict the next item

Bahdanau, Cho and Bengio computed scores with a small network and called the result a soft alignment. Luong and colleagues and later work use dot products, which are cheaper. The whole thing is differentiable, so it trains with the rest of the model.

## Before and After

The reversal task of the previous article, with the same networks plus a dot-product attention:

| Length | Without Attention: Symbols / Whole | With Attention: Symbols / Whole |
| --- | --- | --- |
| 4 | 100% / 100% | 100% / 100% |
| 8 | 95.9% / 85.4% | 100% / 100% |
| 12 | 83.0% / 44.3% | 96.6% / 87.6% |
| 20 | 39.8% / 0% | 60.6% / 2% |

Attention solved length 8 outright and lifted length 12 from 44 to 88 percent whole sequences. At 20 the model still struggled within our short training, so attention eases the bottleneck and does not make training free.

## What the Weights Show

For length 8, the average weights while generating each output symbol. Rows are output steps, and the highest weight in each row is shown with the input position:

| Output Step | Input Position Most Attended | Weight on It |
| --- | --- | --- |
| 1 | 8 | 0.68 |
| 2 | 7 | 0.56 |
| 3 | 6 | 0.53 |
| 4 | 5 | 0.54 |
| 5 | 4 | 0.52 |
| 6 | 3 | 0.48 |
| 7 | 2 | 0.43 |
| 8 | 1 | 0.31 |

The model learned to read the input backward: output 1 looks at input 8, output 2 at input 7, and so on. Nobody told it that the task was reversal. The last rows are more spread out, since the neighboring positions also receive weight.

## Query, Key, Value

A useful way to name the parts: the decoder state is a **query**, each encoder state supplies a **key** to be matched and a **value** to be returned. Attention is a soft lookup: match the query against all keys, and return the values blended by match. This framing is the basis of [Self-Attention](/data-ai/self-attention).

## Limits and Cautions

- **Cost**: comparing every output step with every input step grows with the product of the lengths
- **Order**: the weighted average ignores order unless the states carry it
- **Not an explanation**: high weight on a word shows where information was drawn from, not why the output was chosen. Different weights can give the same prediction
- **Alignment** may be diffuse when many inputs matter

## Why It Changed Things

Attention took the bottleneck out of sequence models, and then, in 2017, authors showed that attention alone, with no recurrence, can make a strong translator. That was the Transformer, and [The Transformer Architecture](/data-ai/transformer-architecture) describes it.

## Key Points

- Attention weights all encoder states anew at each output step, using a softmax over scores
- It improved whole-sequence accuracy at length 12 from 44 to 88 percent
- The weights on a reversal task traced the reversed order that nobody specified
- Queries, keys and values name the parts of the soft lookup
- <u>Use attention weights to debug alignment, not to explain a model's decisions</u>
