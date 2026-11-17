> A **deployment strategy** is the plan for replacing the running version of a service with a new one while limiting the harm if the new version is bad. A **canary release** is one such plan: send the new version to a small share of traffic, compare it with the rest, and widen the rollout while the comparison looks healthy.

The textbook app ships a change on the Thursday before registration day. It passes its tests, and it fails on 20 percent of search requests, because of a case the tests didn't cover. How many students see the failures depends on one decision: how the new version reaches the servers.

The decision matters more than it seems. Google's SRE workbook, citing its own postmortem data, says that a majority of incidents come from pushing a new binary or a new configuration.

The change itself is the most common trigger of outages, so the way it is released is a reliability feature, in the same family as [Bulkheads](/system-design/bulkheads) and [Load Shedding and Graceful Degradation](/system-design/load-shedding).

## The Strategies

Five approaches cover most of what teams do:

| Strategy | How It Works | Rollback |
| --- | --- | --- |
| Recreate | Stop the old version, start the new | Redeploy the old one |
| Rolling | Replace servers in batches | Roll the batches back |
| Blue Green | Switch the whole traffic to a second environment | Switch back |
| Canary | Send a small share of traffic to the new version | Route the share back |
| Mirroring | Copy traffic to the new version and discard its answers | Stop the copy |

- **Recreate**: The simplest, and it has downtime between the two versions
- **Rolling**: The Kubernetes default. A rolling update has two limits, the maximum number of pods unavailable and the maximum above the desired count, and both default to 25 percent. It moves on when new pods report ready, which checks that a server starts, and not that it behaves correctly
- **Blue green**: Martin Fowler's description is two production environments kept as identical as possible. One is live and the other is tested, and when the second is ready the router switches to it. Rollback is the switch back. The costs are a second environment and writes that were made on the new side, which a rollback doesn't carry over. Fowler's remedies are to feed transactions to both sides or to put the system in a state where it can't take writes during the switch
- **Canary**: His description is rolling the change out slowly to a small subset of users. The users can be a random sample, employees first, or one region or brand, and the capacity grows as confidence does
- **Mirroring**: Flagger, a progressive delivery tool, copies requests to the new version and drops its responses. It is safe for requests that can be repeated without side effects, as in [Idempotency and Safe Retries](/system-design/idempotency)

Fowler separates a canary from an A/B test: a canary release should take minutes or hours, and an A/B test can take days to answer a question about users and not about health.

## How Much Each One Risks

We compared them on the Thursday change. 1,000 requests a second arrive, and the bad version fails 20 percent of the requests it serves. An alarm notices after 60 seconds.

Redeploying the old version takes 120 seconds and a traffic switch takes 10, and both are our assumptions. A rolling update with batches of 25 percent at 2 minute intervals is halted by the alarm:

| Strategy | Who Is Exposed | Failed Requests |
| --- | --- | --- |
| Whole Fleet at Once | The full traffic for 3 minutes | 36,000 |
| Rolling, Halted by the Alarm | The first quarter for 3 minutes | 9,000 |
| Blue Green | The full traffic for 70 seconds | 14,000 |
| Canary at 5% | 5% of traffic for 20 seconds | 200 |

The canary number depends on a fast comparison, which the simulation later in this topic supplies: the test flagged the release after 10 seconds, and the traffic switch took 10 more.

The exposure is the product of the share of traffic and the time it takes to notice, and each strategy attacks one of the two. Blue green shortens the rollback and a canary shrinks the share, and the best pipelines do both.

## Canary and Control

Canarying is a partial and time limited deployment of a change in a service, and its evaluation. The canary is the part that gets the change, and the control is the rest. The comparison is what makes it more than a slow rollout.

Its example shows why a breakdown matters. With a 5 percent canary and a defect that fails 20 percent of requests, the failures are just 1 percent of the service's traffic, which a whole service dashboard can hide. The error rate has to be shown for the canary and the control separately.

The workbook's advice on running one:

- **Pick user facing metrics**: Start from the SLIs of [SLIs, SLOs and Error Budgets](/system-design/slo), such as HTTP status and latency, and avoid CPU and memory, which are noisy and don't show that users are hurt
- **Keep few**: No more than a dozen metrics, so the signal stays readable
- **Match the intervals**: Metrics must be aggregated over intervals the same as or shorter than the canary, or the signal is muddied
- **Treat errors carefully**: A 404 is often the user's mistake, so exclude the 400 range and add checks on known URLs
- **Run one canary at a time**: Two at once contaminate each other's signal
- **Cover the peak**: Performance defects often show up just under heavy load, so a canary at the quiet hour can miss them
- **Compare with the control, not with yesterday**: A before and after comparison picks up noise from the time of day and the weekday
- **Back it with absolute checks**: Both groups can get worse together, so keep the checks against the SLO

## How Big and How Long

A small canary limits the damage and takes longer to see a problem. We simulated the comparison: the control has a normal error rate of 0.1 percent, 1,000 requests a second arrive, and the test, a one sided check for a difference at p below 0.001, runs at 10 second intervals.

The table shows the median seconds until a bad release is flagged, over 200 runs:

| Extra Failure Rate | 1% Canary | 5% Canary | 25% Canary |
| --- | --- | --- | --- |
| 1% | 50 | 10 | 10 |
| 0.3% | 120 | 50 | 20 |
| 0.1% | Often Missed | Often Missed | 70 |

The big defect was caught in seconds at any size. The subtle ones need more requests, which means a bigger share or more time. The row at 0.1 percent was missed in some runs even after an hour for the small canaries.

At 100 requests a second, a 5 percent canary needed 90 seconds for the 1 percent defect and 240 for the 0.3 percent one, so a quiet service needs a longer or larger canary.

The workbook stops short of a formula and says the size and duration must be representative: a handful of queries says little about a diverse workload. For a service with a daily release, a canary of a week is too long, and with many releases a day it has to be much shorter.

Tools turn the idea into settings. Flagger's built in checks need a success rate of at least 99 percent and a 99th percentile under 500 ms, evaluated each minute.

It steps traffic up in increments, and with its example of 2 percent steps to a maximum of 50 percent at 1 minute each, a promotion takes at least 25 minutes. A rollback takes the check interval times the number of failures allowed.

## A Whole Pipeline

AWS's Builders' Library article on deployments, from 2020, describes how far this can go. The pipeline's stages run source, build, test and production.

The production stage is a series of waves: a low traffic region first, one zone or cell at a time, then a high traffic region, then three regions, then up to twelve, then the rest, since a single region at a time could take weeks.

Each wave starts with a one box stage, a single server or container that takes at most 10 percent of the requests of a region or zone, and the rest of the fleet is updated in rolling batches that keep at least 66 percent of capacity healthy, up to 33 percent at a time.

Between steps the pipeline waits, which is called **bake time**: in Amazon's pipeline, at least one hour after a one box stage, at least 12 hours after the first regional wave, and 2 to 4 hours after each later wave.

It also waits for a minimum number of requests, such as 100 calls to an API, so that quiet periods don't pass a change unseen.

The rest is automation. A high severity alarm during a deployment rolls it back on its own and pages the on call engineer, and the rollback goes to the previous immutable package. If a team's aggregate alarm is already firing, a new deployment doesn't start.

Time windows keep deployments to business hours and out of nights, weekends and holidays, since recovery is slower when the on call engineer is asleep. At Amazon a change typically reaches the whole set of regions in about four or five business days.

The zones and cells in those waves are the units from [Cellular Architecture](/system-design/cells), and the alarms are the ones from [Alerting and Dashboards](/system-design/alerting).

## Two Versions at Once

Each strategy here runs old and new code together for a time, and the two must work with each other and with the same data.

Fowler's parallel change pattern gives the order: expand, adding the new version alongside the old, migrate, moving the users over, and contract, removing the old. Canary and blue green are applications of it.

Applied to a database, the schema has to serve both versions, so a rename becomes add the new column, write to both, move the readers and drop the old one later. That discipline is a later topic in this phase, [Schema Migrations Without Downtime](/system-design/schema-migrations).

Another tool: keep feature launches apart from binary releases with flags, so that code can be deployed dark and turned on for a few users, as in [Feature Flags](/system-design/feature-flags).

## A Pipeline for the Textbook App

| Stage | What Happens | Gate |
| --- | --- | --- |
| Tests | Unit and integration tests | The suite passes |
| Staging | Production like load test | The latency target holds |
| One Server | 1 of 8 servers, about 12% of traffic | Canary beats the control on errors and latency |
| One Cell | A full cell, as in [Cellular Architecture](/system-design/cells) | The same checks, over a busy hour |
| The Rest of the Fleet | Batches of 25% | Alarm stays quiet, rollback on failure |

The Thursday change fails at the one server stage: errors at that server are well above the control, and the pipeline rolls it back before most students have loaded a page. The release isn't repeated until the missing test is added.

## Pitfalls

- **Readiness as the sole gate**: A server can be ready and wrong
- **Slow rollback**: A canary that finds a problem in 10 seconds and needs 10 minutes to undo it loses most of its value
- **A canary that is too small or too short**: Subtle defects and defects that appear at peak pass
- **Metrics that don't separate canary from control**: A 20 percent failure becomes 1 percent on the dashboard
- **Incompatible versions**: A new version that writes data the old one can't read breaks the rollback
- **Skipping the pipeline for an urgent fix**: The urgent change is the one most likely to be wrong, and AWS asks for senior sign off before a shortened bake

## Key Points

- A deployment strategy decides how many users meet a bad release and for how long: the exposure is the share of traffic times the time to notice and roll back
- Rolling updates check that a server is ready, blue green gives a fast switch back, and a canary shrinks the share and compares it with a control
- In our simulation a defect failing 20 percent of requests cost 36,000 failed requests with the whole fleet at once and 200 with a 5 percent canary
- <u>Compare the canary with the control</u> on user facing metrics, show them apart, and size the canary so the difference is visible in time: subtle defects needed a bigger share or a longer run
- Release in waves with bake time, automatic rollback and compatible versions, since old and new code run together

