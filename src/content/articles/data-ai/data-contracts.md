> A **data contract** is an agreement between the team that produces a dataset and the teams that consume it, covering its schema, meaning, quality, freshness and the rules for changing it. Written as a file and checked automatically, it turns the silent assumptions that downstream pipelines make about upstream data into something that can be tested, versioned and owned.

In [The Data Engineering Lifecycle](/data-ai/data-engineering-lifecycle), the source belongs to the application team, and everything downstream reads it without being asked. The app team renames a column on Tuesday and the price model quietly degrades by Friday. A contract moves that conversation from after the damage to before the change.

## What a Contract Contains

The Open Data Contract Standard, an open specification from the Bitol project, shows a typical shape. A contract is a YAML file with sections for fundamentals, schema, quality, service levels, team and roles. A trimmed contract for the listings feed, written with keys from the specification, looks like this:


```yaml
apiVersion: v3.2.0
kind: DataContract
id: 7b1f0e52-5d41-4a39-9c1e-0a6f3b2c9d10
name: listings_v1
version: 1.2.0
status: active
domain: marketplace
description:
  purpose: One row per textbook listing, for analytics and the price model.
  limitations: Not for per-user targeting.
schema:
  - name: listings
    logicalType: object
    properties:
      - name: listing_id
        logicalType: string
      - name: price
        logicalType: integer
        description: Asking price in whole dollars.
        quality:
          - metric: nullValues
            mustBe: 0
slaProperties:
  - property: latency
    value: 1
    unit: d
  - property: retention
    value: 3
    unit: y
```

Each part does a job:

| Section | What It Fixes |
| --- | --- |
| Fundamentals: name, version, status, domain, purpose and limitations | Which dataset this is, whether it is active or deprecated and what it may be used for |
| Schema: objects and properties, with types and descriptions | The structure, and the meaning of each column, including units |
| Quality: rules such as no null values, no duplicates, valid ranges | What the producer promises to keep true |
| Service levels: latency, frequency, retention and availability | How fresh the data is and how long it is kept |
| Team and roles | Who to ask, and who may access it |

## Schema Changes

Most breakage comes from changing the shape of data. A contract checker can compare a proposed schema with the current one and classify the change. Here is our simple compatibility check run on eight changes to the listings schema, judged from a consumer written against version 1:

| Change | Verdict | Why |
| --- | --- | --- |
| Add an optional column | Compatible | Old readers ignore it |
| Add a required column | Breaking for writers | Old producers can't supply it |
| Rename `price` to `list_price` | Breaking | Readers lose `price`, and see a new unknown column |
| Widen `price` from int to long | Compatible | Every old value still fits |
| Narrow `price` from int to short | Breaking | Values may no longer fit |
| Make `price` nullable | Breaking | Readers assume it is always present |
| Drop `condition` | Breaking | Readers lose a column |
| Change `price` from dollars to cents, type unchanged | **Not detected** | The schema looks identical |

The last line is the important one.

A schema check catches seven of the eight and is blind to the change of meaning, which breaks things the most quietly: every price is now a hundred times too large and nothing fails.

That is why a contract includes descriptions, units and quality rules, such as a plausible range for `price`, so a unit change trips a range check on the first batch. [Serialization and Schema Evolution](/system-design/serialization) covers compatibility rules for message formats in depth.

## Making a Breaking Change

When a breaking change is needed, the usual sequence is the one used for APIs in [API Versioning](/system-design/api-versioning) and for databases in [Schema Migrations Without Downtime](/system-design/schema-migrations):

1. Propose the change as a new contract version
2. Use lineage, from [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage), to find the consumers and notify them
3. Publish both versions side by side, with the old one marked deprecated and an end date
4. Let consumers migrate, then retire the old version

Semantic versioning helps: a compatible change raises the minor version, and a breaking one raises the major.

## Where Enforcement Happens

A contract is only useful if something checks it:

- **In the producer's build**: continuous integration compares the schema of the app's table or event with the contract and blocks a breaking change
- **At ingestion**: each batch is validated, and failures are quarantined or reject the load, the checks of [Testing and Monitoring Data Quality](/data-ai/data-quality-checks)
- **In monitoring**: freshness and volume are compared with the service levels

The first is the most valuable, since it stops a change before it ships. It needs the application team to treat the contract as part of their interface.

## Limits and Costs

- A contract needs an owner who will answer, so it is as much an organizational tool as a technical one
- Too many contracts, or contracts on unstable experimental data, create paperwork without protection. Start with the datasets that many teams depend on
- Contracts describe intent, and reality still needs monitoring
- Contracts don't make data correct. They make the promise explicit, so a violation is visible and attributable

[Data Governance and Ownership](/data-ai/data-governance) places contracts among the other controls.

## Key Points

- A data contract is a versioned agreement on a dataset's schema, meaning, quality, freshness and change rules
- The Open Data Contract Standard expresses it as YAML with schema, quality rules, service levels and roles
- A schema check caught seven of eight example changes, and missed a switch from dollars to cents, so units, descriptions and range rules belong in the contract
- Breaking changes follow a deprecation path: a new version, notice through lineage, a period of overlap and then retirement
- <u>Enforce the contract in the producer's build, where a breaking change can still be stopped</u>
