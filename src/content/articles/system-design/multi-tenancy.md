> A **tenant** is a customer, or a group of users, whose data and experience must be kept apart from the others while they share a system. **Multi-tenancy** is serving many tenants from shared infrastructure, and **tenant isolation** is the set of walls that keeps one tenant's data, performance and failures from reaching another.

The textbook app now has customers beyond students. Forty universities use it, each with its own listings, its own reports and its own rules about who can see what.

One university has 60,000 students and another has 2,000. They share the servers, because running 40 separate copies would cost 40 times as much, and they expect to be isolated as if they didn't.

Two things can go wrong, and they are different in kind. A bug can show one university's listings to another, which is a breach of trust that can't be undone. Or the big university's registration day can slow the app down for the other 39, which is a performance failure. Isolation is the design against both.

## Tenants, Deployments and Isolation

Start with who counts as a tenant. For business customers, a tenant is usually a customer organization, though one customer may need several, for divisions or regions or for development and production. For consumer apps it is harder: a tenant might be one person, or a family that shares data.

A **deployment**, also called a stamp or a supertenant, is a set of infrastructure that serves one or more tenants, and a mapping from tenant to deployment routes each request, as in the stamps of [Cellular Architecture](/system-design/cells).

Isolation isn't a yes or no. It is a spectrum, and it can differ by layer: a shared web front end, shared queues, and separate databases. Each step toward isolation buys security, predictable performance and room for tenant specific needs, and costs money and operating effort.

One distinction is often missed. Isolation is separate from authentication and authorization. A user could be authenticated and authorized and still reach the resources of another tenant, if the system doesn't use the tenant as context to limit access.

A login system proves who the user is, and isolation is the rule that a user of one tenant can't touch the data of another, whatever they ask for. It has to apply to each query and each call, and not just to the pages that remember to check.

## Choosing a Tenancy Model

There are four patterns:

| Model | What It Gives | What It Costs |
| --- | --- | --- |
| A Deployment for Each Tenant | Strong data isolation and no noisy neighbor | Cost grows roughly in line with tenants, so 100 tenants cost about 100 times one |
| Fully Shared | The lowest cost and the simplest maintenance | A change can affect the whole tenant base, and one tenant can slow others |
| Mixed, Vertically Partitioned | Shared for most, dedicated for those who need more | The code has to support both, and moving a tenant needs a plan |
| Shared App, Database for Each Tenant | A heavy tenant is isolated at the database | Management of many databases has to be automated |

The mixed model is common because tenants differ. A small university on a free tier lives in the shared deployment, and a large one that pays for isolation gets its own.

The costs: the codebase must support both models, and the system must track which tenant is where. Avoid permanent forks of the product for single customers, and use feature flags and tenant configuration instead, as in [Feature Flags](/system-design/feature-flags).

## Isolating the Data

For the data tier the range is the same, and it starts at the cheapest end.

The simplest design is a shared database with a tenant column. It has the highest density and the lowest cost, with one thing to manage and secure.

The limits show up later: a ceiling on size and throughput, noisy neighbors, hard per tenant metering, and difficulty giving a tenant its own security, backup or location settings. Restoring one tenant means restoring to a separate resource and recovering that tenant's rows.

The next step is shards with a shard map. Several databases each hold some tenants, and a map says which. That scales to many tenants and works around service quotas, but it makes tenant specific configuration and tenant provided encryption keys harder, as in [Sharding Strategies](/system-design/sharding).

At the far end is a database for each tenant: strong isolation and room for customization, at higher cost, and it needs automated provisioning. Elastic pools can share the cost.

For relational data, three habits cause trouble: a set of tables for each tenant, columns added for one tenant, and manual schema changes. The better path is a shared table set with a tenant id column, or separate databases, with a pipeline that tracks each tenant's schema version, as in [Schema Migrations Without Downtime](/system-design/schema-migrations).

There are three reasons to isolate a tenant's data: its own encryption keys, its own backup and restore policy, and a required data location. Those map to [Encrypting Data at Rest](/system-design/encryption-at-rest), [Backups and Disaster Recovery](/system-design/backup-dr) and [Serving Users Worldwide](/system-design/global-users).

### Let the Database Enforce It

In a shared table, each query must include the tenant condition, and a single forgotten `WHERE tenant_id = ...` leaks data. PostgreSQL's row level security moves the rule into the database:

```sql
ALTER TABLE listing ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON listing
  USING (tenant_id = current_setting('app.tenant_id')::int);
```

A few facts decide how far to trust it. With row security enabled and no policy, the default is deny: no rows are visible and none can be modified.

`USING` decides which existing rows a command sees, and `WITH CHECK` decides which new or changed rows are allowed, and a policy with a `USING` expression alone applies the same test to both. Permissive policies combine with OR and restrictive policies with AND.

Some roles walk around the wall. Superusers and roles with `BYPASSRLS` bypass it in each case, table owners bypass it unless the table is set to `FORCE ROW LEVEL SECURITY`, and referential integrity checks bypass it too. Those integrity checks can also leak information through covert channels, so schemas and policies need care.

The policy runs before the query's own conditions, except for functions marked leakproof. Policies that look at the current row alone are the simplest and perform best, and policies with subqueries on other rows can leak through race conditions.

The examples use `current_user`, and applications that connect through a shared account often set a session variable, as in the snippet, for each request.

Teams often skip the feature: it needs both user and tenant identity to be passed into each query, and many multitenant products decide the complexity isn't worth it. The best use is as a second wall behind the application's own checks.

### Carry the Tenant Everywhere

The tenant has to come from the authenticated identity, and not from a parameter the client sends, since a request that names another tenant's id is the same flaw as the broken object level authorization in [Authentication and Authorization](/system-design/authn-authz).

The identity of the tenant travels with the request through each service and queue message, and each log line, metric and cache key includes it. A cache key without the tenant is a data leak waiting to happen.

<figure class="diagram">
<div class="flow">
<div class="node">Login<small>tenant id</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Context</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Services</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Database Policy</div>
</div>
<figcaption>The tenant comes from the login, and each layer after it uses that value</figcaption>
</figure>

## Noisy Neighbors

The other failure is performance. On a shared system, a tenant that sends a burst takes capacity from the others. We modeled 50 tenants sharing 1,000 requests a second.

Forty nine ask for about 15 each, and one bursts to 600 for a minute, so the demand is 1,335 against a capacity of 1,000. The numbers are our arithmetic:

| Policy | Other Tenants Served | The Bursting Tenant Served |
| --- | --- | --- |
| No Limits, the Overload Is Shared | 74.9% | 75.0% |
| A Limit of 45 a Second for Each Tenant | 100% | 7.5% |
| Fair Share, With Unused Capacity Reused | 100% | 44.1% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share served for ordinary tenants and the bursting tenant under three policies">
<div class="hbar peak"><span>No Limits, Others</span><span class="track"><span class="fill" style="--w: 74.9%"></span></span><span class="value">74.9%</span></div>
<div class="hbar"><span>No Limits, Burster</span><span class="track"><span class="fill" style="--w: 75.0%"></span></span><span class="value">75.0%</span></div>
<div class="hbar"><span>Fixed Limit, Others</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">100%</span></div>
<div class="hbar"><span>Fixed Limit, Burster</span><span class="track"><span class="fill" style="--w: 7.5%"></span></span><span class="value">7.5%</span></div>
<div class="hbar"><span>Fair Share, Others</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">100%</span></div>
<div class="hbar"><span>Fair Share, Burster</span><span class="track"><span class="fill" style="--w: 44.1%"></span></span><span class="value">44.1%</span></div>
</div>
<figcaption>Share of requests served in the burst, by policy and tenant, from our arithmetic</figcaption>
</figure>

Without limits, the overload was spread evenly, and each innocent tenant lost a quarter of its requests because of one. A fixed limit, at three times the normal rate, protected the other tenants and gave the burster the least, since the limit holds even when capacity sits idle.

Fair share does better: tenants asking for less than their equal share are served in full, and the rest of the capacity goes to the heavy tenant, which got 44 percent.

The tools are the ones from earlier phases, applied for each tenant. [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) covers the mechanics, with the tenant id as the key. The bulkheads of [Bulkheads](/system-design/bulkheads), with their shuffle sharding, give each tenant or tier its own pool, so one tenant can't use up the shared threads.

Fair queuing serves tenants in turn, and a paid tier can go first when capacity is short, as in [Absorbing Traffic Spikes](/system-design/traffic-spikes). A dedicated deployment avoids the problem for the heavy tenant, and a database for each tenant isolates a hot tenant's load when the database is the bottleneck.

Metering ties it together: per tenant usage metrics and cost allocation, so the heavy tenants are known before they hurt.

Kubernetes offers the same tools at the platform level. Tenants can be teams in one company or customers of a SaaS product, and the tools are namespaces with namespaced access rules, resource quotas, default deny network policies, dedicated nodes, and, for stronger isolation, a separate control plane for each tenant at a higher cost. Quotas don't limit network traffic, so bandwidth needs its own control.

## Operating Many Tenants

A shared system multiplies the work of operations, and the habits that help are the same ones.

A new tenant is created by automation, with its configuration, keys and quotas, and not by hand. Metrics, logs and traces carry the tenant id, so that an alert says which tenant is affected and a dashboard shows the heavy ones, as in [Logs, Metrics and Traces](/system-design/observability).

Releases roll out to a few small tenants first, which is the idea of [Canary Releases and Other Deployment Strategies](/system-design/deployments) with tenants as the cohorts. A tenant that outgrows the shared tier moves to its own, and a tenant needs to be exportable, which is also a privacy duty in [Data Privacy and Compliance](/system-design/privacy).

Finally, test the walls on a schedule: tests that try to read another tenant's data, and load tests with one tenant at ten times its rate, to look for leakage and noisy neighbor effects.

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
