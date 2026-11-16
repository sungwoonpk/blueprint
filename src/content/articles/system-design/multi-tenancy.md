> A **tenant** is a customer, or a group of users, whose data and experience must be kept apart from the others while they share a system. **Multi-tenancy** is serving many tenants from shared infrastructure, and **tenant isolation** is the set of walls that keeps one tenant's data, performance and failures from reaching another.

The textbook app now has customers beyond students. Forty universities use it, each with its own listings, its own reports and its own rules about who can see what.

One university has 60,000 students and another has 2,000. They share the servers, because running 40 separate copies would cost 40 times as much, and they expect to be isolated as if they didn't.

Two things can go wrong, and they are different in kind. A bug can show one university's listings to another, which is a breach of trust that can't be undone. Or the big university's registration day can slow the app down for the other 39, which is a performance failure. Isolation is the design against both.

## Tenants, Deployments and Isolation

Microsoft's multitenancy guidance starts with definitions. For business customers, a tenant is usually a customer organization, though one customer may need several tenants, for divisions or regions or for development and production. For consumer apps it is harder: a tenant might be one person, or a family that shares data.

A **deployment**, which the guidance also calls a stamp or a supertenant, is a set of infrastructure that serves one or more tenants, and a mapping from tenant to deployment routes each request, as in the stamps of [Cellular Architecture](/system-design/cells).

The guidance also says not to treat isolation as a yes or no. It is a spectrum, and it can differ by layer: a shared web front end, shared queues, and separate databases. Each step toward isolation buys security, predictable performance and room for tenant specific needs, and costs money and operating effort.

The AWS tenant isolation material adds a distinction that engineers often miss. Isolation is separate from authentication and authorization. A user could be authenticated and authorized and still reach the resources of another tenant, if the system doesn't use the tenant as context to limit access.

A login system proves who the user is, and isolation is the rule that a user of one tenant can't touch the data of another, whatever they ask for. It has to apply to each query and each call, and not just to the pages that remember to check.

## Choosing a Tenancy Model

The Azure guidance names four patterns:

| Model | What It Gives | What It Costs |
| --- | --- | --- |
| A Deployment for Each Tenant | Strong data isolation and no noisy neighbor | Cost grows roughly in line with tenants, so 100 tenants cost about 100 times one |
| Fully Shared | The lowest cost and the simplest maintenance | A change can affect the whole tenant base, and one tenant can slow others |
| Mixed, Vertically Partitioned | Shared for most, dedicated for those who need more | The code has to support both, and moving a tenant needs a plan |
| Shared App, Database for Each Tenant | A heavy tenant is isolated at the database | Management of many databases has to be automated |

The mixed model is common because tenants differ. A small university on a free tier lives in the shared deployment, and a large one that pays for isolation gets its own.

The guidance lists the costs: the codebase must support both models, and the system must track which tenant is where. It also advises against permanent forks of the product for single customers, and recommends feature flags and tenant configuration instead, as in [Feature Flags](/system-design/feature-flags).

## Isolating the Data

For the data tier, the guidance describes the same range:

- **A shared database with a tenant column**: The highest density and the lowest cost, with one thing to manage and secure. The limits are a ceiling on size and throughput, noisy neighbors, hard per tenant metering, and difficulty giving a tenant its own security, backup or location settings. Restoring one tenant means restoring to a separate resource and recovering that tenant's rows
- **Shards with a shard map**: Several databases each hold some tenants, and a map says which. It scales to many tenants and works around service quotas, and makes tenant specific configuration and tenant provided encryption keys harder, as in [Sharding Strategies](/system-design/sharding)
- **A database for each tenant**: Strong isolation and room for customization, at higher cost, and it needs automated provisioning. Elastic pools can share the cost
- **Antipatterns for relational data**: A set of tables for each tenant, columns added for one tenant, and manual schema changes. The advice is a shared table set with a tenant id column, or separate databases, and a pipeline that tracks each tenant's schema version, as in [Schema Migrations Without Downtime](/system-design/schema-migrations)

The guidance gives three reasons to isolate a tenant's data: its own encryption keys, its own backup and restore policy, and a required data location. Those map to [Encrypting Data at Rest](/system-design/encryption-at-rest), [Backups and Disaster Recovery](/system-design/backup-dr) and [Serving Users Worldwide](/system-design/global-users).

### Let the database enforce it

In a shared table, each query must include the tenant condition, and a single forgotten `WHERE tenant_id = ...` leaks data. PostgreSQL's row level security moves the rule into the database. The documentation describes it:

```sql
ALTER TABLE listing ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON listing
  USING (tenant_id = current_setting('app.tenant_id')::int);
```

The facts from the documentation:

- **Default deny**: With row security enabled and no policy, no rows are visible or can be modified
- **USING and WITH CHECK**: `USING` decides which existing rows a command sees, and `WITH CHECK` decides which new or changed rows are allowed. A policy with a `USING` expression alone applies the same test to both
- **Combining**: Permissive policies combine with OR and restrictive policies with AND
- **Who bypasses it**: Superusers and roles with `BYPASSRLS` in each case, and table owners unless the table is set to `FORCE ROW LEVEL SECURITY`. Referential integrity checks also bypass it
- **Evaluation order**: The policy runs before the query's own conditions, except for functions marked leakproof
- **Covert channels**: The documentation warns that integrity checks can leak information, so schemas and policies need care
- **Performance**: Policies that look at the current row alone are the simplest and best performing, and policies with subqueries on other rows can leak through race conditions

The documentation's examples use `current_user`, and applications that connect through a shared account often set a session variable, as in the snippet, for each request.

Azure's guidance notes why teams skip the feature: it needs both user and tenant identity to be passed into each query, and many multitenant products decide the complexity isn't worth it. The best use is as a second wall behind the application's own checks.

### Carry the tenant everywhere

The tenant has to come from the authenticated identity, and not from a parameter the client sends, since a request that names another tenant's id is the same flaw as the broken object level authorization in [Authentication and Authorization](/system-design/authn-authz).

The identity of the tenant travels with the request through each service and queue message, and each log line, metric and cache key includes it. A cache key without the tenant is a data leak waiting to happen.

## Noisy Neighbors

The other failure is performance. On a shared system, a tenant that sends a burst takes capacity from the others. We modeled 50 tenants sharing 1,000 requests a second.

Forty nine ask for about 15 each, and one bursts to 600 for a minute, so the demand is 1,335 against a capacity of 1,000. The numbers are our arithmetic:

| Policy | Other Tenants Served | The Bursting Tenant Served |
| --- | --- | --- |
| No Limits, the Overload Is Shared | 74.9% | 75.0% |
| A Limit of 45 a Second for Each Tenant | 100% | 7.5% |
| Fair Share, With Unused Capacity Reused | 100% | 44.1% |

Without limits, the overload was spread evenly, and each innocent tenant lost a quarter of its requests because of one. A fixed limit, at three times the normal rate, protected the other tenants and gave the burster the least, since the limit holds even when capacity sits idle.

Fair share does better: tenants asking for less than their equal share are served in full, and the rest of the capacity goes to the heavy tenant, which got 44 percent.

The tools are the ones from earlier phases, applied for each tenant:

- **Per tenant rate limits and quotas**: [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) covers the mechanics, and the tenant id is the key
- **Pools for each tenant or tier**: The bulkheads of [Bulkheads](/system-design/bulkheads) and the shuffle sharding there keep one tenant from using the shared threads
- **Fair queuing and priorities**: Serve tenants in turn, and let a paid tier go first when capacity is short, as in [Absorbing Traffic Spikes](/system-design/traffic-spikes)
- **A dedicated deployment for the heavy tenant**: The Azure guidance says dedicated deployments avoid the problem entirely, and a database for each tenant isolates a hot tenant's load when the database is the bottleneck
- **Metering**: Per tenant usage metrics and cost allocation, so the heavy tenants are known before they hurt

Kubernetes offers the same tools at the platform level. Its multi-tenancy documentation, which we read in part, distinguishes tenants who are teams in one company from customers of a SaaS product, and describes namespaces with namespaced access rules, resource quotas, default deny network policies, dedicated nodes, and, for stronger isolation, a separate control plane for each tenant at a higher cost.

It also notes that quotas don't limit network traffic, so bandwidth needs its own control.

## Operating Many Tenants

A shared system multiplies the work of operations:

- **Onboarding**: A new tenant is created by automation, with its configuration, keys and quotas, and not by hand
- **Observability**: Metrics, logs and traces carry the tenant id, so that an alert says which tenant is affected and a dashboard shows the heavy ones, as in [Logs, Metrics and Traces](/system-design/observability)
- **Releases**: Roll out to a few small tenants first, which is the idea of [Canary Releases and Other Deployment Strategies](/system-design/deployments) with tenants as the cohorts
- **Moving tenants**: A tenant that outgrows the shared tier moves to its own, and a tenant needs to be exportable, which is also a privacy duty in [Data Privacy and Compliance](/system-design/privacy)
- **Testing the walls**: Tests that try to read another tenant's data, and load tests with one tenant at ten times its rate, as the Azure guidance recommends for leakage and noisy neighbor outcomes

## A Plan for the Textbook App

| Area | Decision |
| --- | --- |
| Model | Mixed: a shared deployment for most universities, a dedicated one for the largest |
| Data | A shared database with a tenant column and row level security, and dedicated databases for tenants who need their own keys or location |
| Identity | The tenant comes from the token, and each query and cache key includes it |
| Limits | A fair share scheduler with a cap of 3 times the normal rate for each tenant, and a higher tier for paid plans |
| Configuration | Flags and tenant settings for differences, with no forks |
| Operations | Automated onboarding, tenant tagged metrics, and a quarterly leakage test |

## Pitfalls

- **Relying on each query to filter**: One forgotten condition leaks a tenant's data
- **A tenant id taken from the request**: A client can name another tenant
- **A cache key without the tenant**: One tenant sees another's page
- **No per tenant limits**: The largest tenant sets the quality for the rest
- **A fork for a single customer**: Each fork multiplies the cost of each change
- **A shared encryption key for the whole tenant base**: A tenant that needs its own key can't have one
- **Untested isolation**: The first test of the wall is a breach

## Key Points

- A tenant's data and performance must be isolated on shared infrastructure, and isolation is a spectrum between a fully shared system and a deployment for each tenant, chosen by risk and cost
- Authentication isn't isolation: a user can be authorized and still reach another tenant's data unless the tenant is used as context on each request
- Let the database help: row level security with a default deny, as a second wall behind the application's checks, and a tenant id in each cache key, log line and message
- <u>Plan for noisy neighbors</u>: in our model of 50 tenants, an unlimited burst cost each other tenant 25 percent of its requests, and a fair share scheduler cost them zero
- Keep one codebase with flags and tenant configuration, automate onboarding and tenant moves, and test for leakage and for a heavy tenant on a schedule
