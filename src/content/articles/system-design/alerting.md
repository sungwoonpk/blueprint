> An **alert** is a notification that something needs a human. A **page** interrupts someone now, a **ticket** waits for working hours, and a **dashboard** is a shared screen for finding out why. The rule of thumb is to page on symptoms that threaten the SLO and use dashboards to find causes.

[SLIs, SLOs and Error Budgets](/system-design/slo) gave the textbook app a budget: 40.3 minutes of full outage in 28 days at 99.9 percent. The budget says how much failure is acceptable. It doesn't say when to wake someone up, and two obvious ways to decide both go wrong.

Alert on every error blip, and the on-call engineer learns to ignore the pager. Alert on a total outage alone, and a slow leak eats the budget for days with no one noticing.

This topic is about telling the two apart, and then about the dashboards that a person opens after the pager goes off.

## What Deserves a Page

Google's SRE book gives the test: an alert should be urgent and actionable, and a page that someone answers by running the same script each time is a sign that the response should be automated or the cause fixed. The Prometheus documentation, from the open source side, says the same thing in three rules:

- **Alert on symptoms**: Page on what users feel, such as high latency and errors, high in the stack, and use dashboards to find the cause
- **Have as few alerts as possible**: Each one should relate to real user pain, with room for small blips
- **Page where a human has something to do**: For latency, page at one point in the stack, and for errors, page on those that users see

It adds guidance by kind of system. A batch job should page when it hasn't succeeded recently enough to cause a visible problem, with a threshold of at least two full runs: a job that runs at 4 hour intervals and takes 1 hour gets a 10 hour threshold.

A system near capacity should alert, since it needs a human to prevent a later outage. And the alerting system itself needs watching, with a test of the whole path, not only of each part.

## Judging an Alert

The SRE workbook names four properties by which to compare alert rules:

| Property | Question |
| --- | --- |
| Precision | Of the alerts that fired, how many were about a significant event |
| Recall | Of the significant events, how many produced an alert |
| Detection Time | How long before someone is told |
| Reset Time | How long the alert keeps firing after the problem is fixed |

They pull against each other. A hair trigger has a short detection time and poor precision. A slow, wide window has good precision and a long reset time, and the alert keeps firing after the fix.

## Alerting on Burn Rate

The workbook walks through six rules, from naive to recommended, using the **burn rate**: how fast the service spends its error budget compared with the SLO. A burn rate of 1 uses the budget exactly by the end of the window. For a 99.9 percent SLO over 30 days:

| Burn Rate | Error Rate | Budget Gone in |
| --- | --- | --- |
| 1 | 0.1% | 30 days |
| 2 | 0.2% | 15 days |
| 10 | 1% | 3 days |
| 1,000 | 100% | 43 minutes |

The share of the budget consumed by the time an alert fires is the burn rate times the window divided by the period: 36 times 1 hour over 720 hours is 5 percent.

The first rule, to alert when the error rate over 10 minutes reaches the SLO's allowed rate of 0.1 percent, has fast detection and poor precision.

Such a rate for 10 minutes uses 0.02 percent of the monthly budget, so the rule could fire 144 times a day while the service meets its SLO. A longer window improves precision, and then a full outage takes about two minutes to detect, and the alert keeps firing for 36 hours after recovery.

A required duration of an hour makes the full outage wait an hour, the same as a 0.2 percent problem.

The recommended design is **multiwindow, multi burn rate**. Each alert needs two conditions at once: the budget burned over a long window and the error rate over a short one, about one twelfth as long, which shows that the problem is still going.

The short window is what lets the alert reset about 5 minutes after errors stop. The workbook's table for a 99.9 percent SLO:

| Budget Consumed | Long Window | Short Window | Burn Rate | Action |
| --- | --- | --- | --- | --- |
| 2% | 1 hour | 5 minutes | 14.4 | Page |
| 5% | 6 hours | 30 minutes | 6 | Page |
| 10% | 3 days | 6 hours | 1 | Ticket |

Fast, severe burns page quickly, slow leaks page after hours, and a very slow one opens a ticket. The three levels measure the same thing, the budget, so the team sees one consistent meaning for each.

## Trying the Rules

We replayed 30 days of the textbook app at 3,000 requests a second. The baseline error rate was 0.04 percent, with about 10 short blips a day of 0.5 percent errors for 1 to 3 minutes. We added 5 real incidents, and noise on the counts:

| Incident | Errors | Duration | Budget Used |
| --- | --- | --- | --- |
| 1 | 100% | 5 minutes | 11.6% |
| 2 | 10% | 10 minutes | 2.3% |
| 3 | 2% | 2 hours | 5.6% |
| 4 | 1% | 6 hours | 8.3% |
| 5 | 0.2% | 2 days | 13.3% |

Here are the four rules against them:

| Rule | Alerts in 30 Days | Outside Incidents | Incidents Caught |
| --- | --- | --- | --- |
| 10 Minute Error Rate Above the SLO Rate | 131 | 126 | 5 of 5 |
| Burn Rate 14.4 Over 1 Hour | 3 | 0 | 3 of 5 |
| Multiwindow Pages | 4 | 0 | 4 of 5 |
| Multiwindow Tickets | 4 | 0 | 4 of 5, including the leak |

The naive rule caught each incident, and 126 of its 131 alerts, 96 percent, were noise from blips. The single window rule was quiet and missed the two slow ones.

The multiwindow pages caught the four incidents that needed fast action, after 0, 8, 42 and 208 minutes, and the ticket rules caught the 2 day leak after about 25 hours, an incident that no page rule should wake anyone for.

Incident 2 used 2.3 percent of the budget and was caught by the page rule and not by the ticket rule, which fits its size.

The detection times are the price of precision. A 6 hour burn at 1 percent took 208 minutes to page, and the question for the team is whether they would prefer a faster alert that also wakes them for blips.

## Services With Little Traffic

Burn rates assume enough requests for the error rate to be meaningful.

The workbook's example is a service with 10 requests an hour: one failure is a 10 percent hourly error rate, a burn rate of 1,000 for a 99.9 percent SLO, and it pages at once, though a 99.9 percent SLO over 30 days allows about 7 failures.

The options it lists are to generate synthetic traffic, to combine related services into one group, to change the product so that a single failure matters less, with retries and fallbacks, or to lower the target or lengthen the window.

At the other end, a 99.999 percent target is spent by a full outage in 26 seconds, shorter than typical metric collection intervals, and the chapter says that design, such as canarying a change to 1 percent of users, can defend such a target.

## Routing and Quieting

An alerting system should send fewer messages than events. Prometheus's Alertmanager has four tools:

- **Grouping**: Similar alerts become one notification. Hundreds of instances failing to reach a database send one page, listing the instances
- **Inhibition**: An alert is muted while another is firing, so a cluster unreachable alert hides the others for that cluster
- **Silences**: A time limited mute with matchers, made in the interface, for planned work
- **Routing**: A tree of rules sends each alert to the right receiver, such as a pager for the urgent and a ticket queue for the rest

Run several Alertmanagers and point Prometheus at the whole set of them, since silences and notification state are replicated between peers, and a limit per alert name stops a flood.

## The Person Who Answers

Pages cost people. The SRE book's chapter on on-call sets numbers: at most 2 incidents per 12 hour shift, where an incident is the set of events tied to one root cause and takes about 6 hours to handle in full.

Paging should be flat over time with a median of 0 pages a day, and a component that pages daily is a warning sign. Response times are typically 5 minutes for user facing services and 30 minutes for less time sensitive ones.

The book explains why this matters. Stress impairs deliberate reasoning and leads to shortcuts and confirmation bias, and low priority alerts that fire each hour make the on-call engineer less attentive to serious ones.

The fixes are measurable goals, such as under 2 pages a shift, pages that match SLO threatening symptoms, grouping so that alerts and incidents are one to one and, in extreme cases, giving the pager back to the developers.

## Dashboards

A dashboard is where the person goes next. Grafana's guidance names two methods that fit different layers:

- **RED, for services**: Rate, errors and duration for each service, from Tom Wilkie. It is a proxy for user happiness, and gives each team the same view, so engineers can be on call for code they didn't write
- **USE, for machines**: Brendan Gregg's method checks utilization, saturation and errors for each resource, such as CPUs, memory, network and disks. He notes that 100 percent utilization usually marks a bottleneck, that more than about 70 percent can already hide bursts, that any saturation, meaning queued work, can be a problem, and that the method finds many server problems with little effort

The four golden signals from the SRE book are RED plus saturation. Grafana says to build alerts from RED dashboards, since alerts should be on symptoms, and to use USE for the causes.

It also gives a maturity model. At the low level, anyone can edit dashboards, copies spread, and no definition is under version control. In the middle, template variables replace per node dashboards, each service has a row in data flow order, and the definitions are in version control.

At the high level, dashboards are generated, reviewed to cut sprawl, and not edited in the browser. Its advice for a single dashboard is to answer one question, normalize axes, use consistent colors, and avoid copying dashboards, since a copy misses later fixes.

For the textbook app, the main dashboard has one row for each service in the order of a request: web, listings, wallet, queue.

Each row shows rate, errors and duration, with deploy markers on the graphs, and below them a row of resource panels for the busiest hosts. The page for purchase errors links to this dashboard and to a runbook that lists the first three things to check.

## Key Points

- Page on urgent, actionable symptoms that threaten the SLO, ticket the slow ones, and keep dashboards for finding causes
- Judge alert rules by precision, recall, detection time and reset time, and use burn rate, the speed of spending the error budget
- <u>Multiwindow, multi burn rate alerts</u> paged 4 times in our 30 days with no noise, where a naive threshold fired 131 times and 126 were noise
- Group, inhibit and route alerts, protect the on-call engineer with a limit of about 2 incidents a shift, and link each page to a dashboard and a runbook
- Use RED dashboards for services and USE for resources, one question for each dashboard, and avoid copies
