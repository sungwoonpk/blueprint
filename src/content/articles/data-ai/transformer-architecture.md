> The **Transformer** stacks identical blocks, each with multi-head self-attention followed by a small feed-forward network on every position, wrapped in residual connections and layer normalization. A decoder adds masked attention and attention to the encoder. It processes all positions in parallel and became the base of modern language models.

The 2017 paper "Attention Is All You Need" dropped recurrence entirely. Attention moves information between positions, and a feed-forward layer processes each position.

## One Block

<figure class="diagram">
<div class="flow">
<div class="node">Input vectors</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Self-attention<small>mix across positions</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Add and normalize</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Feed-forward<small>each position alone</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Add and normalize</div>
</div>
<figcaption>One layer, stacked many times</figcaption>
</figure>

The **residual** connections of [Residual Networks](/data-ai/residual-networks) add each sub-layer's input to its output. The **layer norm** of [Batch and Layer Normalization](/data-ai/normalization-layers) keeps the scale steady. The original paper normalizes after the sum. Many newer models normalize before the sub-layer, called pre-norm, which trains more stably.

The **feed-forward** part is two layers applied to every position with the same weights, usually four times wider inside.

## Encoder and Decoder

The original design translates, so it has two stacks of six layers:

| Sub-layer | Encoder | Decoder |
| --- | --- | --- |
| Self-attention | Sees all positions | Masked: sees only earlier ones |
| Cross-attention | None | Queries from the decoder, keys and values from the encoder output |
| Feed-forward | Yes | Yes |

At the bottom, tokens become vectors from [Embeddings](/data-ai/embeddings) plus positional information. At the top, a linear layer and softmax give a probability for each next token.

## Counting Parameters

Take the paper's base model, with d = 512, 8 heads, 6 layers, feed-forward size 2,048 and a shared vocabulary of 37,000:

| Part | Parameters |
| --- | --- |
| One attention, four 512×512 matrices | 1,048,576 |
| One feed-forward | 2,099,712 |
| Encoder, 6 layers | 18.9 million |
| Decoder, 6 layers | 25.2 million |
| Embeddings, 37,000 × 512 | 18.9 million |
| Total by our count | 63.0 million |

The paper's table lists 65 million for this model, close to our count. The feed-forward part holds about two thirds of a layer's weights.

## A Small One

We built a transformer with 2 layers, 4 heads and width 32, 25,866 parameters, and trained it to reverse sequences:

| Length | Symbols Correct | Whole Sequences Correct |
| --- | --- | --- |
| 8 | 100% | 100% |
| 20 | 100% | 100% |

It solved length 20 in 1,500 steps, where the recurrent model with attention of the [Attention](/data-ai/attention) article reached 60.6 percent of symbols. We also removed parts at length 12:

| Removed | Symbols Correct |
| --- | --- |
| Nothing | 100% |
| Residual connections | 100% |
| Layer normalization | 100% |
| All heads but one | 100% |
| One of the two layers | 100% |
| Positional information | 26.6% |

Only positions mattered at this tiny scale. Residuals and normalization matter for deep stacks, as the earlier articles showed, and not for two layers.

## Why It Spread

- **Parallel** over positions, which uses modern hardware well
- **Direct paths** between any two positions, in one step
- **One block** works for text, images and audio
- The cost grows with the square of the length, which drives work on cheaper attention

## Key Points

- A Transformer repeats blocks of self-attention and a position-wise feed-forward layer, with residuals and normalization
- A decoder adds a causal mask and attention to the encoder's output
- The paper's base model has about 63 to 65 million parameters, mostly in feed-forward layers and embeddings
- Our 26,000-weight transformer reversed 20 symbols perfectly, and only removing positions broke it
- <u>Count parameters and attention cost before choosing a size</u>
