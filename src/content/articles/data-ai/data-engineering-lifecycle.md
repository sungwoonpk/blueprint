> The **data engineering lifecycle** is the path data takes from the system that produces it to the people and models that use it: generation, ingestion, storage, transformation and serving. A set of undercurrents, such as security, quality management and orchestration, cut across every stage. Knowing the stages tells us where a problem started and who has to fix it.

Phase 3 began with a table of listings and sales that already existed. In a real company that table is the result of a chain of work, and models are only as good as the chain. This phase follows the chain for the textbook app, starting with its overall shape. The framing here follows Joe Reis and Matt Housley, *Fundamentals of Data Engineering*, which gave the lifecycle its widely used names.

## The Five Stages

<figure class="diagram">
<div class="flow">
<div class="node">Generation</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Ingestion</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Storage</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Transformation</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Serving</div>
</div>
<figcaption>Storage sits under the whole path, since every stage reads from it or writes to it</figcaption>
</figure>

| Stage | What Happens | In the Textbook App |
| --- | --- | --- |
| Generation | A source system produces data as a side effect of running | The app database records listings, users and sales, and the website logs clicks |
| Ingestion | Data is moved out of the source | A nightly copy of the listings table, and a stream of click events |
| Storage | Data is kept in a form that fits how it will be read | Files in cheap object storage, grouped into tables |
| Transformation | Raw data is cleaned, joined and shaped | Duplicate sales removed, listings joined to sellers, daily totals computed |
| Serving | Data is delivered to those who use it | A dashboard for the team, a training table for the price model, a feature lookup for the app |

The source belongs to someone else: the application team. Its schema changes when the product changes, and the data team usually hears about it afterwards. That unequal relationship explains most of the later articles on contracts, quality and lineage.

## The Undercurrents

Six concerns apply to every stage, and the book calls them undercurrents:

- **Security**: who can read and change what, at each stage
- **Data management**: governance, lineage, quality, metadata and retention
- **DataOps**: applying software practices to data work, with version control, tests, monitoring and incident response
- **Data architecture**: choosing designs that can change as needs do
- **Orchestration**: scheduling and coordinating the steps, covered for general systems in [Workflow Engines](/system-design/workflow-engines)
- **Software engineering**: the code is code, so it needs review, tests and modularity

Most failures in data work come from the undercurrents, not the stages. A pipeline that moves data fine but has no tests, no owner and no alerting will run quietly until a wrong number reaches a meeting.

## Who Does What

| Role | Main Concern |
| --- | --- |
| Software engineers on the app | Generation, and keeping the source stable |
| Data engineers | Ingestion, storage, transformation and the reliability of all three |
| Analytics engineers and analysts | Transformation into models people query, and serving to the business |
| Data scientists and ML engineers | Serving to models, with features and training sets |

[Roles on a Data Team](/data-ai/data-team-roles) describes the roles. The boundaries move between companies, and the work stays the same.

## Where Problems Start

A symptom appears at the end of the path and its cause is usually earlier. A dashboard shows sales dropping 8 percent:

1. At serving, is the chart reading the right table?
2. At transformation, did a join start dropping rows?
3. At storage, is a file or partition missing?
4. At ingestion, did a nightly copy fail silently?
5. At generation, did the app stop writing an event?

Working back through the stages, and having [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage) to show which stages feed which, turns a vague problem into a checklist. The same view explains why quality checks belong at the stage boundaries, as in [Testing and Monitoring Data Quality](/data-ai/data-quality-checks).

## What This Phase Adds

[Batch Processing](/system-design/batch-processing), [Stream Processing](/system-design/stream-processing), [Change Data Capture](/system-design/cdc) and [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap) cover the engines that move and query data. This phase covers the choices around them: how a lake and a warehouse differ, how data is landed, laid out, versioned, transformed, served and trusted. It is the part of the path that decides whether a model gets its training data on time and correct.

## Key Points

- Data moves through generation, ingestion, storage, transformation and serving, and the source is owned by a different team
- Six undercurrents apply at every stage: security, data management, DataOps, architecture, orchestration and software engineering
- A symptom at the end of the path usually has its cause upstream, so work back one stage at a time
- Most data failures come from missing tests, owners and alerts rather than from the movement of data itself
- <u>Treat the pipeline as software with owners, tests and monitoring</u>
