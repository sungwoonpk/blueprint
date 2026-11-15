> **System design** is deciding the parts of a system, how they talk and where the data lives, so the system meets its requirements.

Ever seen course registration freeze at 9:00 AM? The code for "add class" probably worked. The system around it couldn't handle everyone clicking at once. That's what system design is about.

## Code Level and System Level

You already know the code level. System design works one level up.

|  | Code Level | System Level |
| --- | --- | --- |
| Question | Does this feature work? | Does it keep working for everyone? |
| Scope | A function, a class | Servers, databases, the network |
| Example | The code that resizes a photo | Photos go to file storage, not the database |

You'll also hear these called **low level design** and **high level design**. This roadmap stays at the high level.

## Why It Matters to You

- **Your first team**: design docs, design reviews and on call all assume you know how the parts fit. When something breaks at 2 AM, that's how you know where to look
- **Better code**: a slow query is easier to spot when you know what your code talks to
- **Interviews**: standard for experienced hires, and some companies ask new grads too

## The Parts of a System

Take a used textbook app. Students post books with a photo. Others browse and buy.

<figure class="diagram">
<div class="flow">
<div class="node">Phone or Browser<small>client</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web Server<small>runs our code</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Database<small>users, listings</small></div>
<div class="node">File Storage<small>photos</small></div>
</div>
</div>
<figcaption>A first design for the textbook app</figcaption>
</figure>

A request like "show me calculus books" goes from the phone to the web server, which runs our code, queries the database and sends the response back. Photos are large, so they usually go to separate file storage, often **object storage** such as Amazon S3, built to hold huge numbers of files cheaply.

The web server's code for that request can be this small:

```python
def list_books(subject):
    sql = "SELECT title, price FROM listings WHERE subject = ?"
    return db.query(sql, subject)
```

Everything here is the code level you already know, except one call. `db.query` leaves this program, goes to the database and comes back, and the database is a separate part that can be slow, busy or down. That call is where the code level meets the system level.

## What Decides the Design

Two things: what the app must do, and how well it must do it. These are its **functional** and **nonfunctional requirements**.

Here the features stay the same. Only the "how well" changes:

|  | One Campus | Every Campus in the Country |
| --- | --- | --- |
| Users | 2,000 | 3 million |
| Busiest Moment | A few requests per second | Thousands per second |
| One Hour Down | A few annoyed students | Lost sales, angry users |
| A Likely Design | 1 server | Many servers, a load balancer, copies of the data, a cache |

A **load balancer** spreads requests across servers. A **cache** keeps a fast copy of popular data, like the most viewed listings. Start with the simple version and add parts only when the numbers call for them. How one server grows into many is the next topic, [From One Server to Many](/system-design/one-server-to-many).

## What a Good Design Aims For

"How well" breaks down into a few qualities. Each one is a question to ask about the design.

| Quality | The Question |
| --- | --- |
| Scalability | Still fine with 10× the users? |
| Availability | Up at 9:00 AM on registration day? |
| Reliability | Still correct when a server dies? |
| Performance | Do pages load fast at the busiest moment? |
| Maintainability | Can the team change it safely? |
| Cost | Worth what it costs? |
| Security | Only the right people see the data? |

You can't max out all of them. Say we keep a second copy of the database on another machine. If one machine dies, the app can stay up. But we pay for two machines, and every new listing has to reach both copies. Choosing what to give up is the core of the job, and it's why there's rarely one right design, only one that fits the requirements. More in [Thinking in Tradeoffs](/system-design/trade-offs).

## How a Design Comes Together

1. **Requirements**: the features and the "how well". See [Functional and Nonfunctional Requirements](/system-design/requirements)
2. **Estimate**: rough numbers for users, requests per second and storage. See [Estimating Capacity](/system-design/estimation)
3. **Sketch**: boxes and arrows, like the diagram above
4. **Deep dive**: find what breaks first under load and fix it
5. **Revisit**: real traffic shows what you missed

<u>Step 1 often matters most.</u> Get the requirements wrong and the later steps solve the wrong problem.

## Key Points

- System design decides the parts of a system, how they talk and where the data lives
- Features say what to build. Scale and quality goals decide how
- Each choice gives something up. There's rarely a single right answer, only one that fits
- Start simple. Add parts when the numbers say so
