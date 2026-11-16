> **Chaos engineering** is the practice of running controlled experiments on a system, by injecting a failure on purpose, to learn whether it holds up the way its designers believe. An experiment starts from a prediction and ends with either confidence or a weakness found before a real outage finds it.

The textbook app runs on 6 servers, and the team believes it can lose one without users noticing. The belief comes from the design: a load balancer, health checks and retries. Nobody has tested it, and the day it gets tested might be registration day at 9:00 AM.

Everything in this phase so far is a defense: [Timeouts, Retries and Backoff](/system-design/timeouts-retries), [Circuit Breakers](/system-design/circuit-breakers), [Bulkheads](/system-design/bulkheads), [Load Shedding and Graceful Degradation](/system-design/load-shedding) and [Cellular Architecture](/system-design/cells). Each has settings, and the settings are guesses until a failure shows what they do. Chaos engineering tests the guesses on a day of our choosing.

## An Experiment, Not a Prank

The name suggests breaking things at random. The method is the opposite, and the Principles of Chaos Engineering, published at principlesofchaos.org, describe it as an empirical approach. Its steps, in our words:

- **Define steady state**: Pick a measurable output that shows the system is behaving normally, such as orders a minute or error rate and latency percentiles, and not an internal detail like CPU
- **Hypothesize**: Predict that the steady state holds in both a control group and an experimental group
- **Introduce a realistic event**: A crashed server, a slow disk, a cut network link, or a spike in traffic, ranked by likely impact or frequency
- **Try to disprove the hypothesis**: Compare the two groups, and a difference is a finding

Four more ideas shape how it is done. The principles prefer running in production, since real traffic is the best way to capture the real request path. They ask for automation, so experiments run continuously and not once.

They ask to minimize the blast radius, so that the damage from an experiment is contained. And they allow some short term impact, as the price of the learning.

The guidance from cloud providers is more cautious about the first idea. The AWS Fault Injection Service documentation advises against starting in production, and the Azure Well-Architected guidance notes that fault injection in production can be disruptive and can cause downtime.

These agree on a ladder, climbed in order: start in a test environment, then go to production with a small blast radius once the checks are in place.

AWS gives a template for the hypothesis: if a fault injection action is performed, a business or technical metric should not exceed a value. For the textbook app: if one of the 6 servers is stopped, the share of failed requests stays under 0.5 percent and the 99th percentile stays under 300 ms.

## What an Experiment Contains

The AWS service shows the parts in its vocabulary. An experiment template holds the actions, the targets and the stop conditions:

| Part | What It Is | For the Textbook App |
| --- | --- | --- |
| Action | The fault to inject | Stop one server |
| Target | What it hits, picked by name or tag | One of the 6 servers |
| Stop Condition | A threshold that ends the run | Error rate above 2% for a minute |
| Steady State | The metric that must hold | Failed requests and latency |

In AWS, a stop condition is an alarm on a metric, and when it fires during the run the experiment stops. The same idea works anywhere.

Before the first fault goes in, decide the signal that says to stop, and write down how to undo the fault, which is the abort button for the experiment. The alarms from [Alerting and Dashboards](/system-design/alerting) and the budgets from [SLIs, SLOs and Error Budgets](/system-design/slo) are the natural source for both.

The experiment also needs to be seen. If the dashboards from [Logs, Metrics and Traces](/system-design/observability) can't show the steady state, the experiment can't tell a pass from a fail, so observability comes first.

## An Experiment on the Textbook App

We simulated the experiment. 6 servers each finish 600 requests a second, requests arrive at random, and a client gives up after 1 second. One server is stopped at the 60 second mark, and the next 240 seconds are measured. The rows add the protections one at a time:

| Setup | Requests Answered | 99th Percentile |
| --- | --- | --- |
| 1,500 a Second, Dead Server Stays in Rotation | 83.3% | 9 ms |
| 1,500 a Second, Removed After 10 Seconds | 99.3% | 11 ms |
| Same, With One Retry | 99.9% | 13 ms |
| 3,000 a Second, Removed After 10 Seconds | 94.9% | 871 ms |
| Same, With One Retry | 77.5% | 1,000 ms |
| 7 Servers, 3,000 a Second, With One Retry | 99.9% | 33 ms |

The first three rows are the happy story. If no check removes the dead server, one in six requests fails, which is 83.3 percent answered. A health check that takes it out of rotation after 10 seconds brings that to 99.3 percent, and a retry covers the requests that were in flight, as in [Health Checks](/system-design/health-checks).

The next two rows are the finding. At the peak of 3,000 requests a second, 5 remaining servers can finish exactly 3,000, so the fleet has no headroom.

The hypothesis, that losing a server is invisible, held off peak and failed at peak. The retry made it worse, since each retry added load to servers that were already full, as [Cascading Failures](/system-design/cascading-failures) describes. With a seventh server the experiment passes.

Results for a fleet that sits exactly at its limit swing from run to run, so the exact figures matter less than the direction. The experiment turned a belief that was true most of the day into a known gap.

The fix is capacity, covered in [Capacity Planning](/system-design/capacity-planning), or a shedding rule that protects the checkout, and the next run checks that the fix works.

## Which Faults to Inject

The Principles suggest ranking events by their likely impact or how often they happen. A starting list for a service like ours:

- **Servers**: A stopped instance or container, the classic test and still the first one to run
- **Network**: Delay, packet loss, a cut link between two services, or a blocked dependency
- **Slow dependencies**: A call that takes 10 seconds, and not just one that fails, since [Circuit Breakers](/system-design/circuit-breakers) and timeouts are tested by slowness
- **Resources**: A full disk, exhausted memory or a saturated CPU
- **Traffic**: A spike, or a surge of retries
- **Larger units**: A zone or a cell, which leads into [Surviving a Region Outage](/system-design/region-outage)

Platforms supply the tools. A service mesh can add a delay or an abort to a share of the requests for a route, and Istio's fault injection sets the delay time, the status code and the percentage.

Kubernetes gives a related safeguard: a PodDisruptionBudget limits how many pods of an application can be down at once from voluntary actions such as a node drain, though it does not stop a hardware failure.

## Game Days and Tabletop Exercises

Systems aren't the sole thing that fails: the people and the procedures do too. A **game day** is a planned session where a team handles a simulated or injected failure while the others watch.

Google's SRE book describes two forms in its chapter on bringing new engineers on call. One is disaster role playing, where on-call engineers respond to a simulated page and work the problem without a real outage.

The other, under the heading Break Real Things, Fix Real Things, has the team break a real system on purpose, a search cluster in the book's example, and then fix it. Azure's guidance has a milder version, a tabletop exercise, in which the team talks through a scenario without touching anything.

Disaster recovery needs its own tests. Azure advises a dedicated environment so the test can't hurt production, and measures the result against the recovery time and recovery point targets, as in [Backups and Disaster Recovery](/system-design/backup-dr).

Google's book also notes that a test that finds a bug before release gives it a time to repair of zero, which is the logic behind each experiment here.

## Starting Small

A path for the textbook app:

1. **Talk through it**: A tabletop of "a server dies at 9:00 AM," and write down what the team expects
2. **Test environment**: Stop a server there and compare with the prediction
3. **Production, small**: Stop one server off peak, with the stop condition armed and the team watching
4. **Production, at risk**: Repeat at a busy time, now that the headroom is known, or in one cell, as in [Cellular Architecture](/system-design/cells)
5. **Automate**: Run the experiment on a schedule, so a change that breaks the protection shows up in days and not at the next outage

Each run ends with a record: what was predicted, what happened, and what was changed. An experiment that finds no problem is useful too, since it gives a measured reason for trust.

## Pitfalls

- **No hypothesis**: Without a prediction, an outage is just an outage
- **No stop condition**: An experiment that can't be stopped is an incident that was scheduled
- **Testing blind**: If the steady state can't be measured, the result can't be read
- **Skipping the known problems**: Fix what is already known to be weak before injecting a fault that will show it
- **Surprising people**: Tell the teams that might see the effects, and pick a time when people can respond
- **No follow up**: A finding that doesn't change anything is a finding that will return

## Key Points

- Chaos engineering is a controlled experiment: define a measurable steady state, predict that it holds, inject a realistic fault, and look for a difference
- Each experiment needs a hypothesis, a limited blast radius, a stop condition and a way to undo the fault, and the cloud providers advise starting outside production
- In our simulation, losing one of 6 servers was invisible off peak and cut answered requests to 94.9 percent at peak, where a retry made it 77.5 percent, until a seventh server restored 99.9 percent
- <u>Test the settings that earlier topics just guessed</u>: timeouts, breakers, headroom and shedding rules show their real behavior when a fault arrives
- Practice people as well as systems with tabletop exercises and game days, and automate the experiments that pass so they keep passing
