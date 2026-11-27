> **Long short-term memory** and **gated recurrent units** add gates, small learned switches between 0 and 1, that decide what to keep, what to write and what to read. A path where the state is carried forward almost unchanged lets gradients survive many steps. They learn much longer memories than a plain recurrent network.

[Recurrent Neural Networks](/data-ai/rnns) lose early information. The fix is to make remembering the default.

## The LSTM

Hochreiter and Schmidhuber proposed the LSTM in 1997. It keeps two things: a **cell state** c, the memory, and a hidden state h, the output. At each step:

| Gate | Decides |
| --- | --- |
| Forget | How much of the old memory to keep |
| Input | How much new content to write |
| Output | How much memory to show |

The memory updates as c_new = forget × c_old + input × candidate. When forget is near 1 and input near 0, the memory passes through unchanged, and so does the gradient. The forget gate was added to the original design a few years later.

## The GRU

The gated recurrent unit merges the memory and hidden state and uses two gates: an **update** gate that blends the old state with a new candidate, and a **reset** gate that controls how much old state the candidate uses. It has fewer parameters and often performs similarly.

## The Memory Test Again

The task of the previous article: remember the first of T random symbols. With the common default of a forget bias of 1:

| Steps T | Orthogonal Plain RNN | LSTM, Forget Bias 1 |
| --- | --- | --- |
| 20 | 91.5% | 96.1% |
| 40 | 56.0% | 41.4% |
| 60 | 43.6% | 12.2% |

The LSTM was no better, and at 60 steps at chance. A forget bias of 1 means the gate keeps about 73 percent of the memory per step, and 0.73 to the 60th power is practically zero. We then set the gate bias to 4, which keeps about 98 percent per step:

| Steps T | LSTM, Bias 4 | GRU, Bias 4 |
| --- | --- | --- |
| 20 | 100% | 100% |
| 40 | 100% | 100% |
| 60 | 100% | 100% |

Every run of both solved the task. The gradient from the first input relative to the last, at 40 steps, rose from 0.00047 for the plain network and 0.034 for the LSTM with bias 1 to 3.3 with bias 4. The architecture made long memory possible, and initialization made it happen. That same idea is behind starting a gate so it remembers.

## Choosing

| | Plain RNN | GRU | LSTM |
| --- | --- | --- | --- |
| Gates | None | 2 | 3 |
| Parameters, same width | 1× | 3× | 4× |
| Long memory | Poor | Good | Good |

Try both gated types and keep the faster one that is accurate enough.

## Where They Stand

LSTMs powered speech recognition and translation through the mid 2010s. Today attention and transformers dominate language, as [Attention](/data-ai/attention) and [Self-Attention](/data-ai/self-attention) explain, while gated recurrent models remain useful on streams, small devices and time series. Their memory is bounded by the size of the state, which no gate removes.

## Key Points

- Gates control keeping, writing and reading, with a memory path that can pass unchanged
- GRUs merge the states and use two gates, with fewer parameters
- With a default forget bias, our LSTM failed at 60 steps, while a bias of 4 made LSTM and GRU solve it in every run
- Gradients to early inputs survived with the higher bias
- <u>For long memory, start the gates so they remember, and check the result on your sequence length</u>
