> **Capacity estimation** turns a few assumptions about users into rough numbers for requests, storage and bandwidth. The goal is the right order of magnitude, enough to tell whether one server will do or the design needs more.

In [Functional and Nonfunctional Requirements](/system-design/requirements), a goal like "handle registration day" was only useful once it had a number on it. [Numbers Every Engineer Should Know](/system-design/numbers) supplied the building blocks. This topic strings them together, using the textbook app at national scale: 3 million students across the country instead of the 2,000 on one campus.

Estimating is a short chain of multiplications, and each answer feeds the next:

<figure class="diagram">
<div class="flow">
<div class="node">Users<small>how many</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Requests<small>per second</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Peak<small>busiest time</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Servers</div>
<div class="node">Storage</div>
<div class="node">Bandwidth</div>
</div>
</div>
<figcaption>From users to the three things you size</figcaption>
</figure>

Every number below is made up for the example. In real work they come from your own data, or from a guess you write down and later check.

## Start with the Users

Not everyone who signs up shows up each day. The count that matters is **DAU**, daily active users, the people who open the app on a given day. Say 10% of our 3 million do:

```text
3,000,000 users x 10% = 300,000 daily active users
```

Then decide what a typical user does in a day, and separate reading from writing, because they are handled differently later. Say each active user views 20 listings, and one in ten posts a listing:

```text
Reads:  300,000 x 20  = 6,000,000 a day
Writes: 300,000 x 0.1 =    30,000 a day
```

That is about 200 reads for every write. Most systems lean this way, and it shapes the design: a read heavy app benefits from caches and copies of the data, as in [From One Server to Many](/system-design/one-server-to-many).

## From a Day to a Second

Servers think in seconds, so divide by the seconds in a day. The rounding from [Numbers Every Engineer Should Know](/system-design/numbers) uses 100,000 instead of 86,400, and the error is small next to how rough the inputs are:

```text
Reads:  6,000,000 / 100,000 = 60 a second
Writes:    30,000 / 100,000 = 0.3 a second
```

That is the average, and an average is not what takes a system down. Traffic arrives in waves, and the busiest moment sets what you must handle. Think of registration day at 9:00 AM from [From One Server to Many](/system-design/one-server-to-many): everyone shows up at once. Rules of thumb range from 2 to 10 times the average for the peak, depending on how spiky the traffic is. A deadline driven app like ours is spiky, so use 10:

```text
Peak reads: 60 x 10 = 600 a second
```

Pick the multiplier from your own traffic once you have some. A steady app may need much less, a one time event much more.

## How Many Servers

Two quick estimates turn the rate into hardware. The first is how many requests are being handled at the same moment. A rule called **Little's Law** says that for a steady system, the number in flight equals the arrival rate times the time each one takes. Say a request takes 100 ms, as in [Latency and Throughput](/system-design/latency-throughput):

```text
600 a second x 0.1 seconds = 60 requests in flight
```

Use the average time here, not the p99. The second step is headroom. Servers get slow and queues grow as they near full, so plan to use around half to 70% of what they can do, and keep room for failures. Suppose one web server handles about 100 requests at once comfortably. That figure is an assumption, and a load test, covered in [Load Testing](/system-design/load-testing), replaces it with a measurement:

```text
60 in flight / 0.7 = about 90, so one server could carry the load
```

Load says one, and [Redundancy and Failover](/system-design/redundancy-failover) says not to depend on a single machine, so the real answer is at least two, and three if losing one must leave enough. Here availability, not load, sets the count. For comparison, the campus app has 2,000 users, so the same arithmetic gives well under one request a second, even at a 10 times peak, and a single small server is plenty.

## How Much Storage

Storage is a similar chain: how much each write adds, times how many writes, times how long you keep it. Estimate each part of a listing on its own, because sizes differ wildly:

- **Text**: the title, price, description and a few other fields come to about 1 KB
- **Photos**: three photos at about 300 KB each, roughly 0.9 MB

```text
Text:   30,000 x 1 KB   = 30 MB a day      (about 11 GB a year)
Photos: 30,000 x 0.9 MB = 27 GB a day      (about 10 TB a year)
Three copies for safety: 10 TB x 3 = 30 TB a year
```

The photos outweigh the text by close to a thousand times. That one fact decides a lot: the photos shouldn't sit in the main database, they belong in cheap file storage with a [CDN](/system-design/cdn) in front, and the database stays small and fast. The factor of three is a common choice, since [Redundancy and Failover](/system-design/redundancy-failover) keeps several copies so one failed disk doesn't lose the data. Add room for indexes and for growth, and you get a figure to plan against, not an exact bill.

## How Much Bandwidth

The last number is how much data moves each second. Bandwidth is the peak rate times the size of each response. Say a typical page of listings carries about 200 KB once thumbnails are included:

```text
600 a second x 200 KB = 120 MB a second, about 1 Gbit a second
```

Network speeds are quoted in bits, so multiply bytes by 8. One Gbit a second fits on a standard 10 Gbit link, but nearly all of it is images. Serving them from a CDN near the students, instead of from our own servers, takes most of that load off us and speeds up each page.

## What the Numbers Tell Us

Numbers matter only if they change a decision. Here is what the estimate says about the design:

| What We Found | What It Suggests |
| --- | --- |
| About 600 reads a second at peak | A few web servers behind a load balancer, with no need for hundreds |
| About 200 reads for each write | One primary database can take the writes, and caches and copies serve the reads |
| About 10 TB of new photos a year | File storage and a CDN for photos, with only text in the database |
| About 1 Gbit a second at peak | Let a CDN carry most of the image traffic |

Now change one assumption and watch the design change. If the app were ten times busier, peak reads would be 6,000 a second, and one database would need help from caches and copies before anything else. If photos were not part of the app, storage would be a few GB a year and a single database would be fine for years.

## Making an Estimate Trustworthy

Rough numbers can still be wrong in useful ways, so a few habits help:

- **Write down every assumption**: 10% daily active and a 10 times peak are guesses, and anyone should be able to see and change them
- **Check against something real**: compare with a similar app, or with your own traffic from a smaller launch
- **Estimate peak, not just average**: a system sized for the average fails at 9:00 AM
- **Don't forget the extras**: copies, indexes, backups and growth all add up
- **Stop at the right precision**: ten and forty terabytes lead to the same design, and ten terabytes and ten petabytes don't

An estimate is also a starting point. Once the system is live, real measurements replace the guesses, and [Capacity Planning](/system-design/capacity-planning) covers keeping the numbers current as traffic grows.

## Key Points

- Estimate in a chain: users, requests per day, requests per second, then the peak, then servers, storage and bandwidth
- Divide a daily count by about 100,000 to get a rate per second, and multiply by a peak factor for the busiest moment
- Requests in flight equal the rate times the time each takes, and headroom and redundancy raise the server count
- <u>Size the biggest thing first</u>: here photos outweigh text a thousand times and shape the whole design
- Write down assumptions, and change them to see what the design does
