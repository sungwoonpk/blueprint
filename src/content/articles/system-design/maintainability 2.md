> **Maintainability** is how easily people can keep a system running, understand it and change it, for years after it was built. It is where most of a system's life, and cost, ends up.

In [Building Reliable Systems from Unreliable Parts](/system-design/reliability), people were one of the three main sources of faults, and in [Thinking in Tradeoffs](/system-design/trade-offs) simplicity was one side of a dial. This topic is about making the people side easier: a system that is simple to run, to understand and to change leaves fewer chances for a human mistake.

## Most of the Work Comes After Launch

Building a system is the short part. Then it runs for years, and people fix it, patch it and add features. In his book *Facts and Fallacies of Software Engineering*, Robert Glass collects estimates that maintenance takes between 40% and 80% of what software costs over its life, around 60% on average. Estimates vary, but the direction is clear. Most of that work is changes to what the system does, not fixes to bugs.

So a design is not only judged by whether it works on day one. It is also judged by how it feels on day 900, to an engineer who didn't build it.

## Three Parts of Maintainability

| Part | The Question | Helped By |
| --- | --- | --- |
| Operability | Can the team run it smoothly? | Monitoring, automation, runbooks |
| Simplicity | Can a new engineer understand it? | Few parts, clear boundaries |
| Evolvability | Can it change without pain? | Small steps, backward compatibility |

## Operability: Easy to Run

A system that is easy to operate shows what it is doing, can be changed without heroics, and has few surprises:

- **Visibility**: logs, metrics and alerts that tell you what is wrong. See [Logs, Metrics and Traces](/system-design/observability)
- **Automation**: deploying, restarting and rolling back are one command, not a list of manual steps
- **Servers you can rebuild**: describe the setup in code, so a replacement matches the original. Machines that were fixed by hand over the years, each a little different, are called snowflake servers, and they are hard to reproduce or replace
- **Written runbooks**: what to check and what to do for the problems that come up

A test for operability is whether a new engineer who is on call on a Friday evening could diagnose a problem without calling the person who built the service.

## Simplicity: Easy to Understand

Complexity grows faster than the number of parts, because every part can connect to every other. The number of possible pairs among n parts is n times (n minus 1), divided by 2:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>5 services</span><span class="track"><span class="fill" style="--w: 5.3%"></span></span><span class="value">10</span></div>
<div class="hbar"><span>10 services</span><span class="track"><span class="fill" style="--w: 23.7%"></span></span><span class="value">45</span></div>
<div class="hbar peak"><span>20 services</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">190</span></div>
</div>
<figcaption>Ways a handful of services could be connected to each other</figcaption>
</figure>

Doubling the services roughly quadruples the ways they can interact, and each way is something that can surprise you. Most systems don't connect every pair, but each connection they do have is another thing to understand.

Some complexity comes with the problem. Fred Brooks called this essential complexity: if students need to post, search, message, pay and review, the system has to do all of those. The rest he called accidental complexity, which comes from our own tools and choices, and it is the part you can cut. The usual ways to cut it:

- Hide details behind clear interfaces, so one part can be understood without reading the others
- Delete code that nothing uses
- Prefer well known technology. Dan McKinley's rule of thumb is that a team can afford only about three novel technologies, because each one brings unknowns it must learn to run

## A Costly Example

In 2012, Knight Capital, a trading firm, deployed new code by hand to eight servers and missed one. On that server, a setting that the new code used for something else switched on an old feature that had been unused since 2003 and never deleted. The old code ran on its own, and Knight lost about 440 million dollars in 45 minutes. The US regulator later found that the firm had no written procedure for the deployment and no second person checking it. When engineers tried to fix it, they removed the new code from the seven good servers, which made the problem worse.

Both halves are in this topic: a manual, unchecked deployment is an operability problem, and dead code that was still wired up is a simplicity problem.

## Evolvability: Easy to Change

A system that is easy to change gets changed in small steps that can each be undone. Two habits do most of the work:

- **Feature flags**: new behavior ships turned off, and a switch turns it on for a few users and back off in seconds if something is wrong. Flags should be temporary, and removed once the change settles
- **Backward compatible changes**: old clients keep working while new ones arrive, as in [API Versioning](/system-design/api-versioning)

For a change that would break existing users, such as renaming a column or an API field, the safe path has three stages:

<figure class="diagram">
<div class="flow">
<div class="node">Expand<small>support old and new</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Migrate<small>move users over</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Contract<small>remove the old</small></div>
</div>
<figcaption>Changing something that others depend on, without a big bang</figcaption>
</figure>

Every stage can be shipped and rolled back by itself. The step that is easiest to skip is the last one, because once the new path works there's pressure to move on, but leaving the old one behind is how dead code is born. See [Migrating Between Datastores Without Downtime](/system-design/migrating-datastores).

## Simple or Flexible

Flexibility is tempting: build for the changes you might need. But flexibility has a cost too, since every option is something to understand and test. A system that can do anything is hard to change in any particular way. A good default is to build for what you know, keep the parts separate enough that changing one doesn't break the rest, and add options when you need them. Splitting into services is the biggest version of that choice, in [When to Split into Microservices](/system-design/monoliths-microservices).

## Key Points

- Most of a system's cost comes after launch, mainly from changes, so design for the people who will live with it
- Maintainability has three parts: operability, simplicity and evolvability
- <u>Complexity grows faster than the number of parts</u>, so hide details, delete dead code and prefer familiar technology
- Easy to run means visible, automated, rebuildable and documented
- Change in small stages you can roll back, and finish the cleanup step
