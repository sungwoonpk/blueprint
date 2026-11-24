> The three main kinds of machine learning differ in the feedback the program gets. **Supervised learning** has the right answer for each training example, **unsupervised learning** has no answers and looks for structure, and **reinforcement learning** gets a reward score for the actions it tried.

[From Writing Rules to Learning from Data](/data-ai/rules-to-learning) built a price suggestion from past sales that came with their sold prices. That was one kind of learning. The textbook app has more problems, and each one comes with different data.

| Problem | What the Data Has | Kind of Learning |
| --- | --- | --- |
| Predict the price of a listing | Past listings with the price each sold for | Supervised |
| Group students by what they browse | Browsing counts, with no labels | Unsupervised |
| Pick which home page layout to show | Clicks that follow each choice | Reinforcement |

The kind is set by what feedback exists, so the data is the first thing to look at. The next three sections take one row each, with a small simulation of our own.

## Supervised: Learning from Answers

A **supervised** problem comes with examples of inputs paired with the correct output, the label. The program finds a rule that maps one to the other and applies it to new inputs. The price suggestion was supervised, and the simulated sales were the labeled examples.

The label's type splits the kind in two:

- **Regression**: the label is a number, such as a price in dollars or the days a listing takes to sell
- **Classification**: the label is a category, such as "sells within two weeks" or "does not", or which of the course subjects a book belongs to

The cost of supervised learning is the labels. Some come free. The app records the sold price of every sale, so a price model has a label for each past listing. Others take people, such as someone marking photos as acceptable or not, and [Labeling Data](/data-ai/labeling) covers what that costs and how it goes wrong.

## Unsupervised: Finding Structure

Now the team wants to know what kinds of students use the app, so it can tailor the home page. Nobody has labeled students as anything. All the data holds is what each student looked at.

We simulated 300 students and recorded the share of their views in four categories. The program doesn't know that three kinds of student exist in the data. We asked **k-means clustering** to split the students into three groups, which puts each student in the group whose average profile is closest.

| Group Found | Students | Math | CS | Biology | Humanities |
| --- | --- | --- | --- | --- | --- |
| 1 | 120 | 54% | 30% | 10% | 5% |
| 2 | 100 | 10% | 15% | 20% | 55% |
| 3 | 80 | 10% | 10% | 66% | 14% |

The groups matched the three hidden kinds exactly, and the labels in the table are our reading, not the program's. A person looks at each group's profile and names it: "math and CS", "humanities", "biology". The program has no name for what it found. [k-Means Clustering](/data-ai/kmeans) shows how the grouping works.

Two cautions come with this. We chose three groups, and a different choice would give different groups. And we built the data with clean types, so the answer was easy. Real browsing is messier, and [Evaluating Clusterings](/data-ai/evaluating-clusters) is about telling a useful grouping from an accident. Unsupervised learning also compresses data with [Principal Component Analysis](/data-ai/pca) and spots odd cases with [Anomaly Detection](/data-ai/anomaly-detection).

## Reinforcement: Learning from Reward

The third problem has no answer key at all. The app can show one of three home page layouts, and the team wants the one that gets the most clicks. There's no right layout to learn from. The program only finds out whether a visitor clicked after it picked one.

Two things make this different. The feedback is a score for a choice and not a correct answer. And the choice shapes what the program learns, since it only sees clicks for layouts it actually showed. That creates the central tension of **reinforcement learning**, **exploration** against **exploitation**: show the layout that looks best so far, or try another one that might be better.

We gave the three layouts click rates of 4%, 7% and 5%, which the program does not know, and ran 5,000 visits, averaged over 200 runs.

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Pick what looks best so far</span><span class="track"><span class="fill" style="--w: 59.8%"></span></span><span class="value">209</span></div>
<div class="hbar"><span>Pick at random</span><span class="track"><span class="fill" style="--w: 76.3%"></span></span><span class="value">267</span></div>
<div class="hbar peak"><span>Best so far, with 10% tries</span><span class="track"><span class="fill" style="--w: 89.7%"></span></span><span class="value">314</span></div>
<div class="hbar"><span>Knowing the best layout</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">350</span></div>
</div>
<figcaption>Clicks in 5,000 visits, averaged over 200 simulated runs, higher is better</figcaption>
</figure>

Picking whatever looks best so far did worse than random. It tried each layout once, and whichever one happened to get an early click kept winning. In 96% of the runs it settled on a layout other than the best one.

Spending one visit in ten on a random layout cost a little in the short run and gave the best layout 70% of the visits, so it earned 314 clicks, about 90% of what knowing the answer would earn.

This three layout problem is the simplest case, a **bandit**. Real reinforcement learning adds a sequence, where each choice also changes the situation the next choice faces, as in a game or a robot. [Adaptive Experiments and Bandits](/data-ai/bandits) covers the simple case and [Markov Decision Processes](/data-ai/mdps) starts the full one.

Reinforcement learning is not a form of unsupervised learning. Both lack an answer key, but unsupervised learning looks for structure in the data, while reinforcement learning tries to collect as much reward as it can.

## Between the Kinds

The lines blur in practice. A language model learns by predicting the next word of a text. The text itself supplies the answer, so no one labels anything, and the method is called **self-supervised**. [Self-Supervised and Contrastive Learning](/data-ai/self-supervised) explains it. Chat assistants are then tuned with human ratings, using reinforcement learning in [Reinforcement Learning from Human Feedback](/data-ai/rlhf). One system can use all three kinds at different steps.

When a project starts, ask what feedback the data holds. If the right answers exist, think supervised. If there are only raw records and a wish to see structure, think unsupervised. If all there is comes from trying actions and seeing the outcome, think reinforcement.

## Key Points

- The kinds of learning differ by feedback: right answers, no answers, or a reward after an action
- Supervised learning splits into regression for numbers and classification for categories, and its main cost is labels
- Unsupervised learning returns groups or patterns, and a person has to name them and check they are useful
- Reinforcement learning faces exploration against exploitation, since it only learns about the actions it tries
- <u>Look at what feedback the data holds before picking a method</u>
