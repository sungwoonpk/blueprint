> Transformers come in three shapes. **Encoder-only** models, like BERT, read a whole text with attention in both directions and suit understanding tasks. **Decoder-only** models, like GPT, predict the next token with a causal mask and suit generation. **Encoder-decoder** models, like T5, map one sequence to another.

[The Transformer Architecture](/data-ai/transformer-architecture) was built for translation. Later work kept one half or the other.

## The Three Shapes

| Shape | Attention Mask | Pretraining Objective | Examples |
| --- | --- | --- | --- |
| Encoder only | Sees both directions | Fill in hidden words | BERT |
| Decoder only | Causal, past only | Predict the next token | GPT family |
| Encoder-decoder | Encoder both ways, decoder causal plus cross-attention | Restore corrupted text | T5 |

## Encoder Only

BERT, from Devlin and colleagues, trains on **masked** words: hide some words and ask the model to guess them from both sides. Because it reads in both directions, its representations are rich for classification, tagging and extracting answers. It can't generate text left to right, since it was never trained to.

## Decoder Only

A causal model predicts each token from the earlier ones, so it can generate by sampling one token at a time. The GPT-3 paper describes a decoder-only model with 175 billion parameters that does many tasks from a prompt, without further training. Most large language models today have this shape. [In-Context Learning and Prompting](/data-ai/in-context-learning) covers the behavior, and [Language Modeling and Perplexity](/data-ai/language-modeling) the objective.

## Encoder-Decoder

The T5 paper, by Raffel and colleagues, casts every task as **text to text**: translation, classification and summarization all become "read this text, write that text". The encoder reads the input once and the decoder generates against it. It suits tasks with a clear input and output.

## Choosing

| Task | Good Fit |
| --- | --- |
| Classify or tag text, search embeddings | Encoder |
| Chat, completion, code | Decoder |
| Translation, summarization, structured conversion | Encoder-decoder or a large decoder |

Large decoder models now handle many tasks that once needed the others, by prompting. Encoders remain much cheaper per task, so for high-volume classification a small encoder is often the right tool. The same transformer building block, with [Self-Attention](/data-ai/self-attention) underneath, serves all three.

## Cost of Generation

A decoder generating n tokens would recompute attention over the whole past each time. Practical systems **cache** the keys and values of earlier positions, so each new token computes only its own query against them. Memory for the cache grows with the length of the conversation.

## Key Points

- Encoder-only models read both directions and suit understanding tasks
- Decoder-only models use a causal mask and generate token by token
- Encoder-decoder models map one text to another, as in T5's text-to-text framing
- Decoder models dominate large language modeling, while small encoders are cheap for classification
- <u>Match the shape to the task, and weigh cost against a large decoder</u>
