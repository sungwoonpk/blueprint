> A **data team** is the group of people who turn data into decisions and products. Its roles are jobs to be done, such as building pipelines, analyzing, modeling, and running models in production, and titles for them vary from company to company.

This last foundation topic is about the people. [The Machine Learning Project Lifecycle](/data-ai/lifecycle) listed seven stages for the textbook app's price suggestion, and one person rarely does all of them well. This page follows the project through the hands it passes through, then shows how this roadmap lines up with each role.

## Who Does What

Every role below shows up in the price suggestion's story.

- **Product manager**: decides that sellers pricing quickly is worth a project, sets the target with the team, and decides whether the result ships
- **Data engineer**: builds the pipelines that bring listings and sales into clean, reliable tables every day, and alerts when they break
- **Data analyst**: answers questions with queries and charts, such as sales by week of the semester, and finds problems like listings priced at $0
- **Data scientist**: frames the prediction, builds and compares models, and judges whether the results can be trusted
- **Machine learning engineer**: turns the chosen model into a service that runs reliably, and watches it after release
- **Software engineer**: builds the part of the app that asks for a suggestion and shows it to the seller

Around them stand people who aren't on the team's chart but whose knowledge matters. An operations person who handles textbook returns knows that a new edition makes an old one worth much less, which can be a stronger signal for a feature than any column in the data.

## The Handoffs

Each role takes what the one before made and turns it into the next thing.

<figure class="diagram">
<div class="flow">
<div class="node">Data Engineer<small>clean tables</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Data Scientist<small>a trained model</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">ML Engineer<small>a running service</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Software Engineer<small>the app feature</small></div>
</div>
<figcaption>What each role hands to the next</figcaption>
</figure>

Handoffs are where projects slow down. A scientist's notebook that works on a laptop may need rewriting before a service can run it. A data engineer can change a column's meaning without knowing a model depends on it. Teams that write down what one role promises the next, as [Data Contracts and Schema Changes](/data-ai/data-contracts) describes, lose less time here.

## Who Leads Each Stage

Here is one common split of the seven stages. A filled circle marks who leads a stage, and an open circle marks who helps.

| Role | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product Manager | ● |  |  |  | ○ |  | ○ |
| Data Engineer |  | ● | ● |  |  |  | ○ |
| Data Analyst | ○ | ● | ○ |  | ○ |  |  |
| Data Scientist | ○ | ○ | ○ | ● | ● |  | ○ |
| ML Engineer |  |  | ○ | ○ |  | ● | ● |
| Software Engineer |  |  |  |  |  | ○ | ○ |

The stage numbers follow the lifecycle: goal, data, preparation, modeling, evaluation, deployment and monitoring. No row has circles in every column, and no column goes without a lead, which is the reason for having a team.

## Wearing Several Hats

The table looks cleaner than most workplaces. A small company may have one person who does the data engineering, the analysis and the modeling, and a large one may split each role into several. The same title can mean different work, since one company's data scientist is another's analyst. Read what a job asks for before trusting its title.

The roles also overlap in skills. Almost all of the technical roles write SQL, and most write Python. All of them need to explain a result to someone who didn't help produce it, because a finding no one understands changes no decision.

## Where This Roadmap Fits

The roadmap follows the work. Each of these topics sits closest to one role, and every role benefits from a feel for the others:

- **Data analyst**: [Exploratory Data Analysis](/data-ai/eda) and [Communicating Findings with Data](/data-ai/communicating-results)
- **Data engineer**: [The Data Engineering Lifecycle](/data-ai/data-engineering-lifecycle) and [Testing and Monitoring Data Quality](/data-ai/data-quality-checks)
- **Data scientist**: [Learning as Function Approximation](/data-ai/what-is-learning) and [Error Analysis](/data-ai/error-analysis)
- **Machine learning engineer**: [Model Registries and Versioning](/data-ai/model-registry) and [Automating Training and Release](/data-ai/mlops-automation)
- **Everyone**: [Managing AI Risk](/data-ai/ai-risk-management), because someone on each project has to ask who could be harmed

Phase 2 gives the math all of them share. For a new graduate, a software engineering role on a data team can be a good first step, since a team needs people who can write and deploy reliable code around the data, and the other roles can follow as the work shows what you like.

## Key Points

- A data team is a set of jobs, from building pipelines to running models, and titles vary between companies
- Each role hands the next something concrete: clean tables, a trained model, a running service, an app feature
- Handoffs are where projects slow down, and written agreements between roles help
- In small teams one person wears several hats, so read what a job asks for and not only its title
- <u>Each role needs to explain results to people who weren't involved</u>
