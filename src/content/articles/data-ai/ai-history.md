> The **history of AI** is a series of answers to one question: where does a system's knowledge come from? First it came from search, then from rules written by experts, and now mostly from data. Each answer worked until it hit a wall, and the next one began there.

The textbook app's price suggestion from [What Are Data Science, Machine Learning and AI?](/data-ai/what-is-data-ai) could have been built in any of these eras, and each would have built it differently. Walking through them explains why the field looks the way it does today.

## A Question for Machines

In 1950 Alan Turing asked whether machines can think, and then set the question aside because "think" is hard to pin down. He proposed a game instead: a person types questions to an unseen partner, and if the person cannot tell whether a machine or a human answers, the machine has earned the label. The test judges behavior and leaves the inner workings out.

Five years later four researchers proposed a summer study at Dartmouth College, "a 2 month, 10 man study of artificial intelligence". The proposal gave the field its name. Its working belief was that learning and the other features of intelligence could be described so exactly that a machine could be made to imitate them.

## Reasoning by Search

The first programs treated intelligence as search. A program proved a logic theorem or played a game by trying moves, checking where each led and picking the best. For a small game this works completely. Tic-tac-toe has 255,168 possible games, which a laptop counts in a second, and only 5,478 distinct positions that can come up.

Chess is the same idea at a size that breaks it. A position offers about 35 legal moves on average, so looking *d* moves ahead means about 35<sup>d</sup> positions. We assume a machine that checks 200 million positions per second, about what IBM reported for Deep Blue.

| Moves Ahead | Positions to Check | Time at 200 Million per Second |
| --- | --- | --- |
| 2 | 1,225 | Instant |
| 4 | 1.5 million | Under 0.01 seconds |
| 6 | 1.8 billion | 9 seconds |
| 8 | 2.3 trillion | 3 hours |
| 10 | 2.8 quadrillion | 160 days |

Every two moves of foresight multiplies the work by about 1,200. This is the **combinatorial explosion**, and it is the wall of the first era. A 1973 review of the field by Sir James Lighthill, written for the UK Science Research Council, pointed to it as a reason early systems did not carry over to real problems. Funding for much of the work shrank afterward, and the slump is remembered as the first **AI winter**.

Search wasn't wrong, only starved. In May 1997 Deep Blue beat the world chess champion Garry Kasparov, 3.5 to 2.5, using fast special hardware, the ability to skip lines of play that cannot matter and a scoring rule for positions that its team wrote. [Adversarial Search and Minimax](/data-ai/adversarial-search) shows how the skipping works.

## Knowledge Written by Experts

Meanwhile a second idea took over in the 1970s and 1980s. If search cannot find the answer from nothing, give the program what an expert knows. Engineers interviewed specialists, such as doctors diagnosing infections or technicians configuring computer orders, and wrote their know-how down as if-then rules. These **expert systems** were the first commercial wave of AI.

The wall here was the people. Every rule had to be extracted from an expert and typed in by hand. Rules collided with other rules. A case that nobody had listed got a wrong answer, delivered with the same confidence as a right one. The cost of maintaining the rulebook grew faster than its value, and interest cooled in a second winter. The idea itself survives in [Logic and Knowledge Representation](/data-ai/logic-kr).

## Learning from Data

A third thread had run underneath all along. In 1958 Frank Rosenblatt's perceptron adjusted its own weights from labeled examples. In 1969 Marvin Minsky and Seymour Papert proved that a single layer of such units cannot compute some simple functions, such as exclusive or, and the thread went quiet. In 1986 David Rumelhart, Geoffrey Hinton and Ronald Williams showed how to train networks with several layers by passing errors backward, the method in [Backpropagation](/data-ai/backprop).

Through the 1990s and 2000s, data and computers grew, and methods that learn a rule from examples began to beat hand written ones. People still chose the inputs by hand, deciding which measurements of an email or an image to feed in. The learned part was the mapping from those measurements to an answer, and [From Writing Rules to Learning from Data](/data-ai/rules-to-learning) shows that shift with the textbook app.

## Deep Learning

The next step removed the hand chosen inputs. The **ImageNet** contest gave programs about 1.2 million training photos labeled with 1,000 kinds of object, then asked them each year to name what unseen photos show. A guess counts as correct if the right label is among a program's five best. In 2012 an entry called SuperVision, from Alex Krizhevsky, Ilya Sutskever and Hinton, reached a top five error of 16.4%. The next best was 26.2%.

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>2012 runner up</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">26.2%</span></div>
<div class="hbar peak"><span>2012 SuperVision</span><span class="track"><span class="fill" style="--w: 62.6%"></span></span><span class="value">16.4%</span></div>
<div class="hbar"><span>2013 winner</span><span class="track"><span class="fill" style="--w: 44.7%"></span></span><span class="value">11.7%</span></div>
<div class="hbar"><span>2014 winner</span><span class="track"><span class="fill" style="--w: 25.6%"></span></span><span class="value">6.7%</span></div>
<div class="hbar"><span>A person, tested on a sample</span><span class="track"><span class="fill" style="--w: 19.5%"></span></span><span class="value">5.1%</span></div>
</div>
<figcaption>Top five error on ImageNet photos, lower is better</figcaption>
</figure>

SuperVision was a deep convolutional network trained on graphics processors, and it found its own visual features instead of being handed them. Within two years the error was within two points of what a person scored on a sample of the same photos. [How AlexNet Won ImageNet](/data-ai/paper-alexnet) goes through the network itself.

The same recipe, learning from large data on strong hardware, took games next. In March 2016 AlphaGo beat the top Go player Lee Sedol four games to one. Go has far more positions than chess, so search alone could not win. AlphaGo combined search with neural networks trained on human games and on play against itself.

## One Model for Many Tasks

Each of those models did one job. A network trained for photos could not translate, and a translator could not name a photo. In 2017 a paper titled "Attention Is All You Need" introduced the Transformer, which set a new best single model score for English to French translation after 3.5 days of training on eight GPUs. Its design suited parallel hardware and scaled with data, so researchers trained larger versions on large collections of text.

One such model could then answer questions, summarize and write code, because all of those are text in and text out. On November 30, 2022, OpenAI released ChatGPT, which put one of these models in front of the public. The transformer is built step by step in [The Transformer Architecture](/data-ai/transformer-architecture).

## The Pattern

Lay the eras side by side and the shape shows.

| Era | Where Knowledge Comes From | The Wall |
| --- | --- | --- |
| Search, 1950s | The program tries possibilities | The count of possibilities explodes |
| Expert systems, 1980s | Rules typed in by experts | Rules are costly, clash and miss cases |
| Learning, 1990s | Examples, with hand chosen inputs | People must design the inputs |
| Deep learning, 2010s | Examples, with learned inputs | Needs large data and computing power |
| Large models, 2020s | Huge collections of text and more | Cost, errors and misuse, the rest of this roadmap |

Each answer moved a job from a person's head to the machine. The last rows depend on data and computing power, which is why most of this roadmap is about handling data, training models and judging whether they work.

## Key Points

- The name AI comes from a 1955 proposal for a 1956 summer study, built on a bet that intelligence can be described exactly enough for a machine to copy
- Search hit a combinatorial explosion, and hand written expert rules hit the cost of writing and updating them
- Learning from examples moved the knowledge from a programmer's head into data, and deep learning also moved the choice of inputs
- Data, graphics processors and the Transformer design made one large model useful for many tasks
- <u>Each era's success largely came from removing the previous era's bottleneck, and each new bottleneck is where the next idea starts</u>
