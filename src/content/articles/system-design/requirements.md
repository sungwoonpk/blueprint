> **Functional requirements** say what a system does. **Nonfunctional requirements** say how well it does it. A design starts from both, and the second kind is the one people forget to ask for.

[What Is System Design?](/system-design/what-is-system-design) put requirements at the top of the process and said that step often matters most. [Thinking in Tradeoffs](/system-design/trade-offs) explained why: the requirements decide which side of every dial wins. This topic is about getting them on paper, in a form you can design against.

## Two Kinds of Requirements

Here are both kinds for the textbook app, where students post used books and others buy them:

| Functional: What It Does | Nonfunctional: How Well |
| --- | --- |
| Post a book with a photo | Pages load quickly, even on registration day |
| Search listings by subject | The app stays up when thousands arrive at once |
| Message the seller | A book is never sold to two students |
| Mark a book as sold | Student accounts stay private |

You can tell the kinds apart by asking: if this were missing, would a feature be missing, or would a feature be bad? Functional requirements tend to be easy to list because users ask for them. Nonfunctional ones, such as speed, safety and uptime, are felt only when they fail, and they shape the architecture more.

## Wishes Are Not Requirements

"The app should be fast" is a wish. Nobody can build to it or tell whether it was met. A real requirement says how much, measured how, under what load:

| The Wish | A Requirement You Can Build To |
| --- | --- |
| Fast | At the busiest hour, 95% of searches finish in under 300 ms |
| Reliable | 99.9% of requests succeed each month, and a confirmed sale is never lost |
| Scalable | 3,000 requests per second at peak now, and ten times that within a year |
| Secure | Only the seller can edit a listing, and passwords are never stored as plain text |
| Easy to change | A new engineer can ship to production in their first week |

Notice how much the numbers do. They come from earlier topics, such as the percentiles in [Latency and Throughput](/system-design/latency-throughput) and the monthly budget in [Availability and the Nines](/system-design/availability), where 99.9% leaves about 43 minutes. The load condition matters just as much: a 300 ms target at 10 requests per second is a far easier promise than the same target at 3,000.

## Questions That Shape the Design

Asking before drawing saves a rebuild later. A few questions come up for almost every system, and each one points at a part of the design:

1. **Who uses it, and how many?** The number of users drives capacity. See [Estimating Capacity](/system-design/estimation)
2. **Do people mostly read or mostly write?** Mostly reads suggests a cache and replicas, from [From One Server to Many](/system-design/one-server-to-many)
3. **How fresh must the data be?** A few seconds of delay is fine for browsing and not fine for "sold", the split from [Thinking in Tradeoffs](/system-design/trade-offs)
4. **How long can it be down, and how much data can it lose?** These set the nines and the failover plan in [Redundancy and Failover](/system-design/redundancy-failover)
5. **What can we leave out?** Every feature has a cost, so scope is a design decision too

## Decide What Is Out

Requirements need an edge, or they grow without limit. A simple way to set it is to sort features into four groups, known as MoSCoW. For the textbook app it might look like this:

- **Must have**: post a book, search, message the seller, mark it as sold
- **Should have**: email the seller when someone is interested
- **Could have**: price alerts for a book you want
- **Won't have, for now**: paying inside the app, which brings payment rules and a lot of extra design

Writing the "won't" list down matters as much as the rest. It tells everyone what was left out on purpose, so the design doesn't quietly bend around a feature nobody committed to.

## When Requirements Conflict or Change

Nonfunctional requirements pull against each other, as in [Thinking in Tradeoffs](/system-design/trade-offs): faster often costs more, and safer often costs speed. When two collide, put numbers on the trade-off, then let the people who own the goals decide. Some of the best requirements work is finding out which of two good things matters more.

Requirements also move. Users show what they really need once the app exists, and traffic grows past the first guess. That is why the process in [What Is System Design?](/system-design/what-is-system-design) ends with a step called revisit. Mistakes in requirements are cheap to fix on paper and costly after the system is built. The exact multiples that get quoted are shaky, but the direction is consistent.

## Key Points

- Functional requirements say what the system does, and nonfunctional ones say how well
- <u>A requirement needs a number and a load</u>: "fast" becomes "95% of searches under 300 ms at peak"
- A few questions, about users, reads and writes, freshness, downtime and scope, point straight at design choices
- Sort features into must, should, could and won't, and write the "won't" list down
- When requirements collide, quantify the trade-off and let the owners choose, and expect them to change
