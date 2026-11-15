> **System design** is deciding the parts of a system, how they talk and where the data lives.

Ever seen course registration freeze at 9:00 AM? The "add class" code probably worked. The system around it couldn't handle everyone clicking at once. That's a system design problem.

## Coding vs system design

|  | Coding | System design |
| --- | --- | --- |
| Asks | Does this feature work? | Does it keep working for everyone? |
| Scope | a function, a file | servers, databases, the network |
| Example | write "add to cart" | handle 10,000 carts at once |

## Example: a used textbook app

Students post old textbooks with a photo. Others browse and buy.

<figure class="diagram">
<div class="flow">
<div class="node">Phone or browser<small>what you tap</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web server<small>runs our code</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Database<small>users, listings</small></div>
<div class="node">File storage<small>photos</small></div>
</div>
</div>
<figcaption>A first design</figcaption>
</figure>

## Words you'll see a lot

| Word | Meaning |
| --- | --- |
| Client | the app or browser that sends requests |
| Server | the computer that answers them |
| Request | one ask, like "show me this page" |
| Database | where data is kept for good |
| Cache | a fast copy of data people read often |
| Load balancer | spreads requests across servers |

## Scale changes the design

|  | One campus | Every campus in the country |
| --- | --- | --- |
| Users | 2,000 | 3 million |
| Busiest moment | a few clicks per second | thousands per second |
| Down for an hour | a few annoyed students | lost sales, angry users |
| Design | 1 server | many servers, copies of the data, a cache |

Same features, different system.

How one server grows into many: [From One Server to Many](/system-design/one-server-to-many).

## What a good design aims for

| Quality | The question |
| --- | --- |
| Scalability | Still fine with 10× the users? |
| Availability | Up at 9:00 AM on registration day? |
| Reliability | Still correct when a server dies? |
| Performance | Fast enough? |
| Maintainability | Can the team change it safely? |
| Cost | Worth what it costs? |
| Security | Only the right people see the data? |

You can't max out all seven. Keep 3 copies of the data and the app is harder to take down, but you pay 3× the storage and the copies must stay in sync. More in [Thinking in Tradeoffs](/system-design/trade-offs).

## Big picture vs details

|  | High level | Low level |
| --- | --- | --- |
| Decides | which parts, how they connect | classes, functions |
| Example | photos go to file storage | the code that resizes a photo |

This roadmap is about the high level.

## How a design comes together

1. **Requirements**: what must it do? How big, how fast?
2. **Estimate**: users, requests per second, storage.
3. **Sketch**: boxes for parts, arrows for data.
4. **Deep dive**: find what breaks first and fix it.
5. **Revisit**: real traffic shows what you missed.

<u>Step 1 matters most.</u> A chat app for 100 people and one for 100 million are different systems.

## Why learn it

- **First job**: you'll read design docs from day one.
- **Better code**: a slow query is easier to spot when you know what your code talks to.
- **Interviews**: standard for experienced hires, and some companies ask new grads too.

## Key points

- System design: the parts, how they talk, where the data lives.
- Scale decides the design, not features alone.
- Every choice gives something up. No single right answer.
- Start simple. Add parts when the numbers say so.
