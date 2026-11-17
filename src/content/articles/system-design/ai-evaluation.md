> **Evaluation**, often shortened to evals, is a repeatable test that scores an AI system's outputs against success criteria, so that a change can be shown to help or hurt. It replaces the impression that a new prompt "feels better" with a number, and a way to tell whether the number is real.

The team changes the helper's prompt on Tuesday. The three questions someone tried afterward looked better, and the answer to a fourth looked worse.

Was the change good? A language model gives a different answer to the same question from one run to the next, and users ask thousands of different questions, so a handful of examples can't tell.

Evaluation is the part of an AI system that decides whether to trust each other part. [Choosing Between Prompting, RAG and Fine-Tuning](/system-design/prompting-rag-fine-tuning) starts from the need for it, and [Guardrails](/system-design/guardrails) and [Monitoring AI Systems in Production](/system-design/ai-monitoring) depend on it.

This topic covers what to measure, how to build the questions, how to score the answers, and how many questions it takes before a difference means anything.

## Start With the Criteria

Anthropic's guidance on testing says to begin with success criteria, and that they should be specific, measurable, achievable and relevant. Its examples are concrete: an F1 score of at least 0.85 on a held out set of 10,000 posts, or fewer than 0.1 percent of outputs flagged as toxic in 10,000 trials.

It lists common dimensions, and says the list isn't complete: task fidelity, consistency, relevance and coherence, tone and style, privacy preservation, context utilization, latency and price.

The point of the exercise is that one number is rarely enough. A change that raises accuracy and doubles the latency is a decision, and the criteria make it visible. For the helper:

| Criterion | Measure | Target |
| --- | --- | --- |
| Policy Accuracy | Correct on 300 questions with reference answers | At least 90% |
| Grounding | Share of claims supported by the retrieved policy | At least 95% |
| Declining | Says it doesn't know on questions the policy doesn't cover | At least 95% of those |
| Tone | A rubric score from 1 to 5, averaged | At least 4.0 |
| Speed | Time to first token at the 95th percentile | Under 1.5 s |
| Cost | Input and output tokens for each answer | Under $0.01 |
| Privacy | Leaks of another student's data in 1,000 adversarial prompts | 0 |

## Build the Test Set

Anthropic's design principles for the questions are short. Be specific to the task, so the set mirrors the real distribution of requests, including the edge cases. Automate the grading where possible. And favor volume over polish, since more questions graded by a machine beat fewer graded by hand. The set has several sources:

- **Real traffic**: Questions from logs, with personal data removed, which show what students really ask
- **Written by experts**: Cases that matter and are rare, such as a policy with an exception
- **Generated**: The Ragas documentation describes building a knowledge graph of the documents and making single hop and multi hop questions, each in a specific and an abstract form, with a reference answer and its source passages
- **Adversarial**: Attempts to extract another user's data or to make the model ignore its rules
- **Unanswerable**: Questions the documents don't cover, to test that the helper says so

Keep part of the set aside, and don't tune the prompt on it. Public benchmarks add a separate problem.

A 2023 study found that simple rewrites, such as paraphrasing or translating test items, got past the usual decontamination checks based on matching strings, and that a 13 billion parameter model trained on rephrased test samples could reach performance on par with GPT-4 on them.

It also found 8 to 18 percent of the HumanEval benchmark overlapping with large pretraining sets. A general benchmark like MMLU, which covers 57 subjects, says how capable a model is in general, and your private set says whether it works for you.

## Grade the Answers

The Claude documentation sorts graders by speed and nuance. Code based grading, such as an exact match or a check that a citation is present, is the fastest and most reliable and the least nuanced. A person is the most flexible and slow and costly, so use people for a sample that calibrates the others.

A model as grader is fast and flexible and has to be tested for reliability first. Its tips include a detailed rubric, a constrained output such as a score from 1 to 5, and a different model as the judge than the one that wrote the answer.

The research on model judges is encouraging and specific about the limits. The MT-Bench paper found that strong judges such as GPT-4 reach over 80 percent agreement with human preferences, the level at which humans agree with each other.

It also names the biases: position, verbosity and self-enhancement, and limited reasoning ability. In practice that means swapping the order of the two answers, controlling for length, and checking the judge against labels from a person.

Some checks are better written as tests than as scores. The CheckList paper brought the idea of software testing to language models. A minimum functionality test is a simple case for one behavior, like a unit test.

An invariance test changes the input in a way that shouldn't change the answer, and a directional test changes it in a way that should move the answer in a known direction.

Its abstract reports that practitioners who used it created twice as many tests and found almost three times as many bugs. For the helper, writing a course code as "MATH101" or "math 101" should not change the policy it quotes, and adding "please" shouldn't either.

| Grader | Fits | Watch For |
| --- | --- | --- |
| Code Check | Exact answers, formats, a citation present | Misses nuance |
| Model Judge | Tone, faithfulness, helpfulness | Bias, and drift when the judge changes |
| Person | A calibration sample, unclear cases | Slow and costly |
| Behavior Test | Invariance and edge cases | Someone has to design them |

A run with model judges costs money. For 1,000 questions, 3 judge calls for each answer, 4,000 tokens in and 100 out for each call, our round prices give 12 million input tokens and 300,000 output tokens, about $27 a run. That is cheap enough to run on each change.

<figure class="diagram">
<div class="flow">
<div class="node">Test Set</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">System<small>prompt, model, index</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Graders<small>code, judge, person</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Report</div>
</div>
<figcaption>An evaluation run: the same test set goes through the system, the graders score it, and the report shows an interval</figcaption>
</figure>

## Is the Difference Real

Evaluation numbers carry noise, and the noise decides how many questions you need. For a measured accuracy near 80 percent, the 95 percent Wilson interval, a standard interval for a proportion, has these half widths:

<figure class="chart">
<div class="hbars" role="img" aria-label="Half width in points for five test set sizes">
<div class="hbar peak"><span>20 Questions</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">16.8</span></div>
<div class="hbar"><span>50 Questions</span><span class="track"><span class="fill" style="--w: 64.9%"></span></span><span class="value">10.9</span></div>
<div class="hbar"><span>100 Questions</span><span class="track"><span class="fill" style="--w: 46.4%"></span></span><span class="value">7.8</span></div>
<div class="hbar"><span>200 Questions</span><span class="track"><span class="fill" style="--w: 32.7%"></span></span><span class="value">5.5</span></div>
<div class="hbar"><span>500 Questions</span><span class="track"><span class="fill" style="--w: 20.8%"></span></span><span class="value">3.5</span></div>
<div class="hbar"><span>1,000 Questions</span><span class="track"><span class="fill" style="--w: 14.9%"></span></span><span class="value">2.5</span></div>
</div>
<figcaption>Half width of the 95 percent interval around an accuracy of 80 percent, in points, from the Wilson formula</figcaption>
</figure>

At 100 questions the true accuracy could be 8 points either side of the measured one, and at 1,000 it is 2.5.

The Miller paper, which applies standard statistics to language model evaluations, tells readers to report the standard error and the number of questions with each result, and gives its formula for a proportion: the square root of the accuracy times its complement, divided by the number of questions.

Comparing two versions is a different problem, and we simulated it. System A is right on 80 percent of questions and B on 83 percent, a true gain of 3 points. They share a question difficulty and add independent noise, which makes them agree on 81 percent of the questions. We ran each size 2,500 times:

| Questions | Gain Detected, Separate Tests | Gain Detected, Paired |
| --- | --- | --- |
| 100 | 5% | 11% |
| 200 | 7% | 16% |
| 500 | 17% | 34% |
| 1,000 | 39% | 60% |
| 2,000 | 73% | 88% |

A **paired** comparison looks at the difference on each question, which is the paper's recommendation, since the two versions find the same questions hard. It roughly doubled the chance of detecting the gain at small sizes.

Comparing two separate intervals threw that information away, and it also rarely cried wolf: with no true difference it declared a winner in about 1 percent of runs, against about 5 percent for the paired test, which is the rate it should have.

Even paired, a 3 point gain at 1,000 questions was found 60 percent of the time. The Miller paper's own worked example, under different assumptions, arrives at about 969 questions for 80 percent power and recommends at least around 1,000 for new evaluations, so treat our figures as the same warning with different numbers.

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of runs with the wrong order for five set sizes">
<div class="hbar peak"><span>50 Questions</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">25.1%</span></div>
<div class="hbar"><span>100 Questions</span><span class="track"><span class="fill" style="--w: 81.3%"></span></span><span class="value">20.4%</span></div>
<div class="hbar"><span>200 Questions</span><span class="track"><span class="fill" style="--w: 60.9%"></span></span><span class="value">15.3%</span></div>
<div class="hbar"><span>500 Questions</span><span class="track"><span class="fill" style="--w: 24.1%"></span></span><span class="value">6.0%</span></div>
<div class="hbar"><span>1,000 Questions</span><span class="track"><span class="fill" style="--w: 7.3%"></span></span><span class="value">1.8%</span></div>
</div>
<figcaption>Runs in which the better system, ahead by 3 points, measured below the worse one, from our simulation</figcaption>
</figure>

The danger of a small set is sharper than a missed gain. Without a test, we compared the measured scores in the paired runs.

At 100 questions, B scored below A in 20 percent of runs although it is truly better, at 500 questions 6 percent, and at 1,000 questions 1.8 percent. A team that ships whichever number is higher will reverse good changes a fifth of the time at that size.

Two more points from the paper:

- **Grouped questions**: When several questions come from the same document, they aren't independent, and standard errors that account for the groups can be over 3 times larger. Its example on one reading benchmark was 1.34 points against 0.44 for the naive figure
- **Repeated sampling**: Asking the same question several times and averaging reduces the noise from the model, and the paper advises against lowering the temperature as a way to do it

When the effect you care about is small, plan the set size before building it, with the power formula of the paper, and when you can't afford the size, say that differences under the half width are not established.

## Evals in the Release Process

An evaluation earns its keep by running at each change:

- **A gate**: A change to the prompt, the model, the retrieval settings or a tool runs the set, and the result shows the interval, not a single score
- **Slices**: Scores by course, by question type and by difficulty, since an average hides a collapse in a group
- **A regression set**: Each production failure becomes a test case, so it stays fixed
- **Fresh data**: A weekly sample of real conversations, reviewed by a person, feeds new cases in, and a set that doesn't change goes stale
- **Judge control**: A fixed judge version and a small human labeled sample to check it, since a new judge model changes the scores

[Retrieval-Augmented Generation (RAG)](/system-design/rag) described scoring the retrieval and the generation separately, and the same holds here: record the stage that failed, not just the final score. Online signals, from users and from logs, belong to [Monitoring AI Systems in Production](/system-design/ai-monitoring).

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Criteria | The seven in the table above, written down with targets before the next change |
| Set | 1,000 questions: 600 from traffic, 150 written by staff, 150 unanswerable or adversarial |
| Held Out | 200 questions kept out of tuning |
| Graders | Code checks first, a model judge for tone and grounding, 5 percent checked by a person |
| Comparison | Paired, with an interval, and a change ships when the interval clears the target |
| Cost | About $27 for each run, on each change to the prompt or the index |
| Slices | By course, by question type, and for each language |
| Regression | Each reported failure added within a day |

## Pitfalls

- **Judging by a few examples**: Noise decides the verdict
- **A test set built from the questions used for tuning**: The score is flattering and meaningless
- **Comparing two separate scores**: It wastes the pairing and misses real gains
- **Trusting a model judge without a check**: Its biases become the target
- **One average for the whole set**: A group can fail while the mean looks fine
- **Public benchmarks as proof of fit**: They may be contaminated, and they aren't your task
- **A fixed set that stays frozen**: It stops matching what students ask

## Key Points

- Evaluation turns "it feels better" into a number: write specific, measurable success criteria first, with targets for quality, speed, cost and privacy
- Build the set from real traffic, expert cases, generated and adversarial questions, and unanswerable ones, keep part aside, and distrust public benchmarks that may be contaminated
- Grade with code where you can, with a model judge that you calibrate against people, and with behavior tests for invariance and edge cases, at about $27 a run for 1,000 questions
- <u>Size the set for the difference you care about</u>: a half width of 7.8 points at 100 questions and 2.5 at 1,000, and in our simulation a 3 point gain was found 60 percent of the time at 1,000 questions even when the comparison was paired
- Run the set on each change, compare on the same questions, report the interval, and add each production failure as a test
