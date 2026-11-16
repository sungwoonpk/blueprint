> A system is **reliable** if it keeps working correctly when things go wrong. Parts will fail, so reliability comes from how the pieces are put together, not from parts that never break.

[Availability and the Nines](/system-design/availability) asked whether a system is up. Reliability asks a harder question: when it is up, is it right? And [Redundancy and Failover](/system-design/redundancy-failover) gave one tool for surviving failures. This topic zooms out: where failures come from, why copies don't cure all of them, and the toolbox you'll meet in the rest of the roadmap.

## A Fault is Not a Failure

These two words mean different things. A **fault** is one part misbehaving, such as a disk dying. A **failure** is the whole system no longer serving users. A reliable design makes sure faults don't turn into failures:

<figure class="diagram">
<p class="rowname">With a Spare</p>
<div class="flow">
<div class="node">Disk Dies<small>a fault</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Replica Takes Over</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Users Notice Nothing</div>
</div>
<p class="rowname">Without One</p>
<div class="flow">
<div class="node">Disk Dies<small>a fault</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Nothing Takes Over</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">App is Down<small>a failure</small></div>
</div>
<figcaption>The same fault, with and without fault tolerance</figcaption>
</figure>

Building a system that holds up under faults is called **fault tolerance**. The goal isn't zero faults, which no one can promise. It is that a fault stays small.

## At Scale, Failure is Normal

A single disk lasts a long time, so failure feels rare. Backblaze, which runs hundreds of thousands of drives and publishes its results, reported a failure rate of about 1.4% a year across its drives in 2025. Here is what that rate means as the number of disks grows:

| Disks | Failures per Year | One Failure Every |
| --- | --- | --- |
| 1 | 0.014 | About 70 years |
| 100 | 1.4 | About 9 months |
| 1,000 | 14 | About 4 weeks |
| 10,000 | 140 | About 2.6 days |

Big systems have thousands of disks, plus servers, switches and power supplies. Something is breaking nearly all the time. So a reliable system can't hope that things won't fail. It has to expect it.

## Where Faults Come From

Faults come from three places, and they behave differently:

- **Hardware**: disks, power, network cables. These tend to fail one at a time and independently, so copies help
- **Software**: a bug is in every copy of the code, so every copy can fail at the same moment
- **People**: a wrong setting or a bad release, pushed to all the servers at once, hits all the copies together

The last two points are why more copies don't fix everything, the independence condition from [Availability and the Nines](/system-design/availability). Uptime Institute, which studies outages, estimates that human error plays a part in about two thirds to four fifths of them, though it is rarely the only cause.

A real case is Cloudflare in July 2019. A new rule for its web firewall contained a pattern that used far too much CPU. The rule was sent to every server worldwide at once, and the CPUs handling web traffic on every machine ran out of capacity for roughly half an hour. Having many healthy servers did not help, because they were all running the same change. The details are in [Cloudflare's own account](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019). A gradual release, which sends a change to a few servers first, would have caught it sooner.

## Up is Not the Same as Right

A system can be available and still unreliable:

| The System is | Example | Reliable? |
| --- | --- | --- |
| Up and right | Search shows the real listings | Yes |
| Up but wrong | A book that is already sold is sold to a second student | No: available, but not reliable |
| Down | The app shows an error page | No: not available, though it gave no wrong answers |

Correctness is part of reliability, which is why topics later in the roadmap care about duplicates, retries and stale copies.

## The Toolbox

No single tool covers every fault. Each one answers a particular kind, and most have a topic of their own coming up:

| When This Goes Wrong | A Defense | Covered In |
| --- | --- | --- |
| A machine dies | Copies and failover | [Redundancy and Failover](/system-design/redundancy-failover) |
| A call hangs or fails | Timeouts, and retries that are safe to repeat | [Timeouts, Retries and Backoff](/system-design/timeouts-retries) and [Idempotency and Safe Retries](/system-design/idempotency) |
| A dependency keeps failing | Stop calling it for a while, and keep its trouble from spreading | [Circuit Breakers](/system-design/circuit-breakers) and [Bulkheads](/system-design/bulkheads) |
| Too much load | Drop the less important work, and offer a simpler service | [Load Shedding and Graceful Degradation](/system-design/load-shedding) |
| A bad release | Release gradually, and roll back fast | [Canary Releases and Other Deployment Strategies](/system-design/deployments) |
| Data is lost or damaged | Backups you have tested restoring | [Backups and Disaster Recovery](/system-design/backup-dr) |

The tools work best together, and they work best when they are tried before they are needed. Netflix started Chaos Monkey in 2010, a tool that randomly shuts down real servers in production, so that engineers would build services that survive it. See [Chaos Engineering](/system-design/chaos-engineering).

## Key Points

- A fault is one part misbehaving, a failure is the system no longer serving users, and fault tolerance keeps the first from becoming the second
- At scale, failure is normal: 10,000 disks at 1.4% a year means a failure every few days
- Hardware faults are mostly independent, so copies help, but bugs and bad changes hit every copy at once
- <u>Available is not the same as reliable</u>, because a system that is up can still give wrong answers
- Use a different defense for each kind of fault, and test them before they are needed
