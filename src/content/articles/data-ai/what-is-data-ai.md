> **Data science** gets answers from data, **machine learning** builds programs that improve at a task from examples, and **artificial intelligence** (AI) is the wider goal of systems that produce predictions, recommendations or decisions toward an objective. Machine learning is one way to build AI, and data science uses it as one tool among several.

Picture the team behind a used textbook app in one busy week. The founders ask how many calculus books sold in September compared with last year. A seller asks the app to suggest a price when they list a book. A student asks for a helper that answers questions in chat. Someone calls all three "an AI feature", and they need three different kinds of work.

## Three Requests, Three Jobs

| Request | What It Needs | Closest Name |
| --- | --- | --- |
| Sales in September | Query the data, clean it, compare, draw a chart | Data science |
| Suggest a price | A program that learns from past sales | Machine learning |
| Answer questions in chat | A system that writes answers by itself | Artificial intelligence |

The rest of this page takes the rows one at a time, from the oldest and most down to earth to the widest word.

## Data Science: Answers from Data

**Data science** is the work of getting reliable answers out of data, using statistics, programming and knowledge of the subject. The question can be about the past (what sold), the present (what is selling now) or the future (what will sell). A well known account of the field, David Donoho's *50 Years of Data Science*, sorts the work into six kinds.

| Kind of Work | On the Textbook App |
| --- | --- |
| Exploring and preparing data | Notice that 3% of listings have a price of $0 and fix them |
| Representing and transforming data | Turn dates into weeks of the semester, join listings with sales |
| Computing with data | Run the same analysis over four years of listings |
| Modeling | Describe how the price depends on a book's condition |
| Visualizing and presenting | Show the founders sales by week of the semester |
| Studying the practice itself | Check whether the findings hold on a different semester |

Modeling is one row of six. The September question needs no model at all: a query, a cleaning step and a chart answer it. That's still data science, and it's often where a project should start.

## Machine Learning: Improving from Experience

Writing the price rules by hand means someone must keep up with every new edition and every change in demand. **Machine learning** takes the other route: let the program find the pattern in past examples. Tom Mitchell gave the standard way to say it precisely. A program learns from experience **E** at a task **T**, measured by a score **P**, if its score at the task improves as the experience grows.

| Part | The Price Suggestion |
| --- | --- |
| Task (T) | Suggest an asking price for a new listing |
| Experience (E) | Past listings, each with the price it finally sold for |
| Score (P) | Average gap in dollars between the suggestion and the sold price |

The score does real work. Without P, "improves" has no meaning, and a model can look better by one score while the feature gets worse for sellers. [Framing a Problem for Machine Learning](/data-ai/framing-problems) picks that score with care. How the program turns past examples into a rule, and how that differs from writing the rule yourself, is the story of [From Writing Rules to Learning from Data](/data-ai/rules-to-learning).

## Artificial Intelligence: The Widest Word

The word **artificial intelligence** is defined by what a system does and not by how it is built. One widely used definition calls an AI system an engineered or machine based system that, for a given set of objectives, produces outputs such as predictions, recommendations or decisions that influence its environment, with some level of autonomy.

The price suggestion fits, since it produces a prediction. So does the chat helper. So does a route planner that finds the shortest walk between two campus buildings with [A\* Search](/algorithms/a-star), which learns nothing from data. The planner follows a method a person wrote, and it is AI by the textbook meaning all the same. [A Short History of AI](/data-ai/ai-history) shows how the field moved between written methods and learned ones.

## How They Fit Together

Machine learning sits inside AI. **Deep learning**, learning with neural networks of many layers, sits inside machine learning.

<figure class="diagram">
<div class="nest">
<span>Artificial Intelligence<small>systems that produce predictions, recommendations or decisions</small></span>
<div class="nest">
<span>Machine Learning<small>programs that improve from examples</small></span>
<div class="nest hl">
<span>Deep Learning<small>neural networks with many layers</small></span>
</div>
</div>
</div>
<figcaption>Each idea sits inside the one around it</figcaption>
</figure>

Data science is not a layer of this picture. It overlaps machine learning, since modeling is one of its six kinds of work, and it reaches outside AI whenever the result is a chart or a number for a person to read.

| Example | Data Science | Machine Learning | AI |
| --- | --- | --- | --- |
| September sales chart | Yes | No | No |
| Route between two buildings by A\* search | No | No | Yes |
| Price suggestion learned from past sales | Yes | Yes | Yes |

Chat assistants today are deep neural networks trained on very large amounts of text, so they live in the innermost box. Phase 7 builds up to them from [From Linear Models to Multilayer Networks](/data-ai/perceptron-mlp), and Phase 9 starts with [Language Modeling and Perplexity](/data-ai/language-modeling).

## Asking the Right Questions

The words get used loosely, so a few questions cut through them. What goes in, and what comes out? Who wrote the rule that maps one to the other, a person or a training run? What score says it works? A feature with a clear answer to each is easy to plan. One described only as "AI" is not yet a plan.

## Key Points

- Data science answers questions with data, and modeling is only one of its six kinds of work
- Machine learning is a program that improves at a task, by a stated score, as it sees more examples
- AI is defined by what a system does, so it includes methods that learn nothing from data
- Machine learning is one way to build AI, and deep learning is one kind of machine learning
- <u>When someone says "AI", ask what goes in, what comes out and where the rule comes from</u>
