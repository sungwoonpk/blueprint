> **Data governance** is the set of decisions about who owns data, who may use it, how it must be protected, how long it is kept and what quality it must have, together with the people and controls that make those decisions stick. It is mostly about accountability: every dataset should have someone answerable for it.

The earlier articles built a platform: layers, lineage, checks, contracts. Governance is what keeps it from becoming a liability. Data accumulates, personal information spreads through copies and the people who understood a table move on. Without agreed rules and owners, no one can say what the company holds, who sees it or when to delete it.

## Roles

| Role | Responsibility |
| --- | --- |
| Data owner | Accountable for a dataset or domain: approves access and defines acceptable use and quality |
| Data steward | Maintains definitions, documentation and quality day to day |
| Producer or custodian | Builds and runs the pipelines and storage, and applies the controls |
| Consumer | Uses the data within its terms, and reports problems |
| Governance forum | Sets shared policy, settles disputes and reviews exceptions |

DAMA International publishes the Data Management Body of Knowledge, a widely used reference framework for this field, and the details vary between organizations. The shared principle is that ownership is a named role, and not "the data team".

## What Gets Governed

- **Classification**: label data by sensitivity, for example public, internal and personal, so that rules attach to the label and not to each table
- **Access**: who can read or change which data, as granted on request and reviewed regularly
- **Quality standards**: the expectations from [Dimensions of Data Quality](/data-ai/data-quality)
- **Retention and deletion**: how long data is kept, and how it is removed on request or at expiry
- **Lifecycle and cost**: what is archived, deprecated or deleted, since unused data still costs money and risk
- **Definitions**: one meaning for each business term and metric
- **Use**: what purposes the data may serve, and what it must not be used for

## Classification Drives Access

We classified eight columns in the textbook app's tables as public, internal or personal, and set a rule for each role:

| Role | May See | Columns Visible |
| --- | --- | --- |
| External partner | Public | 1 of 8 |
| Analyst | Public, internal | 5 of 8 |
| ML engineer | Public, internal | 5 of 8 |
| Support agent | Public, internal, personal | 8 of 8 |

Personal columns, such as email, phone and buyer ID, are hidden from analysts and model builders without anyone listing them one by one. A new column tagged personal is protected the moment it is tagged.

The Open Data Contract Standard carries this as a classification on each property. Where analysts need to join on a person without seeing them, masking or pseudonymous keys give them the join and hide the identity. [Differential Privacy](/data-ai/differential-privacy) covers the stronger technique for sharing aggregates.

## Deletion Across the Platform

A seller asks the app to delete their account, and the law may require the data to go too. [Data Privacy and Compliance](/system-design/privacy) covers the obligations. The platform problem is that a person's data has spread.

In the lineage graph of [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage), the app's user table feeds five datasets: the raw and cleaned user tables, the seller dimension, the seller scorecard and a dashboard. A deletion request has to reach all of them, and the backups and extracts that no lineage graph shows.

Three design choices make that tractable:

1. Know where personal data lives, by classification and lineage
2. Use table formats that support row-level deletes, as in [Table Formats and Transactions on Object Storage](/data-ai/table-formats), and remember that old versions need cleanup before the data is truly gone
3. Prefer pseudonymous keys, so that deleting the mapping removes the link, and keep the raw layer's retention short

Models raise a further question. If a model trained on the data, is it affected? [Memorization and Privacy Attacks](/data-ai/privacy-attacks) discusses what models can retain.

## Operating Models

Two broad approaches exist:

- **Centralized**: a governance team writes policy and approves access. It is consistent and can become a bottleneck
- **Federated or domain-owned**: each domain owns its data as a product and follows shared standards, an idea associated with the data mesh proposal. It scales, and relies on strong shared tooling and clear standards

Most organizations mix the two: central policy for classification, security and retention, and local ownership of definitions and quality.

## Making It Real

Governance fails when it lives only in documents. Controls that stick are automated:

- Ownership and classification are fields in the catalog, required for new tables
- Access is granted through roles and logged
- Contracts and quality checks run in pipelines
- Retention jobs run on a schedule and are audited
- Policy exceptions are recorded with an expiry

For AI systems, governance carries on into [Model Cards and Datasheets](/data-ai/documentation), which document what data a model was trained on and what it is fit for, and into the rules and frameworks covered in the Responsible AI phase.

## Key Points

- Governance is accountability: every dataset has a named owner, and the rules for access, quality, retention and use are explicit
- Classifying data by sensitivity lets one rule protect many columns, and a new column tagged personal is protected at once
- A deletion request has to reach every copy: in our lineage graph a user table fed five datasets, plus backups and extracts
- Automate controls in the catalog, pipelines and access system, since policy that exists only in documents isn't followed
- <u>Name an owner for every dataset, classify its columns and delete by lineage</u>
