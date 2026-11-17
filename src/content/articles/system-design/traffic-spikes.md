> A **traffic spike** is a surge of requests far above the normal level, lasting seconds to hours. **Absorbing** it means choosing, on purpose, what happens to the excess: serve it with spare capacity, delay it in a queue, turn some of it away, give it a cheaper answer, or make people wait in line. Hoping that the servers cope is the choice that fails.

At 9:00 AM on registration day, the textbook app doesn't get 3,000 requests a second. For the first 30 seconds it gets 8,000, from students who have been refreshing the page since 8:59.

Then it settles at 3,000. Six servers can finish 3,600 a second, so the spike is more than twice what they can serve, and it lasts just long enough to do harm.

[Autoscaling](/system-design/autoscaling) can't answer it alone: in our simulation a reactive policy needed 269 seconds to have enough capacity, and the spike is over before the new servers arrive. The system has to decide what to do in the meantime, and the decision is a design question, not an emergency one.

## The Size of the Problem

The first step is arithmetic. Two numbers describe a spike: how far it exceeds capacity, and how long it lasts. For the textbook app:

| Quantity | Value | How |
| --- | --- | --- |
| Capacity | 3,600 requests a second | 6 servers at 600 each |
| Spike Rate and Length | 8,000 a second for 30 seconds | Our assumption for registration |
| Excess Requests | 132,000 | (8,000 minus 3,600) times 30 |
| Headroom After the Spike | 600 a second | 3,600 minus the usual 3,000 |
| Time to Work Off the Excess | 220 seconds | 132,000 divided by 600 |
| Longest Wait for a Request Joining at the End | 36.7 seconds | 132,000 divided by 3,600 |

The excess isn't large for the whole day. It is 132,000 requests, and a queue of that size drains in under four minutes once the spike is over. The difficulty is that it arrives faster than it can be served, and that people give up and retry while it waits.

Spikes differ in how predictable they are. A registration, a sale or an exam release has a known time, and the preparation is a schedule: more capacity ready before it starts, a rehearsal, a plan.

A viral link or a news event has no date, and the defenses have to be automatic. Both are tested the way [Load Testing](/system-design/load-testing) describes, with a spike shaped like the real one.

## Six Ways to Absorb It

| Option | The Idea | The Price |
| --- | --- | --- |
| Spare Capacity | Have enough servers running at the start | Money for idle machines |
| Cache and CDN | Answer repeated reads without the app | Staleness, and a new dependency |
| Queue | Accept the work now, do it at a sustainable rate | Delay, and a reply that comes later |
| Throttle | Refuse the excess quickly and clearly | Some users get an error |
| Degrade | Serve a cheaper version to each user | Less of the product |
| Waiting Room | Admit users at a rate the app can serve | People wait, and each holds a place |

### Spare capacity and caches

Capacity bought ahead is the most reliable answer for a predictable spike, and the scheduled scaling of [Autoscaling](/system-design/autoscaling) provides it at a known cost.

A spike made mostly of reads should hit a cache or a CDN first, as in [Scaling Reads](/system-design/scaling-reads) and [Content Delivery Networks (CDNs)](/system-design/cdn), with the request coalescing of [Cache Stampedes](/system-design/cache-stampedes) so that a popular page expiring doesn't send the whole crowd to the database.

### A queue to level the load

Queue based load leveling puts a queue between a task and the service it invokes, as a buffer.

The producer posts a message and moves on, and the service pulls messages at its own pace. The app can be sized for the average and not the peak, and it keeps accepting work when the service is slow or down.

The pattern comes with conditions:

- **The queue grows if production exceeds consumption**: If the average producer rate exceeds the consumer rate, the queue continues to grow and latency increases, so a queue absorbs a spike and doesn't fix a lasting overload
- **Scaling consumers can move the problem**: Autoscaling consumers without bounding their combined rate downstream just moves the overload to the dependencies
- **Replies are separate**: A queue is one way, so a caller that needs an answer needs another channel for it
- **Delivery is usually at least once**: Consumers need to be idempotent, as in [Idempotency and Safe Retries](/system-design/idempotency), and poison messages go to a dead letter queue
- **It is a poor fit for a synchronous request**: A user who is waiting for a page can't wait on a queue

For the textbook app, the receipts, emails and statistics from a registration go through a queue, as in [Task Queues](/system-design/task-queues), and the student sees a confirmation page at once. The step that decides whether a student gets a seat can't be queued silently, since the answer is what the student is waiting for.

### Throttling: say no early

The Azure throttling pattern limits the resources that an application instance, a tenant or a service can use. For HTTP, it names two statuses.

A 429 says the caller exceeded a configured rate over a window, and a 503 says the service can't handle the request right now, often because of a load spike, and a `Retry-After` header helps the client pick a retry strategy. [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) covers the mechanisms.

Amazon API Gateway shows the shape with a token bucket. Its default for an account in a region is 10,000 requests a second with a bucket of 5,000 for bursts, clients receive a 429 beyond that, and both throttles and quotas are best effort targets and not guaranteed ceilings.

A fast refusal is cheap for the server, which is the point of [Load Shedding and Graceful Degradation](/system-design/load-shedding).

Throttling can cover the time while autoscaling catches up, though it may not buy enough time when demand grows faster than capacity arrives.

Priorities help: the Priority Queue pattern serves high priority work first. With one pool of consumers, low priority messages can be continually delayed and potentially left unprocessed, so separate pools or an aging rule are used.

### A waiting room

A waiting room holds visitors outside the application and admits them at a controlled rate, with an honest estimate of the wait. Cloudflare's Waiting Room shows the design in its settings:

- **Total active users**: The most sessions allowed on the protected path at one time, and Cloudflare's guidance is to set it to 75 percent of the origin's capacity
- **New users per minute**: A threshold on admissions, not on the number added each minute, and it must not exceed the total active users
- **Session duration**: Between 1 and 30 minutes, with a default of 5, during which a visitor who left can return without queueing again
- **Queueing methods**: First in, first out by default, which rewards those who arrived first, random, where open spots go to random visitors, passthrough, which just collects traffic statistics, and reject, where nobody enters and a static page is shown
- **The wait estimate**: Visitors ahead divided by the rate at which users enter the application, which applies to the first in, first out method

<figure class="diagram">
<p class="rowname">Queue Leveling</p>
<div class="flow">
<div class="node">App</div>
<div class="arrow" data-label="enqueue" aria-hidden="true"></div>
<div class="node">Queue</div>
<div class="arrow wide" data-label="at its pace" aria-hidden="true"></div>
<div class="node">Worker</div>
</div>
<p class="rowname">Waiting Room</p>
<div class="flow">
<div class="node">Visitors</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Waiting Room<small>holds the crowd</small></div>
<div class="arrow wide" data-label="admit at rate" aria-hidden="true"></div>
<div class="node">Application</div>
</div>
<figcaption>Two ways to level a spike: a queue behind the user, a waiting room in front of the app</figcaption>
</figure>

The tracking uses an encrypted cookie that holds the place in line and is renewed at 20 second intervals while a visitor waits.

## What the Options Do

We simulated the textbook spike on the six servers: 8,000 users a second for 30 seconds, then 3,000, each user making one request, and compared four policies for the 240,000 users who arrived during the spike:

| Policy | Served | Failed | Wait |
| --- | --- | --- | --- |
| Accept Each Request, Users Leave After 5 Seconds | 13.8% | 86.2% | Median 2.5 s |
| Refuse Above Half a Second of Queue, No Retry | 45.5% | 54.5% | Under 0.5 s |
| Refuse Above Half a Second, Up to 3 Retries | 48.4% | 51.6% | Up to 15 s |
| Waiting Room, Admit at Capacity | 100% | 0% | Median 18.4 s, longest 36.7 s |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share served for four policies">
<div class="hbar peak"><span>Accept Each, Users Leave</span><span class="track"><span class="fill" style="--w: 13.8%"></span></span><span class="value">13.8%</span></div>
<div class="hbar"><span>Refuse, No Retry</span><span class="track"><span class="fill" style="--w: 45.5%"></span></span><span class="value">45.5%</span></div>
<div class="hbar"><span>Refuse, 3 Retries</span><span class="track"><span class="fill" style="--w: 48.4%"></span></span><span class="value">48.4%</span></div>
<div class="hbar"><span>Waiting Room</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">100%</span></div>
</div>
<figcaption>Share of the 240,000 users served during the spike, by policy, from our simulation</figcaption>
</figure>

Each row teaches something:

- **Accept each request**: The queue grew to many seconds, users left before their turn, and the servers worked on requests nobody was waiting for. Just 13.8 percent of the spike's users were served, though the servers ran at full speed. This is the goodput collapse from [Load Shedding and Graceful Degradation](/system-design/load-shedding)
- **Refuse quickly**: The servers served what they could, 45.5 percent, which is the share that capacity allows in those 30 seconds, and the rest were told at once
- **Refuse with retries**: Retries recovered 3 points of users and added 14 percent to the load on the app, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries), and some users spent 15 seconds on it
- **Waiting room**: The whole crowd was served, with a wait of up to 36.7 seconds, which equals the excess divided by the capacity. The price of fairness was time, and no error pages

The right choice depends on what a failure costs. For a catalog page, a refusal is fine and a retry works. For a seat in a course, a user would rather wait 30 seconds than refresh into an error, so the waiting room fits.

## A Plan for Registration Day

| Layer | Decision |
| --- | --- |
| Capacity | Scheduled scaling to 8 servers at 8:50, as in [Autoscaling](/system-design/autoscaling) |
| Static Content | Photos and scripts on the CDN, listing pages cached for 30 seconds |
| Seat Selection | A waiting room in front of the step, sized at 75 percent of capacity |
| Receipts and Emails | A queue, so the confirmation page is quick |
| API Clients | 429 with Retry-After, and clients that back off with jitter |
| Priority | Checkout ahead of browsing, with separate worker pools |
| Rehearsal | A load test with the real spike shape a week before |

The numbers need an assumption about sessions: if each active session makes about one request a second, capacity of 3,600 requests a second allows about 2,700 active sessions at the 75 percent guideline. The assumption gets replaced by a measurement after the first rehearsal.

## Pitfalls

- **Counting on autoscaling for a sharp spike**: The new servers arrive after the crowd has left
- **An unbounded queue**: The backlog becomes the outage, and latency grows without limit
- **A queue for a synchronous request**: The user waits anyway, and doesn't know why
- **Retries without backoff**: Refused users come back at once, and the load grows 14 percent in our test
- **Scaling consumers faster than the database can take**: The queue moves the overload downstream
- **Refusing without saying when to come back**: A missing Retry-After makes clients guess
- **No rehearsal**: The first test of the plan is the real event

## Key Points

- A spike is a rate above capacity for a limited time, and the size of the problem is the excess: in our case 132,000 requests, which 600 requests a second of headroom drains in 220 seconds
- The options are spare capacity, caching, queueing, throttling, degrading and a waiting room, and each trades money, delay or errors for survival
- In our simulation, accepting each request served 13.8 percent of the spike's users, refusing quickly served 45.5 percent, and a waiting room served the whole crowd with a wait of up to 36.7 seconds
- <u>Queues absorb spikes and don't fix lasting overload</u>: if arrivals stay above service, the queue grows and latency with it, so bound it and watch its age
- Refuse clearly with 429 or 503 and Retry-After, rehearse with the real spike shape, and choose the option by what a failed request costs
