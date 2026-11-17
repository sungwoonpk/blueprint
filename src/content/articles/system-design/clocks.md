> A **physical clock** shows the time of day, kept by hardware and corrected over the network, and different machines don't agree on it exactly. A **logical clock** is a counter that orders events by what could have caused what, without asking what time it was.

The textbook app has a price field that two people can edit. A seller lowers a listing to 4,000 cents on one server, and a moment later an admin on another server sets it to 3,500.

Which edit is the newer one? A timestamp from each server's clock is the obvious answer, and as [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard) said, that answer can be wrong.

This topic separates what clocks are good for from what they aren't, and then builds the tools that can order events without trusting a clock.

## Two Clocks in One Computer

Clocks do two different jobs: measuring how long something took, and saying when something happened. A computer has a separate clock for each. The Linux manual page for `clock_gettime` describes them:

| Clock | What It Is | Can It Jump? | Use It For |
| --- | --- | --- | --- |
| Wall Clock (`CLOCK_REALTIME`) | Time of day, since 1970, settable | Yes, when it is corrected or set by hand | Showing a time to a person |
| Monotonic Clock (`CLOCK_MONOTONIC`) | Time since boot, not settable | No, but its speed can be adjusted slightly | Measuring elapsed time |

Use the wall clock for wall time stamps and the monotonic clock to measure elapsed time, since a correction can make the wall clock jump forward or back. A timeout built on the wall clock can fire early, or late, when the clock is stepped in the middle of the wait.

## How Wrong Are Physical Clocks?

The Network Time Protocol, NTP, keeps clocks close to the official time by asking servers over the network.

NTP typically keeps clocks within a few tens of milliseconds across the internet, and within a few hundred microseconds on a fast local network. Asymmetric routes and congestion can add larger errors.

There are two ways to fix a clock that is off. A **step** sets it to the right value at once, which can move the time backwards. A **slew** changes the clock's speed a little until the error is gone, so time does not jump.

Chrony allows steps in the first few updates after startup, and caps slewing by default at about one part in twelve of the clock rate.

Leap seconds are another trap. When one is added, a naive clock repeats or halts a second, and the incident at Cloudflare in 2017 came from time running backwards.

Google has handled leap seconds since 2008 by **smearing** them: the recommended form stretches the extra second over 24 hours, noon to noon UTC, which changes the clock's rate by about 11.6 parts per million and keeps it within half a second of UTC. Amazon's time service uses the same smear, and mixing smeared and non smeared sources during a leap event is a mistake.

## When Skew Decides the Winner

Some databases settle conflicting writes by timestamp. In Cassandra each write carries a timestamp, from the client or else from the coordinator's clock, and the highest one wins. This is last write wins, used in place of vector clocks, and its correctness depends on clocks that are kept in sync.

We simulated two writes to the same value on different servers, the second made after a gap of up to a second, and each server's clock off by a random amount with the standard deviation shown. The write that is really later loses when its timestamp is not greater:

| Typical Clock Error | Later Write Loses, Gap of Up to 1 Second | Later Write Loses, Gap of Up to 50 ms |
| --- | --- | --- |
| 1 ms | 0.05% | 1.15% |
| 10 ms | 0.54% | 11.27% |
| 50 ms | 2.83% | 36.55% |
| 100 ms | 5.68% | not run |
| 500 ms | 25.57% | not run |

Within a short window, even tens of milliseconds of error lets the wrong edit win about a third of the time, and the loser is silently discarded. The app's seller and admin edit is rare enough to survive this, and a shopping cart updated in bursts would not.

## Ordering by Cause: Lamport Clocks

Leslie Lamport's 1978 paper starts from a different idea. Without a shared clock, the one thing that can be known is which events could have influenced others.

Event a **happened before** event b if both are in one process and a comes first, or if a is the sending of a message and b its receipt, or if a chain of such steps connects them. Events with no chain between them are **concurrent**.

A **Lamport clock** is a counter that respects this order. Each process increments its counter before each event, including a send, and the message carries the counter. On receipt, a process sets its counter to the larger of its own value and the message's, then adds one. We traced the textbook purchase:

<figure class="chart">
<svg viewBox="0 0 420 236" role="img" aria-label="Three lanes for the web, payment and email services with Lamport timestamps. The web order is 1 and its send is 2. Payment receives it at 3, charges at 4 and sends at 5. Email receives that at 6. Email also has an unrelated digest event with timestamp 1." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<g font-size="12" font-weight="600" style="fill:var(--text)"><text x="4" y="56">Web</text><text x="4" y="118">Payment</text><text x="4" y="180">Email</text></g>
<line x1="70" y1="52" x2="412" y2="52" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="70" y1="114" x2="412" y2="114" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="70" y1="176" x2="412" y2="176" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="155.0" y1="59.5" x2="187.0" y2="106.5" style="stroke:var(--accent)" stroke-width="2"/>
<polygon points="187.0,106.5 179.2,102.2 185.8,97.7" style="fill:var(--accent)"/>
<line x1="295.2" y1="121.3" x2="328.8" y2="168.7" style="stroke:var(--accent)" stroke-width="2"/>
<polygon points="328.8,168.7 320.9,164.5 327.4,159.8" style="fill:var(--accent)"/>
<circle cx="100" cy="52" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="100" y="56" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">1</text>
<text x="100" y="78" text-anchor="middle" font-size="10" style="fill:var(--muted)">order</text>
<circle cx="150" cy="52" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="150" y="56" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">2</text>
<text x="150" y="78" text-anchor="middle" font-size="10" style="fill:var(--muted)">send</text>
<circle cx="192" cy="114" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="192" y="118" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">3</text>
<text x="192" y="140" text-anchor="middle" font-size="10" style="fill:var(--muted)">recv</text>
<circle cx="240" cy="114" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="240" y="118" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">4</text>
<text x="240" y="140" text-anchor="middle" font-size="10" style="fill:var(--muted)">charge</text>
<circle cx="290" cy="114" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="290" y="118" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">5</text>
<text x="290" y="140" text-anchor="middle" font-size="10" style="fill:var(--muted)">send</text>
<circle cx="110" cy="176" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="110" y="180" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">1</text>
<text x="110" y="202" text-anchor="middle" font-size="10" style="fill:var(--muted)">digest</text>
<circle cx="334" cy="176" r="10" style="fill:var(--surface);stroke:var(--accent)" stroke-width="2"/>
<text x="334" y="180" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--text)">6</text>
<text x="334" y="202" text-anchor="middle" font-size="10" style="fill:var(--muted)">recv</text>
<g font-size="11" style="fill:var(--muted)"><text x="70" y="226">time moves right, and each circle shows its Lamport timestamp</text></g>
</svg>
<figcaption>Timestamps rise along each lane and across each message, and the email digest has no link to the order</figcaption>
</figure>

If a happened before b, then a's timestamp is lower than b's. The reverse doesn't hold: the email service's digest has timestamp 1 and the web send has timestamp 2, yet neither caused the other.

A lower number doesn't prove a cause, and equal numbers can occur on different processes. Breaking ties by process id gives the events one total order. It agrees with causality, and between concurrent events it invents an order, which Lamport pointed out is arbitrary.

## Spotting Concurrency: Vector Clocks

To tell concurrent events from ordered ones, each process keeps a counter for each process, a vector. A process increments its own entry on each event, sends its vector with messages, and on receipt takes the larger value in each position.

One vector is before another if each entry is at most the other's and at least one is smaller. If neither is before the other, the events are concurrent.

For the price edit, replica A records the seller's change as [1, 0] and replica B records the admin's as [0, 1]. Neither dominates, so the system knows these are conflicting versions, and can keep both for someone to merge, as in [Detecting and Resolving Conflicts](/system-design/conflicts).

If B had first received A's version, its edit would be [1, 1], which is later than [1, 0], and would replace it safely.

The cost is size: a vector has an entry for each process. Amazon's Dynamo paper used vector clocks as a list of node and counter pairs to capture causality between versions of an object, and returned the conflicting versions to the application, for example to merge two shopping carts.

Dynamo also truncates: each pair carries a timestamp, and when the list reaches a threshold, such as 10 pairs, the oldest is removed. This can make descendant relations impossible to derive accurately, though Amazon reported that the problem had not surfaced in production.

## Hybrid and Bounded Clocks

Two designs combine the benefits of both kinds. A **hybrid logical clock**, from a 2014 paper by Sandeep Kulkarni and colleagues, pairs a value kept close to physical time with a counter for events at the same moment.

Each event takes the larger of the previous value plus one and the physical clock, and a message receipt also takes the sender's value into account. The timestamps stay near wall time, so they are useful for queries such as "as of 10 minutes ago", and they keep the causal property.

CockroachDB uses them: nodes attach their timestamp to requests and a receiver advances its own clock past it.

It also shows what skew costs: the default maximum offset is 500 ms, a node shuts itself down when its offset from the others exceeds 80 percent of that, and 250 ms plus a time service on each node is the usual setup for new multi region clusters.

Google's Spanner takes the other route and makes clock error explicit. Its TrueTime interface returns an interval, earliest to latest, that is guaranteed to contain the true time.

The error bound, from about 1 to 7 ms in Spanner, comes from GPS receivers and atomic clocks in each data center and an assumed drift of 200 microseconds a second between syncs.

To commit, a transaction picks a timestamp and then waits, called commit wait, until that timestamp is certainly in the past. The result is external consistency: if one transaction finishes before another starts, its timestamp is lower.

## Choosing

| Need | Use |
| --- | --- |
| Measure a timeout or duration | The monotonic clock |
| Show a time to a person | The wall clock, synced with NTP |
| Know what caused what | Lamport or vector clocks |
| Order events and keep them near wall time | A hybrid logical clock |
| Order across the world and tolerate no stale reads | Bounded clocks, as in Spanner, with the hardware to support them |

Identifiers that sort by time, like those in [Unique ID Generation](/system-design/unique-ids), the next topic, borrow from these ideas.

## Key Points

- Use the monotonic clock to measure durations and the wall clock to show times, since the wall clock can be stepped, and NTP keeps it within tens of milliseconds on the internet
- <u>Timestamps from different machines can't be trusted to order close events</u>: in our simulation, 10 ms of error let the wrong edit win 11.3 percent of the time within a 50 ms window
- Lamport clocks give each event a counter that respects cause and effect, and a lower number doesn't prove a cause
- Vector clocks add a counter for each process, so they can tell concurrent events from ordered ones at a cost in size
- Hybrid logical clocks stay near wall time, and bounded clocks such as TrueTime expose the error and wait it out
