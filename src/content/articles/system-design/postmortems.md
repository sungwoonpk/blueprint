> An **incident** is an unplanned event that degrades a service enough that people must coordinate to restore it. An **incident response** process says who does what while it lasts. A **postmortem** is the written record afterward: the impact, the actions taken, the causes and the follow up work, written without blame so that the system learns and the people stay honest.

Each defense in this phase will fail at some point. A timeout will be set wrong, a breaker will stay closed too long, a failover will need an engineer at 3:00 AM. What decides the damage is often less the fault than the response to it.

Picture registration day. At 9:03 AM search starts returning errors. Five engineers join a chat at once, and each begins fixing what looks wrong. One restarts the search service, another rolls back last night's release, and a third raises a database limit.

Nobody knows what the others did, and when search recovers, nobody can say which action fixed it. The cost wasn't the bug. It was the confusion.

## Deciding That It Is an Incident

The Google SRE book says to declare early, and not to start the framework hours into a problem. It gives three criteria, and any one is enough:

- **A second team is needed**: The problem can't be fixed by one group alone
- **Customers can see it**: The outage is visible to them
- **It is unsolved after an hour**: An hour of concentrated analysis hasn't found the answer

PagerDuty's open incident guide adds a scale. Its severity levels run from SEV-1, a critical issue that warrants public notice and contact with executives, to SEV-5, a cosmetic problem. Anything above SEV-3 counts as a major incident and starts the full response.

If it is unclear which of two levels applies, the guide says to treat it as the higher one, and to review the choice in the postmortem. The guide also recommends that a team's own definitions be specific and driven by metrics, often a percentage of users or accounts affected.

For the textbook app, the levels follow the user's experience, with thresholds that are our assumptions:

| Severity | Meaning | Response |
| --- | --- | --- |
| SEV-1 | Registration unavailable, or personal data exposed | Full incident response, executives and public notice |
| SEV-2 | Search or checkout failing for more than 5 percent of users | Full incident response |
| SEV-3 | A degraded feature, or no redundancy left | A page to the owning team, with a rollback if a release is the suspect |
| SEV-4 | A minor issue with no user impact | A low urgency ticket |

The alerts from [Alerting and Dashboards](/system-design/alerting) and the burn rates from [SLIs, SLOs and Error Budgets](/system-design/slo) are the natural source of these thresholds.

## Who Does What

The SRE book separates the work into roles so that people don't collide. Its four are incident command, operations, communication and planning. PagerDuty's guide names a similar set. Between them:

| Role | Does | Doesn't |
| --- | --- | --- |
| Incident Commander | Holds the state of the incident, assigns roles and tasks, decides | Investigate or fix the problem alone |
| Operations Lead | Applies changes to the system, with the commander | Share the keyboard: no one else changes the system |
| Communicator | Sends updates to stakeholders and users at set times | Speculate on causes |
| Scribe | Records actions and findings in the incident document | Wait for a request to write things down |
| Subject Matter Experts | Investigate, report findings, suggest fixes | Act on a fix before the commander approves |

- **Command**: The commander holds each position that hasn't been delegated, and can remove roadblocks for the operations lead. The most important duty, in the book's words, is keeping the live incident state document
- **Operations**: The book says the operations team should be the sole group modifying the system during an incident, which solves the five engineers problem
- **Communication**: The public face of the response, with periodic updates. PagerDuty's guide advises that if there is doubt about posting a public message, post it
- **Planning**: Longer term work, such as filing bugs, arranging handoffs and tracking how the system has drifted from normal
- **Splitting**: The book describes recursive separation: when one person's load is too high, they ask for staff and delegate, possibly by creating subincidents

## Running It

A few habits from the sources make a response steadier:

- **A central place**: A war room or a chat channel, where the conversation is logged for the postmortem, since bots can record the traffic
- **A live state document**: The SRE book says it can be messy but must be functional, editable by several people at once, with the most important facts at the top
- **Explicit handoffs**: The outgoing commander says "you are now the incident commander", and doesn't leave until the new one acknowledges
- **A rhythm of updates**: PagerDuty's guide has the internal liaison update executives at roughly 30 minute intervals, and the customer liaison post at set times
- **Mitigate first**: Roll back a release, switch off a feature with a flag from [Feature Flags](/system-design/feature-flags), shed load, or move traffic, and find the root cause once users are safe

PagerDuty adds a rule about severity during the incident: assume the worst, and don't debate the level while the system is down.

## A Long Night: GitHub, October 2018

GitHub's own account of 21 and 22 October 2018 shows the shape of a big incident, with its timestamps. Routine maintenance to replace failing optical equipment cut the link between the East Coast network hub and the primary data center. Connectivity returned in 43 seconds.

The failover system, built on Raft, had meanwhile promoted the West Coast to take writes, and the East Coast held a small set of writes that hadn't replicated. Failing back wasn't safe, and the result was a degraded service for 24 hours and 11 minutes.

Times are UTC, and the elapsed figures are our arithmetic from the post:

| Time | Event | Since the Trigger |
| --- | --- | --- |
| Oct 21, 22:52 | Connectivity is cut | 0 |
| 22:54 | Alerts fire | 2 minutes |
| 23:13 | Status turns red, with the incident coordinator in place from 23:11 | 21 minutes |
| 23:19 | Webhook delivery and site builds are paused | 27 minutes |
| Oct 22, 11:12 | The primaries are back on the East Coast | 12 hours 20 minutes |
| 23:03 | Status turns green after the backlog drains | 24 hours 11 minutes |

A 43 second fault led to 87,060 seconds of impact, about 2,025 times longer. The numbers in the post explain it. Restoring clusters of hundreds of gigabytes to nearly 5 terabytes from backups, taken at four hour intervals, took hours.

Afterward, a backlog of more than five million webhook events and 80,000 site builds had to drain, and about 200,000 webhook payloads past an internal time limit were dropped, so the limit was raised.

The post says that no user data was lost, after a manual reconciliation of the unreplicated writes. One busy cluster had 954 of them.

Two choices stand out. The team stated its priority early: data integrity over site usability and time to recovery. That's a decision a commander can make at minute 27 and a communicator can explain.

And the post admits that its public estimate of two hours missed variables, since catch up followed a decaying curve and not a straight line. A promise of a time is a risk, so estimates should say what they rest on.

Its changes are a model of follow up work: configure the failover tool not to promote primaries across regional boundaries, build a richer status page that shows components, continue the work toward redundancy across multiple data centers, and add fault injection and chaos tooling, as in [Chaos Engineering](/system-design/chaos-engineering). The mechanics tie to [Replication Lag](/system-design/replication-lag) and [Backups and Disaster Recovery](/system-design/backup-dr).

## Writing the Postmortem

The SRE book defines a postmortem as a written record of an incident, its impact, the actions taken to mitigate or resolve it, the root causes and the follow up actions. It lists common triggers, with room for teams to adapt them:

1. User visible downtime or degradation beyond a threshold
2. Data loss of any kind
3. An on call engineer's intervention, such as a rollback or rerouting traffic
4. A resolution time above a threshold
5. A monitoring failure, where the incident was found by hand

The criteria are set before the incident, and any stakeholder can ask for a postmortem. A template keeps them comparable:

```text
Owner, status, incident date
Summary: impact and root cause in a few lines
Impact: users, revenue, team load
Root causes and trigger
Timeline: detection, response, resolution
Lessons: what went well, what went poorly, where we got lucky
Action items: type, priority, owner, tracking ticket
```

The Google SRE workbook gives a case with a good and a bad example. The bad one had four owners, no owners on the action items, subjective language and was published four months late.

The good one had a single owner, action items with a priority, an owner and a tracking bug, quantified impact and circulation within a week. The workbook's advice is a single owner with several collaborators, and action items that are specific enough to be verified.

The action types it lists are useful because they push for a mix: investigate, prevent, mitigate, repair and detect. A set of preventive items alone assumes the same incident can be prevented, and a set of repairs alone leaves the next one untouched.

## Blameless Doesn't Mean Pointless

The SRE book calls blamelessness a tenet of its culture. A blameless postmortem names the contributing causes without blaming any person, and assumes that people had good intentions and did the right thing with the information they had.

In the book's words, you can't fix people, but you can fix systems and processes. The practical reason is that blame teaches people to hide incidents, and hidden incidents can't be learned from.

Blameless doesn't mean avoiding the truth about what to improve. The book's example contrasts an action item that points fingers, to rewrite the backend, with one that names the cost for the next on call engineer. The first judges people, and the second describes the system.

It also means looking past one root cause. The October 2025 AWS event in [Surviving a Region Outage](/system-design/region-outage) had a race in DNS automation, a deletion step, a dependency of a server fleet on the database, a recovery that had no procedure, and a health check system whose automatic action removed capacity.

A single root cause would have missed four of the five lessons.

The workbook quotes a Google SRE leader on what makes it count: to users, a postmortem without subsequent action is indistinguishable from no postmortem.

The SRE book adds that an unreviewed postmortem might as well not have existed, so drafts get reviewed for the quality of the data, the depth of the cause, the appropriateness of the action plan and the priority of its tickets.

## Closing the Loop

The postmortem is the start of the learning, and the follow up decides whether it happens:

- **Track the action items**: Each has an owner and a ticket, and an owner reports on them at a regular review
- **Look for repeats**: The same cause twice means the actions were too weak or too slow
- **Share widely**: The SRE book wants the widest audience that benefits, with no end user identifying data
- **Practice**: The book describes Wheel of Misfortune role playing, where on call engineers respond to a simulated page, and game days like those of [Chaos Engineering](/system-design/chaos-engineering)
- **Reward it**: The book suggests recognizing people who write good postmortems and run good responses, with senior leaders taking part

The measurements come from the timeline: time to detect, to assemble a response, to mitigate and to resolve. In GitHub's case the first two were 2 and 19 minutes, and the long part was the restore. Each number points at a different investment, in alerting, in on call, in rollback or in backups.

## For the Textbook App

| Step | Action |
| --- | --- |
| 1 | Define severities by percent of users affected, tied to the SLO |
| 2 | Name an on call rotation with a primary and a backup commander |
| 3 | Keep an incident channel template, a state document template and a status page |
| 4 | Write the postmortem criteria down, and require one for any SEV-2 or data loss |
| 5 | Review postmortems weekly, and track action items to closure |
| 6 | Run one tabletop and one game day before registration week |

## Pitfalls

- **Many people fixing at once**: Changes collide and nobody knows what worked
- **Declaring late**: The framework starts after the hour of confusion
- **A commander who debugs**: The incident has no one in charge
- **Promising a time to recovery**: The estimate misses variables and is wrong in public
- **Blame**: Incidents start to be hidden
- **A postmortem without owners**: The action items are wishes
- **One root cause**: The other contributing factors return

## Key Points

- An incident needs a declared start and defined roles: a commander, an operations lead who alone changes the system, a communicator and a scribe
- Declare early: a second team is needed, customers see it, or an hour of analysis hasn't solved it
- In GitHub's 2018 incident, a 43 second fault became 24 hours and 11 minutes of degradation, about 2,025 times longer, because recovery was dominated by restores and backlogs, and the team's early choice of data integrity over speed shaped the response
- <u>Write blameless postmortems with owned action items</u>: name contributing causes, mix investigate, prevent, mitigate, repair and detect actions, and review them
- Close the loop: track the actions to completion, look for repeat causes, and practice with tabletops and game days
