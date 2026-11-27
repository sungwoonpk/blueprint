> An **encoder-decoder** model reads an input sequence into a representation with one network and writes an output sequence from it with another. This allows inputs and outputs of different lengths, such as translation. When the representation is a single fixed-size vector, it becomes a bottleneck for long inputs.

Translating a sentence, summarizing a page or turning speech into text maps one sequence to another of a different length. A network that emits one output per input can't do it.

## The Two Halves

<figure class="diagram">
<div class="flow">
<div class="node">Input sequence</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Encoder</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Fixed vector</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Decoder</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Output sequence</div>
</div>
<figcaption>Everything the decoder knows about the input passes through one vector</figcaption>
</figure>

The **encoder** reads the input and leaves its final state. The **decoder** starts from that state and generates one item at a time, each time reading the item it just produced, until it emits an end marker.

Sutskever, Vinyals and Le built a translation system this way with LSTMs in 2014. They found it learned much better when the source sentence was reversed, which brings the first words of the input close to the first words of the output.

## Training and Generating

- **Teacher forcing**: during training, feed the decoder the true previous item, not its own guess. It speeds training, and the model then never practices recovering from its own mistakes
- **Free running**: at use time, the decoder feeds back its own outputs, so an early mistake can snowball
- **Beam search**: keep several of the most probable partial outputs instead of only the best one at each step. [Decoding and Sampling](/data-ai/decoding) covers it
- **Loss**: cross-entropy at each output position, from [Multiclass Classification and Softmax](/data-ai/softmax)

## The Bottleneck

We trained a GRU encoder-decoder with 48 units to reverse a sequence of symbols out of 10, a task whose output depends on remembering the whole input. Two seeds each, 1,500 steps, tested with the decoder feeding itself:

| Sequence Length | Symbols Correct | Whole Sequence Correct |
| --- | --- | --- |
| 4 | 100% | 100% |
| 8 | 95.9% | 85.4% |
| 12 | 83.0% | 44.3% |
| 20 | 39.8% | 0% |

The vector has a fixed size, 48 numbers, no matter the length. At length 4 it holds everything. At length 20 the model gets about 40 percent of symbols right and never a whole sequence. A bigger state raises the limit and doesn't remove it.

Whole-sequence accuracy falls faster than symbol accuracy, since every symbol must be right: report both, as they can tell different stories.

## The Way Out

Bahdanau, Cho and Bengio argued that squeezing a sentence into one fixed vector is what limits such translators, and let the decoder look back at all the encoder's states instead. That is [Attention](/data-ai/attention).

## Where the Pattern Lives On

Encoder-decoder is also the shape of models that read an image and write a caption, read audio and write text, and of some transformers, as [Encoder, Decoder and Encoder-Decoder Transformers](/data-ai/transformer-variants) describes. The idea of reading into a representation and writing from it returns in [Autoencoders](/data-ai/autoencoders), where the output is the input itself.

## Key Points

- An encoder reads the input into a representation and a decoder generates the output one item at a time
- Teacher forcing speeds training and leaves the model unpracticed at recovering from its own errors
- A single fixed vector is a bottleneck: reversing 20 symbols gave 40 percent symbol accuracy and no whole sequences
- Report both per-item and whole-sequence accuracy
- <u>When long inputs matter, let the decoder look back at every encoder state</u>
